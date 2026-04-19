import JSZip from "jszip";
import { renderRadix, darkTheme } from "@astro-app/chart-renderer";
import type { UnifiedChart } from "./unified-chart";

export function safeFilename(name: string): string {
  return name.replace(/[\/\\:*?"<>|]/g, "_").trim().slice(0, 80) || "chart";
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportChartsJSON(charts: UnifiedChart[]): Promise<void> {
  if (charts.length === 0) return;
  if (charts.length === 1) {
    const c = charts[0]!;
    const blob = new Blob([JSON.stringify(c, null, 2)], {
      type: "application/json",
    });
    triggerDownload(blob, `${safeFilename(c.name)}.json`);
    return;
  }
  const zip = new JSZip();
  const seen = new Map<string, number>();
  for (const c of charts) {
    const base = safeFilename(c.name);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    const fname = n === 1 ? `${base}.json` : `${base}-${n}.json`;
    zip.file(fname, JSON.stringify(c, null, 2));
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `charts-${date}.zip`);
}

async function renderChartToPngBlob(chart: UnifiedChart): Promise<Blob> {
  // Off-DOM canvas: renderRadix uses canvas.clientWidth/Height when set,
  // otherwise falls back to canvas.width/height — so setting width/height
  // is sufficient without appending to the document.
  const size = 800;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  renderRadix({
    data: chart.chart,
    theme: darkTheme,
    canvas,
    padding: 20,
  });
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Failed to encode PNG")),
      "image/png",
    );
  });
}

export async function exportChartsPNG(charts: UnifiedChart[]): Promise<void> {
  if (charts.length === 0) return;

  if (charts.length === 1) {
    const c = charts[0]!;
    const blob = await renderChartToPngBlob(c);
    triggerDownload(blob, `${safeFilename(c.name)}.png`);
    return;
  }

  const zip = new JSZip();
  const seen = new Map<string, number>();
  for (const c of charts) {
    const base = safeFilename(c.name);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    const fname = n === 1 ? `${base}.png` : `${base}-${n}.png`;
    const blob = await renderChartToPngBlob(c);
    zip.file(fname, blob);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `charts-${date}.zip`);
}
