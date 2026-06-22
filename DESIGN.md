# Pomodonut — Design Doc

*Tyr Bujac · 16 June 2026*

## Overview

A React Pomodoro timer rebuilt from an earlier JS version, in my current stack, with a sleeker, more minimal look. Two modes: **Work**, showing a donut with a clockwise circular sweep that depletes as time runs down; **Break**, showing a coffee mug whose level drops steadily from full to empty.

## Stack

React + TypeScript, Vite. Tailwind + shadcn/ui for chrome (settings dialog, toggle, buttons), Framer Motion for the sweep and transitions. localStorage for settings/streak (no accounts). Vitest for light unit tests on the timer logic. Git/GitHub, minimal GitHub Actions (lint + test on push), Netlify hosting.

## Features

- Work timer (default 25:00), Break timer (default 5:00)
- Custom timer visual centre-screen: donut sweep (work) / coffee level (break)
- Start/Stop, Work↔Break toggle, optional auto-start of next mode
- Settings: durations, sound on/off
- Distinctive bakery/café-style display font for the title; clean readable font for the countdown and UI

## Non-goals (deliberately out of scope)

No session counts/repeats (timer is infinite), no task lists, no stats dashboard, no user accounts. Simplicity is the point.

## Open questions

- Donut/mug assets: lean toward simple flat SVG (suits "minimal", and makes the sweep easier) rather than detailed illustration.
- Sweep implementation: SVG arc / stroke-dasharray tied to secondsRemaining / total.

## Build order

- [x] Scaffold (Vite + React + TS, Tailwind, shadcn, Framer)
- [x] Design tokens (palette, durations) — decide minimal palette up front
- [x] Static layout, hardcoded values
- [~] Timer logic (useState/useEffect interval; mind setInterval cleanup)
5. Mode switching + settings dialog
6. Custom timer visual driven by real state
7. Framer Motion polish + sound
8. Deploy to Netlify
