import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog"
import { motion } from "framer-motion";
import { Settings } from "lucide-react";
import { formatTime } from "./utils";

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
// Each entry: a=angle (degrees), r=distance from donut center (130,130), c=color, t=extra tilt
const SPRINKLES = [
  // original 14
  { a: 15,  r: 80, c: "#f472b6", t: 10  },
  { a: 42,  r: 73, c: "#fbbf24", t: -20 },
  { a: 72,  r: 83, c: "#22d3ee", t: 5   },
  { a: 100, r: 76, c: "#f5f0e8", t: 25  },
  { a: 130, r: 83, c: "#f472b6", t: -10 },
  { a: 160, r: 72, c: "#fbbf24", t: 30  },
  { a: 195, r: 80, c: "#22d3ee", t: -5  },
  { a: 225, r: 76, c: "#f472b6", t: 20  },
  { a: 255, r: 83, c: "#f5f0e8", t: -25 },
  { a: 285, r: 73, c: "#fbbf24", t: 15  },
  { a: 318, r: 80, c: "#f472b6", t: -15 },
  { a: 348, r: 78, c: "#22d3ee", t: 10  },
  { a: 52,  r: 70, c: "#f5f0e8", t: -30 },
  { a: 270, r: 87, c: "#fbbf24", t: 5   },
  // 14 more filling the gaps
  { a: 5,   r: 76, c: "#22d3ee", t: 15  },
  { a: 28,  r: 82, c: "#f472b6", t: -5  },
  { a: 57,  r: 74, c: "#fbbf24", t: 20  },
  { a: 86,  r: 80, c: "#22d3ee", t: -15 },
  { a: 115, r: 77, c: "#f5f0e8", t: 10  },
  { a: 145, r: 82, c: "#fbbf24", t: -25 },
  { a: 177, r: 75, c: "#f472b6", t: 30  },
  { a: 210, r: 84, c: "#22d3ee", t: -10 },
  { a: 238, r: 71, c: "#f5f0e8", t: 20  },
  { a: 262, r: 79, c: "#f472b6", t: -5  },
  { a: 278, r: 85, c: "#22d3ee", t: 25  },
  { a: 302, r: 74, c: "#fbbf24", t: -20 },
  { a: 333, r: 81, c: "#f472b6", t: 15  },
  { a: 358, r: 77, c: "#22d3ee", t: -30 },
];

// ─── Donut progress wedge clip-path ──────────────────────────────────────────
// Pie wedge centred at (130,130), starting at 12 o'clock, sweeping clockwise
// by progress*360°. Clips the vivid donut layer to show remaining time.
function wedgePath(progress: number): string {
  if (progress <= 0) return "";
  const cx = 130, cy = 130, r = 150;
  const startX = cx, startY = cy - r; // 12 o'clock
  if (progress >= 0.9999) {
    // Full circle — two 180° counterclockwise halves (SVG can't do 360° in one arc)
    return `M ${cx},${cy} L ${startX},${startY} A ${r},${r} 0 0 0 ${cx},${cy + r} A ${r},${r} 0 0 0 ${startX},${startY} Z`;
  }
  // Sweep counterclockwise so the ghost eats clockwise from 12 o'clock
  const angle = progress * 2 * Math.PI;
  const endX = cx - r * Math.sin(angle);
  const endY = cy - r * Math.cos(angle);
  const largeArc = progress > 0.5 ? 1 : 0;
  return `M ${cx},${cy} L ${startX},${startY} A ${r},${r} 0 ${largeArc} 0 ${endX},${endY} Z`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ModeButton({ label, onClick, isActive }: { label: string; onClick: () => void; isActive: boolean }) {
  return (
    <button
      onClick={onClick}
      className="relative px-4 py-2 rounded-full font-semibold cursor-pointer"
    >
      {isActive && (
        <motion.div
          layoutId="toggle-pill"
          className="absolute inset-0 bg-coral rounded-full"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
      <span className={`relative z-10 ${isActive ? "text-white" : "text-dim"}`}>
        {label}
      </span>
    </button>
  );
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  // "Previous render value" pattern — sync draft to value without an effect.
  // React re-renders synchronously when setState is called during render.
  const [prevValue, setPrevValue] = useState(value);
  const [draft, setDraft] = useState(String(value));
  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(String(value));
  }

  const commit = () => {
    const n = Math.max(1, parseInt(draft, 10) || 1);
    setDraft(String(n));
    onChange(n);
  };

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium text-dim">{label}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(1, value - 1))}
          className="w-7 h-7 rounded-full bg-surface hover:bg-coral hover:text-white transition-colors font-bold cursor-pointer flex items-center justify-center leading-none"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          className="w-10 text-center text-sm font-semibold bg-transparent outline-none border-b border-border focus:border-coral transition-colors"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => e.key === "Enter" && commit()}
        />
        <button
          onClick={() => onChange(value + 1)}
          className="w-7 h-7 rounded-full bg-surface hover:bg-coral hover:text-white transition-colors font-bold cursor-pointer flex items-center justify-center leading-none"
          aria-label={`Increase ${label}`}
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
  const [workMinutes, setWorkMinutes] = useState(
    Number(localStorage.getItem("workMinutes")) || 25
  );
  const [breakMinutes, setBreakMinutes] = useState(
    Number(localStorage.getItem("breakMinutes")) || 5
  );
  const [autoStart, setAutoStart] = useState(
    localStorage.getItem("autoStart") === "true"
  );
  const [soundOn, setSoundOn] = useState(
    localStorage.getItem("soundOn") !== "false"
  );
  const [secondsLeft, setSecondsLeft] = useState(workMinutes * 60);
  const [session, setSession] = useState(0);

  // Refs so the rAF / timeout callbacks always read current values
  const modeRef = useRef(mode);
  const workMinutesRef = useRef(workMinutes);
  const breakMinutesRef = useRef(breakMinutes);
  const autoStartRef = useRef(autoStart);
  const soundOnRef = useRef(soundOn);

  useLayoutEffect(() => {
    modeRef.current = mode;
    workMinutesRef.current = workMinutes;
    breakMinutesRef.current = breakMinutes;
    autoStartRef.current = autoStart;
    soundOnRef.current = soundOn;
  });

  // Progress (feeds wedgePath for the donut clip)
  const totalSeconds = mode === "work" ? workMinutes * 60 : breakMinutes * 60;
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

      // Session complete: chime → flip mode → auto-start or stop
      function onComplete() {
        if (soundOnRef.current) playChime();
        const nextMode = modeRef.current === "work" ? "break" : "work";
        const nextSecs =
          nextMode === "work"
            ? workMinutesRef.current * 60
            : breakMinutesRef.current * 60;
        setMode(nextMode);
        setSecondsLeft(nextSecs);
        if (autoStartRef.current) {
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

  // (Idle resync is handled inline in the settings onChange handlers below.)

  // ── Persist settings
  useEffect(() => {
    localStorage.setItem("workMinutes", String(workMinutes));
    localStorage.setItem("breakMinutes", String(breakMinutes));
    localStorage.setItem("autoStart", String(autoStart));
    localStorage.setItem("soundOn", String(soundOn));
  }, [workMinutes, breakMinutes, autoStart, soundOn]);

  const handleStartPause = () => {
    const next = !isRunning;
    if (soundOnRef.current) {
      if (next) playStart(); else playPause();
    }
    setIsRunning(next);
  };

  return (
    <div
      className="min-h-screen text-ink flex flex-col transition-colors duration-700"
      style={{ backgroundColor: mode === "work" ? "var(--color-bg)" : "var(--color-bg-break)" }}
    >
      <header className="grid grid-cols-3 items-center p-6">
        <div />
        <h1 className="text-5xl font-display font-medium text-center">Pomodonut</h1>
        <div className="flex justify-end">
          <Dialog>
            <DialogTrigger
              aria-label="Settings"
              className="text-dim hover:text-ink transition-colors cursor-pointer"
            >
              <Settings size={27} />
            </DialogTrigger>
            <DialogContent className="bg-bg border-0 shadow-2xl ring-1 ring-ink/5 sm:max-w-xs">
              <DialogTitle className="font-display text-2xl text-center text-ink">
                Settings
              </DialogTitle>
              <div className="flex flex-col mt-1 divide-y divide-surface">
                <Stepper
                  label="Work (min)"
                  value={workMinutes}
                  onChange={v => {
                    setWorkMinutes(v);
                    // Resync display when idle in work mode
                    if (!isRunning && mode === "work") setSecondsLeft(v * 60);
                  }}
                />
                <Stepper
                  label="Break (min)"
                  value={breakMinutes}
                  onChange={v => {
                    setBreakMinutes(v);
                    // Resync display when idle in break mode
                    if (!isRunning && mode === "break") setSecondsLeft(v * 60);
                  }}
                />
                <ToggleSetting label="Auto-start" checked={autoStart} onChange={setAutoStart} />
                <ToggleSetting label="Sound" checked={soundOn} onChange={setSoundOn} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-8">
        <div className="flex bg-surface rounded-full p-1">
          <ModeButton
            label="Work"
            onClick={() => {
              setIsRunning(false);
              setMode("work");
              setSecondsLeft(workMinutes * 60);
            }}
            isActive={mode === "work"}
          />
          <ModeButton
            label="Break"
            onClick={() => {
              setIsRunning(false);
              setMode("break");
              setSecondsLeft(breakMinutes * 60);
            }}
            isActive={mode === "break"}
          />
        </div>

        {/* ── Donut SVG ─────────────────────────────────────────────────────── */}
        <svg width="260" height="260" viewBox="0 0 260 260" aria-hidden="true">
          <defs>
            <filter id="donut-shadow" x="-8%" y="-8%" width="116%" height="116%">
              <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="rgba(0,0,0,0.18)" />
            </filter>

            {/* Donut art defined once; rendered twice below (ghost + vivid) */}
            <g id="donut-art">
              <circle cx="130" cy="130" r="78" fill="none" stroke="var(--color-dough)" strokeWidth="66" />
              <circle cx="130" cy="130" r="78" fill="none" stroke="var(--color-choc)"  strokeWidth="44" />
              {SPRINKLES.map(({ a, r, c, t }, i) => {
                const rad = (a * Math.PI) / 180;
                const sx  = 130 + Math.cos(rad) * r;
                const sy  = 130 + Math.sin(rad) * r;
                return (
                  <rect
                    key={i}
                    x={sx - 4} y={sy - 1.5}
                    width={8} height={3} rx={1.5}
                    fill={c}
                    transform={`rotate(${a + 90 + t} ${sx} ${sy})`}
                  />
                );
              })}
            </g>

            {/* Pie-wedge clip: covers remaining-time portion (shrinks as timer runs) */}
            {progress > 0 && progress < 0.9999 && (
              <clipPath id="progress-wedge">
                <path d={wedgePath(progress)} />
              </clipPath>
            )}
          </defs>

          {/* Ghost layer — full donut at 25% opacity; carries the drop shadow */}
          <use href="#donut-art" opacity="0.25" filter="url(#donut-shadow)" />

          {/* Vivid layer — same donut, clipped to the remaining-time wedge */}
          {progress > 0 && (
            <use
              href="#donut-art"
              clipPath={progress < 0.9999 ? "url(#progress-wedge)" : undefined}
            />
          )}

          {/* Countdown text — always on top, never clipped */}
          <text
            x="130" y="130"
            textAnchor="middle"
            dominantBaseline="central"
            className="text-3xl font-bold tabular-nums"
            fill="currentColor"
          >
            {formatTime(Math.floor(secondsLeft))}
          </text>
        </svg>

        <button
          onClick={handleStartPause}
          className="px-8 py-3 rounded-full bg-coral text-white font-semibold transition-transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          {isRunning ? "Pause" : "Start"}
        </button>
      </main>
    </div>
  );
}

export default App;
