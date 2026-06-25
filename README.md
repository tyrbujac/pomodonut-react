# Pomodonut

A Pomodoro timer with a donut progress indicator. Work and break sessions, configurable durations, auto-start, and a completion chime.

**[pomodonut.tyrbujac.com](https://pomodonut.tyrbujac.com)**

## Features

- Donut SVG progress ring animated at 60fps via `requestAnimationFrame`
- Live favicon that mirrors the donut drain in the browser tab
- Tab title shows time remaining while the timer is running
- Work / break mode toggle with animated pill
- Configurable session durations
- Auto-start next session toggle
- Completion chime (Web Audio API, no audio file)
- Sound on/off toggle
- Settings persist across reloads via localStorage

## Built with

- [React 19](https://react.dev) + TypeScript
- [Vite](https://vite.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com) (Radix + Nova preset)
- [Framer Motion](https://motion.dev)
- [Vitest](https://vitest.dev)

## Getting started

```bash
pnpm install
pnpm dev
```

Run tests:

```bash
pnpm test
```

## Notes

Built as a learning exercise covering: component architecture in React 19, smooth SVG animation without CSS transitions, Radix UI + Tailwind v4 setup, and CI/CD with GitHub Actions and Netlify.
