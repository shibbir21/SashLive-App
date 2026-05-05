# OnSpace AI (onspace-app)

## Overview
A cross-platform mobile and web social streaming platform built with React Native and Expo SDK 53. Features live audio/video rooms, PK battles, chat, reels, and more. Branded internally as "SashLive".

## Tech Stack
- **Framework**: Expo SDK 53 + Expo Router (file-based routing)
- **Language**: TypeScript 5.8
- **Backend**: Supabase (custom instance at `rolkmmlyuqiraurjrolk.backend.onspace.ai`)
- **State Management**: Zustand
- **UI**: NativeWind (Tailwind for React Native) + React Native Paper
- **Package Manager**: pnpm

## Project Structure
- `app/` — Expo Router file-based routes
  - `(tabs)/` — Main tab navigation (Home, Discover, Messages, Profile)
  - Feature screens: `live/`, `audio-room/`, `chat/`, `video-call/`, etc.
- `components/` — UI and feature components
- `services/` — Data fetching / Supabase queries
- `template/` — Modular auth and core abstractions
- `hooks/` — Custom React hooks
- `constants/` — Colors, theme, config
- `assets/` — Static fonts and images

## Environment Variables
Set in `.env`:
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key

## Running the App
- **Web (dev)**: `npx expo start --web --port 5000` (configured as workflow)
- **Workflow**: "Start application" on port 5000 (webview)

## Deployment
- Type: Static site
- Build: `npx expo export --platform web`
- Output directory: `dist`
