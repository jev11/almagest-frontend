import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/use-settings";
import { Input } from "@/components/ui/input";

interface DateTimePickerProps {
  date: string;        // "YYYY-MM-DD"
  time: string;        // "HH:MM" (always 24h internally)
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  className?: string;
}

/** Convert "YYYY-MM-DD" → "DD/MM/YYYY" */
function toDisplayDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** Parse "DD/MM/YYYY" or "D/M/YYYY" back to "YYYY-MM-DD", rejecting impossible dates */
function parseDate(input: string): string | null {
  const match = input.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!match) return null;
  const d = Number(match[1]);
  const m = Number(match[2]);
  const y = Number(match[3]);
  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1 || y > 9999) return null;
  // Validate the date actually exists (rejects 31/02, 29/02 in non-leap years, etc.)
  const probe = new Date(y, m - 1, d);
  if (probe.getFullYear() !== y || probe.getMonth() !== m - 1 || probe.getDate() !== d) return null;
  return `${String(y)}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Convert "HH:MM" 24h → "h:MM AM/PM" */
function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (h === undefined || m === undefined) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

/** Parse various 12h/24h inputs back to "HH:MM" */
function parseTime(input: string): string | null {
  // Try "h:MM AM/PM" or "h:MMAM"
  const match12 = input.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let h = Number(match12[1]);
    const m = Number(match12[2]);
    const pm = match12[3]!.toUpperCase() === "PM";
    if (h === 12) h = pm ? 12 : 0;
    else if (pm) h += 12;
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }
  // Try "HH:MM" 24h
  const match24 = input.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const h = Number(match24[1]);
    const m = Number(match24[2]);
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }
  return null;
}

export function DateTimePicker({ date, time, onDateChange, onTimeChange, className }: DateTimePickerProps) {
  const timeFormat = useSettings((s) => s.appearance.timeFormat);
  const is12h = timeFormat === "12h";

  const [dateText, setDateText] = useState(() => toDisplayDate(date));
  const [dateError, setDateError] = useState(false);

  const handleDateBlur = useCallback(() => {
    if (!dateText.trim()) {
      setDateError(false);
      onDateChange("");
      return;
    }
    const parsed = parseDate(dateText);
    if (parsed) {
      onDateChange(parsed);
      setDateText(toDisplayDate(parsed));
      setDateError(false);
    } else {
      setDateError(true);
    }
  }, [dateText, onDateChange]);

  const [timeText, setTimeText] = useState(() => is12h ? to12h(time) : time);
  const [timeError, setTimeError] = useState(false);

  const handleTimeBlur = useCallback(() => {
    if (!timeText.trim()) {
      setTimeError(false);
      return;
    }
    const parsed = parseTime(timeText);
    if (parsed) {
      onTimeChange(parsed);
      setTimeText(is12h ? to12h(parsed) : parsed);
      setTimeError(false);
    } else {
      setTimeError(true);
    }
  }, [timeText, is12h, onTimeChange]);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex gap-3">
        <Input
          type="text"
          value={dateText}
          onChange={(e) => {
            let v = e.target.value;
            const prev = dateText;
            // Auto-insert slash after DD or MM when typing forward
            if (v.length > prev.length) {
              const digits = v.replace(/\D/g, "");
              if (digits.length === 2 && !v.includes("/")) {
                v = digits + "/";
              } else if (digits.length >= 4 && v.split("/").length === 2 && !v.endsWith("/")) {
                // After DD/MM, auto-insert second slash
                const parts = v.split("/");
                if (parts.length === 2 && parts[1]!.length === 2) {
                  v = v + "/";
                }
              }
            }
            setDateText(v);
            setDateError(false);
          }}
          onBlur={handleDateBlur}
          placeholder="DD/MM/YYYY"
          maxLength={10}
          className={cn("min-h-[44px] [color-scheme:dark]", dateError && "border-destructive")}
          style={{ flex: "1 1 0" }}
        />
        <Input
          type="text"
          value={timeText}
          onChange={(e) => {
            let v = e.target.value;
            const prev = timeText;
            // Auto-insert colon after HH when typing forward (24h mode)
            if (!is12h && v.length > prev.length) {
              const digits = v.replace(/\D/g, "");
              if (digits.length === 2 && !v.includes(":")) {
                v = digits + ":";
              }
            }
            setTimeText(v);
            setTimeError(false);
          }}
          onBlur={handleTimeBlur}
          placeholder={is12h ? "12:00 PM" : "12:00"}
          maxLength={is12h ? 8 : 5}
          className={cn("min-h-[44px] [color-scheme:dark]", timeError && "border-destructive")}
          style={{ flex: "0 0 120px" }}
        />
      </div>
      {(dateError || timeError) && (
        <p className="text-xs text-destructive">
          {dateError && "Invalid date — use DD/MM/YYYY"}
          {dateError && timeError && " · "}
          {timeError && (is12h ? "Invalid time — use H:MM AM/PM" : "Invalid time — use HH:MM")}
        </p>
      )}
    </div>
  );
}
