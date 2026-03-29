import type { ChartData } from "@astro-app/shared-types";

export type SnapListener = (data: ChartData) => void;

/**
 * Snap-to-server coordinator.
 *
 * The home screen and transits page render approximate data immediately
 * from approx-engine, then call snap() when the server responds with
 * precise data. Listeners are notified whenever better data arrives.
 */
export class SnapController {
  private current: ChartData;
  private listeners = new Set<SnapListener>();

  constructor(initialData: ChartData) {
    this.current = initialData;
  }

  getData(): ChartData {
    return this.current;
  }

  /** Replace current data with more precise server data and notify listeners. */
  snap(preciseData: ChartData): void {
    this.current = preciseData;
    for (const listener of this.listeners) {
      listener(preciseData);
    }
  }

  subscribe(listener: SnapListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export function createSnapController(approximateData: ChartData): SnapController {
  return new SnapController(approximateData);
}
