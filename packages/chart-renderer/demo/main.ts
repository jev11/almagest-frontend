import { renderRadix } from "../src/core/renderer.js";
import { darkTheme, lightTheme } from "../src/themes/index.js";
import { STELLIUM_CHART } from "../src/test-data/stellium-chart.js";

const canvas = document.getElementById("chart") as HTMLCanvasElement;

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

function render() {
  const size = getSize();
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  canvas.width = size;
  canvas.height = size;

  renderRadix({
    data: STELLIUM_CHART,
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

render();
