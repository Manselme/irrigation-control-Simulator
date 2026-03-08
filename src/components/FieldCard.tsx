"use client";

import { useState, useEffect } from "react";
import { ref, get, set, onValue } from "firebase/database";
import { db } from "../firebase";
import { Sprout } from "lucide-react";
import type { Position } from "../types";
import { MiniMapPicker } from "./MiniMapPicker";

interface FieldCardProps {
  moduleId: string;
  userId: string;
  battery: number;
  humidity: number;
  ph: number;
  position: Position | undefined;
  lastSeen: number;
  isKilled: boolean;
  onToggleKill: () => void;
  onUpdateModule: (updates: Record<string, unknown>) => Promise<void>;
}

export function FieldCard({
  moduleId,
  userId,
  battery,
  humidity,
  ph,
  position,
  lastSeen,
  isKilled,
  onToggleKill,
  onUpdateModule,
}: FieldCardProps) {
  const [localBattery, setLocalBattery] = useState(battery);
  const [localHumidity, setLocalHumidity] = useState(humidity);
  const [localPh, setLocalPh] = useState(ph);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    setLocalBattery(battery);
    setLocalHumidity(humidity);
    setLocalPh(ph);
  }, [battery, humidity, ph]);

  useEffect(() => {
    const sensorRef = ref(db, `users/${userId}/sensorData/${moduleId}/latest`);
    const unsub = onValue(sensorRef, (snap) => {
      if (!snap.exists()) return;
      const v = snap.val() as { battery?: number; humidity?: number; ph?: number };
      if (typeof v.battery === "number") setLocalBattery(v.battery);
      if (typeof v.humidity === "number") setLocalHumidity(v.humidity);
      if (typeof v.ph === "number") setLocalPh(v.ph);
    });
    return () => unsub();
  }, [userId, moduleId]);

  useEffect(() => {
    if (isKilled) return;
    const moduleRef = ref(db, `users/${userId}/modules/${moduleId}`);
    const updateLastSeen = () => {
      get(moduleRef).then((snap) => {
        if (!snap.exists()) return;
        const data = snap.val() as Record<string, unknown>;
        set(moduleRef, { ...data, lastSeen: Date.now(), online: true });
      });
    };
    const id = setInterval(updateLastSeen, 2000);
    return () => clearInterval(id);
  }, [userId, moduleId, isKilled]);

  const writeSensor = (updates: { humidity?: number; ph?: number; battery?: number }) => {
    const sensorRef = ref(db, `users/${userId}/sensorData/${moduleId}/latest`);
    const payload = { timestamp: Date.now(), ...updates };
    set(sensorRef, payload);
  };

  const handleBattery = (v: number) => {
    setLocalBattery(v);
    onUpdateModule({ battery: v });
    writeSensor({ battery: v });
  };

  const handleHumidity = (v: number) => {
    setLocalHumidity(v);
    writeSensor({ humidity: v });
  };

  const handlePh = (v: number) => {
    setLocalPh(v);
    writeSensor({ ph: v });
  };

  const handlePosition = (pos: Position) => {
    onUpdateModule({ position: pos });
    setShowMap(false);
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sprout className="h-5 w-5 text-slate-400" />
          <h3 className="text-base font-semibold text-slate-100">Module Champ</h3>
        </div>
        <span className="text-xs font-mono text-slate-500">{moduleId}</span>
      </div>

      <div>
        <label className="label">Batterie (%)</label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            value={localBattery}
            onChange={(e) => handleBattery(parseInt(e.target.value, 10))}
            className="flex-1 max-w-[12rem]"
          />
          <span className="text-sm tabular-nums w-10">{localBattery}%</span>
        </div>
      </div>

      <div>
        <label className="label">Humidité sol (%)</label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            value={localHumidity}
            onChange={(e) => handleHumidity(parseInt(e.target.value, 10))}
            className="flex-1 max-w-[12rem]"
          />
          <span className="text-sm tabular-nums w-10">{localHumidity}%</span>
        </div>
      </div>

      <div>
        <label className="label">pH (0–14)</label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={14}
            step={0.5}
            value={localPh}
            onChange={(e) => handlePh(parseFloat(e.target.value))}
            className="flex-1 max-w-[12rem]"
          />
          <span className="text-sm tabular-nums w-10">{localPh}</span>
        </div>
      </div>

      <div>
        <label className="label">GPS</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            step={0.0001}
            className="input"
            placeholder="Lat"
            value={position?.lat ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              const lat = v === "" ? 0 : parseFloat(v) || 0;
              onUpdateModule({ position: { lat, lng: position?.lng ?? 0 } });
            }}
          />
          <input
            type="number"
            step={0.0001}
            className="input"
            placeholder="Lng"
            value={position?.lng ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              const lng = v === "" ? 0 : parseFloat(v) || 0;
              onUpdateModule({ position: { lat: position?.lat ?? 0, lng } });
            }}
          />
        </div>
        <button
          type="button"
          className="btn-outline mt-2 w-full text-xs"
          onClick={() => setShowMap(true)}
        >
          Choisir sur la carte
        </button>
        {showMap && (
          <MiniMapPicker
            lat={position?.lat ?? 46.6}
            lng={position?.lng ?? 1.9}
            onPick={handlePosition}
            onClose={() => setShowMap(false)}
          />
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-surface-border">
        <span className="text-xs text-slate-500">
          lastSeen: {lastSeen ? new Date(lastSeen).toLocaleTimeString() : "—"}
        </span>
        <button
          type="button"
          onClick={onToggleKill}
          className={isKilled ? "btn-outline" : "btn-danger"}
        >
          {isKilled ? "Réactiver" : "Kill Switch"}
        </button>
      </div>
    </div>
  );
}
