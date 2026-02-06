"use client";

export async function validateSupabaseAccessToken(
  accessToken: string,
): Promise<
  | { ok: true }
  | { ok: false; error: string; isAuthError: boolean }
> {
  const serverPort = process.env.NEXT_PUBLIC_SERVER_PORT;
  if (!serverPort) {
    return {
      ok: false,
      error: "Missing NEXT_PUBLIC_SERVER_PORT",
      isAuthError: false,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const validateUrl = `http://localhost:${serverPort}/validate?supabase_access_token=${encodeURIComponent(accessToken)}`;
    const res = await fetch(validateUrl, {
      method: "GET",
      signal: controller.signal,
    });

    if (!res.ok) {
      const isAuthError = res.status === 401 || res.status === 403;
      return {
        ok: false,
        isAuthError,
        error: isAuthError
          ? "Supabase rejected this token. Please double-check it."
          : `Token validation failed (${res.status} ${res.statusText}). Please try again.`,
      };
    }

    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        ok: false,
        error: "Token validation timed out. Please try again.",
        isAuthError: false,
      };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      isAuthError: false,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
