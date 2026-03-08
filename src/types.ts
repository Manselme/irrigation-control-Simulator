export type ModuleType = "mother" | "pump" | "field";

export interface Position {
  lat: number;
  lng: number;
}

export interface Module {
  id: string;
  type: ModuleType;
  farmId: string;
  zoneId?: string;
  lastSeen: number;
  battery?: number;
  online: boolean;
  position?: Position;
  pressure?: number;
  name?: string;
}

export type ModuleUpdate = Partial<
  Pick<Module, "battery" | "online" | "pressure" | "position" | "name" | "lastSeen">
>;

export type SimulationMode = "manual" | "scenario";

export type MotherStatus = "online" | "offline" | "high_latency";
