// Kaaba coordinates (Al-Masjid al-Haram, Mecca)
const KAABA_LAT = 21.4225;
const KAABA_LON = 39.8262;

const toRad = (d) => (d * Math.PI) / 180;
const toDeg = (r) => (r * 180) / Math.PI;

/**
 * Returns the Great Circle bearing (0–360°) from the user's location to the Kaaba.
 * 0 = North, 90 = East, etc.
 */
export function getQiblaBearing(userLat, userLon) {
  const φ1 = toRad(userLat);
  const φ2 = toRad(KAABA_LAT);
  const Δλ = toRad(KAABA_LON - userLon);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  return ((toDeg(Math.atan2(y, x)) % 360) + 360) % 360;
}

/**
 * Returns the great-circle distance in kilometres from the user to the Kaaba.
 */
export function getDistanceToKaaba(userLat, userLon) {
  const R = 6371;
  const Δφ = toRad(KAABA_LAT - userLat);
  const Δλ = toRad(KAABA_LON - userLon);
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(toRad(userLat)) * Math.cos(toRad(KAABA_LAT)) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Converts a bearing (0–360°) to a 16-point cardinal compass direction.
 */
export function bearingToCardinal(degrees) {
  const dirs = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
  ];
  return dirs[Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16];
}

/**
 * Tilt-compensated compass heading from raw magnetometer + accelerometer data.
 * Returns 0–360° where 0 = geographic North.
 *
 * Uses the standard pitch/roll rotation matrix to project the magnetometer
 * vector onto the horizontal plane before computing heading.
 */
export function computeHeading(mag, acc) {
  const { x: mx, y: my, z: mz } = mag;
  const { x: ax, y: ay, z: az } = acc;

  const norm = Math.hypot(ax, ay, az);
  if (norm < 0.001) return 0;

  // Normalised gravity vector
  const nx = ax / norm;
  const ny = ay / norm;
  const nz = az / norm;

  // Pitch (tilt toward top/bottom of screen) and roll (tilt left/right)
  const pitch = Math.asin(-nx);
  const cosPitch = Math.cos(pitch);
  const roll = cosPitch < 0.001 ? 0 : Math.atan2(ny, nz);
  const sinRoll = Math.sin(roll);
  const cosRoll = Math.cos(roll);
  const sinPitch = Math.sin(pitch);

  // Project magnetometer onto horizontal plane
  const bx = mx * cosPitch + mz * sinPitch;
  const by = mx * sinRoll * sinPitch + my * cosRoll - mz * sinRoll * cosPitch;

  const heading = toDeg(Math.atan2(-by, bx));
  return ((heading % 360) + 360) % 360;
}

/**
 * Smooth an angle reading using a low-pass filter.
 * Handles the 0/360 wrap-around correctly.
 * alpha: 0 = no change, 1 = instant snap. ~0.18 gives good responsiveness.
 */
export function lowPassAngle(newAngle, prevAngle, alpha = 0.18) {
  let diff = newAngle - prevAngle;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return prevAngle + alpha * diff;
}
