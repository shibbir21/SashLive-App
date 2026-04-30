// SashLive — Room Chat Service (Live Room real-time polling)
import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

export interface RoomMessage {
  id: string;
  sender_id: string;
  room_id: string;
  text: string;
  type: 'text' | 'gift' | 'join' | 'system';
  gift_id?: string;
  gift_icon?: string;
  gift_name?: string;
  created_at: string;
  sender?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    vip_level: number;
  };
}

export async function fetchRoomMessages(roomId: string, limit = 50): Promise<{ data: RoomMessage[]; error: string | null }> {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:sender_id (
        id, username, display_name, avatar_url, vip_level
      )
    `)
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) return { data: [], error: error.message };
  return { data: (data || []) as RoomMessage[], error: null };
}

export async function pollNewRoomMessages(
  roomId: string,
  afterTimestamp: string
): Promise<{ data: RoomMessage[]; error: string | null }> {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:sender_id (
        id, username, display_name, avatar_url, vip_level
      )
    `)
    .eq('room_id', roomId)
    .gt('created_at', afterTimestamp)
    .order('created_at', { ascending: true })
    .limit(20);

  if (error) return { data: [], error: error.message };
  return { data: (data || []) as RoomMessage[], error: null };
}

export async function sendRoomMessage(
  senderId: string,
  roomId: string,
  text: string,
  type: RoomMessage['type'] = 'text',
  giftData?: { id: string; icon: string; name: string }
): Promise<{ data: RoomMessage | null; error: string | null }> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: senderId,
      room_id: roomId,
      text,
      type,
      gift_id: giftData?.id,
      gift_icon: giftData?.icon,
      gift_name: giftData?.name,
    })
    .select(`
      *,
      sender:sender_id (
        id, username, display_name, avatar_url, vip_level
      )
    `)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as RoomMessage, error: null };
}

export async function sendRoomGift(
  senderId: string,
  roomId: string,
  giftId: string,
  giftName: string,
  giftIcon: string,
  giftPrice: number,
  target: 'host' | 'opponent' = 'host'
): Promise<{ error: string | null }> {
  // Insert to live_gifts table for PK tracking
  const { error } = await supabase
    .from('live_gifts')
    .insert({
      room_id: roomId,
      sender_id: senderId,
      gift_id: giftId,
      gift_name: giftName,
      gift_icon: giftIcon,
      gift_price: giftPrice,
      target,
    });

  // Also send as a room message
  await sendRoomMessage(senderId, roomId, `Sent ${giftName}!`, 'gift', {
    id: giftId,
    icon: giftIcon,
    name: giftName,
  });

  return { error: error?.message || null };
}

export async function fetchRoomGiftLeaderboard(roomId: string): Promise<{
  data: { sender_id: string; total: number; username: string; avatar_url: string }[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('live_gifts')
    .select(`gift_price, sender_id, sender:sender_id(username, display_name, avatar_url)`)
    .eq('room_id', roomId);

  if (error) return { data: [], error: error.message };

  // Aggregate by sender
  const agg: Record<string, { sender_id: string; total: number; username: string; avatar_url: string }> = {};
  for (const row of data || []) {
    const key = row.sender_id;
    const s = row.sender as any;
    if (!agg[key]) agg[key] = { sender_id: key, total: 0, username: s?.display_name || s?.username || 'User', avatar_url: s?.avatar_url || '' };
    agg[key].total += row.gift_price || 0;
  }
  const sorted = Object.values(agg).sort((a, b) => b.total - a.total).slice(0, 10);
  return { data: sorted, error: null };
}
