import { renderRadix, renderBiwheel } from "../../src/core/renderer.js";
import { renderRadixToSvg } from "../../src/adapters/svg.js";
import { darkTheme, lightTheme } from "../../src/themes/index.js";
import { STELLIUM_CHART } from "../../src/test-data/stellium-chart.js";
import { TRANSIT_CHART, ALL_RETROGRADE_CHART } from "../../src/test-data/transit-chart.js";
import type { ChartData } from "@astro-app/shared-types";

const canvas = document.getElementById("chart-canvas") as HTMLCanvasElement;
const themeSelect = document.getElementById("theme-select") as HTMLSelectElement;
const sizeSlider = document.getElementById("size-slider") as HTMLInputElement;
const sizeValue = document.getElementById("size-value") as HTMLSpanElement;
const chartSelect = document.getElementById("chart-select") as HTMLSelectElement;
const modeSelect = document.getElementById("mode-select") as HTMLSelectElement;
const outerChartSelect = document.getElementById("outer-chart-select") as HTMLSelectElement;
const biwheelRow = document.getElementById("biwheel-row") as HTMLElement;
const exportBtn = document.getElementById("export-svg") as HTMLButtonElement;
const chartInfo = document.getElementById("chart-info") as HTMLElement;

const CHARTS: Record<string, ChartData> = {
  stellium: STELLIUM_CHART,
  transit: TRANSIT_CHART,
  allRetrograde: ALL_RETROGRADE_CHART,
};

function getInnerChart(): ChartData {
  return CHARTS[chartSelect.value] ?? STELLIUM_CHART;
}

function getOuterChart(): ChartData {
  return CHARTS[outerChartSelect.value] ?? TRANSIT_CHART;
}

function getTheme() {
  return themeSelect.value === "light" ? lightTheme : darkTheme;
}

function getLayer(id: string): boolean {
  return (document.getElementById(id) as HTMLInputElement).checked;
}

function render() {
  const size = parseInt(sizeSlider.value, 10);
  sizeValue.textContent = `${size}px`;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  canvas.width = size;
  canvas.height = size;

  const theme = getTheme();
  const innerChart = getInnerChart();
  const mode = modeSelect.value;

  document.body.style.background = theme.background;
  biwheelRow.style.display = mode === "biwheel" ? "" : "none";

  updateChartInfo(innerChart);

  if (mode === "biwheel") {
    renderBiwheel({
      data: innerChart,
      outerData: getOuterChart(),
      theme,
      canvas,
      padding: 24,
    });
  } else {
    renderRadix({
      data: innerChart,
      theme,
      canvas,
      padding: 24,
      layers: {
        background: getLayer("layer-background"),
        zodiacRing: getLayer("layer-zodiac"),
        houseOverlay: getLayer("layer-houses"),
        aspectWeb: getLayer("layer-aspects"),
        planetRing: getLayer("layer-planets"),
        degreeLabels: getLayer("layer-labels"),
      },
    });
  }
}

function updateChartInfo(chart: ChartData) {
  const hs = chart.metadata.house_system;
  const zt = chart.metadata.zodiac_type;
  chartInfo.textContent = `${hs} · ${zt}`;
}


exportBtn.addEventListener("click", () => {
  const size = parseInt(sizeSlider.value, 10);
  const svg = renderRadixToSvg(getInnerChart(), getTheme(), size, size, 24);
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chart-${chartSelect.value}.svg`;
  a.click();
  URL.revokeObjectURL(url);
});

// Wire up all controls
[themeSelect, chartSelect, modeSelect, outerChartSelect].forEach((el) =>
  el.addEventListener("change", render),
);
sizeSlider.addEventListener("input", render);
["layer-background", "layer-zodiac", "layer-houses", "layer-aspects", "layer-planets", "layer-labels"].forEach(
  (id) => document.getElementById(id)!.addEventListener("change", render),
);

render();
