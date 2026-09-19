import test from "node:test";
import assert from "node:assert/strict";
import { createWorkspace, duplicateRoute, migrateStoredState, normalizeWorkspace } from "../shared/workspace.js";

test("new workspace starts with one active route", () => {
  const workspace = createWorkspace("Monday jobs");
  assert.equal(workspace.schemaVersion, 3);
  assert.equal(workspace.routes.length, 1);
  assert.equal(workspace.routes[0].name, "Monday jobs");
  assert.equal(workspace.activeRouteId, workspace.routes[0].id);
});

test("duplicating a route keeps visit details but resets execution state", () => {
  const workspace = createWorkspace("Weekly inspections");
  workspace.routes[0].scheduledDate = "2026-09-19";
  workspace.routes[0].stops = [{
    id: "old", name: "Site A", status: "done", completedAt: "2026-09-19T10:00:00Z",
    taskType: "Inspection", timeWindowStart: "09:00", timeWindowEnd: "10:00"
  }];
  const copy = duplicateRoute(workspace.routes[0], "Next week");
  assert.equal(copy.name, "Next week");
  assert.equal(copy.scheduledDate, "");
  assert.notEqual(copy.stops[0].id, "old");
  assert.equal(copy.stops[0].status, "pending");
  assert.equal(copy.stops[0].completedAt, "");
  assert.equal(copy.stops[0].taskType, "Inspection");
  assert.equal(copy.stops[0].timeWindowStart, "09:00");
});

test("legacy single-route storage migrates without losing stops or mode", () => {
  const workspace = migrateStoredState({
    travelMode: "walking",
    stops: [{ id: "old-1", name: "Legacy stop", lat: 1, lng: 2 }]
  });
  assert.equal(workspace.routes[0].travelMode, "walking");
  assert.equal(workspace.routes[0].stops[0].name, "Legacy stop");
  assert.equal(workspace.routes[0].stops[0].status, "pending");
  assert.equal(workspace.routes[0].travelBufferMinutes, 15);
});

test("workspace restore caps routes and selects a valid active route", () => {
  const input = { activeRouteId: "missing", routes: Array.from({ length: 25 }, (_, i) => ({ name: `R${i}`, stops: [] })) };
  const workspace = normalizeWorkspace(input);
  assert.equal(workspace.routes.length, 20);
  assert.equal(workspace.activeRouteId, workspace.routes[0].id);
});
