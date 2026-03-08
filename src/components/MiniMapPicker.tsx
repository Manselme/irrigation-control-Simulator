"use client";

import { useCallback } from "react";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Position } from "../types";

interface MiniMapPickerProps {
  lat: number;
  lng: number;
  onPick: (pos: Position) => void;
  onClose: () => void;
}

function ClickHandler({ onPick }: { onPick: (pos: Position) => void }) {
  useMapEvents({
    click: (e) => {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export function MiniMapPicker({ lat, lng, onPick, onClose }: MiniMapPickerProps) {
  const center: [number, number] = [lat, lng];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-slate-800 rounded-lg border border-surface-border overflow-hidden max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-2 border-b border-surface-border">
          <span className="text-sm text-slate-400">Cliquez sur la carte pour choisir la position</span>
          <button type="button" onClick={onClose} className="btn-outline text-xs py-1 px-2">
            Fermer
          </button>
        </div>
        <div className="h-[400px] w-full [&_.leaflet-container]:rounded-b-lg">
          <MapContainer
            center={center}
            zoom={10}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickHandler onPick={onPick} />
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
