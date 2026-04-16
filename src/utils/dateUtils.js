// Date utility helpers for Rakah

export function toDateString(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromDateString(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function today() {
  return toDateString(new Date());
}

export function addDays(dateStr, days) {
  const d = fromDateString(dateStr);
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

export function subtractDays(dateStr, days) {
  return addDays(dateStr, -days);
}

export function formatDisplayDate(dateStr) {
  const d = fromDateString(dateStr);
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${dayNames[d.getDay()]}, ${monthNames[d.getMonth()]} ${d.getDate()}`;
}

export function formatShortDate(dateStr) {
  const d = fromDateString(dateStr);
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${monthNames[d.getMonth()]} ${d.getDate()}`;
}

export function isToday(dateStr) {
  return dateStr === today();
}

export function getPast30Days() {
  const days = [];
  for (let i = 0; i < 30; i++) {
    days.push(subtractDays(today(), i));
  }
  return days;
}

export function getWeekDays(referenceDate) {
  const d = fromDateString(referenceDate);
  const dayOfWeek = d.getDay(); // 0 = Sunday
  const days = [];
  for (let i = 0; i < 7; i++) {
    const diff = i - dayOfWeek;
    const day = new Date(d);
    day.setDate(d.getDate() + diff);
    days.push(toDateString(day));
  }
  return days;
}

export function getMonthDays(year, month) {
  // month is 0-indexed
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = [];
  // Pad start
  const startPad = firstDay.getDay();
  for (let i = 0; i < startPad; i++) {
    days.push(null);
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(toDateString(new Date(year, month, d)));
  }
  return days;
}

export function compareDates(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function formatRelativeDate(dateStr) {
  const t = today();
  if (dateStr === t) return "Today";
  if (dateStr === subtractDays(t, 1)) return "Yesterday";
  return formatShortDate(dateStr);
}

export function getLocalTimezoneOffset() {
  return -(new Date().getTimezoneOffset() / 60);
}

export function getDayName(dateStr) {
  const d = fromDateString(dateStr);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
}

const HIJRI_MONTHS = [
  "Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani",
  "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Sha'ban",
  "Ramadan", "Shawwal", "Dhul Qi'dah", "Dhul Hijjah",
];

/**
 * Converts a Gregorian Date to a Hijri date object.
 * Uses the standard tabular Islamic calendar algorithm.
 */
export function toHijri(date) {
  const gD = date.getDate();
  const gM = date.getMonth() + 1;
  const gY = date.getFullYear();

  // Gregorian → Julian Day Number
  const jd =
    Math.floor((1461 * (gY + 4800 + Math.floor((gM - 14) / 12))) / 4) +
    Math.floor((367 * (gM - 2 - 12 * Math.floor((gM - 14) / 12))) / 12) -
    Math.floor((3 * Math.floor((gY + 4900 + Math.floor((gM - 14) / 12)) / 100)) / 4) +
    gD - 32075;

  // Julian Day → Hijri
  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l =
    l -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const hMonth = Math.floor((24 * l) / 709);
  const hDay = l - Math.floor((709 * hMonth) / 24);
  const hYear = 30 * n + j - 30;

  return { year: hYear, month: hMonth, day: hDay };
}

/** Returns a formatted Hijri date string, e.g. "15 Rajab 1446" */
export function formatHijriDate(date) {
  const { year, month, day } = toHijri(date);
  return `${day} ${HIJRI_MONTHS[month - 1]} ${year}`;
}

export function getMonthName(month) {
  return [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ][month];
}
