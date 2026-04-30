// SashLive — Real-time Chat Service (Supabase)
import { getSupabaseClient } from '@/template';

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id?: string;
  room_id?: string;
  text: string;
  type: 'text' | 'gift' | 'join' | 'system' | 'image';
  gift_id?: string;
  gift_icon?: string;
  gift_name?: string;
  is_read: boolean;
  created_at: string;
  // Joined fields
  sender?: { username: string; avatar_url: string; display_name: string };
}

export interface Conversation {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isOnline: boolean;
}

const supabase = getSupabaseClient();

// ── Fetch DM messages between two users ──
export async function fetchDirectMessages(
  myId: string,
  otherId: string,
  limit = 50
): Promise<{ data: ChatMessage[]; error: string | null }> {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:sender_id (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .or(
      `and(sender_id.eq.${myId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${myId})`
    )
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) return { data: [], error: error.message };
  return { data: (data || []) as ChatMessage[], error: null };
}

// ── Send a direct message ──
export async function sendDirectMessage(
  senderId: string,
  receiverId: string,
  text: string,
  type: ChatMessage['type'] = 'text',
  giftData?: { id: string; icon: string; name: string }
): Promise<{ data: ChatMessage | null; error: string | null }> {
  const payload: any = {
    sender_id: senderId,
    receiver_id: receiverId,
    text,
    type,
    is_read: false,
  };
  if (giftData) {
    payload.gift_id = giftData.id;
    payload.gift_icon = giftData.icon;
    payload.gift_name = giftData.name;
  }

  const { data, error } = await supabase
    .from('messages')
    .insert(payload)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as ChatMessage, error: null };
}

// ── Mark messages as read ──
export async function markMessagesRead(
  myId: string,
  senderId: string
): Promise<void> {
  await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('receiver_id', myId)
    .eq('sender_id', senderId)
    .eq('is_read', false);
}

// ── Poll for new messages (since a timestamp) ──
export async function pollNewMessages(
  myId: string,
  otherId: string,
  since: string
): Promise<{ data: ChatMessage[]; error: string | null }> {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:sender_id (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .or(
      `and(sender_id.eq.${myId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${myId})`
    )
    .gt('created_at', since)
    .order('created_at', { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: (data || []) as ChatMessage[], error: null };
}

// ── Get unread message count for current user ──
export async function getUnreadCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .eq('is_read', false);
  return count || 0;
}

// ── Fetch live room messages (room_id based) ──
export async function fetchRoomMessages(
  roomId: string,
  limit = 60
): Promise<{ data: ChatMessage[]; error: string | null }> {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:sender_id (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) return { data: [], error: error.message };
  return { data: (data || []) as ChatMessage[], error: null };
}

// ── Send a room message ──
export async function sendRoomMessage(
  senderId: string,
  roomId: string,
  text: string,
  type: ChatMessage['type'] = 'text',
  giftData?: { id: string; icon: string; name: string }
): Promise<{ data: ChatMessage | null; error: string | null }> {
  const payload: any = {
    sender_id: senderId,
    room_id: roomId,
    text,
    type,
    is_read: true,
  };
  if (giftData) {
    payload.gift_id = giftData.id;
    payload.gift_icon = giftData.icon;
    payload.gift_name = giftData.name;
  }

  const { data, error } = await supabase
    .from('messages')
    .insert(payload)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as ChatMessage, error: null };
}
