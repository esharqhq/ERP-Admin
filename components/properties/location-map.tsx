"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/** Roughly the centre of Germany, at country zoom — the view before a pin exists. */
const GERMANY: [number, number] = [51.1657, 10.4515];
const COUNTRY_ZOOM = 5;
const PIN_ZOOM = 15;

/**
 * Leaflet resolves its default marker images by relative URL, which no bundler
 * rewrites — the well-known "marker is a broken image" bug. A `divIcon` sidesteps
 * the whole mechanism: it is just markup, so nothing has to resolve.
 */
const pinIcon = L.divIcon({
  className: "",
  html: `<span style="
    display:block;width:18px;height:18px;border-radius:9999px;
    background:var(--primary,#10367d);
    border:3px solid #fff;
    box-shadow:0 1px 6px rgba(0,0,0,.45);
  "></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * Leaflet measures its container once, on mount. Inside a dialog that container
 * is still zero-height at that moment, which renders as a grey box with the
 * tiles offset. Re-measuring after the dialog has painted is the documented fix.
 */
function FixSize() {
  const map = useMap();
  useEffect(() => {
    const id = requestAnimationFrame(() => map.invalidateSize());
    return () => cancelAnimationFrame(id);
  }, [map]);
  return null;
}

/** Keeps the view on the pin when it moves from somewhere other than a map click. */
function Recenter({ point }: { point: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.setView(point, Math.max(map.getZoom(), PIN_ZOOM));
  }, [map, point]);
  return null;
}

export interface LocationMapProps {
  /** The placed point, or null when nothing has been picked yet. */
  value: { lat: number; long: number } | null;
  onChange: (lat: number, long: number) => void;
  className?: string;
}

export function LocationMap({ value, onChange, className }: LocationMapProps) {
  const point = useMemo<[number, number] | null>(
    () => (value ? [value.lat, value.long] : null),
    [value],
  );

  return (
    <MapContainer
      center={point ?? GERMANY}
      zoom={point ? PIN_ZOOM : COUNTRY_ZOOM}
      scrollWheelZoom
      className={className}
      // Leaflet's own control sits over the tiles; the surrounding dialog already
      // provides the frame, so only the zoom buttons are kept.
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <FixSize />
      <ClickToPlace onPick={onChange} />
      <Recenter point={point} />
      {point && (
        <Marker
          position={point}
          icon={pinIcon}
          draggable
          eventHandlers={{
            dragend(e) {
              const { lat, lng } = (e.target as L.Marker).getLatLng();
              onChange(lat, lng);
            },
          }}
        />
      )}
    </MapContainer>
  );
}
