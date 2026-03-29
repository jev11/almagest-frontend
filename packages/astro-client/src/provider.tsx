import { createContext, useContext, useMemo } from "react";
import { AstroClient } from "./client.js";

const AstroClientContext = createContext<AstroClient | null>(null);

interface AstroClientProviderProps {
  baseUrl: string;
  timeoutMs?: number;
  children: React.ReactNode;
}

export function AstroClientProvider({
  baseUrl,
  timeoutMs,
  children,
}: AstroClientProviderProps) {
  const client = useMemo(
    () => new AstroClient({ baseUrl, timeoutMs }),
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
