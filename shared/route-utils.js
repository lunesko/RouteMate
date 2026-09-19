export const MAX_STOP_LIMIT = 50;
export const MAPS_SECTION_LIMIT = 10;
const EPSILON_KM = 0.0001;
export const ACTIVE_STOP_STATUSES = ["pending", "in_progress"];
export const FINISHED_STOP_STATUSES = ["done", "skipped"];
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function normalizeTime(value) {
  const time = String(value || "").trim();
  return TIME_PATTERN.test(time) ? time : "";
}

export function minutesFromTime(value) {
  const time = normalizeTime(value);
  if (!time) return null;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function formatClockMinutes(value) {
  const minutes = Math.max(0, Math.round(Number(value) || 0));
  const hours = Math.floor(minutes / 60) % 24;
  const rest = minutes % 60;
  const dayOffset = Math.floor(minutes / 1440);
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}${dayOffset ? ` +${dayOffset}d` : ""}`;
}

export function isFinishedStop(stop) {
  return FINISHED_STOP_STATUSES.includes(stop?.status);
}

export function planRouteDay(stops, { startTime = "08:00", travelBufferMinutes = 15 } = {}) {
  let cursor = minutesFromTime(startTime) ?? 8 * 60;
  const buffer = Math.min(240, Math.max(0, Number(travelBufferMinutes) || 0));

  return stops.filter((stop) => stop?.status !== "skipped").map((stop, index) => {
    const arrivalMinutes = cursor + (index === 0 ? 0 : buffer);
    const windowStartMinutes = minutesFromTime(stop.timeWindowStart);
    const windowEndMinutes = minutesFromTime(stop.timeWindowEnd);
    const invalidWindow = windowStartMinutes !== null && windowEndMinutes !== null && windowEndMinutes < windowStartMinutes;
    const plannedStartMinutes = windowStartMinutes !== null && arrivalMinutes < windowStartMinutes
      ? windowStartMinutes
      : arrivalMinutes;
    const late = invalidWindow || (windowEndMinutes !== null && plannedStartMinutes > windowEndMinutes);
    const serviceMinutes = Math.min(480, Math.max(0, Number(stop.serviceMinutes) || 0));
    const endMinutes = plannedStartMinutes + serviceMinutes;
    cursor = endMinutes;
    return {
      stop,
      arrivalMinutes,
      plannedStartMinutes,
      endMinutes,
      waitMinutes: Math.max(0, plannedStartMinutes - arrivalMinutes),
      late,
      invalidWindow
    };
  });
}

export function haversineKm(a, b) {
  const radius = 6371;
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat ** 2 + Math.cos(lat1) * Math.cos(lat2) * sinLng ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

export function routeDistanceKm(stops) {
  if (stops.length < 2) return 0;
  let total = 0;
  for (let index = 1; index < stops.length; index += 1) {
    total += haversineKm(stops[index - 1], stops[index]);
  }
  return total;
}

function requireCoordinates(stops) {
  if (stops.some((stop) => !Number.isFinite(stop.lat) || !Number.isFinite(stop.lng))) {
    throw new Error("Every stop needs coordinates before optimization.");
  }
}

function nearestNeighbor(stops, keepLastFixed) {
  const ordered = [stops[0]];
  const fixedEnd = keepLastFixed ? stops.at(-1) : null;
  const remaining = keepLastFixed ? stops.slice(1, -1) : stops.slice(1);

  while (remaining.length) {
    const from = ordered.at(-1);
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    remaining.forEach((candidate, index) => {
      const distance = haversineKm(from, candidate);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    ordered.push(remaining.splice(nearestIndex, 1)[0]);
  }

  if (fixedEnd) ordered.push(fixedEnd);
  return ordered;
}

function improveWithTwoOpt(stops, keepLastFixed) {
  let best = [...stops];
  let bestDistance = routeDistanceKm(best);
  let improved = true;
  let passes = 0;

  while (improved && passes < 12) {
    improved = false;
    passes += 1;
    const finalMovableIndex = keepLastFixed ? best.length - 2 : best.length - 1;
    for (let start = 1; start < finalMovableIndex; start += 1) {
      for (let end = start + 1; end <= finalMovableIndex; end += 1) {
        const candidate = [
          ...best.slice(0, start),
          ...best.slice(start, end + 1).reverse(),
          ...best.slice(end + 1)
        ];
        const candidateDistance = routeDistanceKm(candidate);
        if (candidateDistance + EPSILON_KM < bestDistance) {
          best = candidate;
          bestDistance = candidateDistance;
          improved = true;
        }
      }
    }
  }
  return best;
}

export function optimizeRoute(stops, { keepLastFixed = false } = {}) {
  if (stops.length < 3) return [...stops];
  requireCoordinates(stops);
  return improveWithTwoOpt(nearestNeighbor(stops, keepLastFixed), keepLastFixed);
}

export function optimizeNearestNeighbor(stops) {
  return optimizeRoute(stops);
}

export function stopQuery(stop) {
  if (Number.isFinite(stop.lat) && Number.isFinite(stop.lng)) return `${stop.lat},${stop.lng}`;
  return stop.address || stop.name;
}

export function buildDirectionsUrl(stops, travelMode = "driving") {
  if (stops.length < 2) throw new Error("Add at least two stops.");
  const limitedStops = stops.slice(0, MAPS_SECTION_LIMIT);
  const params = new URLSearchParams({
    api: "1",
    origin: stopQuery(limitedStops[0]),
    destination: stopQuery(limitedStops.at(-1)),
    travelmode: travelMode
  });
  if (limitedStops.length > 2) {
    params.set("waypoints", limitedStops.slice(1, -1).map(stopQuery).join("|"));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function buildDirectionsUrls(stops, travelMode = "driving") {
  if (stops.length < 2) throw new Error("Add at least two stops.");
  const sections = [];
  let start = 0;
  while (start < stops.length - 1) {
    const end = Math.min(start + MAPS_SECTION_LIMIT, stops.length);
    sections.push(buildDirectionsUrl(stops.slice(start, end), travelMode));
    start = end - 1;
  }
  return sections;
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function toCsv(stops, routeName = "") {
  const header = [
    "route", "order", "status", "priority", "service_minutes", "window_start", "window_end",
    "task_type", "contact_name", "contact_phone", "name", "address", "latitude", "longitude",
    "note", "completed_at", "google_maps_url"
  ];
  const rows = stops.map((stop, index) => [
    routeName,
    index + 1,
    stop.status || "pending",
    stop.priority || "normal",
    stop.serviceMinutes || 0,
    stop.timeWindowStart,
    stop.timeWindowEnd,
    stop.taskType,
    stop.contactName,
    stop.contactPhone,
    stop.name,
    stop.address,
    stop.lat,
    stop.lng,
    stop.note,
    stop.completedAt,
    stop.url
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value !== "")) rows.push(row);
  return rows;
}

function safeNumber(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function normalizeImportedStops(value) {
  if (!Array.isArray(value)) throw new Error("The imported data must contain an array of stops.");
  return value.slice(0, MAX_STOP_LIMIT).map((stop, index) => ({
    id: typeof stop.id === "string" && stop.id ? stop.id : crypto.randomUUID(),
    name: String(stop.name || `Stop ${index + 1}`).slice(0, 160),
    address: String(stop.address || "").slice(0, 300),
    lat: safeNumber(stop.lat ?? stop.latitude),
    lng: safeNumber(stop.lng ?? stop.longitude),
    url: String(stop.url || stop.google_maps_url || "").slice(0, 2048),
    note: String(stop.note || "").slice(0, 500),
    status: ["pending", "in_progress", "done", "skipped"].includes(stop.status) ? stop.status : "pending",
    priority: ["normal", "high", "urgent"].includes(stop.priority) ? stop.priority : "normal",
    serviceMinutes: Math.min(480, Math.max(0, safeNumber(stop.serviceMinutes ?? stop.service_minutes, 0))),
    timeWindowStart: normalizeTime(stop.timeWindowStart ?? stop.window_start),
    timeWindowEnd: normalizeTime(stop.timeWindowEnd ?? stop.window_end),
    taskType: String(stop.taskType ?? stop.task_type ?? "").slice(0, 80),
    contactName: String(stop.contactName ?? stop.contact_name ?? "").slice(0, 100),
    contactPhone: String(stop.contactPhone ?? stop.contact_phone ?? "").slice(0, 60),
    completedAt: String(stop.completedAt ?? stop.completed_at ?? "").slice(0, 40),
    createdAt: String(stop.createdAt || new Date().toISOString())
  }));
}

export function stopsFromCsv(text) {
  const rows = parseCsv(text.replace(/^\uFEFF/, ""));
  if (rows.length < 2) throw new Error("The CSV file has no stop rows.");
  const headers = rows[0].map((value) => value.trim().toLowerCase());
  const objects = rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
  return normalizeImportedStops(objects);
}
