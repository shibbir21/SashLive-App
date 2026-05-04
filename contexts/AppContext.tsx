// SashLive — AppContext with DB Follow + Presence Heartbeat + Points System
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { AppState } from 'react-native';
import { MOCK_CURRENT_USER } from '@/services/mockData';
import { followUser, unfollowUser } from '@/services/followService';
import { updatePresence } from '@/services/presenceService';
import { addPoints, EARNING_RATES, diamondsToPoints } from '@/services/earningService';
import { useAuth } from '@/template';
import { getSupabaseClient } from '@/template';

interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  followers: number;
  following: number;
  diamonds: number;
  coins: number;
  points: number;
  vipLevel: number;
  isHost: boolean;
  isAgency: boolean;
  referralCode: string;
  blockedCount: number;
  totalGiftsReceived: number;
  joinDate: string;
  isOnline: boolean;
  lastSeen?: string;
}

interface AppContextType {
  currentUser: User;
  updateDiamonds: (amount: number) => void;
  updateCoins: (amount: number) => void;
  updatePoints: (amount: number) => void;
  earnPointsFromGift: (diamondValue: number) => void;
  earnPointsFromStream: (durationMinutes: number) => void;
  updateUser: (updates: Partial<User>) => void;
  followedUsers: string[];
  toggleFollow: (userId: string) => Promise<void>;
  isFollowingUser: (userId: string) => boolean;
  syncUserProfile: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function AppProviderInner({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentUser, setCurrentUser] = useState<User>({
    ...(MOCK_CURRENT_USER as any),
    username: 'StreamQueen',
    displayName: 'Stream Queen',
    points: 0,
    isOnline: true,
  });
  const [followedUsers, setFollowedUsers] = useState<string[]>(['u002', 'u007', 'u003']);
  const heartbeatRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Presence Heartbeat ──
  useEffect(() => {
    if (!user?.id) return;

    // Set online immediately
    updatePresence(user.id, true).catch(() => {});

    // Heartbeat every 30s
    heartbeatRef.current = setInterval(() => {
      updatePresence(user.id, true).catch(() => {});
    }, 30000);

    // Listen for app state changes
    const sub = AppState.addEventListener('change', state => {
      const online = state === 'active';
      setCurrentUser(prev => ({ ...prev, isOnline: online }));
      updatePresence(user.id, online).catch(() => {});
    });

    // Set offline on unmount
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      sub.remove();
      updatePresence(user.id, false).catch(() => {});
    };
  }, [user?.id]);

  // ── Sync user profile from DB ──
  const syncUserProfile = useCallback(async () => {
    if (!user?.id) return;
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('user_profiles')
      .select('username, display_name, avatar_url, bio, diamonds, coins, points, followers, following, vip_level, is_host, total_gifts_received')
      .eq('id', user.id)
      .single();
    if (data) {
      setCurrentUser(prev => ({
        ...prev,
        username: data.username || prev.username,
        displayName: data.display_name || prev.displayName,
        avatar: data.avatar_url || prev.avatar,
        bio: data.bio || prev.bio,
        diamonds: data.diamonds ?? prev.diamonds,
        coins: data.coins ?? prev.coins,
        points: data.points ?? prev.points,
        followers: data.followers ?? prev.followers,
        following: data.following ?? prev.following,
        vipLevel: data.vip_level ?? prev.vipLevel,
        isHost: data.is_host ?? prev.isHost,
        totalGiftsReceived: data.total_gifts_received ?? prev.totalGiftsReceived,
      }));
    }
  }, [user?.id]);

  // Sync on mount
  useEffect(() => {
    syncUserProfile();
  }, [syncUserProfile]);

  const updateDiamonds = useCallback((amount: number) => {
    setCurrentUser(prev => ({ ...prev, diamonds: Math.max(0, prev.diamonds + amount) }));
    if (user?.id && amount !== 0) {
      const supabase = getSupabaseClient();
      supabase.from('user_profiles').select('diamonds').eq('id', user.id).single().then(({ data }) => {
        if (data) {
          supabase.from('user_profiles').update({ diamonds: Math.max(0, (data.diamonds || 0) + amount) }).eq('id', user.id);
        }
      });
    }
  }, [user?.id]);

  const updateCoins = useCallback((amount: number) => {
    setCurrentUser(prev => ({ ...prev, coins: Math.max(0, prev.coins + amount) }));
    if (user?.id) {
      const supabase = getSupabaseClient();
      supabase.from('user_profiles').select('coins').eq('id', user.id).single().then(({ data }) => {
        if (data) supabase.from('user_profiles').update({ coins: Math.max(0, (data.coins || 0) + amount) }).eq('id', user.id);
      });
    }
  }, [user?.id]);

  const updatePoints = useCallback((amount: number) => {
    setCurrentUser(prev => ({ ...prev, points: Math.max(0, prev.points + amount) }));
    if (user?.id) {
      const supabase = getSupabaseClient();
      supabase.from('user_profiles').select('points').eq('id', user.id).single().then(({ data }) => {
        if (data) supabase.from('user_profiles').update({ points: Math.max(0, (data.points || 0) + amount) }).eq('id', user.id);
      });
    }
  }, [user?.id]);

  const updateUser = useCallback((updates: Partial<User>) => {
    setCurrentUser(prev => ({ ...prev, ...updates }));
    // Also sync relevant fields to DB
    if (user?.id) {
      const dbUpdates: Record<string, any> = {};
      if (updates.displayName) dbUpdates.display_name = updates.displayName;
      if (updates.username) dbUpdates.username = updates.username;
      if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
      if (updates.avatar) dbUpdates.avatar_url = updates.avatar;
      if (Object.keys(dbUpdates).length > 0) {
        const supabase = getSupabaseClient();
        supabase.from('user_profiles').update(dbUpdates).eq('id', user.id).catch(() => {});
      }
    }
  }, [user?.id]);

  const toggleFollow = useCallback(async (userId: string) => {
    const isCurrentlyFollowing = followedUsers.includes(userId);
    setFollowedUsers(prev =>
      isCurrentlyFollowing ? prev.filter(id => id !== userId) : [...prev, userId]
    );
    setCurrentUser(prev => ({
      ...prev,
      following: Math.max(0, prev.following + (isCurrentlyFollowing ? -1 : 1)),
    }));
    if (user?.id) {
      if (isCurrentlyFollowing) await unfollowUser(user.id, userId);
      else await followUser(user.id, userId);
    }
  }, [followedUsers, user?.id]);

  const isFollowingUser = useCallback((userId: string) =>
    followedUsers.includes(userId), [followedUsers]);

  // ── Earn points when receiving a gift ──
  const earnPointsFromGift = useCallback((diamondValue: number) => {
    const pts = diamondsToPoints(diamondValue);
    if (pts <= 0) return;
    setCurrentUser(prev => ({ ...prev, points: prev.points + pts }));
    if (user?.id) addPoints(user.id, pts, 'earn_gift', `Gift received: ${diamondValue} diamonds`);
  }, [user?.id]);

  // ── Earn points from live stream session ──
  const earnPointsFromStream = useCallback((durationMinutes: number) => {
    const pts = Math.floor((durationMinutes / 60) * EARNING_RATES.stream_per_hour);
    if (pts <= 0) return;
    setCurrentUser(prev => ({ ...prev, points: prev.points + pts }));
    if (user?.id) addPoints(user.id, pts, 'earn_stream', `Streamed ${durationMinutes} minutes`);
  }, [user?.id]);

  return (
    <AppContext.Provider value={{
      currentUser, updateDiamonds, updateCoins, updatePoints,
      earnPointsFromGift, earnPointsFromStream, updateUser,
      followedUsers, toggleFollow, isFollowingUser, syncUserProfile,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function AppProvider({ children }: { children: ReactNode }) {
  return <AppProviderInner>{children}</AppProviderInner>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
