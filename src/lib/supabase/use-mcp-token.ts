"use client";

import { useEffect, useState } from "react";
import {
  getSupabaseMcpProjectUrl,
  getSupabaseMcpToken,
  subscribeToSupabaseMcpTokenChanges,
} from "@/lib/supabase/mcp-token";

export function useSupabaseMcpConnection(userId: string | undefined) {
  const [, setNonce] = useState(0);

  useEffect(() => {
    if (!userId) return;

    return subscribeToSupabaseMcpTokenChanges(() => {
      setNonce((n) => n + 1);
    });
  }, [userId]);

  if (!userId) {
    return {
      projectUrl: null,
      token: null,
    };
  }

  return {
    projectUrl: getSupabaseMcpProjectUrl(userId),
    token: getSupabaseMcpToken(userId),
  };
}
