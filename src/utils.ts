export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// Pie wedge centred at (130,130), starting at 12 o'clock, sweeping clockwise
// by progress*360°. Clips the vivid donut layer to show remaining time.
export function wedgePath(progress: number): string {
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

// Parse "M:SS" or "MM:SS" → total seconds. Returns null for invalid input.
// Clamped to [5, 5999] seconds (0:05–99:59).
export function parseTime(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  if (seconds >= 60) return null;
  const total = minutes * 60 + seconds;
  return Math.max(5, Math.min(5999, total));
}
