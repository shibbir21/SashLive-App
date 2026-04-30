// Powered by OnSpace.AI
import { useState, useEffect, useRef, useCallback } from 'react';
import { MOCK_CHAT_MESSAGES } from '@/services/mockData';
import { GIFTS } from '@/constants/config';

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
  type: 'message' | 'notification' | 'gift';
  giftIcon?: string;
  giftName?: string;
  giftPrice?: number;
}

interface FloatingGift {
  id: string;
  icon: string;
  name: string;
  sender: string;
  x: number;
}

export function useLiveRoom(roomId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_CHAT_MESSAGES);
  const [viewers, setViewers] = useState(4821);
  const [duration, setDuration] = useState(0);
  const [inputText, setInputText] = useState('');
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [floatingGifts, setFloatingGifts] = useState<FloatingGift[]>([]);
  const [pkHostScore, setPkHostScore] = useState(68420);
  const [pkOpponentScore, setPkOpponentScore] = useState(54100);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
      setViewers(prev => prev + Math.floor(Math.random() * 10 - 4));
    }, 1000);

    const msgInterval = setInterval(() => {
      const randomUsers = ['CosmicRider', 'StarFan', 'NightOwl', 'Dragonfly'];
      const randomTexts = ['Amazing stream! 🔥', 'Love it!! 💗', 'Send gifts!!! 🎁', 'Best host 👑', '🌌🌌🌌'];
      const newMsg: ChatMessage = {
        id: `auto_${Date.now()}`,
        userId: `auto`,
        username: randomUsers[Math.floor(Math.random() * randomUsers.length)],
        text: randomTexts[Math.floor(Math.random() * randomTexts.length)],
        timestamp: Date.now(),
        type: 'message',
      };
      setMessages(prev => [...prev.slice(-50), newMsg]);
    }, 3000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearInterval(msgInterval);
    };
  }, []);

  const sendMessage = useCallback(() => {
    if (!inputText.trim()) return;
    const newMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      userId: 'u001',
      username: 'StreamQueen',
      text: inputText.trim(),
      timestamp: Date.now(),
      type: 'message',
    };
    setMessages(prev => [...prev.slice(-50), newMsg]);
    setInputText('');
  }, [inputText]);

  const sendGift = useCallback((giftId: string, diamonds: number) => {
    const gift = GIFTS.find(g => g.id === giftId);
    if (!gift) return;

    const newMsg: ChatMessage = {
      id: `gift_${Date.now()}`,
      userId: 'u001',
      username: 'StreamQueen',
      text: `sent a ${gift.name}`,
      timestamp: Date.now(),
      type: 'gift',
      giftIcon: gift.icon,
      giftName: gift.name,
      giftPrice: gift.price,
    };
    setMessages(prev => [...prev.slice(-50), newMsg]);

    const floatId = `float_${Date.now()}`;
    setFloatingGifts(prev => [...prev, {
      id: floatId,
      icon: gift.icon,
      name: gift.name,
      sender: 'StreamQueen',
      x: Math.random() * 200,
    }]);

    setTimeout(() => {
      setFloatingGifts(prev => prev.filter(g => g.id !== floatId));
    }, 3000);

    setShowGiftPanel(false);
  }, []);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return {
    messages,
    viewers: Math.max(0, viewers),
    duration: formatDuration(duration),
    inputText,
    setInputText,
    showGiftPanel,
    setShowGiftPanel,
    floatingGifts,
    pkHostScore,
    pkOpponentScore,
    setPkHostScore,
    setPkOpponentScore,
    sendMessage,
    sendGift,
  };
}
