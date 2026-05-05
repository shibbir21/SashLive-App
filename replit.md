# SashLive — Production-Ready Live Streaming App

## Overview
SashLive is a full-featured React Native / Expo live streaming app — a PoppoLive clone. It includes live streaming, audio rooms, PK battles, gifting, real-time chat, virtual currency (Diamonds/S-Coins/Points), leaderboards, VIP system, reels/short videos, games (Ocean Hunt, Fruit Roulette, Golden Wheel, Lucky Number, Blackjack, etc.), agency system, daily tasks, notifications, and all PoppoLive-equivalent features.

## Tech Stack
- **Framework**: Expo SDK 53 with Expo Router v5
- **Language**: TypeScript
- **Package Manager**: pnpm
- **Backend**: Supabase (auth, database, real-time)
- **Styling**: NativeWind (Tailwind for RN) + StyleSheet
- **State**: Zustand via AppContext
- **Navigation**: Expo Router (file-based)
- **Icons**: @expo/vector-icons (MaterialIcons)
- **Images**: expo-image
- **Gradients**: expo-linear-gradient

## Theme / Colors
- `Colors.bg = '#0D0014'` (dark purple), `primary = '#FF2E8B'`, `secondary = '#9B30FF'`
- `diamond = '#00DFFF'`, `gold = '#FFCC00'`, `live = red`, `success = green`
- Home/Messages/Profile use light white (`#F9FAFB`) theme; inner screens use dark purple

## Project Structure
- `app/(tabs)/` — Home, Explore, Messages, Profile tabs + `_layout.tsx` (tab bar)
- `app/live/[id].tsx` — Full live room (1623 lines): chat, gifts, PK battles, mini-games, beauty
- `app/go-live.tsx` — Stream setup + active streaming session with timers
- `app/audio-room/` — Voice-only broadcast rooms
- `app/reels.tsx` — TikTok-style short video feed
- `app/stories.tsx` — Instagram-style stories viewer
- `app/games.tsx` — Full games hub (Ocean Hunt, Fruit Roulette, Golden Wheel, Lucky Number, etc.)
- `app/leaderboard.tsx` — Top gifters/hosts/agencies with podium (fixed mock data fallback)
- `app/daily-tasks.tsx` — Task list with claim rewards
- `app/wallet.tsx` — Points/diamonds/coins balance + transaction history
- `app/withdrawal.tsx` — Multi-method withdrawal (USDT, bKash, Nagad, PayPal, Bank)
- `app/recharge.tsx` — 4-step diamond purchase flow
- `app/vip-store.tsx` — VIP tiers (Bronze→Crown) with perks + Item Shop
- `app/agency.tsx` — Full agency system: tiers, commissions, host management, QR
- `app/host-panel.tsx` — Host dashboard: earnings, stats, schedule
- `app/notifications.tsx` — Filtered notification list with action buttons
- `app/search.tsx` — Search users, rooms, tags with debounce
- `app/chat/[id].tsx` — Direct message chat
- `app/user/[id].tsx` — User profile page
- `app/pk-invite/[id].tsx` — PK battle invitation flow
- `app/video-call/[id].tsx` — Video call screen
- `app/edit-profile.tsx` — Edit profile
- `app/settings.tsx` — App settings
- `app/admin-panel.tsx` — Admin panel
- `constants/theme.ts` — All colors, spacing, typography
- `services/mockData.ts` — Mock fallback data for all screens
- `services/earningService.ts` — Points/USD conversion, leaderboard fetches
- `services/liveRoomService.ts` — Live room CRUD operations
- `services/dailyTaskService.ts` — Task fetch and claim
- `services/presenceService.ts` — Online/offline presence
- `contexts/AppContext.tsx` — Global state (user, diamonds, coins, points, follows)
- `template/` — Auth and UI stubs (Supabase auth + custom alert/modal system)

## Home Screen Architecture (app/(tabs)/index.tsx)
1. Top Nav (Following/Popular/Party/Explore tabs + Search/Leaderboard icons)
2. **FeaturedLiveHero** — Auto-scrolling carousel of top 3 live streams (NEW)
3. StoriesRow — Horizontal story avatars with LIVE badges
4. ShortVideosRow — Vertical video preview cards  
5. PKBattlesRow — Live PK battle cards with VS bars
6. OnlineStreamersRow — Online user avatars with LIVE badges
7. TopFeatureBanners — Honor/Activity banners (Popular/Explore only)
8. Room list (list/grid view) with EventBanner inserted at index 4
9. QuickNavRow — PK Battle / Games / Daily Tasks / Withdraw

## Mock Data Fallbacks
All screens use mock data (`MOCK_*` constants) and fall back gracefully when Supabase returns no data. The leaderboard was fixed to show mock data immediately (no loading spinner on first render).

## Key Fixes Made
- `textShadow*` deprecated props → `textShadow: '0px 0px 8px color'` in live room, stories, reels, VIP
- `pointerEvents` prop on View → `style={{ pointerEvents: 'none' }}` in live room
- Leaderboard loading state: shows mock data immediately, only fetches from DB on refresh
- Featured Live Hero Carousel added to home screen

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
