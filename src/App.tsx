import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog"

function ModeButton({ label, onClick, isActive }: { label: string; onClick: () => void; isActive: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full font-semibold transition-colors ${
        isActive ? "bg-coral text-white" : "text-dim"
      }`}
    >
      {label}
    </button>
  );
}

function App() {
  const [mode, setMode] = useState<"work" | "break">("work");
  const [isRunning, setIsRunning] = useState(false);
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [secondsLeft, setSecondsLeft] = useState(workMinutes * 60);

  const RADIUS = 100;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const totalSeconds = mode === "work" ? workMinutes * 60 : breakMinutes * 60;
  const offset = CIRCUMFERENCE * (1 - secondsLeft / totalSeconds);

  function formatTime(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  useEffect(() => {
    if (!isRunning) return;
  
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  
    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col items-center justify-center gap-8">
      <h1 className="text-5xl font-display font-medium">Pomodonut</h1>

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
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
        <text
          x="120"
          y="120"
          textAnchor="middle"
          dominantBaseline="central"
          className="text-4xl font-bold tabular-nums"
          fill="currentColor"
        >
          {formatTime(secondsLeft)}
        </text>
      </svg>

      <button
        onClick={() => setIsRunning((prev) => !prev)}
        className="px-8 py-3 rounded-full bg-coral text-white font-semibold"
      >
        {isRunning ? "Pause" : "Start"}
      </button>
    </div>
  );
}

export default App;