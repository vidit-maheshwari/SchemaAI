"use client";

export async function validateSupabaseAccessToken(
  accessToken: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch("https://api.supabase.com/v1/projects", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        error:
          text || `Supabase API request failed (${res.status} ${res.statusText})`,
      };
    }

    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: "Supabase request timed out" };
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timeoutId);
  }
}
