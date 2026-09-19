# Market gap

Established route platforms focus on fleet-scale planning: time windows, job duration, priorities, live tracking, proof of delivery, driver apps, analytics, and ERP/CRM APIs. This is powerful but much heavier than the workflow of one technician or a very small team.

RouteMate's wedge is narrower:

1. discover or open a place in Google Maps;
2. add it to a reusable work route in one click;
3. attach the minimum job context;
4. reorder pending work locally;
5. continue navigation in the map the user already knows.

The product should not attempt to clone a fleet suite. It should become the fastest bridge between map discovery and a small field team's daily work.

## Signals from the market

- OptimoRoute highlights priority, time windows, variable job duration, live status, route changes, analytics, and API integration as core operational features: https://optimoroute.com/features/
- Google Routes supports waypoint optimization and up to 25 intermediate waypoints through its paid API surface: https://developers.google.com/maps/documentation/routes/intermed_waypoints
- Google recommends Place IDs over raw coordinates or address strings for routing accuracy: https://developers.google.com/maps/documentation/routes/specify_location

## Product implication

RouteMate v0.4 implements the lightweight operational layer—route templates, priority, duration, four-state execution, contacts, time windows, local schedule warnings, CSV interoperability, and improved local ordering—without accounts or a backend. It deliberately does not pretend that its configurable travel buffer is traffic-aware ETA. Road-aware routing, Place IDs, dispatch, and collaboration belong to later validated stages.
