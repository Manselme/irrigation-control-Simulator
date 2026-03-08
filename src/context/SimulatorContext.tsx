"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { SimulationMode } from "../types";

interface SimulatorContextValue {
  targetUserId: string;
  setTargetUserId: (id: string) => void;
  killedModules: Set<string>;
  toggleKill: (moduleId: string) => void;
  isKilled: (moduleId: string) => boolean;
  simulationMode: SimulationMode;
  setSimulationMode: (mode: SimulationMode) => void;
}

const SimulatorContext = createContext<SimulatorContextValue | null>(null);

export function SimulatorProvider({
  children,
  defaultUserId,
}: {
  children: ReactNode;
  defaultUserId: string;
}) {
  const [targetUserId, setTargetUserId] = useState(defaultUserId);
  const [killedModules, setKilledModules] = useState<Set<string>>(new Set());
  const [simulationMode, setSimulationMode] = useState<SimulationMode>("manual");

  const toggleKill = useCallback((moduleId: string) => {
    setKilledModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }, []);

  const isKilled = useCallback(
    (moduleId: string) => killedModules.has(moduleId),
    [killedModules]
  );

  return (
    <SimulatorContext.Provider
      value={{
        targetUserId,
        setTargetUserId,
        killedModules,
        toggleKill,
        isKilled,
        simulationMode,
        setSimulationMode,
      }}
    >
      {children}
    </SimulatorContext.Provider>
  );
}

export function useSimulator() {
  const ctx = useContext(SimulatorContext);
  if (!ctx) throw new Error("useSimulator must be used within SimulatorProvider");
  return ctx;
}
