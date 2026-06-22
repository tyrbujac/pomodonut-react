import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog"
import { motion } from "framer-motion";
import { Settings } from "lucide-react";
import { formatTime } from "./utils";

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

  // Refs so the rAF loop always reads current values without restarting the effect
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

  const RADIUS = 100;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const totalSeconds = mode === "work" ? workMinutes * 60 : breakMinutes * 60;
  const offset = CIRCUMFERENCE * (1 - secondsLeft / totalSeconds);

  function playChime() {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }

  useEffect(() => {
    if (!isRunning) return;

    const startTs = performance.now();
    const startRemaining = secondsLeft;
    let raf = 0;

    const loop = (now: number) => {
      const remaining = startRemaining - (now - startTs) / 1000;
      if (remaining <= 0) {
        if (soundOnRef.current) playChime();
        const nextMode = modeRef.current === "work" ? "break" : "work";
        setMode(nextMode);
        setSecondsLeft(nextMode === "work" ? workMinutesRef.current * 60 : breakMinutesRef.current * 60);
        if (autoStartRef.current) {
          setSession((s) => s + 1);
        } else {
          setIsRunning(false);
        }
        return;
      }
      setSecondsLeft(remaining);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isRunning, session]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    localStorage.setItem("workMinutes", String(workMinutes));
    localStorage.setItem("breakMinutes", String(breakMinutes));
    localStorage.setItem("autoStart", String(autoStart));
    localStorage.setItem("soundOn", String(soundOn));
  }, [workMinutes, breakMinutes, autoStart, soundOn]);

  return (
    <div className="min-h-screen text-ink flex flex-col transition-colors duration-700"
    style={{ backgroundColor: mode === "work" ? "var(--color-bg)" : "var(--color-bg-break)" }}
    >
      <header className="grid grid-cols-3 items-center p-6">
        <div />
        <h1 className="text-5xl font-display font-medium text-center">Pomodonut</h1>
        <div className="flex justify-end">
        <Dialog>
          <DialogTrigger aria-label="Settings" className="text-dim hover:text-ink transition-colors cursor-pointer">
            <Settings size={27} />
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Settings</DialogTitle>
            <div className="flex flex-col gap-2 mt-4">
              <label className="text-sm text-dim">Work minutes</label>
              <input
                type="number"
                min="1"
                value={workMinutes}
                onChange={(e) => setWorkMinutes(Math.max(1, Number(e.target.value)))}
                className="border rounded-md px-3 py-2"
              />
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <label className="text-sm text-dim">Break minutes</label>
              <input
                type="number"
                min="1"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(Math.max(1, Number(e.target.value)))}
                className="border rounded-md px-3 py-2"
              />
            </div>
            <div className="flex items-center justify-between mt-4">
              <label className="text-sm text-dim">Auto-start next session</label>
              <button
                onClick={() => setAutoStart((prev) => !prev)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${autoStart ? "bg-coral" : "bg-surface"}`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${autoStart ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
            <div className="flex items-center justify-between mt-4">
              <label className="text-sm text-dim">Sound</label>
              <button
                onClick={() => setSoundOn((prev) => !prev)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${soundOn ? "bg-coral" : "bg-surface"}`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${soundOn ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-8">
        <div className="flex bg-surface rounded-full p-1">
          <ModeButton
            label="Work"
            onClick={() => { setMode("work"); setSecondsLeft(workMinutes * 60); }}
            isActive={mode === "work"}
          />
          <ModeButton
            label="Break"
            onClick={() => { setMode("break"); setSecondsLeft(breakMinutes * 60); }}
            isActive={mode === "break"}
          />
        </div>

        <svg width="240" height="240" viewBox="0 0 240 240">
          <circle
            cx="120"
            cy="120"
            r={RADIUS}
            fill="none"
            stroke="var(--color-surface)"
            strokeWidth="20"
          />
          <circle
            cx="120"
            cy="120"
            r={RADIUS}
            fill="none"
            stroke="var(--color-donut)"
            strokeWidth="20"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={-offset}
            transform="rotate(-90 120 120)"
            style={{ transition: "none" }}
          />
          <text
            x="120"
            y="120"
            textAnchor="middle"
            dominantBaseline="central"
            className="text-4xl font-bold tabular-nums"
            fill="currentColor"
          >
            {formatTime(Math.floor(secondsLeft))}
          </text>
        </svg>

        <button
          onClick={() => setIsRunning((prev) => !prev)}
          className="px-8 py-3 rounded-full bg-coral text-white font-semibold transition-transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          {isRunning ? "Pause" : "Start"}
        </button>
      </main>
    </div>
  );
}

export default App;