// Standard astronomical prayer time calculations
// Supports ISNA, MWL, Egyptian, and Karachi (Hanafi) methods

const METHODS = {
  ISNA: { fajrAngle: 15, ishaAngle: 15, name: "ISNA (North America)" },
  MWL: { fajrAngle: 18, ishaAngle: 17, name: "Muslim World League" },
  Egyptian: {
    fajrAngle: 19.5,
    ishaAngle: 17.5,
    name: "Egyptian General Authority",
  },
  Karachi: {
    fajrAngle: 18,
    ishaAngle: 18,
    name: "University of Islamic Sciences, Karachi",
  },
};

const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

function toJulianDate(date) {
  const d = date.getUTCDate();
  const m = date.getUTCMonth() + 1;
  const y = date.getUTCFullYear();
  return (
    367 * y -
    Math.floor((7 * (y + Math.floor((m + 9) / 12))) / 4) +
    Math.floor((275 * m) / 9) +
    d +
    1721013.5
  );
}

function sunPosition(jd) {
  const D = jd - 2451545.0;
  const g = (((357.529 + 0.98560028 * D) % 360) + 360) % 360;
  const q = (((280.459 + 0.98564736 * D) % 360) + 360) % 360;
  const L =
    (((q + 1.915 * Math.sin(toRad(g)) + 0.02 * Math.sin(toRad(2 * g))) % 360) +
      360) %
    360;
  const e = 23.439 - 0.00000036 * D;
  const RA = toDeg(
    Math.atan2(Math.cos(toRad(e)) * Math.sin(toRad(L)), Math.cos(toRad(L))),
  );
  const declination = toDeg(Math.asin(Math.sin(toRad(e)) * Math.sin(toRad(L))));
  const equationOfTime = q / 15 - (((RA % 360) + 360) % 360) / 15;
  return { declination, equationOfTime };
}

function hourAngle(lat, dec, angle) {
  const cosHA =
    (Math.sin(toRad(angle)) - Math.sin(toRad(lat)) * Math.sin(toRad(dec))) /
    (Math.cos(toRad(lat)) * Math.cos(toRad(dec)));
  if (cosHA > 1 || cosHA < -1) return null;
  return toDeg(Math.acos(cosHA)) / 15;
}

function formatTime(hours, use24HourTime = false) {
  if (hours === null || isNaN(hours)) return "--:--";
  // Normalize to 0–24
  const h = ((hours % 24) + 24) % 24;
  const totalMinutes = Math.round(h * 60);
  const hh = Math.floor(totalMinutes / 60) % 24;
  const mm = totalMinutes % 60;
  if (use24HourTime) {
    return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
  }
  const period = hh < 12 ? "AM" : "PM";
  const displayH = hh % 12 === 0 ? 12 : hh % 12;
  return `${displayH}:${mm.toString().padStart(2, "0")} ${period}`;
}

export function calculatePrayerTimes(
  date,
  latitude,
  longitude,
  timezoneOffset,
  method = "ISNA",
  use24HourTime = false,
) {
  const { fajrAngle, ishaAngle } = METHODS[method] || METHODS.ISNA;

  const jd = toJulianDate(date);
  const { declination, equationOfTime } = sunPosition(jd);

  // Solar noon in UTC
  const solarNoonUTC = 12 - equationOfTime - longitude / 15;
  // Adjust for timezone
  const solarNoon = solarNoonUTC + timezoneOffset;

  // Sunrise / Sunset  (zenith = 90.833 degrees)
  const sunriseHA = hourAngle(latitude, declination, -0.8333);
  const sunrise = sunriseHA !== null ? solarNoon - sunriseHA : null;
  const sunset = sunriseHA !== null ? solarNoon + sunriseHA : null;

  // Fajr
  const fajrHA = hourAngle(latitude, declination, -fajrAngle);
  const fajr = fajrHA !== null ? solarNoon - fajrHA : null;

  // Dhuhr = solar noon
  const dhuhr = solarNoon;

  // Asr (Shafi'i: shadow factor = 1)
  const shadowFactor = 1;
  const asrAngle = toDeg(
    Math.atan(
      1 / (shadowFactor + Math.tan(toRad(Math.abs(latitude - declination)))),
    ),
  );
  const asrHA = hourAngle(latitude, declination, asrAngle);
  const asr = asrHA !== null ? solarNoon + asrHA : null;

  // Maghrib = sunset
  const maghrib = sunset;

  // Isha
  const ishaHA = hourAngle(latitude, declination, -ishaAngle);
  const isha = ishaHA !== null ? solarNoon + ishaHA : null;

  return {
    Fajr: { time: fajr, formatted: formatTime(fajr, use24HourTime) },
    Sunrise: { time: sunrise, formatted: formatTime(sunrise, use24HourTime) },
    Dhuhr: { time: dhuhr, formatted: formatTime(dhuhr, use24HourTime) },
    Asr: { time: asr, formatted: formatTime(asr, use24HourTime) },
    Maghrib: { time: maghrib, formatted: formatTime(maghrib, use24HourTime) },
    Sunset: { time: sunset, formatted: formatTime(sunset, use24HourTime) },
    Isha: { time: isha, formatted: formatTime(isha, use24HourTime) },
  };
}

export function getMethods() {
  return Object.entries(METHODS).map(([key, val]) => ({ key, name: val.name }));
}

export const PRAYER_NAMES = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
