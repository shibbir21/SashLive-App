# SashLive — OnSpace App

## Overview
SashLive is a React Native / Expo mobile and web app focused on live streaming, audio rooms, PK invites, gifting, chat, and virtual currency (Diamonds / S-Coins). It uses Expo Router for file-based navigation and Supabase as the backend.

## Tech Stack
- **Framework**: Expo SDK 53 with Expo Router v5
- **Language**: TypeScript
- **Package Manager**: pnpm
- **Backend**: Supabase (auth, database, real-time)
- **Styling**: NativeWind (Tailwind for RN) + React Native Paper
- **State**: Zustand
- **Navigation**: Expo Router (file-based)

## Project Structure
- `app/` — All screens and routing (Expo Router file-based)
  - `app/(tabs)/` — Main bottom-tab navigation (Home, Explore, Messages, Profile)
  - `app/live/`, `app/audio-room/`, `app/chat/`, etc. — Feature screens
- `components/` — Reusable UI components
  - `components/ui/` — Base elements
  - `components/feature/` — Business-logic components
- `services/` — Data fetching and business logic
- `hooks/` — Custom React hooks
- `contexts/` — React Context providers
- `constants/` — App-wide constants (Colors, theme, config)
- `template/` — Auth and UI module stubs (Mock vs Supabase)
- `assets/` — Fonts and images

## Environment Variables
Stored in `.env`:
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase public anon key

## Running the App
```bash
pnpm install
pnpm run web   # Runs on port 5000
```

## Workflow
- **Start application**: `pnpm run web` — serves the Expo web build on port 5000
