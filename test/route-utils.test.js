import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDirectionsUrl,
  buildDirectionsUrls,
  haversineKm,
  formatClockMinutes,
  minutesFromTime,
  normalizeImportedStops,
  optimizeNearestNeighbor,
  optimizeRoute,
  parseCsv,
  planRouteDay,
  routeDistanceKm,
  stopsFromCsv,
  toCsv
} from "../shared/route-utils.js";

const stop = (name, lat, lng) => ({ name, address: "", lat, lng, url: `https://example.test/${name}`, note: "" });

test("haversine calculates a plausible Berlin–Paris distance", () => {
  const distance = haversineKm({ lat: 52.52, lng: 13.405 }, { lat: 48.8566, lng: 2.3522 });
  assert.ok(distance > 870 && distance < 890);
});

test("optimizer keeps the first stop and selects nearby stops", () => {
  const result = optimizeNearestNeighbor([stop("A", 0, 0), stop("C", 0, 3), stop("B", 0, 1)]);
  assert.deepEqual(result.map((item) => item.name), ["A", "B", "C"]);
});

test("optimizer can keep both the first and final stop fixed", () => {
  const input = [stop("A", 0, 0), stop("C", 0, 3), stop("B", 0, 1), stop("D", 0, 4)];
  const result = optimizeRoute(input, { keepLastFixed: true });
  assert.equal(result[0].name, "A");
  assert.equal(result.at(-1).name, "D");
  assert.ok(routeDistanceKm(result) <= routeDistanceKm(input));
});

test("optimizer rejects missing coordinates", () => {
  assert.throws(() => optimizeNearestNeighbor([stop("A", 0, 0), stop("B", null, null), stop("C", 1, 1)]));
});

test("directions URL contains origin, destination and waypoint", () => {
  const url = new URL(buildDirectionsUrl([stop("A", 1, 2), stop("B", 3, 4), stop("C", 5, 6)]));
  assert.equal(url.searchParams.get("api"), "1");
  assert.equal(url.searchParams.get("origin"), "1,2");
  assert.equal(url.searchParams.get("destination"), "5,6");
  assert.equal(url.searchParams.get("waypoints"), "3,4");
});

test("long routes are split into connected Google Maps sections", () => {
  const stops = Array.from({ length: 20 }, (_, index) => stop(`S${index}`, index, index));
  const urls = buildDirectionsUrls(stops);
  assert.equal(urls.length, 3);
  const first = new URL(urls[0]);
  const second = new URL(urls[1]);
  assert.equal(first.searchParams.get("destination"), second.searchParams.get("origin"));
});

test("CSV escapes quotes", () => {
  assert.match(toCsv([{ ...stop('A "quoted"', 1, 2), note: "x" }]), /"A ""quoted"""/);
});

test("CSV parser supports quoted commas and escaped quotes", () => {
  const rows = parseCsv('name,address,note\r\n"A, Inc","Main St","Say ""hello"""');
  assert.deepEqual(rows[1], ["A, Inc", "Main St", 'Say "hello"']);
});

test("CSV stop import normalizes workflow fields", () => {
  const imported = stopsFromCsv("name,address,priority,service_minutes,status,window_start,window_end,task_type,contact_name,contact_phone\nJob,Main St,urgent,45,in_progress,09:00,10:00,Repair,Alex,+49123");
  assert.equal(imported[0].priority, "urgent");
  assert.equal(imported[0].serviceMinutes, 45);
  assert.equal(imported[0].status, "in_progress");
  assert.equal(imported[0].timeWindowStart, "09:00");
  assert.equal(imported[0].taskType, "Repair");
  assert.equal(imported[0].contactPhone, "+49123");
});

test("JSON import normalizes and limits unsafe fields", () => {
  const result = normalizeImportedStops([{ name: "A", lat: "1.5", lng: "2.5" }]);
  assert.equal(result[0].lat, 1.5);
  assert.equal(result[0].lng, 2.5);
  assert.ok(result[0].id);
});

test("time helpers validate and format a field-day clock", () => {
  assert.equal(minutesFromTime("08:30"), 510);
  assert.equal(minutesFromTime("25:00"), null);
  assert.equal(formatClockMinutes(510), "08:30");
  assert.equal(formatClockMinutes(1500), "01:00 +1d");
});

test("field-day schedule waits for windows and flags late visits", () => {
  const visits = [
    { id: "a", status: "pending", serviceMinutes: 30, timeWindowStart: "09:00", timeWindowEnd: "10:00" },
    { id: "b", status: "pending", serviceMinutes: 45, timeWindowStart: "09:15", timeWindowEnd: "09:20" },
    { id: "c", status: "skipped", serviceMinutes: 60 }
  ];
  const schedule = planRouteDay(visits, { startTime: "08:00", travelBufferMinutes: 15 });
  assert.equal(schedule.length, 2);
  assert.equal(schedule[0].plannedStartMinutes, 540);
  assert.equal(schedule[0].waitMinutes, 60);
  assert.equal(schedule[1].plannedStartMinutes, 585);
  assert.equal(schedule[1].late, true);
});

test("completed visits keep the remaining field-day forecast stable", () => {
  const schedule = planRouteDay([
    { id: "done", status: "done", serviceMinutes: 30 },
    { id: "next", status: "pending", serviceMinutes: 20 }
  ], { startTime: "08:00", travelBufferMinutes: 15 });
  assert.equal(schedule[1].plannedStartMinutes, 525);
  assert.equal(formatClockMinutes(schedule[1].plannedStartMinutes), "08:45");
});
