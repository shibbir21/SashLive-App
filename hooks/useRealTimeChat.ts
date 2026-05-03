// SashLive — Real-Time Chat Hook: 2-second polling with optimistic updates + read receipts
import { useState, useEffect, useRef, useCallback } from 'react';
import { getSupabaseClient } from '@/template';

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  type: 'text' | 'gift' | 'system';
  gift_id?: string;
  gift_icon?: string;
  gift_name?: string;
  gift_price?: number;
  is_read: boolean;
  created_at: string;
  sender?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    vip_level: number;
    is_online: boolean;
  };
}

const supabase = getSupabaseClient();
const POLL_INTERVAL = 2000;

export function useRealTimeChat(myId?: string, otherId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const isFirstLoad = useRef(true);

  const loadMessages = useCallback(async (isInitial = false) => {
    if (!myId || !otherId) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id (
          id, username, display_name, avatar_url, vip_level, is_online
        )
      `)
      .or(
        `and(sender_id.eq.${myId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${myId})`
      )
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      if (isInitial) setLoading(false);
      return;
    }

    const msgs = (data || []) as ChatMessage[];

    if (msgs.length > 0) {
      const latestId = msgs[msgs.length - 1]?.id;
      const hasNew = latestId !== lastMessageIdRef.current;

      if (isInitial || hasNew) {
        setMessages(msgs);
        lastMessageIdRef.current = latestId;
      }
    } else if (isInitial) {
      setMessages([]);
    }

    if (isInitial) setLoading(false);
  }, [myId, otherId]);

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!myId || !otherId) return;
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', myId)
      .eq('sender_id', otherId)
      .eq('is_read', false);
  }, [myId, otherId]);

  useEffect(() => {
    if (!myId || !otherId) { setLoading(false); return; }

    loadMessages(true);
    markAsRead();

    // Poll every 2 seconds for new messages
    pollRef.current = setInterval(() => loadMessages(false), POLL_INTERVAL);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [myId, otherId, loadMessages, markAsRead]);

  const sendMessage = useCallback(async (
    text: string,
    type: 'text' | 'gift' = 'text',
    giftData?: { id: string; icon: string; name: string; price?: number }
  ) => {
    if (!myId || !otherId || (!text.trim() && type !== 'gift')) return;
    setSending(true);

    // Optimistic update
    const optimisticId = `opt_${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: optimisticId,
      sender_id: myId,
      receiver_id: otherId,
      text: text.trim(),
      type,
      gift_id: giftData?.id,
      gift_icon: giftData?.icon,
      gift_name: giftData?.name,
      gift_price: giftData?.price,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    const insertData: any = {
      sender_id: myId,
      receiver_id: otherId,
      text: text.trim(),
      type,
      is_read: false,
    };
    if (giftData) {
      insertData.gift_id = giftData.id;
      insertData.gift_icon = giftData.icon;
      insertData.gift_name = giftData.name;
    }

    const { data, error } = await supabase
      .from('messages')
      .insert(insertData)
      .select(`*, sender:sender_id(id, username, display_name, avatar_url, vip_level, is_online)`)
      .single();

    if (!error && data) {
      // Replace optimistic message with real one
      setMessages(prev => prev.map(m => m.id === optimisticId ? (data as ChatMessage) : m));
      lastMessageIdRef.current = data.id;
    } else {
      // Remove optimistic on failure
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
    }

    setSending(false);
  }, [myId, otherId]);

  return { messages, loading, sending, sendMessage };
}
