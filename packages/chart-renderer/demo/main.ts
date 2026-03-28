import { renderRadix } from "../src/core/renderer.js";
import { darkTheme, lightTheme } from "../src/themes/index.js";
import { STELLIUM_CHART } from "../src/test-data/stellium-chart.js";
import type { ChartData } from "@astro-app/shared-types";

const canvas = document.getElementById("chart") as HTMLCanvasElement;

// Cache loaded JSON datasets
const datasetCache: Record<string, ChartData> = {
  stellium: STELLIUM_CHART,
};

async function loadDataset(name: string): Promise<ChartData> {
  if (datasetCache[name]) return datasetCache[name];

  const urls: Record<string, string> = {
    test1: "/test_data.json",
    test2: "/test_data_2.json",
  };

  const resp = await fetch(urls[name]!);
  const data = await resp.json() as ChartData;
  datasetCache[name] = data;
  return data;
}

function getSize(): number {
  return parseInt((document.getElementById("size") as HTMLSelectElement).value);
}

function getTheme() {
  const val = (document.getElementById("theme") as HTMLSelectElement).value;
  return val === "light" ? lightTheme : darkTheme;
}

function getLayer(id: string): boolean {
  return (document.getElementById(id) as HTMLInputElement).checked;
}

async function render() {
  const size = getSize();
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  canvas.width = size;
  canvas.height = size;

  const datasetName = (document.getElementById("dataset") as HTMLSelectElement).value;
  const data = await loadDataset(datasetName);

  renderRadix({
    data,
    theme: getTheme(),
    canvas,
    layers: {
      background: getLayer("bg"),
      zodiacRing: getLayer("zodiac"),
      houseOverlay: getLayer("houses"),
      aspectWeb: getLayer("aspects"),
      planetRing: getLayer("planets"),
      degreeLabels: getLayer("degrees"),
    },
  });
}

// Wire up controls
["bg", "zodiac", "houses", "aspects", "planets", "degrees"].forEach((id) => {
  document.getElementById(id)!.addEventListener("change", render);
});
document.getElementById("theme")!.addEventListener("change", render);
document.getElementById("size")!.addEventListener("change", render);
document.getElementById("dataset")!.addEventListener("change", render);

render();
