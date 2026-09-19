function cleanText(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function coordinatesFromUrl(url) {
  const dataMatch = url.match(/!3d(-?\d+(?:\.\d+)?).*?!4d(-?\d+(?:\.\d+)?)/);
  if (dataMatch) {
    return { lat: Number(dataMatch[1]), lng: Number(dataMatch[2]) };
  }

  // The @ pair is often the viewport center, so use it only as a fallback.
  const atMatch = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    return { lat: Number(atMatch[1]), lng: Number(atMatch[2]) };
  }

  return { lat: null, lng: null };
}

function nameFromUrl(url) {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/maps\/place\/([^/]+)/);
    return match ? cleanText(decodeURIComponent(match[1].replace(/\+/g, " "))) : "";
  } catch {
    return "";
  }
}

function readCurrentPlace() {
  const url = location.href;
  const coordinates = coordinatesFromUrl(url);
  const heading = cleanText(document.querySelector("h1")?.textContent);
  const title = cleanText(document.title.replace(/\s*[-–—]\s*Google Maps.*$/i, ""));
  const addressButton = document.querySelector('[data-item-id="address"], button[data-item-id*="address"]');
  const address = cleanText(
    addressButton?.getAttribute("aria-label")?.replace(/^Address:\s*/i, "") ||
    addressButton?.textContent
  );

  return {
    name: heading || nameFromUrl(url) || title || "Map location",
    address,
    lat: coordinates.lat,
    lng: coordinates.lng,
    url,
    capturedAt: new Date().toISOString()
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "ROUTEMATE_CAPTURE_PLACE") return false;
  sendResponse({ ok: true, place: readCurrentPlace() });
  return false;
});
