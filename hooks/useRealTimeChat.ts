// SashLive — Real-Time Chat Hook (polling-based)
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchDirectMessages,
  sendDirectMessage,
  markMessagesRead,
  pollNewMessages,
  type ChatMessage,
} from '@/services/chatService';
import { sendMessageNotification } from '@/hooks/usePushNotifications';

const POLL_INTERVAL = 2000; // 2 seconds

export function useRealTimeChat(myId: string | undefined, otherId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastTimestamp = useRef<string>(new Date(0).toISOString());
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);

  // Initial load
  useEffect(() => {
    isMounted.current = true;
    if (!myId) { setLoading(false); return; }

    loadMessages();

    // Start polling
    pollTimer.current = setInterval(poll, POLL_INTERVAL);

    return () => {
      isMounted.current = false;
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [myId, otherId]);

  const loadMessages = async () => {
    if (!myId) return;
    setLoading(true);
    const { data, error: err } = await fetchDirectMessages(myId, otherId);
    if (!isMounted.current) return;
    if (err) {
      setError(err);
    } else {
      setMessages(data);
      if (data.length > 0) {
        lastTimestamp.current = data[data.length - 1].created_at;
      }
      // Mark as read
      await markMessagesRead(myId, otherId);
    }
    setLoading(false);
  };

  const poll = useCallback(async () => {
    if (!myId || !isMounted.current) return;
    const { data } = await pollNewMessages(myId, otherId, lastTimestamp.current);
    if (!isMounted.current) return;
    if (data.length > 0) {
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const newMsgs = data.filter(m => !existingIds.has(m.id));
        if (newMsgs.length === 0) return prev;
        lastTimestamp.current = data[data.length - 1].created_at;
        return [...prev, ...newMsgs];
      });
      // Mark new incoming messages as read
      await markMessagesRead(myId, otherId);
    }
  }, [myId, otherId]);

  const sendMessage = useCallback(async (
    text: string,
    type: ChatMessage['type'] = 'text',
    giftData?: { id: string; icon: string; name: string }
  ): Promise<boolean> => {
    if (!myId || !text.trim()) return false;
    setSending(true);

    // Optimistic update
    const optimistic: ChatMessage = {
      id: `opt_${Date.now()}`,
      sender_id: myId,
      receiver_id: otherId,
      text: text.trim(),
      type,
      gift_id: giftData?.id,
      gift_icon: giftData?.icon,
      gift_name: giftData?.name,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    const { data, error: err } = await sendDirectMessage(myId, otherId, text.trim(), type, giftData);
    setSending(false);

    if (err || !data) {
      // Remove optimistic
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setError(err || 'Failed to send message');
      return false;
    }

    // Replace optimistic with real
    setMessages(prev => prev.map(m => m.id === optimistic.id ? data : m));
    lastTimestamp.current = data.created_at;
    return true;
  }, [myId, otherId]);

  return { messages, loading, sending, error, sendMessage, reload: loadMessages };
}
