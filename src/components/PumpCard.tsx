"use client";

import { useEffect, useState, useRef } from "react";
import { ref, get, set, onValue, off } from "firebase/database";
import { db } from "../firebase";
import { Droplets } from "lucide-react";

interface PumpCardProps {
  moduleId: string;
  userId: string;
  pressure: number;
  lastSeen: number;
  isKilled: boolean;
  onToggleKill: () => void;
  onUpdateModule: (updates: Record<string, unknown>) => Promise<void>;
}

export function PumpCard({
  moduleId,
  userId,
  pressure,
  lastSeen,
  isKilled,
  onToggleKill,
  onUpdateModule,
}: PumpCardProps) {
  const [loraDelaySec, setLoraDelaySec] = useState(3);
  const [pumpOn, setPumpOn] = useState(false);
  const [valveOpen, setValveOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    const commandsRef = ref(db, `users/${userId}/commands/${moduleId}`);
    const unsub = onValue(commandsRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.val() as { status?: string; type?: string; pumpOn?: boolean; valveOpen?: boolean };
      if (data.status === "confirmed" || data.status === "failed") {
        if (data.pumpOn !== undefined) setPumpOn(data.pumpOn);
        if (data.valveOpen !== undefined) setValveOpen(data.valveOpen);
        return;
      }
      if (data.status !== "pending" || !data.type) return;

      const delayMs = loraDelaySec * 1000;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(async () => {
        timeoutRef.current = null;
        const payload: Record<string, unknown> = {
          ...data,
          status: "confirmed",
          confirmedAt: Date.now(),
        };
        const t = data.type as string;
        if (t === "PUMP_ON") payload.pumpOn = true;
        else if (t === "PUMP_OFF") payload.pumpOn = false;
        else if (t === "VALVE_OPEN") payload.valveOpen = true;
        else if (t === "VALVE_CLOSE") payload.valveOpen = false;
        await set(commandsRef, payload);
      }, delayMs);
    });

    return () => {
      off(commandsRef, unsub);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [userId, moduleId, loraDelaySec]);

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-slate-400" />
          <h3 className="text-base font-semibold text-slate-100">Module Pompe</h3>
        </div>
        <span className="text-xs font-mono text-slate-500">{moduleId}</span>
      </div>

      <div>
        <label className="label">Pression (bar) 0–10</label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={pressure}
            onChange={(e) => onUpdateModule({ pressure: parseFloat(e.target.value) })}
            className="flex-1 max-w-[12rem]"
          />
          <span className="text-sm tabular-nums w-10">{pressure}</span>
        </div>
      </div>

      <div>
        <label className="label">Délai LoRa (s)</label>
        <select
          className="input"
          value={loraDelaySec}
          onChange={(e) => setLoraDelaySec(Number(e.target.value))}
        >
          {[2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n} s</option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between rounded border border-surface-border px-3 py-2">
        <span className="text-sm text-slate-400">Pompe</span>
        <span className="text-sm font-medium">{pumpOn ? "Allumée" : "Éteinte"}</span>
      </div>
      <div className="flex items-center justify-between rounded border border-surface-border px-3 py-2">
        <span className="text-sm text-slate-400">Vanne</span>
        <span className="text-sm font-medium">{valveOpen ? "Ouverte" : "Fermée"}</span>
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
