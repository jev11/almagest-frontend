import type { CSSProperties, ReactNode, JSX } from "react";

// Locks every CSS variable the app theme reads to a light-mode value,
// so an offscreen snapshot is white-background regardless of the app's
// current theme. Kept as inline styles (not a class) so the override wins
// over any ancestor `.dark` class without modifying globals.
const LIGHT_VARS: CSSProperties & Record<string, string> = {
  "--background": "oklch(99% 0.002 260)",
  "--foreground": "oklch(18% 0.005 260)",
  "--bg-elev": "oklch(97% 0.003 260)",
  "--card": "oklch(100% 0 0)",
  "--card-foreground": "oklch(18% 0.005 260)",
  "--card-hover": "oklch(98% 0.002 260)",
  "--popover": "oklch(100% 0 0)",
  "--popover-foreground": "oklch(18% 0.005 260)",
  "--primary": "oklch(52% 0.17 275)",
  "--primary-foreground": "oklch(100% 0 0)",
  "--secondary": "oklch(97% 0.003 260)",
  "--secondary-foreground": "oklch(18% 0.005 260)",
  "--muted": "oklch(97% 0.003 260)",
  "--muted-foreground": "oklch(42% 0.006 260)",
  "--accent": "oklch(97% 0.003 260)",
  "--accent-foreground": "oklch(18% 0.005 260)",
  "--destructive": "oklch(55% 0.2 25)",
  "--border": "oklch(86% 0.006 260)",
  "--border-strong": "oklch(72% 0.008 260)",
  "--input": "oklch(97% 0.003 260)",
  "--ring": "oklch(52% 0.17 275)",
  "--primary-hover": "oklch(62% 0.17 275)",
  "--dim-foreground": "oklch(58% 0.006 260)",
  "--faint-foreground": "oklch(72% 0.005 260)",
  "--border-hover": "oklch(72% 0.008 260)",
  "--color-fire": "oklch(55% 0.15 30)",
  "--color-earth": "oklch(52% 0.11 140)",
  "--color-air": "oklch(62% 0.12 85)",
  "--color-water": "oklch(55% 0.13 235)",
  "--aspect-harm": "oklch(55% 0.12 220)",
  "--aspect-hard": "oklch(55% 0.15 25)",
  "--aspect-conj": "oklch(50% 0.006 260)",
  "--aspect-conjunction": "oklch(50% 0.006 260)",
  "--aspect-sextile": "oklch(55% 0.12 220)",
  "--aspect-trine": "oklch(55% 0.12 220)",
  "--aspect-square": "oklch(55% 0.15 25)",
  "--aspect-opposition": "oklch(55% 0.15 25)",
  "--aspect-quincunx": "oklch(55% 0.11 300)",
  "--accent-soft": "oklch(52% 0.17 275 / 0.10)",
  colorScheme: "light",
  background: "#ffffff",
  color: "oklch(18% 0.005 260)",
  fontFamily:
    "'Inter', 'DM Sans', 'Noto Sans Symbols 2', 'Noto Sans Symbols', system-ui, -apple-system, sans-serif",
};

interface Props {
  children: ReactNode;
  width?: number;
}

export function PdfLightScope({ children, width = 720 }: Props): JSX.Element {
  return (
    <div style={{ ...LIGHT_VARS, width, padding: 16 }}>
      {children}
    </div>
  );
}
