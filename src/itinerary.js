import polyline from "@mapbox/polyline";

// A route ending this close to where it started is a loop
const LOOP_THRESHOLD_KM = 1;
// Matches within this of the best one count as ties, the earliest wins, so an
// out-and-back route maps a stop to its first pass instead of the way back
const MATCH_SLACK_KM = 0.2;

// Valhalla encodes shapes with 6 decimal places, not the usual 5
export function decodeShape(encoded) {
  return encoded ? polyline.decode(encoded, 6) : [];
}

export function haversineKm([lat1, lon1], [lat2, lon2]) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

export function isLoop(shape) {
  return shape.length > 1 && haversineKm(shape[0], shape[shape.length - 1]) < LOOP_THRESHOLD_KM;
}

// The API stores waypoints without the closing start of a loop and has no
// per-leg numbers, so both are rebuilt here by matching each stop onto the
// route line in order. Leg times are the route's average pace, so estimates.
export function buildItinerary(route, shape) {
  const loop = isLoop(shape);
  const stops = route.waypoints.map((waypoint) => ({ ...waypoint, kind: "stop" }));
  if (stops.length === 0) return { loop, stops, legs: [] };

  stops[0].kind = "start";
  if (loop) stops.push({ ...route.waypoints[0], kind: "finish" });
  else if (stops.length > 1) stops[stops.length - 1].kind = "finish";

  if (shape.length < 2) return { loop, stops, legs: [] };

  const cumulative = [0];
  for (let i = 1; i < shape.length; i++) {
    cumulative.push(cumulative[i - 1] + haversineKm(shape[i - 1], shape[i]));
  }
  const lineKm = cumulative[cumulative.length - 1];
  // The decoded line is slightly shorter than Valhalla's road distance
  const scale = lineKm > 0 ? route.distance_km / lineKm : 0;

  const last = shape.length - 1;
  let previous = 0;
  const indexes = stops.map((stop, i) => {
    if (i === 0) return 0;
    if (i === stops.length - 1 && stop.kind === "finish") return last;
    previous = nearestIndex(shape, [stop.lat, stop.lon], previous);
    return previous;
  });

  stops.forEach((stop, i) => {
    stop.atKm = cumulative[indexes[i]] * scale;
  });

  const legs = stops.slice(1).map((stop, i) => {
    const km = stop.atKm - stops[i].atKm;
    return { km, minutes: route.distance_km > 0 ? (route.duration_min * km) / route.distance_km : 0 };
  });

  return { loop, stops, legs };
}

function nearestIndex(shape, point, from) {
  let best = Infinity;
  const distances = [];
  for (let i = from; i < shape.length; i++) {
    const d = haversineKm(shape[i], point);
    distances.push(d);
    if (d < best) best = d;
  }
  return from + distances.findIndex((d) => d <= best + MATCH_SLACK_KM);
}

export function routeTitle(route, loop) {
  const names = route.waypoints.map((waypoint) => waypoint.name);
  if (names.length === 0) return "Untitled route";
  if (loop) return `Loop from ${names[0]}`;
  if (names.length === 1) return names[0];
  return `${names[0]} → ${names[names.length - 1]}`;
}

// The places between start and finish, for a short "via" line
export function viaNames(route, loop) {
  const names = route.waypoints.map((waypoint) => waypoint.name);
  return loop ? names.slice(1) : names.slice(1, -1);
}

// A and B for the ends, numbers for the stops between, a loop finishes back at A
export function markerLabel(stop, index, loop) {
  if (stop.kind === "start") return "A";
  if (stop.kind === "finish") return loop ? "A" : "B";
  return String(index);
}

export function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function formatKm(km) {
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

export function formatAge(isoDate) {
  const seconds = (new Date(isoDate) - Date.now()) / 1000;
  const units = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) {
      if (unit === "day" && Math.abs(seconds) > 7 * 86400) {
        return new Date(isoDate).toLocaleDateString(undefined, { day: "numeric", month: "short" });
      }
      return relative.format(Math.round(seconds / size), unit);
    }
  }
  return "just now";
}
