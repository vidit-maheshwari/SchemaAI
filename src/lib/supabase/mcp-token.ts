const TOKEN_STORAGE_PREFIX = "supabase_mcp_token:";
const PROJECT_URL_STORAGE_PREFIX = "supabase_mcp_project_url:";
const TOKEN_CHANGE_EVENT = "supabase_mcp_token_changed";

function getTokenKey(userId: string): string {
  return `${TOKEN_STORAGE_PREFIX}${userId}`;
}

function getProjectUrlKey(userId: string): string {
  return `${PROJECT_URL_STORAGE_PREFIX}${userId}`;
}

export function getSupabaseMcpToken(userId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(getTokenKey(userId));
}

export function setSupabaseMcpToken(userId: string, token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getTokenKey(userId), token);
  window.dispatchEvent(new Event(TOKEN_CHANGE_EVENT));
}

export function clearSupabaseMcpToken(userId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(getTokenKey(userId));
  window.localStorage.removeItem(getProjectUrlKey(userId));
  window.dispatchEvent(new Event(TOKEN_CHANGE_EVENT));
}

export function getSupabaseMcpProjectUrl(userId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(getProjectUrlKey(userId));
}

export function setSupabaseMcpProjectUrl(userId: string, projectUrl: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getProjectUrlKey(userId), projectUrl);
}

export function subscribeToSupabaseMcpTokenChanges(
  callback: () => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event: StorageEvent) => {
    if (!event.key) return;
    if (
      !event.key.startsWith(TOKEN_STORAGE_PREFIX) &&
      !event.key.startsWith(PROJECT_URL_STORAGE_PREFIX)
    ) {
      return;
    }
    callback();
  };

  window.addEventListener(TOKEN_CHANGE_EVENT, callback);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(TOKEN_CHANGE_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}
