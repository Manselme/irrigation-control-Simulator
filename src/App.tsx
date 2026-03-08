import { useState, useEffect, useCallback } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { ref, get, set, onValue } from "firebase/database";
import { auth, db, isFirebaseConfigured } from "./firebase";
import type { Module, ModuleType } from "./types";
import { SimulatorProvider, useSimulator } from "./context/SimulatorContext";
import { ModuleFactory } from "./components/ModuleFactory";
import { MotherCard } from "./components/MotherCard";
import { PumpCard } from "./components/PumpCard";
import { FieldCard } from "./components/FieldCard";
import { useScenarioMode } from "./hooks/useScenarioMode";

function parseModule(id: string, data: Record<string, unknown>): Module {
  const lastSeen = (data.lastSeen as number) ?? 0;
  return {
    id,
    type: (data.type as ModuleType) ?? "field",
    farmId: (data.farmId as string) ?? "",
    zoneId: data.zoneId as string | undefined,
    lastSeen,
    battery: data.battery as number | undefined,
    online: (data.online as boolean) ?? false,
    position: data.position as Module["position"],
    pressure: data.pressure as number | undefined,
    name: data.name as string | undefined,
  };
}

function Dashboard() {
  const { user } = useDashboardAuth();
  const {
    targetUserId,
    setTargetUserId,
    toggleKill,
    isKilled,
    simulationMode,
    setSimulationMode,
    killedModules,
  } = useSimulator();

  const [modules, setModules] = useState<Module[]>([]);

  useEffect(() => {
    if (!targetUserId.trim()) {
      setModules([]);
      return;
    }
    const modulesRef = ref(db, `users/${targetUserId}/modules`);
    const unsub = onValue(modulesRef, (snap) => {
      if (!snap.exists()) {
        setModules([]);
        return;
      }
      const data = snap.val() as Record<string, Record<string, unknown>>;
      const list = Object.entries(data)
        .filter(
          ([id, v]) =>
            id.startsWith("SIM_") || (v as { simulator?: boolean }).simulator === true
        )
        .map(([id, v]) => parseModule(id, v as Record<string, unknown>));
      setModules(list);
    });
    return () => unsub();
  }, [targetUserId]);

  useScenarioMode(
    targetUserId,
    modules.map((m) => ({ id: m.id, type: m.type })),
    simulationMode === "scenario",
    killedModules
  );

  const updateModule = useCallback(
    async (moduleId: string, updates: Record<string, unknown>) => {
      if (!targetUserId.trim()) return;
      const moduleRef = ref(db, `users/${targetUserId}/modules/${moduleId}`);
      const snap = await get(moduleRef);
      if (!snap.exists()) return;
      const current = snap.val() as Record<string, unknown>;
      await set(moduleRef, { ...current, ...updates });
    },
    [targetUserId]
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-border pb-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">
            Simulateur de modules IoT
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {user?.email} — Données en temps réel dans Firebase
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <label className="label">UserId cible</label>
            <input
              type="text"
              className="input w-48"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              placeholder="UID Firebase"
            />
          </div>
          <div>
            <label className="label">Mode</label>
            <select
              className="input w-32"
              value={simulationMode}
              onChange={(e) =>
                setSimulationMode(e.target.value as "manual" | "scenario")
              }
            >
              <option value="manual">Manuel</option>
              <option value="scenario">Scénario</option>
            </select>
          </div>
          <button type="button" className="btn-outline mt-5" onClick={() => signOut(auth)}>
            Déconnexion
          </button>
        </div>
      </header>

      <section>
        <ModuleFactory
          targetUserId={targetUserId}
          onCreated={() => {}}
        />
      </section>

      <section>
        <h2 className="text-base font-medium text-slate-300 mb-3">
          Modules actifs ({modules.length})
        </h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod) => {
            const killed = isKilled(mod.id);
            const onToggleKill = () => toggleKill(mod.id);
            const onUpdate = (updates: Record<string, unknown>) =>
              updateModule(mod.id, updates);

            if (mod.type === "mother") {
              return (
                <MotherCard
                  key={mod.id}
                  moduleId={mod.id}
                  userId={targetUserId}
                  lastSeen={mod.lastSeen}
                  isKilled={killed}
                  onToggleKill={onToggleKill}
                  onUpdateModule={onUpdate}
                />
              );
            }
            if (mod.type === "pump") {
              return (
                <PumpCard
                  key={mod.id}
                  moduleId={mod.id}
                  userId={targetUserId}
                  pressure={mod.pressure ?? 2.5}
                  lastSeen={mod.lastSeen}
                  isKilled={killed}
                  onToggleKill={onToggleKill}
                  onUpdateModule={onUpdate}
                />
              );
            }
            if (mod.type === "field") {
              return (
                <FieldCard
                  key={mod.id}
                  moduleId={mod.id}
                  userId={targetUserId}
                  battery={mod.battery ?? 80}
                  humidity={50}
                  ph={7}
                  position={mod.position}
                  lastSeen={mod.lastSeen}
                  isKilled={killed}
                  onToggleKill={onToggleKill}
                  onUpdateModule={onUpdate}
                />
              );
            }
            return null;
          })}
        </div>
      </section>
    </div>
  );
}

function useDashboardAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { user, loading };
}

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-16 card">
      <h1 className="text-lg font-semibold text-slate-100 mb-2">
        Simulateur de modules
      </h1>
      <p className="text-sm text-slate-500 mb-4">
        Connectez-vous avec le même compte que sur l&apos;IHM principale.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="vous@exemple.com"
          />
        </div>
        <div>
          <label className="label">Mot de passe</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" className="btn-primary w-full">
          Connexion
        </button>
      </form>
    </div>
  );
}

function ConfigMissing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900 text-slate-200">
      <h1 className="text-lg font-semibold text-slate-100 mb-2">
        Configuration Firebase manquante
      </h1>
      <p className="text-sm text-slate-400 text-center max-w-md mb-4">
        Sur Vercel, ajoutez les variables d&apos;environnement dans le projet : Settings → Environment Variables.
        Préfixe requis : <code className="font-mono text-sky-400">VITE_FIREBASE_</code> (API_KEY, AUTH_DOMAIN, DATABASE_URL, PROJECT_ID, etc.).
      </p>
      <p className="text-xs text-slate-500">
        En local, créez un fichier <code className="font-mono">.env</code> avec ces variables.
      </p>
    </div>
  );
}

export default function App() {
  if (!isFirebaseConfigured) {
    return <ConfigMissing />;
  }

  return <AppWithAuth />;
}

function AppWithAuth() {
  const { user, loading } = useDashboardAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-500">
        Chargement…
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <SimulatorProvider defaultUserId={user.uid}>
      <Dashboard />
    </SimulatorProvider>
  );
}
