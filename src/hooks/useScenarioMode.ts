"use client";

import { useEffect, useRef } from "react";
import { ref, get, set } from "firebase/database";
import { db } from "../firebase";

interface VirtualModule {
  id: string;
  type: "mother" | "pump" | "field";
}

export function useScenarioMode(
  userId: string,
  modules: VirtualModule[],
  active: boolean,
  killedSet: Set<string>
) {
  const intervalMinRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const intervalHourRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active || !userId) return;

    const fieldIds = modules.filter((m) => m.type === "field" && !killedSet.has(m.id)).map((m) => m.id);
    const pumpIds = modules.filter((m) => m.type === "pump").map((m) => m.id);

    const runMinute = async () => {
      let anyPumpOn = false;
      for (const pumpId of pumpIds) {
        const cmdRef = ref(db, `users/${userId}/commands/${pumpId}`);
        const snap = await get(cmdRef);
        const data = snap.val() as { pumpOn?: boolean } | null;
        if (data?.pumpOn) anyPumpOn = true;
      }

      for (const moduleId of fieldIds) {
        const sensorRef = ref(db, `users/${userId}/sensorData/${moduleId}/latest`);
        const snap = await get(sensorRef);
        const data = (snap.val() || {}) as { humidity?: number; battery?: number };
        const currentH = typeof data.humidity === "number" ? data.humidity : 50;
        const delta = anyPumpOn ? +3 : -5;
        const newH = Math.max(0, Math.min(100, currentH + delta));
        await set(sensorRef, { ...data, timestamp: Date.now(), humidity: newH });
      }
    };

    const runHour = async () => {
      for (const moduleId of fieldIds) {
        const sensorRef = ref(db, `users/${userId}/sensorData/${moduleId}/latest`);
        const moduleRef = ref(db, `users/${userId}/modules/${moduleId}`);
        const [sensorSnap, moduleSnap] = await Promise.all([get(sensorRef), get(moduleRef)]);
        const sensorData = (sensorSnap.val() || {}) as { battery?: number };
        const moduleData = (moduleSnap.val() || {}) as { battery?: number };
        const current = sensorData.battery ?? moduleData.battery ?? 80;
        const newB = Math.max(0, current - 1);
        await set(sensorRef, { ...sensorData, timestamp: Date.now(), battery: newB });
        if (moduleSnap.exists()) {
          await set(moduleRef, { ...moduleSnap.val(), battery: newB });
        }
      }
    };

    intervalMinRef.current = setInterval(runMinute, 60 * 1000);
    intervalHourRef.current = setInterval(runHour, 60 * 60 * 1000);
    runMinute();

    return () => {
      if (intervalMinRef.current) clearInterval(intervalMinRef.current);
      if (intervalHourRef.current) clearInterval(intervalHourRef.current);
    };
  }, [userId, active, modules.map((m) => m.id + m.type).join(","), Array.from(killedSet).sort().join(",")]);
}
