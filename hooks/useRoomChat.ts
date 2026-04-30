// SashLive — Room Chat Hook with polling
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchRoomMessages,
  pollNewRoomMessages,
  sendRoomMessage,
  type RoomMessage,
} from '@/services/roomChatService';

const POLL_INTERVAL = 2500;

export function useRoomChat(roomId: string, senderId?: string) {
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const lastTs = useRef<string>(new Date(0).toISOString());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    load();
    pollRef.current = setInterval(poll, POLL_INTERVAL);
    return () => {
      mounted.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [roomId]);

  const load = async () => {
    setLoading(true);
    const { data } = await fetchRoomMessages(roomId, 60);
    if (!mounted.current) return;
    setMessages(data);
    if (data.length > 0) lastTs.current = data[data.length - 1].created_at;
    setLoading(false);
  };

  const poll = useCallback(async () => {
    if (!mounted.current) return;
    const { data } = await pollNewRoomMessages(roomId, lastTs.current);
    if (!mounted.current || data.length === 0) return;
    setMessages(prev => {
      const ids = new Set(prev.map(m => m.id));
      const fresh = data.filter(m => !ids.has(m.id));
      if (fresh.length === 0) return prev;
      lastTs.current = data[data.length - 1].created_at;
      return [...prev, ...fresh];
    });
  }, [roomId]);

  const sendMsg = useCallback(async (
    text: string,
    type: RoomMessage['type'] = 'text',
    giftData?: { id: string; icon: string; name: string }
  ) => {
    if (!senderId || !text.trim()) return;
    setSending(true);
    // Optimistic
    const opt: RoomMessage = {
      id: `opt_${Date.now()}`,
      sender_id: senderId,
      room_id: roomId,
      text,
      type,
      gift_id: giftData?.id,
      gift_icon: giftData?.icon,
      gift_name: giftData?.name,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, opt]);
    const { data, error } = await sendRoomMessage(senderId, roomId, text, type, giftData);
    setSending(false);
    if (data) {
      setMessages(prev => prev.map(m => m.id === opt.id ? data : m));
      lastTs.current = data.created_at;
    } else {
      setMessages(prev => prev.filter(m => m.id !== opt.id));
    }
  }, [senderId, roomId]);

  return { messages, loading, sending, sendMsg, reload: load };
}
