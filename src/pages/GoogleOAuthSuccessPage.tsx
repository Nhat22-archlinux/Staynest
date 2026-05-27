import { useEffect, useState } from "react";
import type { AuthUser, Language } from "../types";
import { fetchMe } from "../utils/api";
import { text } from "../utils/i18n";

type GoogleOAuthSuccessPageProps = {
  language: Language;
  onAuthed: (user: AuthUser, token: string) => void;
  onFailure: () => void;
};

export function GoogleOAuthSuccessPage({ language, onAuthed, onFailure }: GoogleOAuthSuccessPageProps) {
  const t = text[language];
  const [message, setMessage] = useState(t.googleSigningIn);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");

    if (!token) {
      setMessage(t.googleAuthError);
      onFailure();
      return;
    }

    if (import.meta.env.DEV) {
      console.info("[StayNest] Google OAuth token received. Loading user profile.");
    }

    fetchMe(token)
      .then((user) => {
        onAuthed(user, token);
      })
      .catch(() => {
        setMessage(t.googleAuthError);
        onFailure();
      });
  }, [onAuthed, onFailure, t.googleAuthError, t.googleSigningIn]);

  return (
    <main className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center px-4 py-10 sm:px-6 lg:px-8">
      <section className="w-full rounded-lg border border-black/10 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-ocean">Google</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">{message}</h1>
      </section>
    </main>
  );
}
