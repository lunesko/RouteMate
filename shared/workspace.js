import { MAX_STOP_LIMIT, normalizeImportedStops } from "./route-utils.js";

export const SCHEMA_VERSION = 3;
export const MAX_ROUTE_LIMIT = 20;

export function createRoute(name = "My route", now = new Date().toISOString()) {
  return {
    id: crypto.randomUUID(),
    name: String(name).trim().slice(0, 80) || "My route",
    travelMode: "driving",
    keepLastFixed: true,
    skipCompleted: true,
    scheduledDate: "",
    startTime: "08:00",
    travelBufferMinutes: 15,
    stops: [],
    createdAt: now,
    updatedAt: now
  };
}

export function createWorkspace(routeName = "My first route") {
  const route = createRoute(routeName);
  return { schemaVersion: SCHEMA_VERSION, activeRouteId: route.id, routes: [route] };
}

function normalizeRoute(route, index) {
  const now = new Date().toISOString();
  const travelBuffer = route?.travelBufferMinutes === undefined || route?.travelBufferMinutes === null
    ? 15
    : Number(route.travelBufferMinutes);
  return {
    id: typeof route?.id === "string" && route.id ? route.id : crypto.randomUUID(),
    name: String(route?.name || `Route ${index + 1}`).slice(0, 80),
    travelMode: ["driving", "walking", "bicycling", "transit"].includes(route?.travelMode) ? route.travelMode : "driving",
    keepLastFixed: route?.keepLastFixed !== false,
    skipCompleted: route?.skipCompleted !== false,
    scheduledDate: /^\d{4}-\d{2}-\d{2}$/.test(String(route?.scheduledDate || "")) ? route.scheduledDate : "",
    startTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(route?.startTime || "")) ? route.startTime : "08:00",
    travelBufferMinutes: Math.min(240, Math.max(0, Number.isFinite(travelBuffer) ? travelBuffer : 15)),
    stops: normalizeImportedStops(Array.isArray(route?.stops) ? route.stops.slice(0, MAX_STOP_LIMIT) : []),
    createdAt: String(route?.createdAt || now),
    updatedAt: String(route?.updatedAt || now)
  };
}

export function duplicateRoute(source, name = `${source?.name || "Route"} copy`, now = new Date().toISOString()) {
  const route = normalizeRoute({
    ...source,
    id: crypto.randomUUID(),
    name,
    scheduledDate: "",
    createdAt: now,
    updatedAt: now,
    stops: (source?.stops || []).map((stop) => ({
      ...stop,
      id: crypto.randomUUID(),
      status: "pending",
      completedAt: "",
      createdAt: now
    }))
  }, 0);
  return route;
}

export function normalizeWorkspace(value) {
  if (!value || !Array.isArray(value.routes)) throw new Error("This is not a RouteMate workspace backup.");
  const routes = value.routes.slice(0, MAX_ROUTE_LIMIT).map(normalizeRoute);
  if (!routes.length) routes.push(createRoute());
  const activeRouteId = routes.some((route) => route.id === value.activeRouteId)
    ? value.activeRouteId
    : routes[0].id;
  return { schemaVersion: SCHEMA_VERSION, activeRouteId, routes };
}

export function migrateStoredState(saved) {
  if (saved?.workspace) return normalizeWorkspace(saved.workspace);
  const workspace = createWorkspace("Imported route");
  const route = workspace.routes[0];
  route.stops = normalizeImportedStops(Array.isArray(saved?.stops) ? saved.stops : []);
  route.travelMode = ["driving", "walking", "bicycling", "transit"].includes(saved?.travelMode)
    ? saved.travelMode
    : "driving";
  return workspace;
}
