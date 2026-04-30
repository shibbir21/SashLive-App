// Powered by OnSpace.AI
import { useState, useCallback } from 'react';
import { MOCK_CHAT_MESSAGES } from '@/services/mockData';

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  type?: string;
}

const QUICK_REPLIES = [
  '😍 Wow!',
  '🔥 Amazing!',
  '💗 Love it!',
  '👑 You are great!',
  'When are you streaming?',
  '🎁 Sending a gift!',
  'Follow me back!',
  '🌟 Keep it up!',
];

const MOCK_PRIVATE_MESSAGES: Message[] = [
  { id: 'pm1', senderId: 'u007', text: 'Hey! Loved your stream tonight 🔥', timestamp: Date.now() - 600000, type: 'message' },
  { id: 'pm2', senderId: 'u001', text: 'Thank you so much! You are amazing 💗', timestamp: Date.now() - 540000, type: 'message' },
  { id: 'pm3', senderId: 'u007', text: 'Want to do a PK battle tomorrow?', timestamp: Date.now() - 480000, type: 'message' },
  { id: 'pm4', senderId: 'u001', text: 'Yes! What time? I will be ready 💪', timestamp: Date.now() - 420000, type: 'message' },
  { id: 'pm5', senderId: 'u007', text: '8PM sounds perfect! See you then 👑', timestamp: Date.now() - 360000, type: 'message' },
  { id: 'pm6', senderId: 'u007', text: 'Also check out my new VIP frame 🌟', timestamp: Date.now() - 120000, type: 'message' },
];

export function useChat(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>(MOCK_PRIVATE_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isCallActive, setIsCallActive] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      senderId: 'u001',
      text: text.trim(),
      timestamp: Date.now(),
      type: 'message',
    };
    setMessages(prev => [...prev, newMsg]);
    setInputText('');

    // Simulate reply after 1.5s
    setTimeout(() => {
      const replies = [
        'Haha yes!! 😍',
        'So true! 🔥',
        'Can not wait! 👑',
        'See you there 💗',
        'That sounds amazing!',
        '🎉🎉🎉',
      ];
      const replyMsg: Message = {
        id: `reply_${Date.now()}`,
        senderId: 'other',
        text: replies[Math.floor(Math.random() * replies.length)],
        timestamp: Date.now(),
        type: 'message',
      };
      setMessages(prev => [...prev, replyMsg]);
    }, 1500);
  }, []);

  const startCall = useCallback((type: 'audio' | 'video') => {
    setCallType(type);
    setIsCallActive(true);
  }, []);

  const endCall = useCallback(() => {
    setCallType(null);
    setIsCallActive(false);
  }, []);

  return {
    messages,
    inputText,
    setInputText,
    sendMessage,
    quickReplies: QUICK_REPLIES,
    isCallActive,
    callType,
    startCall,
    endCall,
  };
}
