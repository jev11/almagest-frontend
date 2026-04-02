import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAstroClient } from "./provider.js";
import { chartCache } from "./cache.js";
import type { NatalRequest, TransitRequest } from "./types.js";

/** Deterministic hash of a request for use as a cache key. */
export function hashRequest(req: object): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(req).sort(([a], [b]) => a.localeCompare(b)),
    ),
  );
}

export const chartKeys = {
  natal: (req: NatalRequest) => ["chart", "natal", hashRequest(req)] as const,
  transits: (req: TransitRequest) => ["chart", "transits", hashRequest(req)] as const,
};

/**
 * Query a natal chart. Natal charts are deterministic (same inputs → same outputs),
 * so staleTime is Infinity — the data never goes stale.
 */
export function useNatalChart(request: NatalRequest | null) {
  const client = useAstroClient();

  return useQuery({
    queryKey: request ? chartKeys.natal(request) : ["chart", "natal", null],
    queryFn: async () => {
      if (!request) throw new Error("No request");
      const response = await client.calculateNatal(request);
      return response;
    },
    enabled: request !== null,
    staleTime: Infinity,
  });
}

/** Transit chart query — stale after 5 minutes since sky positions change. */
export function useTransitChart(request: TransitRequest | null) {
  const client = useAstroClient();

  return useQuery({
    queryKey: request ? chartKeys.transits(request) : ["chart", "transits", null],
    queryFn: async () => {
      if (!request) throw new Error("No request");
      const response = await client.calculateTransits(request);
      return response.transit_chart;
    },
    enabled: request !== null,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Mutation for calculating a natal chart and saving it to IndexedDB.
 * Also pre-populates the query cache so useNatalChart() returns immediately.
 */
export function useCalculateChart() {
  const client = useAstroClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      request,
      name,
      location,
    }: {
      request: NatalRequest;
      name: string;
      location?: string;
    }) => {
      const response = await client.calculateNatal(request);
      const id = hashRequest(request);

      const stored = {
        id,
        name,
        chart: response,
        request,
        location,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await chartCache.set(stored);

      // Pre-populate the query cache so the chart view loads instantly
      queryClient.setQueryData(chartKeys.natal(request), response);

      return stored;
    },
  });
}
