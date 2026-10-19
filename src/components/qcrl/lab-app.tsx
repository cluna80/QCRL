import { useEffect, useState } from "react";
import { Binary, Compass, Gauge, Grid2x2, Layers, Library, ScrollText, Search, ShieldAlert } from "lucide-react";

import { environmentMeta, runSelfTest, type SelfCheck } from "@/lib/qcrl/experiments";
import { EXPERIMENTS } from "@/lib/qcrl/program";
import { loadRuns, makeRun, saveRuns, type RunInput, type RunRecord } from "@/lib/qcrl/runs";
import { AttackPanel } from "./attack-panel";
import { DiscoveryPanel } from "./discovery-panel";
import { EncodingPanel } from "./encoding-panel";
import { LatticePanel } from "./lattice-panel";
import { MathPanel } from "./math-panel";
import { BenchPanel, NotesPanel, RegistryPanel } from "./record-panel";

type Tab = "lab" | "math" | "lattice" | "discovery" | "attacks" | "encoding" | "bench" | "registry" | "notes";

const NAV: { id: Tab; label: string; icon: typeof Compass }[] = [
  { id: "lab", label: "Laboratory", icon: Compass },
  { id: "math", label: "Arithmetic", icon: Binary },
  { id: "lattice", label: "Lattices", icon: Grid2x2 },
  { id: "discovery", label: "Discovery", icon: Search },
  { id: "attacks", label: "Attacks", icon: ShieldAlert },
  { id: "encoding", label: "Encoding", icon: Layers },
  { id: "bench", label: "Records", icon: Gauge },
  { id: "registry", label: "Registry", icon: Library },
  { id: "notes", label: "Notes", icon: ScrollText },
];

export function LabApp() {
  const [tab, setTab] = useState<Tab>("lab");
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [checks, setChecks] = useState<SelfCheck[] | null>(null);
  const [env, setEnv] = useState<ReturnType<typeof environmentMeta> | null>(null);

  useEffect(() => {
    setRuns(loadRuns());
    setEnv(environmentMeta());
    const math = runSelfTest();
    let storageOk = false;
    let storageDetail = "localStorage is unavailable.";
    try {
      const key = "qcrl-doctor-probe";
      localStorage.setItem(key, "1");
      storageOk = localStorage.getItem(key) === "1";
      localStorage.removeItem(key);
      storageDetail = storageOk ? "A probe key was written and read back." : "The probe key did not round-trip.";
    } catch (error) {
      storageDetail = error instanceof Error ? error.message : storageDetail;
    }
    setChecks([
      ...math,
      { name: "Run ledger storage", ok: storageOk, detail: storageDetail },
      {
        name: "Timers",
        ok: typeof performance !== "undefined" && typeof performance.now === "function",
        detail: "performance.now is available for durations.",
      },
    ]);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveRuns(runs);
  }, [ready, runs]);

  function save(input: RunInput) {
    setRuns((current) => [makeRun(input), ...current].slice(0, 40));
  }

  const passed = checks?.filter((check) => check.ok).length ?? 0;
  const failed = checks ? checks.length - passed : 0;

  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="font-mono text-xs tracking-widest text-brass">QCRL · VERSION 0.1</p>
            <h1 className="mt-2 text-3xl font-medium tracking-tight md:text-4xl">Qattice research lab</h1>
            <p className="mt-3 max-w-2xl text-sm text-muted md:text-base">
              A bounded instrument for algebraic experiments. A passing check is not a theorem, and it is not a
              security proof.
            </p>
          </div>
          <p className="font-mono text-xs text-muted">QCRL-EXP-001 · local only</p>
        </div>
        <div className="lab-rule h-6 border-t border-line" aria-hidden="true" />
      </header>
      <div className="mx-auto max-w-6xl px-4">
        <nav className="flex min-w-0 gap-2 overflow-x-auto py-4" aria-label="Laboratory sections">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => setTab(item.id)}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 border px-3 text-sm ${
                  active ? "border-brass bg-brass text-brass-ink" : "border-line bg-panel text-muted"
                }`}
              >
                <Icon className="size-4" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
      <main className="mx-auto flex min-w-0 max-w-6xl flex-col gap-6 px-4 pb-16">
        {tab === "lab" ? (
          <LabHome
            checks={checks}
            env={env}
            passed={passed}
            failed={failed}
            onOpen={(next) => setTab(next)}
          />
        ) : null}
        {tab === "math" ? <MathPanel save={save} /> : null}
        {tab === "lattice" ? <LatticePanel save={save} /> : null}
        {tab === "discovery" ? <DiscoveryPanel save={save} /> : null}
        {tab === "attacks" ? <AttackPanel save={save} /> : null}
        {tab === "encoding" ? <EncodingPanel save={save} /> : null}
        {tab === "bench" ? <BenchPanel save={save} runs={runs} onClear={() => setRuns([])} /> : null}
        {tab === "registry" ? <RegistryPanel /> : null}
        {tab === "notes" ? <NotesPanel /> : null}
      </main>
    </div>
  );
}

function LabHome({
  checks,
  env,
  passed,
  failed,
  onOpen,
}: {
  checks: SelfCheck[] | null;
  env: ReturnType<typeof environmentMeta> | null;
  passed: number;
  failed: number;
  onOpen: (tab: Tab) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section className="max-w-3xl">
        <p className="font-mono text-xs tracking-widest text-brass">DOCTOR</p>
        <h2 className="mt-2 text-2xl font-medium tracking-tight">Environment and integrity</h2>
        <p className="mt-3 text-sm text-muted">
          The doctor reruns the finite checks: inverses, a negacyclic product, an accepted automorphism, a planted
          invalid map, a repeated seed, a toy collision, and a round-trip encoding.
        </p>
      </section>
      <div className="grid gap-3 sm:grid-cols-3">
        <Status label="Checks passed" value={checks ? String(passed) : "…"} tone="sage" />
        <Status label="Checks failed" value={checks ? String(failed) : "…"} tone={failed ? "oxide" : "sage"} />
        <Status label="Runtime" value={env?.runtime ?? "Checking"} tone="brass" />
      </div>
      <div className="border border-line bg-panel">
        {checks ? (
          <ul>
            {checks.map((check) => (
              <li key={check.name} className="border-b border-line px-4 py-3 last:border-b-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm">{check.name}</p>
                  <p className={`font-mono text-xs tracking-widest ${check.ok ? "text-sage" : "text-oxide"}`}>
                    {check.ok ? "PASS" : "FAIL"}
                  </p>
                </div>
                <p className="mt-1 text-sm text-muted">{check.detail}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-sm text-muted">Checking the arithmetic engine…</p>
        )}
      </div>
      {env ? (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="CPU" value={env.cpuArchitecture} />
          <Fact label="Memory GB" value={env.deviceMemoryGb === null ? "unavailable" : String(env.deviceMemoryGb)} />
          <Fact label="Source commit" value={env.sourceCommit} />
          <Fact label="Peak memory" value={env.peakMemory} />
        </dl>
      ) : null}
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium">Registered experiments</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {EXPERIMENTS.map((experiment) => (
            <button
              key={experiment.id}
              type="button"
              onClick={() => onOpen(experiment.tab)}
              className="border border-line bg-panel p-4 text-left"
            >
              <p className="font-mono text-xs tracking-widest text-brass">
                {experiment.index} · {experiment.id}
              </p>
              <p className="mt-2 text-lg font-medium">{experiment.title}</p>
              <p className="mt-2 text-sm text-muted">{experiment.summary}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function Status({ label, value, tone }: { label: string; value: string; tone: "sage" | "oxide" | "brass" }) {
  const color = tone === "sage" ? "text-sage" : tone === "oxide" ? "text-oxide" : "text-brass";
  return (
    <div className="border border-line bg-panel px-4 py-3">
      <p className="font-mono text-xs tracking-widest text-muted">{label}</p>
      <p className={`mt-2 font-mono text-2xl tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line px-4 py-3">
      <dt className="font-mono text-xs tracking-widest text-muted">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}
