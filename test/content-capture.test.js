import test from "node:test";
import assert from "node:assert/strict";

test("place capture prefers exact !3d/!4d coordinates over viewport center", async (t) => {
  let listener;
  globalThis.location = {
    href: "https://www.google.com/maps/place/Test/@54.8000,9.5000,1000m/data=!3d54.8321!4d9.5487"
  };
  globalThis.document = {
    title: "Test Place - Google Maps",
    querySelector(selector) {
      if (selector === "h1") return { textContent: "Test Place" };
      return null;
    }
  };
  globalThis.chrome = {
    runtime: {
      onMessage: { addListener(callback) { listener = callback; } }
    }
  };
  t.after(() => {
    delete globalThis.location;
    delete globalThis.document;
    delete globalThis.chrome;
  });

  await import("../content/maps-capture.js?capture-test");
  let response;
  listener({ type: "ROUTEMATE_CAPTURE_PLACE" }, null, (value) => { response = value; });
  assert.equal(response.ok, true);
  assert.equal(response.place.name, "Test Place");
  assert.equal(response.place.lat, 54.8321);
  assert.equal(response.place.lng, 9.5487);
});
