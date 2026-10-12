import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import { markerLabel } from "./itinerary.js";

const BRNO = [49.195, 16.608];
// Keeps the route clear of the floating panel on wide screens
const PANEL_WIDTH = 440;

export default function RouteMap({ shape, stops, loop, focusedStop }) {
  return (
    <MapContainer className="map" center={BRNO} zoom={8} zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <ZoomControl />
      {shape.length > 0 && (
        <>
          <Polyline positions={shape} pathOptions={{ color: "#ffffff", weight: 9, opacity: 0.9 }} />
          <Polyline positions={shape} pathOptions={{ color: "#ea580c", weight: 5 }} />
        </>
      )}
      {/* Div icons, Leaflet's default pin images don't resolve through the bundler */}
      {stops.map((stop, index) =>
        // A loop's finish sits on its start, one marker is enough
        loop && index === stops.length - 1 ? null : (
          <Marker
            key={index}
            position={[stop.lat, stop.lon]}
            icon={stopIcon(stop, index, loop, focusedStop === index)}
            zIndexOffset={focusedStop === index ? 1000 : stop.kind === "stop" ? 0 : 500}
          >
            <Tooltip direction="top" offset={[0, -14]}>
              {stop.name}
            </Tooltip>
          </Marker>
        ),
      )}
      <FitToRoute shape={shape} />
      <FocusStop stop={focusedStop != null ? stops[focusedStop] : null} />
    </MapContainer>
  );
}

function stopIcon(stop, index, loop, focused) {
  const classes = ["map-marker", `is-${stop.kind}`, focused ? "focused" : ""].join(" ");
  return L.divIcon({
    className: "",
    html: `<span class="${classes}">${markerLabel(stop, index, loop)}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function padding(map) {
  const wide = map.getSize().x > 900;
  return {
    paddingTopLeft: [wide ? PANEL_WIDTH : 40, 40],
    paddingBottomRight: [40, 40],
  };
}

function FitToRoute({ shape }) {
  const map = useMap();
  useEffect(() => {
    if (shape.length > 0) map.fitBounds(shape, padding(map));
  }, [map, shape]);
  return null;
}

function FocusStop({ stop }) {
  const map = useMap();
  useEffect(() => {
    if (!stop) return;
    const wide = map.getSize().x > 900;
    // Offset the target so it lands in the middle of the visible map, not under the panel
    const zoom = Math.max(map.getZoom(), 13);
    const point = map.project([stop.lat, stop.lon], zoom).subtract([wide ? PANEL_WIDTH / 2 : 0, 0]);
    map.flyTo(map.unproject(point, zoom), zoom, { duration: 0.8 });
  }, [map, stop]);
  return null;
}

function ZoomControl() {
  const map = useMap();
  useEffect(() => {
    const control = L.control.zoom({ position: "bottomright" }).addTo(map);
    return () => control.remove();
  }, [map]);
  return null;
}
