"use client";
import { components } from "@/lib/tambo";
import { TamboProvider } from "@tambo-ai/react";
import { TamboMcpProvider } from "@tambo-ai/react/mcp";
import { Geist, Geist_Mono } from "next/font/google";
import { usePathname } from "next/navigation";
import "./globals.css";
import { AuthProvider, useAuth } from "@/lib/supabase/auth-provider";
import { useSupabaseMcpConnection } from "@/lib/supabase/use-mcp-token";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <AppProviders>{children}</AppProviders>
        </AuthProvider>
      </body>
    </html>
  );
}

function AppProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { token } = useSupabaseMcpConnection(user?.id);
  const isDashboard = pathname.startsWith("/dashboard");

  if (!isDashboard || !user || !token) {
    return children;
  }

  const serverPort = process.env.NEXT_PUBLIC_SERVER_PORT;
  const mcpUrl = `http://localhost:${serverPort}/sse?supabase_access_token=${encodeURIComponent(token)}`;

  return (
    <TamboProvider apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY!} components={components}>
      <TamboMcpProvider mcpServers={[mcpUrl]}>{children}</TamboMcpProvider>
    </TamboProvider>
  );
}
