import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Settings } from "lucide-react";
import { formatTime, parseTime, wedgePath } from "./utils";

// ─── Audio ────────────────────────────────────────────────────────────────────
// One shared AudioContext, lazily created and reused across all sounds.
let audioCtx: AudioContext | null = null;
function getCtx() {
  if (!audioCtx || audioCtx.state === "closed") audioCtx = new AudioContext();
  return audioCtx;
}
function scheduleNote(ctx: AudioContext, freq: number, start: number, dur: number, vol: number) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g);
  g.connect(ctx.destination);
  osc.frequency.value = freq;
  g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.start(start);
  osc.stop(start + dur);
}
function playStart() {
  const ctx = getCtx();
  ctx.resume().then(() => {
    scheduleNote(ctx, 440, ctx.currentTime, 0.12, 0.15);
    scheduleNote(ctx, 660, ctx.currentTime + 0.1, 0.12, 0.12);
  });
}
function playPause() {
  const ctx = getCtx();
  ctx.resume().then(() => {
    scheduleNote(ctx, 550, ctx.currentTime, 0.12, 0.15);
    scheduleNote(ctx, 370, ctx.currentTime + 0.1, 0.12, 0.12);
  });
}
function playChime() {
  const ctx = getCtx();
  ctx.resume().then(() => {
    scheduleNote(ctx, 880, ctx.currentTime, 0.5, 0.3);
    scheduleNote(ctx, 1100, ctx.currentTime + 0.2, 0.35, 0.2);
  });
}

// ─── Donut sprinkle data (hardcoded = deterministic, stable across renders) ───
// Each entry: a=angle (degrees, 0=right, clockwise), r=distance from donut centre (130,130), c=color, t=extra tilt
// 24 sprinkles at ~14.5° intervals with a deliberate 32° gap centred just clockwise
// of 12 o'clock (a=268→300). No sprinkle lands within the wedge-edge danger zone so
// none get clipped at the start of the timer. Radii cycle 90/68/80 — no adjacent
// pair shares a radius, guaranteeing no overlap.
const SPRINKLES = [
  { a: 298, r: 90, c: "#f472b6", t: 15  },
  { a: 314, r: 68, c: "#fbbf24", t: -10 },
  { a: 328, r: 80, c: "#22d3ee", t: 20  },
  { a: 342, r: 90, c: "#fb923c", t: -5  },
  { a: 357, r: 68, c: "#f5f0e8", t: 25  },
  { a: 11,  r: 80, c: "#a78bfa", t: -15 },
  { a: 25,  r: 90, c: "#4ade80", t: 10  },
  { a: 40,  r: 68, c: "#f472b6", t: -20 },
  { a: 54,  r: 80, c: "#fbbf24", t: 5   },
  { a: 68,  r: 90, c: "#22d3ee", t: -10 },
  { a: 82,  r: 68, c: "#fb923c", t: 30  },
  { a: 97,  r: 80, c: "#f5f0e8", t: -25 },
  { a: 111, r: 90, c: "#a78bfa", t: 15  },
  { a: 125, r: 68, c: "#4ade80", t: -5  },
  { a: 140, r: 80, c: "#f472b6", t: 20  },
  { a: 154, r: 90, c: "#fbbf24", t: -30 },
  { a: 168, r: 68, c: "#22d3ee", t: 10  },
  { a: 182, r: 80, c: "#fb923c", t: -15 },
  { a: 197, r: 90, c: "#f5f0e8", t: 25  },
  { a: 211, r: 68, c: "#a78bfa", t: -20 },
  { a: 225, r: 80, c: "#4ade80", t: 5   },
  { a: 239, r: 90, c: "#f472b6", t: -10 },
  { a: 253, r: 68, c: "#fbbf24", t: 15  },
  { a: 270, r: 80, c: "#22d3ee", t: -25 },
];

// ─── Wavy chocolate glaze path ───────────────────────────────────────────────
// Outer boundary: sine-wave bumps around r=100. Inner boundary: clean circular
// hole at r=44. fill-rule="evenodd" cuts the inner circle out, leaving the ring.
const CHOC_PATH = (() => {
  const cx = 130, cy = 130, innerR = 44;
  const outerR = 103, amplitude = 3.8, bumps = 10;
  const steps = 200; // 20 segments per bump — smooth curves
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    // cos so the first bump peaks at 12 o'clock
    const r = outerR + amplitude * Math.cos(bumps * theta);
    const x = (cx + r * Math.cos(theta - Math.PI / 2)).toFixed(1);
    const y = (cy + r * Math.sin(theta - Math.PI / 2)).toFixed(1);
    d += i === 0 ? `M ${x},${y}` : ` L ${x},${y}`;
  }
  d += " Z";
  // Inner hole subpath (clockwise arc) — evenodd cuts it out
  d += ` M ${cx + innerR},${cy}`;
  d += ` A ${innerR},${innerR} 0 1 1 ${cx - innerR},${cy}`;
  d += ` A ${innerR},${innerR} 0 1 1 ${cx + innerR},${cy} Z`;
  return d;
})();

// ─── localStorage helpers ─────────────────────────────────────────────────────
// Reads seconds; migrates from old whole-minute keys if new key absent.
function getSecondsFromStorage(key: string, legacyMinuteKey: string, defaultMinutes: number): number {
  const saved = localStorage.getItem(key);
  if (saved !== null) return Number(saved);
  const oldMins = Number(localStorage.getItem(legacyMinuteKey));
  return (oldMins || defaultMinutes) * 60;
}
// Reads a boolean; falls back to the legacy "autoStart" key if new key absent.
function getAutoStartFromStorage(key: string): boolean {
  const saved = localStorage.getItem(key);
  if (saved !== null) return saved === "true";
  return localStorage.getItem("autoStart") === "true";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ModeButton({
  label,
  onClick,
  isActive,
  accent,
}: {
  label: string;
  onClick: () => void;
  isActive: boolean;
  accent: string;
}) {
  return (
    <button
      onClick={onClick}
      className="relative px-5 py-2.5 sm:px-7 sm:py-3 rounded-full font-semibold cursor-pointer text-sm sm:text-base"
    >
      {isActive && (
        <motion.div
          layoutId="toggle-pill"
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: accent }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
      <span className={`relative z-10 ${isActive ? "text-white" : "text-dim"}`}>
        {label}
      </span>
    </button>
  );
}

// MM:SS time field — value is total seconds; ± buttons step by 1 minute.
function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (s: number) => void;
}) {
  // "Previous render value" pattern — sync draft to value without an effect.
  const [prevValue, setPrevValue] = useState(value);
  const [draft, setDraft] = useState(formatTime(value));
  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(formatTime(value));
  }

  const commit = () => {
    const parsed = parseTime(draft);
    if (parsed !== null) {
      setDraft(formatTime(parsed));
      onChange(parsed);
    } else {
      setDraft(formatTime(value)); // reset to last valid value
    }
  };

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium text-dim">{label}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(5, value - 60))}
          className="w-7 h-7 rounded-full bg-surface hover:bg-coral hover:text-white transition-colors font-bold cursor-pointer flex items-center justify-center leading-none"
          aria-label={`Decrease ${label} by 1 minute`}
        >
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          className="w-14 text-center text-sm font-semibold bg-transparent outline-none border-b border-border focus:border-coral transition-colors"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onFocus={e => e.target.select()}
          onBlur={commit}
          onKeyDown={e => e.key === "Enter" && commit()}
          aria-label={`${label} duration (MM:SS)`}
        />
        <button
          onClick={() => onChange(Math.min(5999, value + 60))}
          className="w-7 h-7 rounded-full bg-surface hover:bg-coral hover:text-white transition-colors font-bold cursor-pointer flex items-center justify-center leading-none"
          aria-label={`Increase ${label} by 1 minute`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function ToggleSetting({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium text-dim">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-coral/50 outline-none ${
          checked ? "bg-coral" : "bg-surface"
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const [mode, setMode] = useState<"work" | "break">("work");
  const [isRunning, setIsRunning] = useState(false);
  const [workSeconds, setWorkSeconds] = useState(() =>
    getSecondsFromStorage("workSeconds", "workMinutes", 25)
  );
  const [breakSeconds, setBreakSeconds] = useState(() =>
    getSecondsFromStorage("breakSeconds", "breakMinutes", 5)
  );
  const [autoStartBreak, setAutoStartBreak] = useState(() =>
    getAutoStartFromStorage("autoStartBreak")
  );
  const [autoStartWork, setAutoStartWork] = useState(() =>
    getAutoStartFromStorage("autoStartWork")
  );
  const [soundOn, setSoundOn] = useState(
    localStorage.getItem("soundOn") !== "false"
  );
  const [secondsLeft, setSecondsLeft] = useState(() =>
    getSecondsFromStorage("workSeconds", "workMinutes", 25)
  );
  const [session, setSession] = useState(0);

  // Refs so rAF / timeout callbacks always read current values
  const modeRef = useRef(mode);
  const workSecondsRef = useRef(workSeconds);
  const breakSecondsRef = useRef(breakSeconds);
  const autoStartBreakRef = useRef(autoStartBreak);
  const autoStartWorkRef = useRef(autoStartWork);
  const soundOnRef = useRef(soundOn);

  useLayoutEffect(() => {
    modeRef.current = mode;
    workSecondsRef.current = workSeconds;
    breakSecondsRef.current = breakSeconds;
    autoStartBreakRef.current = autoStartBreak;
    autoStartWorkRef.current = autoStartWork;
    soundOnRef.current = soundOn;
  });

  // Progress (feeds wedgePath for the donut clip)
  const totalSeconds = mode === "work" ? workSeconds : breakSeconds;
  const progress = Math.max(0, Math.min(1, secondsLeft / totalSeconds));

  // Timer refs
  const endTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Timer engine: a scheduled timeout drives completion (fires even in
  //    background tabs); rAF keeps the on-screen number smooth while visible.
  useEffect(() => {
    if (!isRunning) return;

    const end = Date.now() + secondsLeft * 1000;
    endTimeRef.current = end;

    // This fires even when the tab is hidden — fixes the background-tab bug.
    timeoutRef.current = setTimeout(() => {
      cancelAnimationFrame(rafRef.current);
      setSecondsLeft(0);

      function onComplete() {
        if (soundOnRef.current) playChime();
        const nextMode = modeRef.current === "work" ? "break" : "work";
        const nextSecs =
          nextMode === "work"
            ? workSecondsRef.current
            : breakSecondsRef.current;
        setMode(nextMode);
        setSecondsLeft(nextSecs);
        // "Auto-start breaks" triggers when work ends → break begins
        // "Auto-start work"   triggers when break ends → work begins
        const shouldAutoStart =
          nextMode === "break"
            ? autoStartBreakRef.current
            : autoStartWorkRef.current;
        if (shouldAutoStart) {
          setSession(s => s + 1);
        } else {
          setIsRunning(false);
        }
      }

      onComplete();
    }, secondsLeft * 1000);

    // rAF loop: only responsible for rendering the countdown, not completion.
    const tick = () => {
      const rem = (endTimeRef.current! - Date.now()) / 1000;
      if (rem > 0) {
        setSecondsLeft(rem);
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isRunning, session]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist settings
  useEffect(() => {
    localStorage.setItem("workSeconds", String(workSeconds));
    localStorage.setItem("breakSeconds", String(breakSeconds));
    localStorage.setItem("autoStartBreak", String(autoStartBreak));
    localStorage.setItem("autoStartWork", String(autoStartWork));
    localStorage.setItem("soundOn", String(soundOn));
  }, [workSeconds, breakSeconds, autoStartBreak, autoStartWork, soundOn]);

  // ── Document title + real-time favicon
  useEffect(() => {
    // Title
    if (isRunning) {
      const label = mode === "work" ? "Work Time" : "Enjoy your break";
      const s = Math.ceil(secondsLeft);
      const m = Math.floor(s / 60);
      const sec = s % 60;
      const compact = `${m}:${String(sec).padStart(2, "0")}`;
      document.title = `${compact} left – ${label}`;
    } else {
      document.title = "Pomodonut";
    }

    // Favicon: mini 32×32 SVG donut mirroring current drain
    const cx = 16, cy = 16, fr = 18;
    let cpDefs = "";
    let clipAttr = "";
    if (progress > 0 && progress < 0.9999) {
      const angle = progress * 2 * Math.PI;
      const ex = (cx - fr * Math.sin(angle)).toFixed(2);
      const ey = (cy - fr * Math.cos(angle)).toFixed(2);
      const la = progress > 0.5 ? 1 : 0;
      const d = `M ${cx},${cy} L ${cx},${cy - fr} A ${fr},${fr} 0 ${la} 0 ${ex},${ey} Z`;
      cpDefs = `<defs><clipPath id="fc"><path d="${d}"/></clipPath></defs>`;
      clipAttr = ` clip-path="url(#fc)"`;
    }
    const vivid = progress > 0
      ? `<circle cx="16" cy="16" r="11" fill="none" stroke="#d4a882" stroke-width="10"${clipAttr}/><circle cx="16" cy="16" r="11" fill="none" stroke="#5c3317" stroke-width="7"${clipAttr}/>`
      : "";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${cpDefs}<circle cx="16" cy="16" r="11" fill="none" stroke="#dcd2c8" stroke-width="10"/>${vivid}</svg>`;

    let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = "data:image/svg+xml," + encodeURIComponent(svg);
  }, [secondsLeft, isRunning, mode, progress]);

  const handleStartPause = () => {
    const next = !isRunning;
    if (soundOnRef.current) {
      if (next) playStart(); else playPause();
    }
    setIsRunning(next);
  };

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const secs = String(Math.floor(secondsLeft) % 60).padStart(2, "0");

  return (
    <div
      className="min-h-screen text-ink flex flex-col transition-colors duration-700"
      style={{ backgroundColor: mode === "work" ? "var(--color-bg)" : "var(--color-bg-break)" }}
    >
      <header className="relative flex items-center justify-center px-6 pt-6 pb-2">
        <h1
          className="font-display font-medium leading-none"
          style={{ fontSize: "clamp(2.8rem, 7vw, 3.3rem)" }}
        >
          Pomodonut
        </h1>
        <div className="absolute right-6">
          <Dialog>
            <DialogTrigger
              aria-label="Settings"
              className="text-dim hover:text-ink transition-colors cursor-pointer"
            >
              <Settings size={30} />
            </DialogTrigger>
            <DialogContent className="bg-bg border-0 shadow-2xl ring-1 ring-ink/5 sm:max-w-sm">
              <DialogTitle className="font-display text-2xl text-center text-ink">
                Settings
              </DialogTitle>
              <div className="flex flex-col mt-1 divide-y divide-surface">
                <TimeField
                  label="Work"
                  value={workSeconds}
                  onChange={v => {
                    setWorkSeconds(v);
                    if (!isRunning && mode === "work") setSecondsLeft(v);
                  }}
                />
                <TimeField
                  label="Break"
                  value={breakSeconds}
                  onChange={v => {
                    setBreakSeconds(v);
                    if (!isRunning && mode === "break") setSecondsLeft(v);
                  }}
                />
                <ToggleSetting
                  label="Auto-start breaks"
                  checked={autoStartBreak}
                  onChange={setAutoStartBreak}
                />
                <ToggleSetting
                  label="Auto-start work"
                  checked={autoStartWork}
                  onChange={setAutoStartWork}
                />
                <ToggleSetting label="Sound" checked={soundOn} onChange={setSoundOn} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-8 sm:gap-10 px-4 pb-8">
        {/* ── Work / Break toggle ───────────────────────────────────────────── */}
        <div className="flex bg-surface rounded-full p-1.5">
          <ModeButton
            label="Work"
            onClick={() => {
              setIsRunning(false);
              setMode("work");
              setSecondsLeft(workSeconds);
            }}
            isActive={mode === "work"}
            accent="var(--color-coral)"
          />
          <ModeButton
            label="Break"
            onClick={() => {
              setIsRunning(false);
              setMode("break");
              setSecondsLeft(breakSeconds);
            }}
            isActive={mode === "break"}
            accent="var(--color-break)"
          />
        </div>

        {/* ── Donut + countdown overlay ─────────────────────────────────────── */}
        <div
          className="relative w-full"
          style={{ maxWidth: "min(360px, 82vw)" }}
        >
          <svg
            width="100%"
            viewBox="0 0 260 260"
            aria-hidden="true"
          >
            <defs>
              {/* Donut art defined once; reused for ghost + vivid layers */}
              <g id="donut-art" transform="rotate(-14, 130, 130)">
                {/* Dough ring — slightly wider than choc to show a rim */}
                <circle cx="130" cy="130" r="78" fill="none" stroke="var(--color-dough)" strokeWidth="68" />
                {/* Chocolate glaze — wavy outer edge, clean inner hole, evenodd cuts the centre out */}
                <path d={CHOC_PATH} fill="var(--color-choc)" fillRule="evenodd" />
                {/* Sprinkles — spread across the full chocolate zone */}
                {SPRINKLES.map(({ a, r, c, t }, i) => {
                  const rad = (a * Math.PI) / 180;
                  const sx = 130 + Math.cos(rad) * r;
                  const sy = 130 + Math.sin(rad) * r;
                  return (
                    <rect
                      key={i}
                      x={sx - 9.75} y={sy - 3.75}
                      width={19.5} height={7.5} rx={3.75}
                      fill={c}
                      transform={`rotate(${a + 90 + t} ${sx} ${sy})`}
                    />
                  );
                })}
              </g>

              {/* Pie-wedge clip: covers remaining-time portion */}
              {progress > 0 && progress < 0.9999 && (
                <clipPath id="progress-wedge">
                  <path d={wedgePath(progress)} />
                </clipPath>
              )}
            </defs>

            {/* Grey background ring — plain empty ring shown in drained area */}
            <circle cx="130" cy="130" r="78" fill="none" stroke="oklch(0.86 0.01 60)" strokeWidth="68" />

            {/* Vivid layer — clipped to the remaining-time wedge */}
            {progress > 0 && (
              <use
                href="#donut-art"
                clipPath={progress < 0.9999 ? "url(#progress-wedge)" : undefined}
              />
            )}
          </svg>

          {/* Countdown — HTML overlay centred on the donut hole */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            aria-label={`${mins} minutes ${secs} seconds remaining`}
          >
            <div
              className="inline-grid tabular-nums font-semibold font-display text-ink"
              style={{
                gridTemplateColumns: "calc(2ch + 6px) auto calc(2ch + 6px)",
                fontSize: "clamp(1.5rem, 5vw, 2.2rem)",
                lineHeight: 1,
                letterSpacing: "1.5px",
              }}
            >
              <span className="text-right leading-none">{mins}</span>
              <span className="text-center leading-none" style={{ paddingInline: "0.06em" }}>:</span>
              <span className="leading-none">{secs}</span>
            </div>
          </div>
        </div>

        {/* ── Start / Pause button ──────────────────────────────────────────── */}
        <button
          onClick={handleStartPause}
          className="px-10 py-3.5 sm:px-12 sm:py-4 rounded-full bg-coral text-white font-semibold text-base sm:text-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          {isRunning ? "Pause" : "Start"}
        </button>
      </main>
    </div>
  );
}

export default App;
