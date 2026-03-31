import { createContext, useContext, useMemo } from "react";
import { AstroClient } from "./client.js";
import type { TokenPair } from "./auth.js";

const AstroClientContext = createContext<AstroClient | null>(null);

interface AstroClientProviderProps {
  baseUrl: string;
  timeoutMs?: number;
  onTokenRefreshed?: (tokens: TokenPair) => void;
  onAuthExpired?: () => void;
  children: React.ReactNode;
}

export function AstroClientProvider({
  baseUrl,
  timeoutMs,
  onTokenRefreshed,
  onAuthExpired,
  children,
}: AstroClientProviderProps) {
  const client = useMemo(
    () => new AstroClient({ baseUrl, timeoutMs, onTokenRefreshed, onAuthExpired }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseUrl, timeoutMs],
  );

  return (
    <AstroClientContext.Provider value={client}>
      {children}
    </AstroClientContext.Provider>
  );
}

export function useAstroClient(): AstroClient {
  const client = useContext(AstroClientContext);
  if (!client) {
    throw new Error("useAstroClient must be used within AstroClientProvider");
  }
  return client;
}
