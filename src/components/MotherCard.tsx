"use client";

import { useEffect, useState } from "react";
import { ref, get, set } from "firebase/database";
import { db } from "../firebase";
import type { MotherStatus } from "../types";
import { Cpu } from "lucide-react";

interface MotherCardProps {
  moduleId: string;
  userId: string;
  lastSeen: number;
  isKilled: boolean;
  onToggleKill: () => void;
  onUpdateModule: (updates: Record<string, unknown>) => Promise<void>;
}

const STATUS_OPTIONS: { value: MotherStatus; label: string }[] = [
  { value: "online", label: "En ligne" },
  { value: "offline", label: "Hors ligne" },
  { value: "high_latency", label: "Latence élevée" },
];

export function MotherCard({
  moduleId,
  userId,
  lastSeen,
  isKilled,
  onToggleKill,
  onUpdateModule,
}: MotherCardProps) {
  const [status, setStatus] = useState<MotherStatus>("online");

  useEffect(() => {
    if (isKilled || status === "offline") return;

    const moduleRef = ref(db, `users/${userId}/modules/${moduleId}`);
    const updateLastSeen = () => {
      get(moduleRef).then((snap) => {
        if (!snap.exists()) return;
        const data = snap.val() as Record<string, unknown>;
        set(moduleRef, { ...data, lastSeen: Date.now(), online: true });
      });
    };

    const intervalMs = status === "high_latency" ? 45000 : 2000;
    const id = setInterval(updateLastSeen, intervalMs);
    return () => clearInterval(id);
  }, [userId, moduleId, isKilled, status]);

  const handleStatusChange = (s: MotherStatus) => {
    setStatus(s);
    onUpdateModule({ online: s !== "offline" });
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-slate-400" />
          <h3 className="text-base font-semibold text-slate-100">Module Mère</h3>
        </div>
        <span className="text-xs font-mono text-slate-500">{moduleId}</span>
      </div>

      <div>
        <label className="label">Statut</label>
        <select
          className="input"
          value={status}
          onChange={(e) => handleStatusChange(e.target.value as MotherStatus)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
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
