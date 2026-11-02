/**
 * Kleap Database — the app's built-in database + user accounts.
 *
 * This is the ONLY way the app talks to its data and its users. It is wired up
 * automatically: the URLs come from build-time env (PUBLIC_NEON_*). You never
 * configure anything. (Under the hood it's Postgres + row-level security; the
 * end-user only ever sees "sign in / sign up" and their own data.)
 *
 * USAGE (in a React island — client:load / client:only):
 *
 *   import { getKleapDb } from "@/lib/kleap-db";
 *   const db = getKleapDb();
 *   // read the signed-in user's rows (RLS scopes automatically):
 *   const { data, error } = await db.from("bookings").select("*");
 *   // insert (user_id is filled by the DB default auth.user_id()):
 *   await db.from("bookings").insert({ date, guests });
 *
 * AUTH lives in @/components/auth/KleapAuth (SignIn, SignUp, UserButton,
 * useKleapUser, AuthGate). Don't hand-roll auth — use those.
 *
 * ⚠️ Browser-only. getKleapDb() returns null during SSR / when the database
 * isn't enabled, so guard for null. Auth/session need browser storage.
 *
 * 🖥️ SERVER CODE MUST NOT USE THIS FILE. Inside `src/pages/api/*.ts` (a
 * Cloudflare Worker) there is no `window`, so getKleapDb() returns null on
 * EVERY call, forever — not just in preview. A guard like `if (!db) return`
 * there silently turns each write into a success that stored nothing, which is
 * invisible to the user AND still looks correct on re-read. Use the server
 * helper instead:
 *
 *   import { kleapSql } from "@/lib/kleap-db-server";
 *   const { rows } = await kleapSql("SELECT * FROM orders WHERE id = $1", [id]);
 *
 * It throws on failure, so a broken write is loud. Never hand-roll a wrapper
 * around getKleapDb() for the server.
 */
import { createClient } from "@neondatabase/neon-js";
import { BetterAuthReactAdapter } from "@neondatabase/neon-js/auth/react/adapters";

const AUTH_URL = import.meta.env.PUBLIC_NEON_AUTH_URL as string | undefined;
const DATA_API_URL = import.meta.env.PUBLIC_NEON_DATA_API_URL as
  | string
  | undefined;

/** True when the database is provisioned for this app. */
export const isKleapDbReady = Boolean(AUTH_URL && DATA_API_URL);

type KleapDbClient = ReturnType<typeof createClient>;
let _client: KleapDbClient | null = null;

/**
 * Get the singleton Kleap Database client. Returns null on the server or when
 * the DB isn't enabled — always guard:  `const db = getKleapDb(); if (!db) ...`
 */
export function getKleapDb(): KleapDbClient | null {
  if (typeof window === "undefined") return null; // never during SSR
  if (!isKleapDbReady) return null;
  if (!_client) {
    _client = createClient({
      auth: {
        url: AUTH_URL!,
        adapter: BetterAuthReactAdapter(),
        // Unauthenticated visitors get an anonymous token so PUBLIC data
        // (e.g. listings) can render before sign-in. RLS still governs every
        // row — anonymous only sees tables that explicitly grant it.
        allowAnonymous: true,
      },
      dataApi: { url: DATA_API_URL! },
    });
  }
  return _client;
}
