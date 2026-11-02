"use client";

import { useState, type FormEvent } from "react";

/**
 * KleapForm — built-in form collection for Astro apps (React island).
 *
 * Submissions go straight to the user's Kleap dashboard with ZERO setup, exactly
 * like the Next.js KleapForm: it POSTs multipart/form-data to https://form.kleap.co
 * with { app_id, form_id, form_name, ...fields }. The endpoint is public + CORS-open
 * and resolves the app from PUBLIC_APP_ID when inlined, otherwise from the request
 * Origin hostname ({slug}.kleap.io or a custom domain) — so a static site on
 * Cloudflare Workers collects submissions without any server code.
 *
 * Self-contained on purpose: plain inputs + Tailwind, no shadcn/react-hook-form/zod
 * imports, so it always builds regardless of which ui primitives an app has.
 *
 * Usage (hydrate with a client directive — it's interactive):
 *   import KleapForm from "@/components/KleapForm";
 *   <KleapForm client:load formId="contact" title="Contact Us" fields={[
 *     { name: "name", label: "Name", type: "text", required: true },
 *     { name: "email", label: "Email", type: "email", required: true },
 *     { name: "message", label: "Message", type: "textarea", required: true },
 *   ]} submitText="Send" successMessage="Thanks — we'll be in touch!" />
 */

export interface KleapFormField {
  name: string;
  label: string;
  type?:
    | "text"
    | "email"
    | "tel"
    | "url"
    | "number"
    | "textarea"
    | "select"
    | "checkbox";
  placeholder?: string;
  required?: boolean;
  // A select option is either a bare string or the standard {value,label} pair.
  // The type used to allow only strings while the model writes the pair — the
  // shape every React/HTML tutorial uses — and the component then rendered the
  // OBJECT as a child: "Objects are not valid as a React child (found: object
  // with keys {value, label})", which fails `astro build` and ships NO site at
  // all. Accepting both is one line here and removes a total build failure.
  options?: (string | { value: string; label: string })[]; // for select
  rows?: number; // for textarea
}

export interface KleapFormProps {
  /** Logical form name shown in the dashboard, e.g. "contact" | "newsletter" | "booking". */
  formId: string;
  title?: string;
  description?: string;
  fields: KleapFormField[];
  submitText?: string;
  successMessage?: string;
  className?: string;
}

/**
 * Textes par défaut dans la langue du SITE (même résolution que KleapAuth :
 * PUBLIC_KLEAP_LANG estampé au build → <html lang> → anglais). Banc qualité
 * KLE-548 : sur des sites français, la relecture visuelle relevait « Select… »
 * et « Sending… » en anglais au milieu d'une page en français.
 */
const FORM_STRINGS: Record<
  string,
  {
    select: string;
    sending: string;
    error: string;
    submit: string;
    success: string;
  }
> = {
  en: {
    select: "Select…",
    sending: "Sending…",
    error: "Something went wrong — please try again.",
    submit: "Submit",
    success: "Thank you! Your submission has been received.",
  },
  fr: {
    select: "Choisir…",
    sending: "Envoi…",
    error: "Une erreur est survenue — merci de réessayer.",
    submit: "Envoyer",
    success: "Merci ! Votre message a bien été reçu.",
  },
  es: {
    select: "Elegir…",
    sending: "Enviando…",
    error: "Algo salió mal — inténtalo de nuevo.",
    submit: "Enviar",
    success: "¡Gracias! Hemos recibido tu mensaje.",
  },
  de: {
    select: "Auswählen…",
    sending: "Wird gesendet…",
    error: "Etwas ist schiefgelaufen — bitte erneut versuchen.",
    submit: "Senden",
    success: "Danke! Ihre Nachricht ist eingegangen.",
  },
  it: {
    select: "Scegli…",
    sending: "Invio…",
    error: "Qualcosa è andato storto — riprova.",
    submit: "Invia",
    success: "Grazie! Abbiamo ricevuto il tuo messaggio.",
  },
  pt: {
    select: "Escolher…",
    sending: "Enviando…",
    error: "Algo deu errado — tente novamente.",
    submit: "Enviar",
    success: "Obrigado! Recebemos a sua mensagem.",
  },
  nl: {
    select: "Kiezen…",
    sending: "Verzenden…",
    error: "Er ging iets mis — probeer het opnieuw.",
    submit: "Verzenden",
    success: "Bedankt! We hebben je bericht ontvangen.",
  },
};

function resolveFormLang(): string {
  let raw = "";
  try {
    raw = (
      ((import.meta as any).env?.PUBLIC_KLEAP_LANG as string) || ""
    ).trim();
  } catch {
    /* import.meta.env indisponible */
  }
  if (!raw && typeof document !== "undefined") {
    raw = (document.documentElement.getAttribute("lang") || "").trim();
  }
  const code = raw.toLowerCase().split("-")[0];
  return Object.prototype.hasOwnProperty.call(FORM_STRINGS, code) ? code : "en";
}

const FORMS_ENDPOINT =
  // PUBLIC_FORMS_API_URL lets self-hosted/staging override; defaults to prod.
  (import.meta as any).env?.PUBLIC_FORMS_API_URL || "https://form.kleap.co";

function resolveAppId(): string {
  // 1) Inlined at build (PUBLIC_* — only inside Vite-processed islands).
  const fromEnv = (import.meta as any).env?.PUBLIC_APP_ID;
  if (fromEnv) return String(fromEnv);
  if (typeof window !== "undefined") {
    // 2) window._kleap.id — injected on EVERY deployed Kleap page by /_kleap.js.
    //    The reliable post-deploy source: works even in plain public assets (no
    //    import.meta.env there) and on {slug}.kleap.io (Origin isn't a custom
    //    domain the form endpoint can resolve).
    const fromKleap = (window as any)._kleap?.id;
    if (fromKleap) return String(fromKleap);
    // 3) ?app_id= on the URL (used by the live preview).
    const fromUrl = new URLSearchParams(window.location.search).get("app_id");
    if (fromUrl) return fromUrl;
  }
  // 4) Empty → the server resolves the app from the Origin hostname (custom domains).
  return "";
}

export default function KleapForm({
  formId,
  title,
  description,
  fields = [],
  submitText,
  successMessage,
  className = "",
}: KleapFormProps) {
  const [lang] = useState(resolveFormLang);
  const t = FORM_STRINGS[lang] || FORM_STRINGS.en;
  const submitLabel = submitText || t.submit;
  const successLabel = successMessage || t.success;
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">(
    "idle",
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;

    const formEl = e.currentTarget;
    // Honeypot: bots fill hidden fields. Silently "succeed" without submitting.
    const trap = (formEl.elements.namedItem("_kleap_hp") as HTMLInputElement)
      ?.value;
    if (trap) {
      setStatus("ok");
      return;
    }

    setStatus("sending");
    try {
      const body = new FormData();
      body.append("app_id", resolveAppId());
      body.append("form_id", formId);
      body.append("form_name", title || formId);
      for (const [k, v] of new FormData(formEl).entries()) {
        if (k === "_kleap_hp") continue;
        // A File must be passed through as a File. `String(file)` yields the
        // literal "[object File]", so the attachment was destroyed in the
        // browser and the site owner saw that string where a CV should be —
        // with no error anywhere. FormData carries File natively; the server
        // decides what it can store.
        body.append(k, v);
      }
      const res = await fetch(FORMS_ENDPOINT, { method: "POST", body });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus("ok");
      formEl.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "ok") {
    return (
      <div
        className={`rounded-xl border border-green-200 bg-green-50 p-6 text-green-800 ${className}`}
      >
        <p className="font-medium">{successLabel}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`flex max-w-md flex-col gap-4 ${className}`}
    >
      {title && <h3 className="text-xl font-semibold">{title}</h3>}
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      {(Array.isArray(fields) ? fields : []).map((f) => {
        const id = `kf_${formId}_${f.name}`;
        const base =
          "rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary";
        return (
          <div key={f.name} className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-sm font-medium">
              {f.label}
              {f.required && <span className="text-red-500"> *</span>}
            </label>
            {f.type === "textarea" ? (
              <textarea
                id={id}
                name={f.name}
                required={f.required}
                rows={f.rows ?? 4}
                placeholder={f.placeholder}
                className={base}
              />
            ) : f.type === "select" ? (
              <select
                id={id}
                name={f.name}
                required={f.required}
                className={base}
              >
                <option value="">{f.placeholder || t.select}</option>
                {(f.options ?? []).map((o) => {
                  const value = typeof o === "string" ? o : o.value;
                  const label = typeof o === "string" ? o : o.label;
                  return (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  );
                })}
              </select>
            ) : f.type === "checkbox" ? (
              <input
                id={id}
                name={f.name}
                type="checkbox"
                required={f.required}
                className="h-4 w-4"
              />
            ) : (
              <input
                id={id}
                name={f.name}
                type={f.type || "text"}
                required={f.required}
                placeholder={f.placeholder}
                className={base}
              />
            )}
          </div>
        );
      })}

      {/* Honeypot — hidden from humans, catches bots. */}
      <input
        type="text"
        name="_kleap_hp"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50"
      >
        {status === "sending" ? t.sending : submitLabel}
      </button>

      {status === "error" && <p className="text-sm text-red-600">{t.error}</p>}
    </form>
  );
}
