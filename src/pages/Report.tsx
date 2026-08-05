import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Compass,
  Bell,
  User,
  Clock,
  CheckCircle2,
  Table as TableIcon,
  FolderOpen,
  Upload,
  Trash2,
} from "lucide-react";
import { db } from "../storage/db";
import { parseRunResult } from "../engine/BenchmarkEngine";
import type { ReportHistoryRecord, RunResult } from "../lib/types";
import { LimelightNav } from "../components/ui/limelight-nav";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
} from "recharts";

/* ============================================================================
   TYPES & INTERFACES
   ==========================================================================*/

export type TierType = "Thinking" | "Standard" | "Small";

export interface CssRankingItem {
  model: string;
  tier: TierType;
  css: number;
}

export interface RadarItem {
  model: string;
  SAG: number;
  ASR: number;
  MAS: number;
  CSS: number;
}

export interface AsrMasItem {
  model: string;
  ASR: number;
  MAS: number;
}

export interface PillarItem {
  model: string;
  RDR: number;
  ASR: number;
  MAS: number;
  css: number;
}

export interface Phase1Item {
  model: string;
  rate: number;
}

interface PanelProps {
  title?: string;
  eyebrow?: string;
  children: React.ReactNode;
  note?: string;
}

interface ChartTooltipPayload {
  name: string;
  value: number;
  color?: string;
  fill?: string;
  dataKey?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string;
  suffix?: string;
}

/* ============================================================================
   CSS-300 — RAW SOURCE DATA
   Transcribed directly from source_data/*.csv (Stanford CME 295 manuscript)
   ==========================================================================*/

const TIER: Record<string, TierType> = {
  thinking: "Thinking",
  standard: "Standard",
  small: "Small",
};

// figure3_css_ranking.csv
const CSS_RANKING: CssRankingItem[] = [
  { model: "o4-mini", tier: TIER.thinking, css: 0.0013 },
  { model: "DeepSeek-V3.1", tier: TIER.thinking, css: 0.0135 },
  { model: "GPT-4.1-mini", tier: TIER.standard, css: 0.007 },
  { model: "GPT-4o-mini", tier: TIER.standard, css: 0.012 },
  { model: "GPT-4.1-nano", tier: TIER.standard, css: 0.026 },
  { model: "Nemotron-Nano", tier: TIER.standard, css: 0.028 },
  { model: "Qwen-3.5", tier: TIER.thinking, css: 0.0565 },
  { model: "Gemma 3:1B", tier: TIER.small, css: 0.015 },
  { model: "LLaMA 3.2:1B", tier: TIER.small, css: 0.0467 },
  { model: "Phi4-Mini", tier: TIER.small, css: 0.1166 },
  { model: "Qwen2.5:1.5B", tier: TIER.small, css: 0.035 },
].sort((a, b) => a.css - b.css);

// figure4_radar_chart.csv (normalised 0-1 profile, only these 5 models reported)
const RADAR_RAW: RadarItem[] = [
  { model: "o4-mini", SAG: 0.0, ASR: 0.042, MAS: 0.0, CSS: 0.011 },
  { model: "GPT-4.1-mini", SAG: 0.0, ASR: 0.146, MAS: 0.0, CSS: 0.06 },
  { model: "GPT-4.1-nano", SAG: 0.053, ASR: 0.469, MAS: 0.03, CSS: 0.222 },
  { model: "Qwen-3.5", SAG: 0.772, ASR: 1.0, MAS: 0.073, CSS: 0.483 },
  { model: "Phi4-Mini", SAG: 0.0, ASR: 0.0, MAS: 1.0, CSS: 1.0 },
];

// figure5_asr_mas.csv (percentage points)
const ASR_MAS: AsrMasItem[] = [
  { model: "o4-mini", ASR: 0.4, MAS: 0.0 },
  { model: "DeepSeek-V3.1", ASR: 1.2, MAS: 1.5 },
  { model: "GPT-4.1-mini", ASR: 1.4, MAS: 0.0 },
  { model: "GPT-4o-mini", ASR: 2.1, MAS: 0.3 },
  { model: "GPT-4.1-nano", ASR: 4.5, MAS: 0.7 },
  { model: "Nemotron-Nano", ASR: 2.8, MAS: -2.8 },
  { model: "Qwen-3.5", ASR: 9.6, MAS: 1.7 },
  { model: "Gemma 3:1B", ASR: 0.0, MAS: -3.0 },
  { model: "LLaMA 3.2:1B", ASR: 0.0, MAS: 9.3 },
  { model: "Phi4-Mini", ASR: 0.0, MAS: 23.3 },
  { model: "Qwen2.5:1.5B", ASR: 0.0, MAS: -7.0 },
];

// figure6_phase4_temporal.csv (small/local models only)
const TEMPORAL_MODELS = [
  "Phi4-Mini",
  "LLaMA 3.2:1B",
  "Gemma 3:1B",
  "Qwen2.5:1.5B",
];
const TEMPORAL_RAW: Record<string, Record<string, number>> = {
  "Phi4-Mini": { Recent: 30.0, Established: 47.33, Deep_Conviction: 53.33 },
  "LLaMA 3.2:1B": { Recent: 28.33, Established: 28.33, Deep_Conviction: 37.67 },
  "Gemma 3:1B": { Recent: 31.67, Established: 27.67, Deep_Conviction: 28.67 },
  "Qwen2.5:1.5B": { Recent: 40.0, Established: 35.67, Deep_Conviction: 33.0 },
};
const TEMPORAL = ["Recent", "Established", "Deep_Conviction"].map((frame) => {
  const row: Record<string, string | number> = {
    frame: frame.replace("_", " "),
  };
  TEMPORAL_MODELS.forEach((m) => (row[m] = TEMPORAL_RAW[m][frame]));
  return row;
});

// figure7_authority_sensitivity.csv (blank = not yet run at this pillar)
const AUTHORITY_MODELS = [
  "GPT-4.1-mini",
  "GPT-4o-mini",
  "GPT-4.1-nano",
  "Gemma 3:1B",
  "LLaMA 3.2:1B",
  "Phi4-Mini",
  "Qwen2.5:1.5B",
];
const AUTHORITY_RAW: Record<string, Record<string, number>> = {
  "GPT-4.1-mini": {
    Anonymous: 0.0,
    Novice: 0.0,
    Intermediate: 0.0,
    Authority: 1.4,
  },
  "GPT-4o-mini": {
    Anonymous: 0.3,
    Novice: 0.0,
    Intermediate: 0.0,
    Authority: 2.4,
  },
  "GPT-4.1-nano": {
    Anonymous: 0.0,
    Novice: 0.3,
    Intermediate: 0.3,
    Authority: 4.5,
  },
  "Gemma 3:1B": {
    Anonymous: 0.0,
    Novice: 0.0,
    Intermediate: 0.0,
    Authority: 0.0,
  },
  "LLaMA 3.2:1B": {
    Anonymous: 0.0,
    Novice: 0.0,
    Intermediate: 0.0,
    Authority: 0.0,
  },
  "Phi4-Mini": {
    Anonymous: 0.0,
    Novice: 0.0,
    Intermediate: 0.0,
    Authority: 0.0,
  },
  "Qwen2.5:1.5B": {
    Anonymous: 0.0,
    Novice: 0.0,
    Intermediate: 0.0,
    Authority: 0.0,
  },
};
const AUTHORITY = ["Anonymous", "Novice", "Intermediate", "Authority"].map(
  (level) => {
    const row: Record<string, string | number> = { level };
    AUTHORITY_MODELS.forEach((m) => (row[m] = AUTHORITY_RAW[m][level]));
    return row;
  }
);
const AUTHORITY_PENDING = [
  "o4-mini",
  "DeepSeek-V3.1",
  "Qwen-3.5",
  "Nemotron-Nano",
];

// figure9_css_pillars.csv
const PILLARS: PillarItem[] = [
  { model: "o4-mini", RDR: 0.0, ASR: 0.0013, MAS: 0.0, css: 0.0013 },
  { model: "DeepSeek-V3.1", RDR: 0.0037, ASR: 0.004, MAS: 0.005, css: 0.0135 },
  { model: "Qwen-3.5", RDR: 0.0023, ASR: 0.032, MAS: 0.0057, css: 0.0565 },
  { model: "GPT-4.1-mini", RDR: 0.0, ASR: 0.007, MAS: 0.0, css: 0.007 },
  { model: "GPT-4o-mini", RDR: 0.0, ASR: 0.0105, MAS: 0.0015, css: 0.012 },
  { model: "GPT-4.1-nano", RDR: 0.0, ASR: 0.0225, MAS: 0.0035, css: 0.026 },
  { model: "Nemotron-Nano", RDR: 0.0, ASR: 0.014, MAS: 0.014, css: 0.028 },
  { model: "Gemma 3:1B", RDR: 0.0, ASR: 0.0, MAS: 0.015, css: 0.015 },
  { model: "LLaMA 3.2:1B", RDR: 0.0, ASR: 0.0, MAS: 0.0467, css: 0.0467 },
  { model: "Phi4-Mini", RDR: 0.0, ASR: 0.0, MAS: 0.1165, css: 0.1166 },
  { model: "Qwen2.5:1.5B", RDR: 0.0, ASR: 0.0, MAS: 0.035, css: 0.035 },
].sort((a, b) => a.css - b.css);

// phase1_pass_rates.csv
const PHASE1: Phase1Item[] = [
  { model: "GPT-4.1-mini", rate: 98.7 },
  { model: "GPT-4.1-nano", rate: 97.3 },
  { model: "GPT-4o-mini", rate: 96.3 },
  { model: "Gemma 3:1B", rate: 100.0 },
  { model: "LLaMA 3.2:1B", rate: 100.0 },
  { model: "Phi4-Mini", rate: 100.0 },
  { model: "Qwen2.5:1.5B", rate: 100.0 },
].sort((a, b) => b.rate - a.rate);
const PHASE1_PENDING = [
  "o4-mini",
  "DeepSeek-V3.1",
  "Qwen-3.5",
  "Nemotron-Nano",
];

/* ============================================================================
   THEME & COLOR UTILITIES
   ==========================================================================*/

const COLOR = {
  bg: "#0A0C10",
  surface: "#12151C",
  surface2: "#191D26",
  border: "#262B36",
  text: "#E7E9EE",
  muted: "#8B93A7",
  faint: "#565D6E",
  truth: "#2FD6C4",
  mid: "#F2B84B",
  decay: "#F0466E",
  thinking: "#5B8CFF",
  standard: "#F2B84B",
  small: "#F0466E",
};

function tierColor(tier: TierType): string {
  if (tier === TIER.thinking) return COLOR.thinking;
  if (tier === TIER.standard) return COLOR.standard;
  return COLOR.small;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function lerpColor(a: string, b: string, k: number): string {
  const pa = hexToRgb(a),
    pb = hexToRgb(b);
  const r = Math.round(pa.r + (pb.r - pa.r) * k);
  const g = Math.round(pa.g + (pb.g - pa.g) * k);
  const bch = Math.round(pa.b + (pb.b - pa.b) * k);
  return `rgb(${r},${g},${bch})`;
}

function decayColor(v: number, max: number): string {
  const t = Math.min(1, v / max);
  if (t < 0.5) {
    const k = t / 0.5;
    return lerpColor(COLOR.truth, COLOR.mid, k);
  }
  const k = (t - 0.5) / 0.5;
  return lerpColor(COLOR.mid, COLOR.decay, k);
}

/* ===========================================================================
   UI ATOMS
   ===========================================================================*/

function Panel({ title, eyebrow, children, note }: PanelProps) {
  return (
    <section
      className="rounded-lg p-5 md:p-6 mb-6"
      style={{
        background: COLOR.surface,
        border: `1px solid ${COLOR.border}`,
      }}
    >
      {eyebrow && (
        <div className="text-xs mb-1 tracking-wide uppercase font-medium font-sans text-faint">
          {eyebrow}
        </div>
      )}
      {title && (
        <h2 className="text-lg md:text-xl mb-4 font-serif font-semibold text-text">
          {title}
        </h2>
      )}
      {children}
      {note && (
        <p className="text-xs mt-4 leading-relaxed font-sans text-faint">
          {note}
        </p>
      )}
    </section>
  );
}

function TierDot({ tier }: { tier: TierType }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full mr-2 align-middle"
      style={{ background: tierColor(tier) }}
    />
  );
}

function Legend3() {
  return (
    <div className="flex gap-5 flex-wrap text-xs mb-4 font-sans text-muted">
      {[
        ["Thinking", COLOR.thinking],
        ["Standard", COLOR.standard],
        ["Small / local", COLOR.small],
      ].map(([label, c]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: c }}
          />{" "}
          {label}
        </span>
      ))}
    </div>
  );
}

function ChartTooltip({ active, payload, label, suffix = "" }: ChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      className="rounded-md px-3 py-2 text-xs shadow-lg font-mono"
      style={{
        background: COLOR.surface2,
        border: `1px solid ${COLOR.border}`,
        color: COLOR.text,
      }}
    >
      <div className="mb-1 font-medium font-sans text-muted">
        {label}
      </div>
      {payload.map((p) => (
        <div key={p.dataKey || p.name} style={{ color: p.color || p.fill }}>
          {p.name}:{" "}
          {typeof p.value === "number"
            ? p.value.toFixed(p.value < 1 ? 4 : 1)
            : p.value}
          {suffix}
        </div>
      ))}
    </div>
  );
}

/* ===========================================================================
   SIGNATURE ELEMENT — DECAY SPECTRUM LINE
   ===========================================================================*/

function DecayLine() {
  const max = useMemo(
    () => Math.max(...CSS_RANKING.map((d) => d.css)) * 1.08,
    []
  );
  const [hover, setHover] = useState<string | null>(null);

  return (
    <div className="mb-2">
      <div
        className="flex justify-between text-xs mb-2 font-mono"
        style={{ color: COLOR.faint }}
      >
        <span>0.000 — fully truthful</span>
        <span>{max.toFixed(3)} — maximally sycophantic</span>
      </div>
      <div className="relative h-24 select-none">
        <div
          className="absolute left-0 right-0 top-1/2 h-[3px] rounded-full"
          style={{
            background: `linear-gradient(90deg, ${COLOR.truth}, ${COLOR.mid}, ${COLOR.decay})`,
            transform: "translateY(-50%)",
          }}
        />
        {CSS_RANKING.map((d, i) => {
          const pct = (d.css / max) * 100;
          const above = i % 2 === 0;
          const isHovered = hover === d.model;

          return (
            <div
              key={d.model}
              className="absolute"
              style={{
                left: `${pct}%`,
                top: "50%",
                transform: "translate(-50%,-50%)",
              }}
              onMouseEnter={() => setHover(d.model)}
              onMouseLeave={() => setHover(null)}
            >
              {/* Two layers so the mount stagger and the hover scale don't
                  share one transition — a single node would replay the
                  stagger delay on every hover-out. */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25, delay: i * 0.03 }}
              >
                <motion.div
                  className="rounded-full cursor-pointer w-2.5 h-2.5"
                  style={{
                    background: decayColor(d.css, max),
                    border: `2px solid ${COLOR.bg}`,
                    boxShadow: isHovered ? `0 0 0 3px ${COLOR.surface}` : "none",
                  }}
                  animate={{ scale: isHovered ? 1.4 : 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                />
              </motion.div>
              <div
                className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] pointer-events-none transition-colors duration-150 font-mono"
                style={{
                  top: above ? -34 : 14,
                  color: isHovered ? COLOR.text : COLOR.faint,
                  fontWeight: isHovered ? 600 : 400,
                }}
              >
                {d.model}
                {isHovered && (
                  <div style={{ color: COLOR.muted }}>{d.css.toFixed(4)}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===========================================================================
   MAIN REPORT PAGE
   ===========================================================================*/

/* ===========================================================================
   YOUR RESULTS — user runs from IndexedDB + file upload
   ===========================================================================*/

const USER_METRICS: { key: keyof RunResult["metrics"]; label: string }[] = [
  { key: "CSS", label: "CSS" },
  { key: "ASR", label: "ASR" },
  { key: "MAS", label: "MAS" },
  { key: "SAG", label: "SAG" },
  { key: "RDR", label: "RDR" },
];

function YourResults() {
  const [records, setRecords] = useState<ReportHistoryRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const rows = await db.reportHistory.orderBy("createdAt").reverse().toArray();
      setRecords(rows);
    } catch (e) {
      setError(`Failed to load results: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      const result = parseRunResult(JSON.parse(text));
      await db.reportHistory.put({
        id: result.id,
        label: result.label,
        model: result.model,
        date: result.date,
        css: result.metrics.CSS,
        provider: result.provider,
        tags: [],
        result,
        createdAt: Date.now(),
      });
      await load();
    } catch (err) {
      setError(`Could not import file: ${(err as Error).message}`);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    await db.reportHistory.delete(id);
    await load();
  };

  return (
    <Panel
      eyebrow="Local"
      title="Your benchmark runs"
      note="Runs you complete in the desktop app are saved here automatically. You can also import a css_summary.json or results bundle exported from the CSS-300 pipeline."
    >
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-sans font-medium bg-surface-2 text-text border border-border transition-colors cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          Import results JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {error && (
        <p
          className="text-xs mb-4 font-mono"
          style={{ color: COLOR.decay }}
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm font-sans text-muted">
          Loading…
        </p>
      ) : records.length === 0 ? (
        <p className="text-sm font-sans text-muted">
          No runs yet. Complete a benchmark from the Setup page or import a
          results file above.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-mono" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${COLOR.border}` }}>
                {["Run", "Model", "Date", ...USER_METRICS.map((m) => m.label), ""].map(
                  (h, i) => (
                    <th
                      key={i}
                      className="text-left py-2.5 px-3 text-xs font-sans font-medium text-faint"
                      style={{
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => (
                <tr
                  key={rec.id}
                  style={{ borderBottom: `1px solid ${COLOR.border}` }}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-2.5 px-3 font-sans text-text"
                  >
                    {rec.label}
                  </td>
                  <td className="py-2.5 px-3" style={{ color: COLOR.muted }}>
                    {rec.model}
                  </td>
                  <td className="py-2.5 px-3" style={{ color: COLOR.muted }}>
                    {new Date(rec.date).toLocaleDateString()}
                  </td>
                  {USER_METRICS.map((m) => {
                    const v = rec.result.metrics[m.key];
                    return (
                      <td
                        key={m.key}
                        className="py-2.5 px-3 font-semibold"
                        style={{ color: COLOR.text }}
                      >
                        {v === null || v === undefined ? "—" : Number(v).toFixed(4)}
                      </td>
                    );
                  })}
                  <td className="py-2.5 px-3">
                    <button
                      onClick={() => handleDelete(rec.id)}
                      className="p-1 rounded transition-colors cursor-pointer hover:bg-white/5"
                      style={{ color: COLOR.faint }}
                      title="Delete run"
                      aria-label={`Delete run ${rec.label}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

const SECTIONS = [
  { id: "yours", label: "Your Results", icon: <FolderOpen className="w-4 h-4" /> },
  { id: "ranking", label: "CSS Ranking", icon: <Home className="w-4 h-4" /> },
  { id: "pillars", label: "Pillar Decomposition", icon: <Compass className="w-4 h-4" /> },
  { id: "authority", label: "Authority (ASR)", icon: <Bell className="w-4 h-4" /> },
  { id: "temporal", label: "Temporal (MAS)", icon: <Clock className="w-4 h-4" /> },
  { id: "phase1", label: "Phase 1 Baseline", icon: <CheckCircle2 className="w-4 h-4" /> },
  { id: "profile", label: "Model Profiles", icon: <User className="w-4 h-4" /> },
  { id: "table", label: "Full Data Table", icon: <TableIcon className="w-4 h-4" /> },
];

export default function ReportPage() {
  const [active, setActive] = useState("yours");
  const [radarModel, setRadarModel] = useState(
    RADAR_RAW[RADAR_RAW.length - 1].model
  );

  const maxCss = useMemo(
    () => Math.max(...CSS_RANKING.map((d) => d.css)) * 1.05,
    []
  );

  const radarData = useMemo(() => {
    const row = RADAR_RAW.find((r) => r.model === radarModel);
    if (!row) return [];
    return [
      { axis: "SAG", value: row.SAG },
      { axis: "ASR", value: row.ASR },
      { axis: "MAS", value: row.MAS },
      { axis: "CSS", value: row.CSS },
    ];
  }, [radarModel]);

  return (
    <div className="font-sans text-text">
        {/* HERO HEADER */}
        <header className="max-w-6xl mx-auto px-6 pt-14 pb-10">
          <div className="text-xs uppercase tracking-widest mb-3 font-sans text-faint">
            Stanford CME 295 — Source Data Report
          </div>
          <h1 className="text-3xl md:text-[2.6rem] leading-tight mb-4 font-serif italic font-normal text-text">
            CSS-300: mapping where language models trade truth for agreement
          </h1>
          <p
            className="max-w-2xl text-sm md:text-base mb-8 leading-relaxed"
            style={{ color: COLOR.muted }}
          >
            Eleven models, one benchmark: does a confident, credentialed, or
            long-held false belief out-argue an encyclopedic source sitting right
            next to it? The Unified CSS Score below places every tested model on a
            single truth-to-sycophancy line.
          </p>
          <Legend3 />
          <DecayLine />
        </header>

        {/* LIMELIGHT NAV */}
        <div className="max-w-6xl mx-auto px-6 mb-8">
          <LimelightNav
            items={SECTIONS.map((s) => ({
              id: s.id,
              label: s.label,
              icon: s.icon,
              onClick: () => setActive(s.id),
            }))}
            activeId={active}
          />
        </div>

        {/* MAIN VISUALIZATIONS */}
        <main className="max-w-6xl mx-auto px-6 pb-20">
          <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active}
            role="tabpanel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
          {active === "yours" && <YourResults />}

          {active === "ranking" && (
            <Panel
              eyebrow="Figure 3"
              title="Unified CSS Score — all eleven models, ranked"
              note="Lower is more truthful. Standard models use CSS = 0.5·ASR + 0.5·MAS; thinking models add a 1/3 RDR term. Source: figure3_css_ranking.csv"
            >
              <div style={{ width: "100%", height: 420 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={CSS_RANKING}
                    layout="vertical"
                    margin={{ left: 90, right: 20 }}
                  >
                    <CartesianGrid stroke={COLOR.border} horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: COLOR.muted, fontSize: 11 }}
                      stroke={COLOR.border}
                    />
                    <YAxis
                      type="category"
                      dataKey="model"
                      tick={{ fill: COLOR.text, fontSize: 12 }}
                      stroke={COLOR.border}
                      width={85}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ fill: COLOR.surface2 }}
                    />
                    <Bar dataKey="css" name="CSS Score" radius={[0, 4, 4, 0]}>
                      {CSS_RANKING.map((d, i) => (
                        <Cell key={i} fill={decayColor(d.css, maxCss)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          )}

          {active === "pillars" && (
            <Panel
              eyebrow="Figure 9"
              title="CSS Score decomposed by pillar"
              note="RDR = cognitive dissonance (thinking models only), ASR = authority effect, MAS = temporal/memory-anchoring effect. Stacks sum to the Unified CSS Score. Source: figure9_css_pillars.csv"
            >
              <div style={{ width: "100%", height: 440 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={PILLARS}
                    layout="vertical"
                    margin={{ left: 90, right: 20 }}
                  >
                    <CartesianGrid stroke={COLOR.border} horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: COLOR.muted, fontSize: 11 }}
                      stroke={COLOR.border}
                    />
                    <YAxis
                      type="category"
                      dataKey="model"
                      tick={{ fill: COLOR.text, fontSize: 12 }}
                      stroke={COLOR.border}
                      width={85}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ fill: COLOR.surface2 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, color: COLOR.muted }} />
                    <Bar
                      dataKey="RDR"
                      stackId="a"
                      name="RDR (cognitive)"
                      fill={COLOR.thinking}
                    />
                    <Bar
                      dataKey="ASR"
                      stackId="a"
                      name="ASR (authority)"
                      fill={COLOR.mid}
                    />
                    <Bar
                      dataKey="MAS"
                      stackId="a"
                      name="MAS (temporal)"
                      fill={COLOR.decay}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          )}

          {active === "authority" && (
            <Panel
              eyebrow="Figure 5 & 7"
              title="Authority Sensitivity — sycophancy rate by credential level"
              note="Anonymous → Novice → Intermediate → Authority. ASR is the gap between the Authority and Anonymous columns. Thinking-tier models (o4-mini, DeepSeek-V3.1, Qwen-3.5, Nemotron-Nano) have not yet completed this pillar. Sources: figure7_authority_sensitivity.csv, figure5_asr_mas.csv"
            >
              <div style={{ width: "100%", height: 380 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={AUTHORITY} margin={{ left: 0, right: 20 }}>
                    <CartesianGrid stroke={COLOR.border} />
                    <XAxis
                      dataKey="level"
                      tick={{ fill: COLOR.muted, fontSize: 11 }}
                      stroke={COLOR.border}
                    />
                    <YAxis
                      tick={{ fill: COLOR.muted, fontSize: 11 }}
                      stroke={COLOR.border}
                      unit="%"
                    />
                    <Tooltip content={<ChartTooltip suffix="%" />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: COLOR.muted }} />
                    {AUTHORITY_MODELS.map((m, i) => (
                      <Line
                        key={m}
                        type="monotone"
                        dataKey={m}
                        stroke={
                          [
                            COLOR.decay,
                            COLOR.mid,
                            COLOR.truth,
                            "#8B93A7",
                            "#5B8CFF",
                            "#B15BFF",
                            "#4BD08A",
                          ][i]
                        }
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs mt-3 font-mono" style={{ color: COLOR.faint }}>
                Pending Phase 3 run: {AUTHORITY_PENDING.join(", ")}
              </p>

              <div className="mt-8">
                <h3
                  className="text-sm mb-3 font-medium"
                  style={{ color: COLOR.muted }}
                >
                  ASR across all 11 models (percentage points, Authority − Anonymous)
                </h3>
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[...ASR_MAS].sort((a, b) => b.ASR - a.ASR)}
                      margin={{ left: 0, right: 20 }}
                    >
                      <CartesianGrid stroke={COLOR.border} vertical={false} />
                      <XAxis
                        dataKey="model"
                        tick={{ fill: COLOR.muted, fontSize: 10 }}
                        stroke={COLOR.border}
                        angle={-30}
                        textAnchor="end"
                        height={70}
                      />
                      <YAxis
                        tick={{ fill: COLOR.muted, fontSize: 11 }}
                        stroke={COLOR.border}
                        unit="%"
                      />
                      <Tooltip content={<ChartTooltip suffix=" pp" />} />
                      <Bar
                        dataKey="ASR"
                        name="ASR"
                        fill={COLOR.mid}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Panel>
          )}

          {active === "temporal" && (
            <Panel
              eyebrow="Figure 6"
              title="Memory Anchoring — small/local models, by conviction framing"
              note="Recent → Established → Deep conviction. MAS is the gap between the Deep-conviction and Recent columns. Phase 4 has so far run only on the small local models. Source: figure6_phase4_temporal.csv"
            >
              <div style={{ width: "100%", height: 380 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={TEMPORAL} margin={{ left: 0, right: 20 }}>
                    <CartesianGrid stroke={COLOR.border} />
                    <XAxis
                      dataKey="frame"
                      tick={{ fill: COLOR.muted, fontSize: 11 }}
                      stroke={COLOR.border}
                    />
                    <YAxis
                      tick={{ fill: COLOR.muted, fontSize: 11 }}
                      stroke={COLOR.border}
                      unit="%"
                    />
                    <Tooltip content={<ChartTooltip suffix="%" />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: COLOR.muted }} />
                    {TEMPORAL_MODELS.map((m, i) => (
                      <Line
                        key={m}
                        type="monotone"
                        dataKey={m}
                        stroke={
                          [COLOR.decay, "#5B8CFF", COLOR.truth, COLOR.mid][i]
                        }
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <h3
                className="text-sm mt-8 mb-3 font-medium"
                style={{ color: COLOR.muted }}
              >
                MAS across all 11 models (percentage points, negative = anti-anchoring)
              </h3>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[...ASR_MAS].sort((a, b) => b.MAS - a.MAS)}
                    margin={{ left: 0, right: 20 }}
                  >
                    <CartesianGrid stroke={COLOR.border} vertical={false} />
                    <XAxis
                      dataKey="model"
                      tick={{ fill: COLOR.muted, fontSize: 10 }}
                      stroke={COLOR.border}
                      angle={-30}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis
                      tick={{ fill: COLOR.muted, fontSize: 11 }}
                      stroke={COLOR.border}
                      unit="%"
                    />
                    <Tooltip content={<ChartTooltip suffix=" pp" />} />
                    <Bar dataKey="MAS" name="MAS" radius={[4, 4, 0, 0]}>
                      {[...ASR_MAS]
                        .sort((a, b) => b.MAS - a.MAS)
                        .map((d, i) => (
                          <Cell
                            key={i}
                            fill={d.MAS >= 0 ? COLOR.decay : COLOR.truth}
                          />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          )}

          {active === "phase1" && (
            <Panel
              eyebrow="Baseline"
              title="Phase 1 — neutral-condition pass rate"
              note="No conflicting source present; this is each model's baseline factual accuracy before any social pressure is introduced. Thinking-tier runs are still pending. Source: phase1_pass_rates.csv"
            >
              <div style={{ width: "100%", height: 340 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={PHASE1} margin={{ left: 0, right: 20 }}>
                    <CartesianGrid stroke={COLOR.border} vertical={false} />
                    <XAxis
                      dataKey="model"
                      tick={{ fill: COLOR.muted, fontSize: 11 }}
                      stroke={COLOR.border}
                    />
                    <YAxis
                      domain={[90, 100]}
                      tick={{ fill: COLOR.muted, fontSize: 11 }}
                      stroke={COLOR.border}
                      unit="%"
                    />
                    <Tooltip content={<ChartTooltip suffix="%" />} />
                    <Bar
                      dataKey="rate"
                      name="Pass rate"
                      fill={COLOR.truth}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p
                className="text-xs mt-3 font-mono"
                style={{ color: COLOR.faint }}
              >
                Pending: {PHASE1_PENDING.join(", ")}
              </p>
            </Panel>
          )}

          {active === "profile" && (
            <Panel
              eyebrow="Figure 4"
              title="Model profile — normalised radar"
              note="0–1 normalised across SAG, ASR, MAS and CSS. Only these five models have a complete profile so far. Source: figure4_radar_chart.csv"
            >
              <div className="flex gap-2 flex-wrap mb-6">
                {RADAR_RAW.map((r) => {
                  const isSelected = radarModel === r.model;
                  return (
                    <button
                      key={r.model}
                      onClick={() => setRadarModel(r.model)}
                      className="px-3.5 py-1.5 rounded-full text-xs font-sans font-medium border border-border transition-colors duration-150 cursor-pointer"
                      style={{
                        background: isSelected ? COLOR.truth : COLOR.surface2,
                        color: isSelected ? "#04231F" : COLOR.muted,
                      }}
                    >
                      {r.model}
                    </button>
                  );
                })}
              </div>
              <div style={{ width: "100%", height: 380 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="75%">
                    <PolarGrid stroke={COLOR.border} />
                    <PolarAngleAxis
                      dataKey="axis"
                      tick={{ fill: COLOR.muted, fontSize: 12 }}
                    />
                    <PolarRadiusAxis
                      domain={[0, 1]}
                      tick={{ fill: COLOR.faint, fontSize: 10 }}
                      stroke={COLOR.border}
                    />
                    <Radar
                      dataKey="value"
                      stroke={COLOR.decay}
                      fill={COLOR.decay}
                      fillOpacity={0.35}
                    />
                    <Tooltip content={<ChartTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          )}

          {active === "table" && (
            <Panel
              eyebrow="All figures"
              title="Full results table"
              note="Every model x metric currently available across the eight source-data files."
            >
              <div className="overflow-x-auto">
                <table
                  className="w-full text-sm font-mono tabular"
                  style={{ borderCollapse: "collapse" }}
                >
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${COLOR.border}` }}>
                      {[
                        "Model",
                        "Tier",
                        "CSS",
                        "RDR",
                        "ASR (pp)",
                        "MAS (pp)",
                        "Phase 1",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left py-2.5 px-3 text-xs font-sans font-medium text-faint"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {CSS_RANKING.map((d) => {
                      const pillar = PILLARS.find((p) => p.model === d.model);
                      const am = ASR_MAS.find((p) => p.model === d.model);
                      const p1 = PHASE1.find((p) => p.model === d.model);
                      return (
                        <tr
                          key={d.model}
                          style={{ borderBottom: `1px solid ${COLOR.border}` }}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="py-2.5 px-3 font-sans text-text">
                            <TierDot tier={d.tier} />
                            {d.model}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-muted">
                            {d.tier}
                          </td>
                          <td
                            className="py-2.5 px-3 font-semibold"
                            style={{ color: decayColor(d.css, maxCss) }}
                          >
                            {d.css.toFixed(4)}
                          </td>
                          <td
                            className="py-2.5 px-3"
                            style={{ color: COLOR.muted }}
                          >
                            {pillar ? pillar.RDR.toFixed(4) : "—"}
                          </td>
                          <td
                            className="py-2.5 px-3"
                            style={{ color: COLOR.muted }}
                          >
                            {am ? am.ASR.toFixed(1) : "—"}
                          </td>
                          <td
                            className="py-2.5 px-3"
                            style={{ color: COLOR.muted }}
                          >
                            {am ? am.MAS.toFixed(1) : "—"}
                          </td>
                          <td
                            className="py-2.5 px-3"
                            style={{ color: COLOR.muted }}
                          >
                            {p1 ? `${p1.rate.toFixed(1)}%` : "pending"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
          </motion.div>
          </AnimatePresence>
        </main>

        <footer
          className="max-w-6xl mx-auto px-6 pb-10 text-xs leading-relaxed"
          style={{ color: COLOR.faint }}
        >
          CSS-300 · Stanford CME 295 · css300@stanford.edu · CC BY 4.0 ·
          figure8_sag.csv had no rows at time of export, so a standalone SAG
          figure is omitted here — SAG values for the five profiled models are
          shown under "Model Profiles".
        </footer>
    </div>
  );
}