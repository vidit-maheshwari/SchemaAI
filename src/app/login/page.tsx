"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/supabase/auth-provider";

export default function LoginPage() {
  const router = useRouter();
  const { loading, user, signIn, signUp } = useAuth();

  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) return;

    setSubmitting(true);
    setError(null);

    try {
      if (mode === "sign-in") {
        await signIn(normalizedEmail, password);
        return;
      }

      await signUp(normalizedEmail, password);

      // If email confirmations are enabled on the Supabase project, this may fail.
      try {
        await signIn(normalizedEmail, password);
      } catch {
        setError(
          "Sign-up successful. Check your email to confirm your account, then sign in.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-yellow-50 flex items-center justify-center px-4">
      <div className="nb-card nb-shadow-lg w-full max-w-md bg-white p-6">
        <h1 className="text-2xl font-black text-black">
          {mode === "sign-in" ? "Sign in" : "Create an account"}
        </h1>
        <p className="mt-2 text-sm font-mono text-gray-800">
          Authenticate with Supabase to use MCP features.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-black">Email</label>
            <input
              className="nb-input mt-2 w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              disabled={submitting}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-black">
              Password
            </label>
            <input
              className="nb-input mt-2 w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              disabled={submitting}
              required
            />
          </div>

          {error ? (
            <div className="nb-card bg-red-50 px-4 py-3">
              <div className="text-sm font-mono text-red-800">{error}</div>
            </div>
          ) : null}

          <button
            type="submit"
            className="nb-btn bg-indigo-300 hover:bg-indigo-400 w-full"
            disabled={submitting}
          >
            {submitting
              ? mode === "sign-in"
                ? "Signing in..."
                : "Creating account..."
              : mode === "sign-in"
                ? "Sign in"
                : "Sign up"}
          </button>
        </form>

        <div className="mt-4 text-sm font-mono text-gray-800">
          {mode === "sign-in" ? (
            <button
              type="button"
              className="underline"
              onClick={() => setMode("sign-up")}
              disabled={submitting}
            >
              Need an account? Sign up
            </button>
          ) : (
            <button
              type="button"
              className="underline"
              onClick={() => setMode("sign-in")}
              disabled={submitting}
            >
              Have an account? Sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
