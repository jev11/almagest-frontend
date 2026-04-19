import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { renderRadix, lightTheme } from "@astro-app/chart-renderer";
import { AspectGrid } from "@/components/home/aspect-grid";
import { PdfLightScope } from "@/components/chart/pdf-light-scope";
import type { UnifiedChart } from "./unified-chart";

const WHEEL_PX = 1200;
const GRID_WIDTH_PX = 720;

function renderWheelDataUrl(chart: UnifiedChart): string {
  const canvas = document.createElement("canvas");
  canvas.width = WHEEL_PX;
  canvas.height = WHEEL_PX;
  renderRadix({
    data: chart.chart,
    theme: lightTheme,
    canvas,
    padding: 24,
  });
  return canvas.toDataURL("image/png");
}

async function renderAspectGridDataUrl(chart: UnifiedChart): Promise<string> {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-99999px";
  host.style.top = "0";
  host.style.zIndex = "-1";
  host.style.pointerEvents = "none";
  document.body.appendChild(host);

  const root = createRoot(host);
  try {
    root.render(
      createElement(PdfLightScope, {
        width: GRID_WIDTH_PX,
        children: createElement(AspectGrid, { chartData: chart.chart }),
      }),
    );

    // Wait for React to paint + fonts to load (glyphs).
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const target = host.firstElementChild as HTMLElement | null;
    if (!target) throw new Error("Aspect grid did not render");

    // skipFonts: html-to-image otherwise enumerates every stylesheet to
    // inline @font-face — including the cross-origin Google Fonts sheet,
    // which throws SecurityError. Our glyph fonts (@fontsource/noto-sans-symbols*)
    // are already in document.fonts by the time we get here and render
    // via the page's own font stack during foreignObject rasterization.
    return await toPng(target, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      cacheBust: true,
      skipFonts: true,
    });
  } finally {
    root.unmount();
    host.remove();
  }
}

function formatBirthLine(chart: UnifiedChart): string {
  const dt = new Date(chart.birthDatetime);
  const date = dt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const time = dt.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = [`${date} · ${time}`];
  if (chart.location) {
    parts.push(chart.location);
  } else {
    const lat = chart.latitude.toFixed(2);
    const lon = chart.longitude.toFixed(2);
    parts.push(`${lat}°, ${lon}°`);
  }
  return parts.join("  ·  ");
}

export async function buildChartPdfBlob(chart: UnifiedChart): Promise<Blob> {
  const wheel = renderWheelDataUrl(chart);
  const grid = await renderAspectGridDataUrl(chart);

  const pdf = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
  });

  const pageW = pdf.internal.pageSize.getWidth(); // 210
  const pageH = pdf.internal.pageSize.getHeight(); // 297
  const margin = 15;

  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageW, pageH, "F");

  let y = margin;

  pdf.setTextColor(20, 20, 25);
  pdf.setFontSize(18);
  pdf.text(chart.name, margin, y + 6);
  y += 10;

  pdf.setTextColor(90, 90, 100);
  pdf.setFontSize(10);
  pdf.text(formatBirthLine(chart), margin, y + 4);
  y += 10;

  const wheelSize = 140;
  const wheelX = (pageW - wheelSize) / 2;
  pdf.addImage(wheel, "PNG", wheelX, y, wheelSize, wheelSize);
  y += wheelSize + 10;

  const gridW = pageW - margin * 2;
  // Preserve aspect ratio from the rasterized grid
  const gridProps = pdf.getImageProperties(grid);
  const gridH = (gridProps.height / gridProps.width) * gridW;
  const maxGridH = pageH - margin - y;
  const finalGridH = Math.min(gridH, maxGridH);
  const finalGridW = (gridProps.width / gridProps.height) * finalGridH;
  const gridX = (pageW - finalGridW) / 2;
  pdf.addImage(grid, "PNG", gridX, y, finalGridW, finalGridH);

  return pdf.output("blob");
}
