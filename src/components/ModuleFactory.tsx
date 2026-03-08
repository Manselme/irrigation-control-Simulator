"use client";

import { useState } from "react";
import { ref, get, set, push } from "firebase/database";
import { db } from "../firebase";
import type { ModuleType } from "../types";

const SIM_FARM_NAME = "Ferme Simulation";
const TYPE_PREFIX: Record<ModuleType, string> = {
  mother: "SIM_MERE",
  pump: "SIM_POMPE",
  field: "SIM_CHAMP",
};

function generateUniqueId(type: ModuleType): string {
  const prefix = TYPE_PREFIX[type];
  const suffix = Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("").toUpperCase();
  return `${prefix}_${suffix}`;
}

interface ModuleFactoryProps {
  targetUserId: string;
  onCreated: () => void;
}

export function ModuleFactory({ targetUserId, onCreated }: ModuleFactoryProps) {
  const [type, setType] = useState<ModuleType>("field");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!targetUserId.trim()) {
      setError("UserId cible requis.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const userId = targetUserId.trim();
      const farmsRef = ref(db, `users/${userId}/farms`);

      let farmId: string | null = null;
      const farmsSnap = await get(farmsRef);
      if (farmsSnap.exists()) {
        const data = farmsSnap.val() as Record<string, { name?: string }>;
        farmId = Object.keys(data)[0] ?? null;
      }
      if (!farmId) {
        const newFarmRef = push(farmsRef);
        await set(newFarmRef, { name: SIM_FARM_NAME });
        farmId = newFarmRef.key;
      }
      if (!farmId) throw new Error("Impossible de créer ou récupérer une ferme.");

      const newId = generateUniqueId(type);
      const moduleRef = ref(db, `users/${userId}/modules/${newId}`);
      const now = Date.now();
      await set(moduleRef, {
        type,
        farmId,
        lastSeen: now,
        online: true,
        simulator: true,
        ...(type === "pump" && { pressure: 2.5 }),
        ...(type === "field" && {
          battery: 80,
          position: { lat: 46.6, lng: 1.9 },
        }),
      });

      if (type === "field") {
        const sensorRef = ref(db, `users/${userId}/sensorData/${newId}/latest`);
        await set(sensorRef, {
          timestamp: now,
          humidity: 50,
          ph: 7,
          battery: 80,
        });
      }

      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la création.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card space-y-4">
      <h3 className="text-base font-semibold text-slate-100">Créer un nouveau module</h3>
      <div>
        <label className="label">Type de module</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ModuleType)}
          className="input"
        >
          <option value="mother">Module Mère (Passerelle)</option>
          <option value="pump">Module Pompe (Actionneur)</option>
          <option value="field">Module Champ (Capteur)</option>
        </select>
      </div>
      <p className="text-xs text-slate-500">
        ID généré : <code className="font-mono">{TYPE_PREFIX[type]}_????</code>
      </p>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="button"
        onClick={handleCreate}
        disabled={busy}
        className="btn-primary"
      >
        {busy ? "Création…" : "Créer le module"}
      </button>
    </div>
  );
}
