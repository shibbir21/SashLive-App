// SashLive — Earning Service: points, streams, gifts, tasks, agency commissions
import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

// ── Constants ──
export const POINTS_PER_DOLLAR = 10000;
export const MIN_WITHDRAWAL_POINTS = 100000; // $10
export const MAX_DAILY_WITHDRAWAL_USD = 500;
export const HOST_GIFT_SHARE = 0.70; // host receives 70% of gift value in points

// Points per activity
export const EARNING_RATES = {
  stream_per_hour: 2000,         // base pts/hr (regular host)
  stream_new_host_bonus: 20000,  // pts/day for 7 days (new host, 2hr stream)
  crown_seat_per_hour: 800,
  pk_per_30min: 1000,            // requires level 5
  video_call_per_min: 800,
  audio_call_per_min: 400,
  message_reply: 5,              // per message
  gift_to_points_rate: 0.70,     // 70% of diamond value → points (×10 factor)
  treasure_box_coins: 40,        // coins per open
  treasure_box_max_daily: 10,
  invite_friend: 500,
  follow_user: 100,
  post_reel: 1000,
  post_story: 300,
};

// Agency commission tiers
export const AGENCY_TIERS_RATES = [
  { minHosts: 1,  maxHosts: 4,  rate: 0.04, label: 'Starter' },
  { minHosts: 5,  maxHosts: 9,  rate: 0.08, label: 'Bronze'  },
  { minHosts: 10, maxHosts: 19, rate: 0.12, label: 'Silver'  },
  { minHosts: 20, maxHosts: 49, rate: 0.20, label: 'Gold'    },
  { minHosts: 50, maxHosts: 99, rate: 0.35, label: 'Diamond' },
  { minHosts: 100,maxHosts: 999,rate: 0.50, label: 'Elite'   },
];

export function getAgencyRate(hostCount: number): number {
  const tier = [...AGENCY_TIERS_RATES].reverse().find(t => hostCount >= t.minHosts);
  return tier?.rate ?? 0.04;
}

export function pointsToUSD(points: number): number {
  return points / POINTS_PER_DOLLAR;
}

export function usdToPoints(usd: number): number {
  return Math.floor(usd * POINTS_PER_DOLLAR);
}

export function diamondsToPoints(diamonds: number): number {
  // 1 diamond ≈ 10 points at 70% host share
  return Math.floor(diamonds * 10 * HOST_GIFT_SHARE);
}

// ── Add points to user ──
export async function addPoints(
  userId: string,
  amount: number,
  type: string,
  description?: string,
  refId?: string
): Promise<{ error: string | null }> {
  // Insert transaction ledger
  await supabase.from('points_transactions').insert({
    user_id: userId,
    amount,
    type,
    description: description || type,
    ref_id: refId,
  });
  // Increment points in profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('points')
    .eq('id', userId)
    .single();
  if (profile) {
    await supabase
      .from('user_profiles')
      .update({ points: Math.max(0, (profile.points || 0) + amount) })
      .eq('id', userId);
  }
  return { error: null };
}

// ── Stream Earning from session (async DB write) ──
export async function earnPointsFromStream(
  userId: string,
  durationMinutes: number
): Promise<void> {
  const pts = Math.floor((durationMinutes / 60) * EARNING_RATES.stream_per_hour);
  if (pts <= 0) return;
  await addPoints(userId, pts, 'earn_stream', `Streamed ${durationMinutes} minutes`);
}

// ── Stream Earning: calculate points for session ──
export function calcStreamPoints(
  durationMinutes: number,
  isNewHost: boolean,
  dayIndex: number // 0-6 for first 7 days
): number {
  if (isNewHost && dayIndex < 7 && durationMinutes >= 120) {
    return EARNING_RATES.stream_new_host_bonus;
  }
  return Math.floor((durationMinutes / 60) * EARNING_RATES.stream_per_hour);
}

// ── Gift to Points: when host receives gift ──
export function calcGiftPoints(diamondValue: number): number {
  return diamondsToPoints(diamondValue);
}

// ── Treasure Box: claim coins ──
export async function claimTreasureBox(userId: string): Promise<{
  coins: number;
  error: string | null;
  dailyCount: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: claims } = await supabase
    .from('treasure_claims')
    .select('id')
    .eq('user_id', userId)
    .gte('claimed_at', today.toISOString());

  const dailyCount = claims?.length || 0;
  if (dailyCount >= EARNING_RATES.treasure_box_max_daily) {
    return { coins: 0, error: `Max ${EARNING_RATES.treasure_box_max_daily} claims per day reached`, dailyCount };
  }

  await supabase.from('treasure_claims').insert({ user_id: userId, coins_earned: EARNING_RATES.treasure_box_coins });
  // Increment coins
  const { data: profile } = await supabase.from('user_profiles').select('coins').eq('id', userId).single();
  if (profile) {
    await supabase.from('user_profiles').update({ coins: (profile.coins || 0) + EARNING_RATES.treasure_box_coins }).eq('id', userId);
  }
  return { coins: EARNING_RATES.treasure_box_coins, error: null, dailyCount: dailyCount + 1 };
}

// ── Submit withdrawal request ──
export async function submitWithdrawal(
  userId: string,
  pointsAmount: number,
  method: string,
  accountDetails: string
): Promise<{ data: any; error: string | null }> {
  if (pointsAmount < MIN_WITHDRAWAL_POINTS) {
    return { data: null, error: `Minimum withdrawal is ${MIN_WITHDRAWAL_POINTS.toLocaleString()} points ($${pointsToUSD(MIN_WITHDRAWAL_POINTS)})` };
  }
  const usdAmount = pointsToUSD(pointsAmount);
  if (usdAmount > MAX_DAILY_WITHDRAWAL_USD) {
    return { data: null, error: `Maximum daily withdrawal is $${MAX_DAILY_WITHDRAWAL_USD}` };
  }

  // Check user has enough points
  const { data: profile } = await supabase.from('user_profiles').select('points').eq('id', userId).single();
  if (!profile || (profile.points || 0) < pointsAmount) {
    return { data: null, error: 'Insufficient points balance' };
  }

  const { data, error } = await supabase.from('withdrawal_requests').insert({
    user_id: userId,
    points_amount: pointsAmount,
    usd_amount: usdAmount,
    method,
    account_details: accountDetails,
    status: 'pending',
  }).select().single();

  if (error) return { data: null, error: error.message };

  // Deduct points
  await supabase.from('user_profiles').update({ points: (profile.points || 0) - pointsAmount }).eq('id', userId);
  await addPoints(userId, -pointsAmount, 'withdrawal', `Withdrawal via ${method}`, data.id);

  return { data, error: null };
}

// ── Fetch user points transactions ──
export async function fetchPointsHistory(userId: string, limit = 20): Promise<{
  data: Array<{ id: string; amount: number; type: string; description: string; created_at: string }>;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('points_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { data: [], error: error.message };
  return { data: data || [], error: null };
}

// ── Leaderboard: top gift senders ──
export async function fetchTopGifters(period: 'day' | 'week' | 'month' = 'week'): Promise<{
  data: Array<{
    rank: number;
    user_id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    vip_level: number;
    total_diamonds: number;
  }>;
  error: string | null;
}> {
  const since = new Date();
  if (period === 'day') since.setDate(since.getDate() - 1);
  else if (period === 'week') since.setDate(since.getDate() - 7);
  else since.setMonth(since.getMonth() - 1);

  const { data, error } = await supabase
    .from('live_gifts')
    .select('sender_id, gift_price')
    .gte('created_at', since.toISOString());

  if (error) return { data: [], error: error.message };

  // Aggregate by sender
  const totals: Record<string, number> = {};
  (data || []).forEach((g: any) => {
    totals[g.sender_id] = (totals[g.sender_id] || 0) + (g.gift_price || 0);
  });

  if (!Object.keys(totals).length) return { data: [], error: null };

  const sorted = Object.entries(totals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20);

  const userIds = sorted.map(([id]) => id);
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, username, display_name, avatar_url, vip_level')
    .in('id', userIds);

  const profileMap: Record<string, any> = {};
  (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });

  return {
    data: sorted.map(([id, diamonds], i) => ({
      rank: i + 1,
      user_id: id,
      username: profileMap[id]?.username || 'User',
      display_name: profileMap[id]?.display_name || 'User',
      avatar_url: profileMap[id]?.avatar_url || '',
      vip_level: profileMap[id]?.vip_level || 0,
      total_diamonds: diamonds,
    })),
    error: null,
  };
}

// ── Leaderboard: top hosts by diamonds_earned ──
export async function fetchTopHosts(period: 'day' | 'week' | 'month' = 'week'): Promise<{
  data: Array<{
    rank: number;
    host_id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    vip_level: number;
    total_diamonds: number;
    total_viewers: number;
  }>;
  error: string | null;
}> {
  const since = new Date();
  if (period === 'day') since.setDate(since.getDate() - 1);
  else if (period === 'week') since.setDate(since.getDate() - 7);
  else since.setMonth(since.getMonth() - 1);

  const { data, error } = await supabase
    .from('live_rooms')
    .select('host_id, diamonds_earned, viewers')
    .gte('started_at', since.toISOString());

  if (error) return { data: [], error: error.message };

  // Aggregate by host
  const totals: Record<string, { diamonds: number; viewers: number }> = {};
  (data || []).forEach((r: any) => {
    if (!totals[r.host_id]) totals[r.host_id] = { diamonds: 0, viewers: 0 };
    totals[r.host_id].diamonds += r.diamonds_earned || 0;
    totals[r.host_id].viewers += r.viewers || 0;
  });

  if (!Object.keys(totals).length) return { data: [], error: null };

  const sorted = Object.entries(totals)
    .sort(([, a], [, b]) => b.diamonds - a.diamonds)
    .slice(0, 20);

  const userIds = sorted.map(([id]) => id);
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, username, display_name, avatar_url, vip_level')
    .in('id', userIds);

  const profileMap: Record<string, any> = {};
  (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });

  return {
    data: sorted.map(([id, stats], i) => ({
      rank: i + 1,
      host_id: id,
      username: profileMap[id]?.username || 'Host',
      display_name: profileMap[id]?.display_name || 'Host',
      avatar_url: profileMap[id]?.avatar_url || '',
      vip_level: profileMap[id]?.vip_level || 0,
      total_diamonds: stats.diamonds,
      total_viewers: stats.viewers,
    })),
    error: null,
  };
}

// ── Leaderboard: top agencies ──
export async function fetchTopAgencies(period: 'day' | 'week' | 'month' = 'week'): Promise<{
  data: Array<{
    rank: number;
    agent_id: string;
    agency_name: string;
    avatar_url: string;
    host_count: number;
    total_earned: number;
  }>;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('agency_members')
    .select('agent_id, total_earned, host_id')
    .eq('status', 'active');

  if (error) return { data: [], error: error.message };

  // Aggregate
  const totals: Record<string, { earned: number; hosts: number }> = {};
  (data || []).forEach((m: any) => {
    if (!totals[m.agent_id]) totals[m.agent_id] = { earned: 0, hosts: 0 };
    totals[m.agent_id].earned += m.total_earned || 0;
    totals[m.agent_id].hosts += 1;
  });

  if (!Object.keys(totals).length) return { data: [], error: null };

  const sorted = Object.entries(totals)
    .sort(([, a], [, b]) => b.earned - a.earned)
    .slice(0, 20);

  const agentIds = sorted.map(([id]) => id);
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, username, display_name, avatar_url, agency_name')
    .in('id', agentIds);

  const profileMap: Record<string, any> = {};
  (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });

  return {
    data: sorted.map(([id, stats], i) => ({
      rank: i + 1,
      agent_id: id,
      agency_name: profileMap[id]?.agency_name || profileMap[id]?.display_name || 'Agency',
      avatar_url: profileMap[id]?.avatar_url || '',
      host_count: stats.hosts,
      total_earned: stats.earned,
    })),
    error: null,
  };
}

// ── Agency: fetch members for an agent ──
export async function fetchAgencyMembers(agentId: string): Promise<{
  data: Array<{
    id: string;
    host_id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    is_online: boolean;
    commission_rate: number;
    total_earned: number;
    status: string;
    joined_at: string;
  }>;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('agency_members')
    .select(`
      id, host_id, commission_rate, total_earned, status, joined_at,
      host:host_id (id, username, display_name, avatar_url, is_online, diamonds)
    `)
    .eq('agent_id', agentId)
    .order('total_earned', { ascending: false });

  if (error) return { data: [], error: error.message };
  return {
    data: (data || []).map((m: any) => ({
      id: m.id,
      host_id: m.host_id,
      username: m.host?.username || 'Host',
      display_name: m.host?.display_name || 'Host',
      avatar_url: m.host?.avatar_url || '',
      is_online: m.host?.is_online || false,
      commission_rate: m.commission_rate,
      total_earned: m.total_earned,
      status: m.status,
      joined_at: m.joined_at,
    })),
    error: null,
  };
}

// ── Agency: add a host to agency ──
export async function addHostToAgency(
  agentId: string,
  hostId: string,
  commissionRate: number
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('agency_members').insert({
    agent_id: agentId,
    host_id: hostId,
    commission_rate: commissionRate,
    status: 'active',
  });
  return { error: error?.message || null };
}
