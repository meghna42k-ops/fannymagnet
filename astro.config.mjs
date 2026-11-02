// @ts-check
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import {
  kleapCompatLog,
  kleapConstReassignCompat,
  kleapContentConfigStub,
  kleapContentEntryCompat,
  kleapDedupeFrontmatterImports,
  kleapV5RouteOutcomes,
  kleapViewTransitionsCompat,
} from "./kleap-astro-compat.mjs";

// Build timestamp captured once per build (this config is evaluated fresh in
// each ephemeral build dir), so EVERY sitemap URL gets the SAME <lastmod>. A
// per-page mtime isn't available in a static build, so build-time is the
// accepted freshness signal — without it @astrojs/sitemap emits no <lastmod>
// at all and Google loses the "recently updated" hint.
const BUILD_LASTMOD = new Date().toISOString();

// ─── Astro 7 / @astrojs/cloudflare 14 backward-compat shims ─────────────────
// Every app in app_files was written for Astro 5 + adapter v12. Two runtime
// contracts changed underneath them; both are restored here, in the one file the
// template owns (astro.config.mjs is a scaffold path — an app's copy never wins).

// (1) `Astro.locals.runtime` — adapter v13+ replaced it with getters that THROW
//     ("Astro.locals.runtime.env has been removed in Astro v6"). Generated code
//     reads it (the Robot-Speed SSR blog scaffold: `Astro.locals.runtime.env`),
//     so every such page would answer 500. Rewrite the adapter's createLocals so
//     `runtime` answers the v12 shape again: env (the Worker bindings, same object
//     `cloudflare:workers` exports), cf, caches and ctx. `cfContext` (the v13 API)
//     is left untouched. If the adapter changes shape the transform no-ops and
//     logs — it never fails a build.
const CF_HELPERS_RE = /@astrojs[\\/]cloudflare[\\/]dist[\\/]utils[\\/]cf-helpers\.js$/;
const CF_HANDLER_RE = /@astrojs[\\/]cloudflare[\\/]dist[\\/]utils[\\/]handler\.js$/;
function kleapLocalsRuntimeCompat() {
  return {
    name: "kleap:locals-runtime-compat",
    enforce: "pre",
    transform(code, id) {
      const cleanId = id.split("?")[0];
      if (CF_HANDLER_RE.test(cleanId)) {
        if (!code.includes("createLocals(context)")) {
          console.warn("[kleap] locals.runtime compat: handler shape changed, cf passthrough skipped");
          return null;
        }
        return { code: code.replace("createLocals(context)", "createLocals(context, request)"), map: null };
      }
      if (!CF_HELPERS_RE.test(cleanId)) return null;
      const start = code.indexOf("function createLocals(ctx) {");
      const end = code.indexOf("function getClientAddress");
      if (start < 0 || end < 0 || end < start) {
        console.warn("[kleap] locals.runtime compat: adapter shape changed, shim skipped");
        return null;
      }
      const compat = `function createLocals(ctx, request) {
  const locals = { cfContext: ctx };
  Object.defineProperty(locals, "runtime", {
    enumerable: false,
    value: {
      get env() { return __kleapCfEnv; },
      get cf() { return request ? request.cf : undefined; },
      get caches() { return globalThis.caches; },
      get ctx() { return ctx; },
    },
  });
  return locals;
}
`;
      return {
        code:
          'import { env as __kleapCfEnv } from "cloudflare:workers";\n' +
          code.slice(0, start) +
          compat +
          code.slice(end),
        map: null,
      };
    },
  };
}

// (2) Private `import.meta.env.X` in SERVER code. Astro 5 compiled it to a
//     runtime `process.env.X` lookup when X existed at build time; Astro 6+
//     inlines the build-time VALUE as a string literal into the Worker bundle —
//     a server secret baked into the script, frozen until the next publish.
//     Restore the v5 contract: same names, same condition (set at build time),
//     same runtime lookup. Unset names are left alone (both versions inline
//     `undefined` for them). Client code is never touched: private vars were
//     never exposed there in either version.
const ASTRO_BUILTIN_ENV = new Set(["MODE", "DEV", "PROD", "SSR", "SITE", "BASE_URL", "ASSETS_PREFIX"]);
function kleapPrivateEnvCompat() {
  return {
    name: "kleap:private-env-compat",
    enforce: "pre",
    transform(code, id) {
      if (this.environment && this.environment.config.consumer === "client") return null;
      if (id.includes("node_modules") || !code.includes("import.meta.env.")) return null;
      let changed = false;
      const out = code.replace(/\bimport\.meta\.env\.([A-Za-z_][A-Za-z0-9_]*)\b/g, (m, name) => {
        if (name.startsWith("PUBLIC_") || ASTRO_BUILTIN_ENV.has(name)) return m;
        if (process.env[name] === undefined) return m;
        changed = true;
        return `process.env.${name}`;
      });
      if (changed) kleapCompatLog("private-env", id.split("?")[0]);
      return changed ? { code: out, map: null } : null;
    },
  };
}

// (3)–(6) Astro 5 → 7 compat shims (ViewTransitions alias, v5 content
//     collections, Rolldown strictness, v5 same-URL outcomes) live in
//     kleap-astro-compat.mjs — laid down next to this file by the build runner,
//     unit-tested in src/__tests__/astro7-compat-shims.test.ts.

// Kleap Astro template — SEO/GEO-first, edge-rendered on Cloudflare Workers.
// output:'static' (Astro 5+) = SSG by default; pages opt into Edge SSR with
// `export const prerender = false`. The deployer overwrites `site` with the
// real domain at deploy time (drives canonical + sitemap absolute URLs).
export default defineConfig({
  site: "https://example.kleap.io",
  output: "static",
  // Astro 7 changed the default to 'jsx' (React whitespace rules: `<span>a</span>
  // <em>b</em>` renders "ab"). Every stored app was written against the HTML
  // rules — keep them, or words glued together appear across existing sites.
  compressHTML: true,
  // No Astro sessions. Adapter v13+ otherwise declares a `SESSION` KV binding in
  // the generated Worker config, which `wrangler deploy` auto-provisions — one KV
  // namespace per published app. Our deploys never bound SESSION under v12
  // either, so Astro.session never worked on a published site: nothing is lost.
  session: false,
  // v5 content collections — see kleap-astro-compat.mjs (4).
  legacy: { collectionsBackwardsCompat: true },
  // imageService:'compile' = optimize images with sharp at BUILD time (sharp is
  // unsupported in the Workers runtime). Keeps sharp a devDependency only.
  // (Explicit on purpose: adapter v13+ defaults to 'cloudflare-binding', which
  // needs an IMAGES binding our dispatch-namespace workers do not have.)
  // prerenderEnvironment:'node' = prerender static pages in Node, like Astro 5
  // did. The v13+ default ('workerd') cannot load CommonJS deps nor see the
  // build-time env (buildSecretEnv, e.g. ROBOTSPEED_API_KEY baked into SSG blogs).
  adapter: cloudflare({ imageService: "compile", prerenderEnvironment: "node" }),
  integrations: [
    kleapContentConfigStub(),
    kleapV5RouteOutcomes(),
    react(),
    // serialize sets <lastmod> on every URL (build-time). @astrojs/sitemap emits
    // none by default → freshness signal lost. Keep item.url/priority/changefreq
    // as the integration computed them; only stamp lastmod.
    sitemap({
      // Keep owner-only scaffold pages (login/signup/dashboard/crm) OUT of the
      // sitemap — they ship noindex, so listing them is a mixed crawl signal.
      filter: (page) => !/^https?:\/\/[^/]+\/(login|signup|dashboard|crm)\/?$/.test(page),
      serialize(item) {
        item.lastmod = BUILD_LASTMOD;
        return item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss(), kleapLocalsRuntimeCompat(), kleapPrivateEnvCompat(), kleapViewTransitionsCompat(), kleapContentEntryCompat(), kleapDedupeFrontmatterImports(), kleapConstReassignCompat()],
    // Vite 8 bundles with Rolldown, which FAILS the build on an import of a
    // name the target module does not export ([MISSING_EXPORT]). Vite 6/Rollup
    // let those builds through (the binding is simply undefined at runtime), and
    // AI-written apps that publish today carry such imports (measured: app
    // 25636, a component importing a helper that was later renamed). Shim them
    // as undefined, as before, instead of taking a live site down on republish.
    build: {
      rolldownOptions: { shimMissingExports: true },
    },
    resolve: {
      // 🧪 CRITICAL for the ephemeral preview build: each build runs in a temp
      // dir whose node_modules is a SYMLINK to the shared template node_modules.
      // Vite's default preserveSymlinks:false resolves that symlink to its
      // realpath, which splits React into TWO module identities → islands render
      // but setState is a silent no-op (the renderer's React ≠ the event React),
      // with ZERO console errors. preserveSymlinks keeps the symlink path as the
      // identity, and dedupe collapses every react/react-dom import onto one copy
      // so hooks/state work. Without this, NO interactive island hydrates.
      preserveSymlinks: true,
      dedupe: ["react", "react-dom", "react-dom/client", "react/jsx-runtime"],
      // 🧪 CRITICAL for DEPLOY: the @astrojs/react SSR renderer pulls in
      // react-dom/server. The default resolves to the BROWSER build
      // (react-dom/server.browser), which throws at Cloudflare Worker startup
      // → upload fails with validation error 10021. The EDGE build is built for
      // edge runtimes (Workers/Deno). Alias it so the generated _worker.js
      // passes CF's startup validation. (Static pages don't invoke the worker,
      // but CF still evaluates the script at upload — so it must not throw.)
      alias: {
        "react-dom/server": "react-dom/server.edge",
        // `@/…` → the app's src/. shadcn components.json + AI-written imports use
        // `@/components/ui/button`, `@/lib/utils`. Resolved relative to THIS
        // config file, which is copied into each ephemeral build dir, so it
        // points at that build's own src/ (not the shared template).
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  },
});
