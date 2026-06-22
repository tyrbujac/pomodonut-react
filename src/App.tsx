import { useState, useEffect } from "react";

const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

function ModeButton({ label, onClick, isActive }: { label: string; onClick: () => void; isActive: boolean }) {
  return (
    <button
      onClick={onClick}
      className={isActive ? "bg-accent text-white" : "text-muted"}
    >
      {label}
    </button>
  );
}

function App() {
  const [mode, setMode] = useState<"work" | "break">("work");
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);

  function formatTime(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  useEffect(() => {
    if (!isRunning) return;
  
    const interval = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
  
    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col items-center justify-center gap-8">
      <h1 className="text-4xl font-bold">Pomodonut</h1>

      <div className="flex gap-2">
        <ModeButton
          label="Work"
          onClick={() => { setMode("work"); setSecondsLeft(WORK_SECONDS); }}
          isActive={mode === "work"}
        />
        <ModeButton
          label="Break"
          onClick={() => { setMode("break"); setSecondsLeft(BREAK_SECONDS); }}
          isActive={mode === "break"}
        />
      </div>
      
      <div className="text-6xl font-bold tabular-nums">{formatTime(secondsLeft)}</div>

      <button
        onClick={() => setIsRunning((prev) => !prev)}
        className="px-8 py-3 rounded-full bg-accent text-white font-semibold"
      >
        {isRunning ? "Pause" : "Start"}
      </button>
    </div>
  );
}

export default App;