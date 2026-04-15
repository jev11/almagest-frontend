import SunCalc from "suncalc";

export const CHALDEAN_ORDER = [
  "saturn", "jupiter", "mars", "sun", "venus", "mercury", "moon",
] as const;

export const DAY_RULERS: Record<number, string> = {
  0: "sun",       // Sunday
  1: "moon",      // Monday
  2: "mars",      // Tuesday
  3: "mercury",   // Wednesday
  4: "jupiter",   // Thursday
  5: "venus",     // Friday
  6: "saturn",    // Saturday
};

export interface PlanetaryHour {
  planet: string;
  start: Date;
  end: Date;
  isDay: boolean;
  hourNumber: number;
}

export interface PlanetaryHoursResult {
  dayRuler: string;
  currentHour: PlanetaryHour;
  nextHour: PlanetaryHour;
  allHours: PlanetaryHour[];
  sunrise: Date;
  sunset: Date;
  nextSunrise: Date;
}

export function calculatePlanetaryHours(
  now: Date,
  lat: number,
  lon: number,
): PlanetaryHoursResult | null {
  const today = new Date(now);
  today.setHours(12, 0, 0, 0);

  const todayTimes = SunCalc.getTimes(today, lat, lon);
  const sunrise = todayTimes.sunrise;
  const sunset = todayTimes.sunset;

  if (isNaN(sunrise.getTime()) || isNaN(sunset.getTime())) {
    return null;
  }

  if (now.getTime() < sunrise.getTime()) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(12, 0, 0, 0);
    const yesterdayTimes = SunCalc.getTimes(yesterday, lat, lon);
    if (isNaN(yesterdayTimes.sunrise.getTime()) || isNaN(yesterdayTimes.sunset.getTime())) {
      return null;
    }
    return buildResult(yesterdayTimes.sunrise, yesterdayTimes.sunset, sunrise, yesterday, now);
  }

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(12, 0, 0, 0);
  const tomorrowTimes = SunCalc.getTimes(tomorrow, lat, lon);
  const nextSunrise = tomorrowTimes.sunrise;

  if (isNaN(nextSunrise.getTime())) {
    return null;
  }

  return buildResult(sunrise, sunset, nextSunrise, today, now);
}

function buildResult(
  sunrise: Date,
  sunset: Date,
  nextSunrise: Date,
  dayDate: Date,
  now: Date,
): PlanetaryHoursResult {
  const weekday = dayDate.getDay();
  const dayRuler = DAY_RULERS[weekday]!;

  const dayDuration = sunset.getTime() - sunrise.getTime();
  const nightDuration = nextSunrise.getTime() - sunset.getTime();
  const dayHourMs = dayDuration / 12;
  const nightHourMs = nightDuration / 12;

  const startIdx = CHALDEAN_ORDER.indexOf(dayRuler as typeof CHALDEAN_ORDER[number]);

  const allHours: PlanetaryHour[] = [];

  for (let i = 0; i < 12; i++) {
    allHours.push({
      planet: CHALDEAN_ORDER[(startIdx + i) % 7]!,
      start: new Date(sunrise.getTime() + i * dayHourMs),
      end: new Date(sunrise.getTime() + (i + 1) * dayHourMs),
      isDay: true,
      hourNumber: i + 1,
    });
  }

  for (let i = 0; i < 12; i++) {
    allHours.push({
      planet: CHALDEAN_ORDER[(startIdx + 12 + i) % 7]!,
      start: new Date(sunset.getTime() + i * nightHourMs),
      end: new Date(sunset.getTime() + (i + 1) * nightHourMs),
      isDay: false,
      hourNumber: i + 1,
    });
  }

  const nowMs = now.getTime();
  let currentIdx = allHours.findIndex(
    (h) => nowMs >= h.start.getTime() && nowMs < h.end.getTime(),
  );
  if (currentIdx === -1) currentIdx = 0;

  const currentHour = allHours[currentIdx]!;
  const nextHour = allHours[currentIdx + 1] ?? allHours[0]!;

  return { dayRuler, currentHour, nextHour, allHours, sunrise, sunset, nextSunrise };
}
