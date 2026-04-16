/**
 * Location search using the free Nominatim (OpenStreetMap) geocoding API.
 * No API key required. Returns up to 5 results.
 */
function getSpecificPlaceName(item) {
  const address = item.address || {};
  if (typeof item.name === "string" && item.name.trim()) {
    return item.name.trim();
  }

  const preferredKeys = [
    "borough",
    "suburb",
    "city_district",
    "quarter",
    "neighbourhood",
    "hamlet",
    "village",
    "town",
    "municipality",
    "city",
    "county",
    "state",
  ];

  for (const key of preferredKeys) {
    const value = address[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  const firstDisplayPart = item.display_name?.split(",")[0];
  return typeof firstDisplayPart === "string" && firstDisplayPart.trim()
    ? firstDisplayPart.trim()
    : "Unknown location";
}

export async function searchPlaces(query) {
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Rakah Prayer App" },
  });
  const data = await res.json();
  return data.map((item) => ({
    id: String(item.place_id),
    displayName: item.display_name,
    // Prefer Nominatim's primary place name first, then fall back to a
    // specific locality so "Brooklyn, NY" stays Brooklyn without turning
    // true city matches like "Chicago" into township labels.
    shortName: getSpecificPlaceName(item),
    country: item.address?.country || "",
    lat: parseFloat(item.lat).toFixed(4),
    lon: parseFloat(item.lon).toFixed(4),
  }));
}

/**
 * Returns the UTC offset (as a decimal hour) for a given lat/lon using the
 * free timeapi.io service. Falls back to a longitude-based estimate if the
 * request fails.
 */
export async function getTimezoneOffset(lat, lon) {
  try {
    const res = await fetch(
      `https://timeapi.io/api/TimeZone/coordinate?latitude=${lat}&longitude=${lon}`,
    );
    const data = await res.json();
    const secs = data.currentUtcOffset?.seconds;
    if (typeof secs === "number") return secs / 3600;
  } catch {
    // intentional fall-through
  }
  // Rough fallback: 15° longitude ≈ 1 hour
  return Math.round(parseFloat(lon) / 15);
}
