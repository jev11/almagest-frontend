import { useEffect, useRef, useMemo, useState } from "react";
import type { ChartData } from "@astro-app/shared-types";
import {
  renderRadix,
  renderBiwheel,
  darkTheme,
  lightTheme,
  type ChartTheme,
  type ChartDensity,
  type ChartInfo,
  type RenderOptions,
} from "@astro-app/chart-renderer";
import { cn } from "@/lib/utils";
import { filterNodeType } from "@/lib/format";
import { useSettings } from "@/hooks/use-settings";
import { useBreakpoint } from "@/hooks/use-breakpoint";

function readCardBg(): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue("--card")
    .trim();
}

/**
 * Read the chart-density CSS variables off a container's computed style.
 * These are defined per semantic breakpoint in `apps/web/src/index.css`
 * (phone → wide). Falls back to the renderer's defaults if a var is missing
 * or unparsable.
 */
function readChartDensity(el: HTMLElement): ChartDensity {
  const s = getComputedStyle(el);
  const stroke = parseFloat(s.getPropertyValue("--chart-stroke"));
  const glyphScale = parseFloat(s.getPropertyValue("--chart-glyph-scale"));
  const labelSize = parseFloat(s.getPropertyValue("--chart-label-size"));
  return {
    stroke: Number.isFinite(stroke) && stroke > 0 ? stroke : 1,
    glyphScale: Number.isFinite(glyphScale) && glyphScale > 0 ? glyphScale : 1,
    labelSize: Number.isFinite(labelSize) && labelSize > 0 ? labelSize : 12,
  };
}

interface ChartCanvasProps {
  data: ChartData;
  outerData?: ChartData;
  theme?: ChartTheme;
  className?: string;
  layers?: RenderOptions["layers"];
  padding?: number;
  chartInfo?: ChartInfo;
  /** Override global node type setting for this chart */
  nodeType?: "mean" | "true";
}

export function ChartCanvas({
  data,
  outerData,
  theme,
  className,
  layers,
  padding = 20,
  chartInfo,
  nodeType: nodeTypeProp,
}: ChartCanvasProps) {
  const appTheme = useSettings((s) => s.appearance.theme);
  const globalNodeType = useSettings((s) => s.defaults.nodeType);
  const nodeType = nodeTypeProp ?? globalNodeType;
  // Re-run the render effect whenever the semantic tier changes so the
  // canvas picks up the new --chart-* CSS vars even if the container size
  // didn't change (the ResizeObserver fires on most tier transitions but
  // a density-only user-preference shift still needs an explicit trigger).
  const { tier } = useBreakpoint();
  const filteredData = useMemo(() => filterNodeType(data, nodeType), [data, nodeType]);
  const filteredOuterData = useMemo(
    () => outerData ? filterNodeType(outerData, nodeType) : undefined,
    [outerData, nodeType],
  );
  const baseTheme = theme ?? (() => {
    if (appTheme === "light") return lightTheme;
    if (appTheme === "dark") return darkTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? darkTheme : lightTheme;
  })();
  const [cardBg, setCardBg] = useState<string>(() =>
    typeof window === "undefined" ? "" : readCardBg(),
  );
  useEffect(() => {
    setCardBg(readCardBg());
    const observer = new MutationObserver(() => setCardBg(readCardBg()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);
  const resolvedTheme = useMemo<ChartTheme>(
    () => (cardBg ? { ...baseTheme, background: cardBg } : baseTheme),
    [baseTheme, cardBg],
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const render = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width === 0 || height === 0) return;

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Read density fresh on every render so breakpoint transitions (and any
      // future user-preference density toggle) land on the canvas immediately.
      const density = readChartDensity(container);

      if (filteredOuterData) {
        renderBiwheel({ data: filteredData, outerData: filteredOuterData, theme: resolvedTheme, canvas, layers, padding, chartInfo, density });
      } else {
        renderRadix({ data: filteredData, theme: resolvedTheme, canvas, layers, padding, chartInfo, density });
      }
    };

    render();

    const observer = new ResizeObserver(render);
    observer.observe(container);

    return () => observer.disconnect();
  }, [filteredData, filteredOuterData, resolvedTheme, layers, padding, chartInfo, tier]);

  return (
    <div ref={containerRef} className={cn("w-full h-full", className)}>
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
