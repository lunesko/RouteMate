import {
  MAX_STOP_LIMIT,
  buildDirectionsUrls,
  formatClockMinutes,
  isFinishedStop,
  normalizeImportedStops,
  normalizeTime,
  optimizeRoute,
  planRouteDay,
  routeDistanceKm,
  stopQuery,
  stopsFromCsv,
  toCsv
} from "../shared/route-utils.js";
import {
  MAX_ROUTE_LIMIT,
  createRoute,
  duplicateRoute,
  migrateStoredState,
  normalizeWorkspace
} from "../shared/workspace.js";

const state = { workspace: null, draggedStopId: null };
const ids = [
  "planBadge", "routeCount", "routeSelect", "newRouteButton", "duplicateRouteButton", "renameRouteButton", "deleteRouteButton",
  "captureButton", "notice", "travelMode", "scheduledDate", "startTime", "travelBufferMinutes", "keepLastFixed", "skipCompleted", "summaryRemaining",
  "summaryDistance", "summaryService", "summaryFinish", "progressLabel", "scheduleIssueLabel", "progressBar",
  "nextVisitCard", "nextVisitTitle", "nextVisitMeta", "nextVisitOpenButton", "nextVisitActionButton",
  "stopCount", "stopList", "emptyState", "clearCompletedButton",
  "clearButton", "openRouteButton", "optimizeButton", "reverseButton", "exportButton", "backupButton",
  "importButton", "importFile", "stopTemplate"
];
const elements = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));

function activeRoute() {
  return state.workspace.routes.find((route) => route.id === state.workspace.activeRouteId) || state.workspace.routes[0];
}

function showNotice(message, error = false) {
  elements.notice.textContent = message;
  elements.notice.classList.toggle("error", error);
  elements.notice.hidden = false;
  clearTimeout(showNotice.timer);
  showNotice.timer = setTimeout(() => { elements.notice.hidden = true; }, 4500);
}

async function saveWorkspace() {
  const route = activeRoute();
  route.updatedAt = new Date().toISOString();
  await chrome.storage.local.set({ workspace: state.workspace });
}

function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function filteredRouteStops(route) {
  return route.skipCompleted ? route.stops.filter((stop) => !isFinishedStop(stop)) : route.stops;
}

function mapsPlaceUrl(stop) {
  if (stop?.url) return stop.url;
  const query = stopQuery(stop || {});
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : "";
}

function replaceActiveStops(route, replacement) {
  const queue = [...replacement];
  route.stops = route.stops.map((stop) => isFinishedStop(stop) ? stop : queue.shift());
}

function updateSummary(route) {
  const pending = route.stops.filter((stop) => !isFinishedStop(stop));
  elements.summaryRemaining.textContent = pending.length;
  const allCoordinates = pending.length > 1 && pending.every((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng));
  elements.summaryDistance.textContent = allCoordinates ? `${routeDistanceKm(pending).toFixed(1)} km` : "—";
  const serviceMinutes = pending.reduce((sum, stop) => sum + (Number(stop.serviceMinutes) || 0), 0);
  elements.summaryService.textContent = formatMinutes(serviceMinutes);
  const schedule = planRouteDay(route.stops, route);
  elements.summaryFinish.textContent = schedule.length ? formatClockMinutes(schedule.at(-1).endMinutes) : "—";

  const done = route.stops.filter((stop) => stop.status === "done").length;
  const skipped = route.stops.filter((stop) => stop.status === "skipped").length;
  const processed = done + skipped;
  const progress = route.stops.length ? Math.round(processed / route.stops.length * 100) : 0;
  elements.progressLabel.textContent = `${done} done${skipped ? ` · ${skipped} skipped` : ""} · ${progress}%`;
  elements.progressBar.style.width = `${progress}%`;
  const issueCount = schedule.filter((entry) => !isFinishedStop(entry.stop) && entry.late).length;
  elements.scheduleIssueLabel.textContent = issueCount ? `${issueCount} schedule ${issueCount === 1 ? "conflict" : "conflicts"}` : "No schedule conflicts";
  elements.scheduleIssueLabel.classList.toggle("has-issues", issueCount > 0);

  const next = route.stops.find((stop) => stop.status === "in_progress") || pending[0];
  elements.nextVisitCard.hidden = !next;
  if (next) {
    const entry = schedule.find((item) => item.stop.id === next.id);
    elements.nextVisitTitle.textContent = next.name;
    const time = entry ? formatClockMinutes(entry.plannedStartMinutes) : route.startTime;
    const details = [time, next.taskType, next.contactName].filter(Boolean);
    elements.nextVisitMeta.textContent = details.join(" · ") || "Ready to visit";
    elements.nextVisitActionButton.textContent = next.status === "in_progress" ? "Complete" : "Start";
    elements.nextVisitCard.dataset.stopId = next.id;
  } else {
    delete elements.nextVisitCard.dataset.stopId;
  }
  return schedule;
}

function renderRoutePicker(route) {
  elements.routeSelect.replaceChildren();
  state.workspace.routes.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    option.selected = item.id === route.id;
    elements.routeSelect.append(option);
  });
  elements.routeCount.textContent = `${state.workspace.routes.length} / ${MAX_ROUTE_LIMIT}`;
  elements.deleteRouteButton.disabled = state.workspace.routes.length === 1;
}

function stopMatches(a, b) {
  if (a.url && b.url && a.url === b.url) return true;
  if (Number.isFinite(a.lat) && Number.isFinite(a.lng) && Number.isFinite(b.lat) && Number.isFinite(b.lng)) {
    return Math.abs(a.lat - b.lat) < 0.00008 && Math.abs(a.lng - b.lng) < 0.00008;
  }
  return a.name?.trim().toLowerCase() === b.name?.trim().toLowerCase() &&
    a.address?.trim().toLowerCase() === b.address?.trim().toLowerCase();
}

function renderStop(stop, index, route, scheduleEntry) {
  const fragment = elements.stopTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".stop-card");
  card.dataset.id = stop.id;
  card.classList.toggle("is-done", stop.status === "done");
  card.classList.toggle("is-skipped", stop.status === "skipped");
  card.classList.toggle("is-active", stop.status === "in_progress");
  card.classList.toggle("is-late", Boolean(scheduleEntry?.late));
  card.classList.toggle("is-high", stop.priority === "high");
  card.classList.toggle("is-urgent", stop.priority === "urgent");
  fragment.querySelector(".stop-index").textContent = index + 1;

  const done = fragment.querySelector(".stop-done");
  done.checked = stop.status === "done";
  done.addEventListener("change", async () => {
    stop.status = done.checked ? "done" : "pending";
    stop.completedAt = done.checked ? new Date().toISOString() : "";
    await saveWorkspace();
    render();
  });

  const name = fragment.querySelector(".stop-name");
  name.value = stop.name;
  name.addEventListener("change", async () => {
    stop.name = name.value.trim() || `Stop ${index + 1}`;
    await saveWorkspace();
    renderRoutePicker(route);
  });

  const address = fragment.querySelector(".stop-address");
  address.textContent = stop.address || (Number.isFinite(stop.lat) ? `${stop.lat.toFixed(5)}, ${stop.lng.toFixed(5)}` : "Address only · optimization unavailable");

  const timeBadge = fragment.querySelector(".stop-time-badge");
  if (scheduleEntry && !isFinishedStop(stop)) {
    timeBadge.textContent = scheduleEntry.late
      ? `⚠ ${formatClockMinutes(scheduleEntry.plannedStartMinutes)}`
      : formatClockMinutes(scheduleEntry.plannedStartMinutes);
    timeBadge.title = scheduleEntry.invalidWindow
      ? "The visit time window ends before it starts"
      : scheduleEntry.late ? "The planned arrival is after this visit window" : "Planned visit time";
  }

  const status = fragment.querySelector(".stop-status");
  status.value = stop.status || "pending";
  status.addEventListener("change", async () => {
    stop.status = status.value;
    stop.completedAt = stop.status === "done" ? (stop.completedAt || new Date().toISOString()) : "";
    await saveWorkspace();
    render();
  });

  const priority = fragment.querySelector(".stop-priority");
  priority.value = stop.priority || "normal";
  priority.addEventListener("change", async () => {
    stop.priority = priority.value;
    await saveWorkspace();
    render();
  });

  const duration = fragment.querySelector(".stop-duration");
  duration.value = stop.serviceMinutes || 0;
  duration.addEventListener("change", async () => {
    stop.serviceMinutes = Math.min(480, Math.max(0, Number(duration.value) || 0));
    await saveWorkspace();
    render();
  });

  const note = fragment.querySelector(".stop-note");
  note.value = stop.note || "";
  note.addEventListener("change", async () => {
    stop.note = note.value.trim();
    await saveWorkspace();
  });

  const taskType = fragment.querySelector(".stop-task-type");
  taskType.value = stop.taskType || "";
  taskType.addEventListener("change", async () => {
    stop.taskType = taskType.value.trim().slice(0, 80);
    await saveWorkspace();
    render();
  });

  const contactName = fragment.querySelector(".stop-contact-name");
  contactName.value = stop.contactName || "";
  contactName.addEventListener("change", async () => {
    stop.contactName = contactName.value.trim().slice(0, 100);
    await saveWorkspace();
    render();
  });

  const contactPhone = fragment.querySelector(".stop-contact-phone");
  contactPhone.value = stop.contactPhone || "";
  contactPhone.addEventListener("change", async () => {
    stop.contactPhone = contactPhone.value.trim().slice(0, 60);
    await saveWorkspace();
  });

  const windowStart = fragment.querySelector(".stop-window-start");
  const windowEnd = fragment.querySelector(".stop-window-end");
  windowStart.value = stop.timeWindowStart || "";
  windowEnd.value = stop.timeWindowEnd || "";
  const saveWindow = async () => {
    stop.timeWindowStart = normalizeTime(windowStart.value);
    stop.timeWindowEnd = normalizeTime(windowEnd.value);
    await saveWorkspace();
    render();
  };
  windowStart.addEventListener("change", saveWindow);
  windowEnd.addEventListener("change", saveWindow);

  if (stop.taskType || stop.contactName || stop.contactPhone || stop.timeWindowStart || stop.timeWindowEnd) {
    fragment.querySelector(".job-details").open = true;
  }

  const openStop = fragment.querySelector(".open-stop");
  const placeUrl = mapsPlaceUrl(stop);
  openStop.disabled = !placeUrl;
  openStop.addEventListener("click", () => placeUrl && chrome.tabs.create({ url: placeUrl }));
  fragment.querySelector(".move-up").disabled = index === 0;
  fragment.querySelector(".move-up").addEventListener("click", () => moveStop(index, -1));
  fragment.querySelector(".move-down").disabled = index === route.stops.length - 1;
  fragment.querySelector(".move-down").addEventListener("click", () => moveStop(index, 1));
  fragment.querySelector(".remove-stop").addEventListener("click", () => removeStop(index));

  card.addEventListener("dragstart", () => {
    state.draggedStopId = stop.id;
    card.classList.add("is-dragging");
  });
  card.addEventListener("dragend", () => {
    state.draggedStopId = null;
    card.classList.remove("is-dragging");
  });
  card.addEventListener("dragover", (event) => event.preventDefault());
  card.addEventListener("drop", async (event) => {
    event.preventDefault();
    const from = route.stops.findIndex((item) => item.id === state.draggedStopId);
    const to = route.stops.findIndex((item) => item.id === stop.id);
    if (from < 0 || to < 0 || from === to) return;
    const [moved] = route.stops.splice(from, 1);
    route.stops.splice(to, 0, moved);
    await saveWorkspace();
    render();
  });
  return fragment;
}

function render() {
  const route = activeRoute();
  state.workspace.activeRouteId = route.id;
  renderRoutePicker(route);
  elements.travelMode.value = route.travelMode;
  elements.scheduledDate.value = route.scheduledDate || "";
  elements.startTime.value = route.startTime || "08:00";
  elements.travelBufferMinutes.value = route.travelBufferMinutes ?? 15;
  elements.keepLastFixed.checked = route.keepLastFixed;
  elements.skipCompleted.checked = route.skipCompleted;
  elements.stopList.replaceChildren();
  const schedule = planRouteDay(route.stops, route);
  const scheduleByStopId = new Map(schedule.map((entry) => [entry.stop.id, entry]));
  route.stops.forEach((stop, index) => elements.stopList.append(renderStop(stop, index, route, scheduleByStopId.get(stop.id))));

  elements.emptyState.hidden = route.stops.length > 0;
  elements.stopCount.textContent = `${route.stops.length} / ${MAX_STOP_LIMIT}`;
  elements.clearButton.hidden = route.stops.length === 0;
  elements.clearCompletedButton.hidden = !route.stops.some(isFinishedStop);
  const navigableStops = filteredRouteStops(route);
  elements.openRouteButton.disabled = navigableStops.length < 2;
  const sectionCount = Math.max(1, Math.ceil((navigableStops.length - 1) / 9));
  elements.openRouteButton.textContent = sectionCount > 1
    ? `Open ${sectionCount} connected route sections`
    : "Open route in Google Maps";
  updateSummary(route);
}

async function moveStop(index, delta) {
  const route = activeRoute();
  const target = index + delta;
  if (target < 0 || target >= route.stops.length) return;
  [route.stops[index], route.stops[target]] = [route.stops[target], route.stops[index]];
  await saveWorkspace();
  render();
}

async function removeStop(index) {
  activeRoute().stops.splice(index, 1);
  await saveWorkspace();
  render();
}

async function capturePlace() {
  const route = activeRoute();
  if (route.stops.length >= MAX_STOP_LIMIT) return showNotice(`The route limit is ${MAX_STOP_LIMIT} stops.`, true);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/^https:\/\/(www\.|maps\.)?google\.com\/maps\//.test(tab.url || "")) {
    return showNotice("Open Google Maps and select a place first.", true);
  }
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "ROUTEMATE_CAPTURE_PLACE" });
    if (!response?.ok) throw new Error("Could not read this place.");
    const place = response.place;
    if (route.stops.some((stop) => stopMatches(stop, place))) return showNotice("This place is already in the active route.", true);
    route.stops.push({
      id: crypto.randomUUID(),
      ...place,
      note: "",
      status: "pending",
      priority: "normal",
      serviceMinutes: 0,
      timeWindowStart: "",
      timeWindowEnd: "",
      taskType: "",
      contactName: "",
      contactPhone: "",
      completedAt: "",
      createdAt: new Date().toISOString()
    });
    await saveWorkspace();
    render();
    showNotice(`Added “${place.name}”.`);
  } catch {
    showNotice("Refresh the Google Maps tab once, then try again.", true);
  }
}

function download(name, type, content) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function loadInitialState() {
  const saved = await chrome.storage.local.get(["workspace", "stops", "travelMode"]);
  state.workspace = migrateStoredState(saved);
  await chrome.storage.local.set({ workspace: state.workspace });
  render();
}

elements.routeSelect.addEventListener("change", async () => {
  state.workspace.activeRouteId = elements.routeSelect.value;
  await saveWorkspace();
  render();
});
elements.newRouteButton.addEventListener("click", async () => {
  if (state.workspace.routes.length >= MAX_ROUTE_LIMIT) return showNotice(`The workspace limit is ${MAX_ROUTE_LIMIT} routes.`, true);
  const name = prompt("Route name", `Route ${state.workspace.routes.length + 1}`);
  if (!name?.trim()) return;
  const route = createRoute(name);
  state.workspace.routes.push(route);
  state.workspace.activeRouteId = route.id;
  await saveWorkspace();
  render();
});
elements.duplicateRouteButton.addEventListener("click", async () => {
  if (state.workspace.routes.length >= MAX_ROUTE_LIMIT) return showNotice(`The workspace limit is ${MAX_ROUTE_LIMIT} routes.`, true);
  const source = activeRoute();
  const name = prompt("Name for the reusable copy", `${source.name} copy`);
  if (!name?.trim()) return;
  const route = duplicateRoute(source, name.trim().slice(0, 80));
  state.workspace.routes.push(route);
  state.workspace.activeRouteId = route.id;
  await saveWorkspace();
  render();
  showNotice(`Created a fresh copy with ${route.stops.length} pending visits.`);
});
elements.renameRouteButton.addEventListener("click", async () => {
  const route = activeRoute();
  const name = prompt("Route name", route.name);
  if (!name?.trim()) return;
  route.name = name.trim().slice(0, 80);
  await saveWorkspace();
  render();
});
elements.deleteRouteButton.addEventListener("click", async () => {
  if (state.workspace.routes.length === 1) return;
  const route = activeRoute();
  if (!confirm(`Delete “${route.name}” and its ${route.stops.length} stops?`)) return;
  state.workspace.routes = state.workspace.routes.filter((item) => item.id !== route.id);
  state.workspace.activeRouteId = state.workspace.routes[0].id;
  await saveWorkspace();
  render();
});
elements.captureButton.addEventListener("click", capturePlace);
elements.travelMode.addEventListener("change", async () => {
  activeRoute().travelMode = elements.travelMode.value;
  await saveWorkspace();
});
elements.scheduledDate.addEventListener("change", async () => {
  activeRoute().scheduledDate = elements.scheduledDate.value;
  await saveWorkspace();
});
elements.startTime.addEventListener("change", async () => {
  activeRoute().startTime = normalizeTime(elements.startTime.value) || "08:00";
  await saveWorkspace();
  render();
});
elements.travelBufferMinutes.addEventListener("change", async () => {
  activeRoute().travelBufferMinutes = Math.min(240, Math.max(0, Number(elements.travelBufferMinutes.value) || 0));
  await saveWorkspace();
  render();
});
elements.keepLastFixed.addEventListener("change", async () => {
  activeRoute().keepLastFixed = elements.keepLastFixed.checked;
  await saveWorkspace();
});
elements.skipCompleted.addEventListener("change", async () => {
  activeRoute().skipCompleted = elements.skipCompleted.checked;
  await saveWorkspace();
  render();
});
elements.clearButton.addEventListener("click", async () => {
  const route = activeRoute();
  if (!confirm(`Remove all ${route.stops.length} stops from “${route.name}”?`)) return;
  route.stops = [];
  await saveWorkspace();
  render();
});
elements.clearCompletedButton.addEventListener("click", async () => {
  const route = activeRoute();
  route.stops = route.stops.filter((stop) => !isFinishedStop(stop));
  await saveWorkspace();
  render();
});
elements.nextVisitOpenButton.addEventListener("click", () => {
  const stop = activeRoute().stops.find((item) => item.id === elements.nextVisitCard.dataset.stopId);
  const url = mapsPlaceUrl(stop);
  if (url) chrome.tabs.create({ url });
});
elements.nextVisitActionButton.addEventListener("click", async () => {
  const route = activeRoute();
  const stop = route.stops.find((item) => item.id === elements.nextVisitCard.dataset.stopId);
  if (!stop) return;
  if (stop.status === "in_progress") {
    stop.status = "done";
    stop.completedAt = new Date().toISOString();
    showNotice(`Completed “${stop.name}”.`);
  } else {
    route.stops.forEach((item) => {
      if (item.status === "in_progress") item.status = "pending";
    });
    stop.status = "in_progress";
    stop.completedAt = "";
    showNotice(`Started “${stop.name}”.`);
  }
  await saveWorkspace();
  render();
});
elements.openRouteButton.addEventListener("click", async () => {
  try {
    const route = activeRoute();
    const urls = buildDirectionsUrls(filteredRouteStops(route), route.travelMode);
    for (const [index, url] of urls.entries()) await chrome.tabs.create({ url, active: index === 0 });
    showNotice(urls.length > 1 ? `Opened ${urls.length} connected route sections.` : "Route opened in Google Maps.");
  } catch (error) { showNotice(error.message, true); }
});
elements.optimizeButton.addEventListener("click", async () => {
  const route = activeRoute();
  const pending = route.stops.filter((stop) => !isFinishedStop(stop));
  if (pending.length < 3) return showNotice("Add at least three pending stops before optimization.", true);
  try {
    const optimized = optimizeRoute(pending, { keepLastFixed: route.keepLastFixed });
    const before = routeDistanceKm(pending);
    const after = routeDistanceKm(optimized);
    replaceActiveStops(route, optimized);
    await saveWorkspace();
    render();
    showNotice(`Optimized pending stops: ${before.toFixed(1)} → ${after.toFixed(1)} km straight-line.`);
  } catch (error) { showNotice(error.message, true); }
});
elements.reverseButton.addEventListener("click", async () => {
  const route = activeRoute();
  const pending = route.stops.filter((stop) => !isFinishedStop(stop)).reverse();
  replaceActiveStops(route, pending);
  await saveWorkspace();
  render();
});
elements.exportButton.addEventListener("click", () => {
  const route = activeRoute();
  download(`${route.name.replace(/[^a-z0-9_-]+/gi, "-") || "route"}.csv`, "text/csv;charset=utf-8", `\uFEFF${toCsv(route.stops, route.name)}`);
});
elements.backupButton.addEventListener("click", () => {
  download("routemate-workspace.json", "application/json", JSON.stringify(state.workspace, null, 2));
});
elements.importButton.addEventListener("click", () => elements.importFile.click());
elements.importFile.addEventListener("change", async () => {
  const [file] = elements.importFile.files;
  if (!file) return;
  try {
    const text = await file.text();
    if (file.name.toLowerCase().endsWith(".csv")) {
      if (state.workspace.routes.length >= MAX_ROUTE_LIMIT) throw new Error(`The workspace limit is ${MAX_ROUTE_LIMIT} routes.`);
      const route = createRoute(file.name.replace(/\.csv$/i, ""));
      route.stops = stopsFromCsv(text);
      state.workspace.routes.push(route);
      state.workspace.activeRouteId = route.id;
      showNotice(`Imported ${route.stops.length} stops into a new route.`);
    } else {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        activeRoute().stops = normalizeImportedStops(parsed);
        showNotice(`Restored ${activeRoute().stops.length} stops.`);
      } else {
        state.workspace = normalizeWorkspace(parsed);
        showNotice(`Restored ${state.workspace.routes.length} routes.`);
      }
    }
    await saveWorkspace();
    render();
  } catch (error) { showNotice(error.message, true); }
  elements.importFile.value = "";
});

loadInitialState();
