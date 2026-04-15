import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { HouseSystem, ZodiacType } from "@astro-app/shared-types";
import { useSettings, type SettingsStore } from "@/hooks/use-settings";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

const HOUSE_SYSTEMS: { value: HouseSystem; label: string }[] = [
  { value: HouseSystem.Placidus, label: "Placidus" },
  { value: HouseSystem.Koch, label: "Koch" },
  { value: HouseSystem.WholeSign, label: "Whole Sign" },
  { value: HouseSystem.Equal, label: "Equal" },
  { value: HouseSystem.Campanus, label: "Campanus" },
  { value: HouseSystem.Regiomontanus, label: "Regiomontanus" },
  { value: HouseSystem.Porphyry, label: "Porphyry" },
  { value: HouseSystem.Morinus, label: "Morinus" },
  { value: HouseSystem.Alcabitius, label: "Alcabitius" },
  { value: HouseSystem.Topocentric, label: "Topocentric" },
];

const DEFAULT_ORBS: Record<string, number> = {
  conjunction: 8,
  opposition: 8,
  trine: 8,
  square: 8,
  sextile: 4,
  semi_square: 2,
  sesquiquadrate: 2,
  semi_sextile: 2,
  quincunx: 2,
};

const ASPECT_ORB_LABELS: Record<string, string> = {
  conjunction: "Conjunction",
  opposition: "Opposition",
  trine: "Trine",
  square: "Square",
  sextile: "Sextile",
  semi_square: "Semi-square",
  sesquiquadrate: "Sesquiquadrate",
  semi_sextile: "Semi-sextile",
  quincunx: "Quincunx",
};

const selectClass =
  "w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring transition-colors appearance-none cursor-pointer";

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 flex flex-col gap-4">
      <h2 className="text-card-foreground font-semibold text-lg">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-muted-foreground font-medium">{label}</label>
      {children}
    </div>
  );
}

function SelectWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">▼</div>
    </div>
  );
}

interface DraftSettings {
  defaults: { houseSystem: string; zodiacType: string; nodeType: "mean" | "true" };
  appearance: { theme: "dark" | "light" | "system"; chartStyle: "modern" | "classic"; timeFormat: "12h" | "24h" };
  aspects: { showMinor: boolean; orbs: Record<string, number> };
}

function snapshotSettings(settings: SettingsStore): DraftSettings {
  return {
    defaults: { houseSystem: settings.defaults.houseSystem, zodiacType: settings.defaults.zodiacType, nodeType: settings.defaults.nodeType },
    appearance: { theme: settings.appearance.theme, chartStyle: settings.appearance.chartStyle, timeFormat: settings.appearance.timeFormat },
    aspects: { showMinor: settings.aspects.showMinor, orbs: { ...settings.aspects.orbs } },
  };
}

function draftsEqual(a: DraftSettings, b: DraftSettings): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function SettingsPage() {
  const settings = useSettings();
  const [draft, setDraft] = useState<DraftSettings>(() => snapshotSettings(settings));

  const isDirty = !draftsEqual(draft, snapshotSettings(settings));

  // Sync theme to document (uses persisted settings, not draft)
  useEffect(() => {
    const { theme } = settings.appearance;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else if (theme === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
      root.classList.toggle("light", !prefersDark);
    }
  }, [settings.appearance.theme]);

  const handleSave = useCallback(() => {
    settings.setDefaults(draft.defaults);
    settings.setTheme(draft.appearance.theme);
    settings.setChartStyle(draft.appearance.chartStyle);
    settings.setTimeFormat(draft.appearance.timeFormat);
    if (draft.aspects.showMinor !== settings.aspects.showMinor) {
      settings.toggleMinorAspects();
    }
    for (const [aspect, orb] of Object.entries(draft.aspects.orbs)) {
      settings.setAspectOrb(aspect, orb);
    }
    toast.success("Settings saved");
  }, [draft, settings]);

  const handleCancel = useCallback(() => {
    setDraft(snapshotSettings(settings));
  }, [settings]);

  const handleReset = useCallback(() => {
    settings.resetAll();
    // resetAll is synchronous in Zustand, but we need the next render's values.
    // Use the known defaults directly.
    setDraft({
      defaults: { houseSystem: "placidus", zodiacType: "tropical", nodeType: "mean" },
      appearance: { theme: "dark", chartStyle: "modern", timeFormat: "24h" },
      aspects: {
        showMinor: false,
        orbs: { ...DEFAULT_ORBS },
      },
    });
    toast.success("Settings reset to defaults");
  }, [settings]);

  return (
    <div className="py-8 px-6 md:px-12 overflow-y-auto">
      <div className="max-w-[640px]">
        <h1 className="text-2xl font-semibold text-foreground mb-6">Settings</h1>

        <div className="flex flex-col gap-6">
          {/* Preferences */}
          <SectionCard title="Preferences">
            <Field label="House System">
              <SelectWrapper>
                <select
                  value={draft.defaults.houseSystem}
                  onChange={(e) => setDraft((d) => ({ ...d, defaults: { ...d.defaults, houseSystem: e.target.value } }))}
                  className={selectClass}
                >
                  {HOUSE_SYSTEMS.map((h) => (
                    <option key={h.value} value={h.value}>{h.label}</option>
                  ))}
                </select>
              </SelectWrapper>
            </Field>
            <Field label="Zodiac Type">
              <SelectWrapper>
                <select
                  value={draft.defaults.zodiacType}
                  onChange={(e) => setDraft((d) => ({ ...d, defaults: { ...d.defaults, zodiacType: e.target.value } }))}
                  className={selectClass}
                >
                  <option value={ZodiacType.Tropical}>Tropical</option>
                  <option value={ZodiacType.Sidereal}>Sidereal</option>
                </select>
              </SelectWrapper>
            </Field>
            <Field label="Lunar Node">
              <SelectWrapper>
                <select
                  value={draft.defaults.nodeType}
                  onChange={(e) => setDraft((d) => ({ ...d, defaults: { ...d.defaults, nodeType: e.target.value as "mean" | "true" } }))}
                  className={selectClass}
                >
                  <option value="mean">Mean Node</option>
                  <option value="true">True Node</option>
                </select>
              </SelectWrapper>
            </Field>
          </SectionCard>

          {/* Appearance */}
          <SectionCard title="Appearance">
            <Field label="Theme">
              <SelectWrapper>
                <select
                  value={draft.appearance.theme}
                  onChange={(e) => setDraft((d) => ({ ...d, appearance: { ...d.appearance, theme: e.target.value as "dark" | "light" | "system" } }))}
                  className={selectClass}
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">System</option>
                </select>
              </SelectWrapper>
            </Field>
            <Field label="Time Format">
              <SelectWrapper>
                <select
                  value={draft.appearance.timeFormat}
                  onChange={(e) => setDraft((d) => ({ ...d, appearance: { ...d.appearance, timeFormat: e.target.value as "12h" | "24h" } }))}
                  className={selectClass}
                >
                  <option value="24h">24-hour</option>
                  <option value="12h">12-hour</option>
                </select>
              </SelectWrapper>
            </Field>
            <Field label="Chart Style">
              <SelectWrapper>
                <select
                  value={draft.appearance.chartStyle}
                  onChange={(e) => setDraft((d) => ({ ...d, appearance: { ...d.appearance, chartStyle: e.target.value as "modern" | "classic" } }))}
                  className={selectClass}
                >
                  <option value="modern">Modern</option>
                  <option value="classic">Classic</option>
                </select>
              </SelectWrapper>
            </Field>
          </SectionCard>

          {/* Aspects */}
          <SectionCard title="Aspects">
            <div className="flex items-center gap-3">
              <span className="text-foreground text-sm flex-1">Show minor aspects</span>
              <Switch
                checked={draft.aspects.showMinor}
                onCheckedChange={() => setDraft((d) => ({ ...d, aspects: { ...d.aspects, showMinor: !d.aspects.showMinor } }))}
              />
            </div>

            <div className="flex flex-col gap-4 mt-2">
              {Object.entries(draft.aspects.orbs).map(([aspect, orb]) => (
                <div key={aspect} className="flex items-center gap-3">
                  <span className="text-foreground text-sm w-[110px] shrink-0">
                    {ASPECT_ORB_LABELS[aspect] ?? aspect}
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={15}
                    value={orb}
                    onChange={(e) => setDraft((d) => ({ ...d, aspects: { ...d.aspects, orbs: { ...d.aspects.orbs, [aspect]: e.target.valueAsNumber } } }))}
                    onDoubleClick={() => setDraft((d) => ({ ...d, aspects: { ...d.aspects, orbs: { ...d.aspects.orbs, [aspect]: DEFAULT_ORBS[aspect] ?? orb } } }))}
                    className="orb-slider flex-1"
                  />
                  <span className="text-muted-foreground text-xs w-6 text-right">{orb}°</span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Action buttons */}
          {isDirty && (
            <div className="flex gap-3">
              <Button onClick={handleSave} className="flex-1">
                Save
              </Button>
              <Button variant="outline" onClick={handleCancel} className="flex-1">
                Cancel
              </Button>
            </div>
          )}

          <button
            type="button"
            className="w-full text-destructive text-sm hover:underline py-2"
            onClick={handleReset}
          >
            Reset to defaults
          </button>
        </div>
      </div>
    </div>
  );
}
