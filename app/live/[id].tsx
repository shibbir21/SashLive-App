// SashLive — Complete Live Room: Camera Controls, Beauty Effects, Sound Effects, In-Room Games, All Actions
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, FlatList, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, Dimensions,
  Animated, Modal, ActivityIndicator, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useLiveRoom } from '@/hooks/useLiveRoom';
import { useRoomChat } from '@/hooks/useRoomChat';
import { useApp } from '@/contexts/AppContext';
import { MOCK_LIVE_ROOMS } from '@/services/mockData';
import { GIFTS } from '@/constants/config';
import { useAlert } from '@/template';
import { useAuth } from '@/template';
import { sendRoomGift, fetchRoomGiftLeaderboard } from '@/services/roomChatService';
import { updatePKScore, addDiamondsEarned } from '@/services/liveRoomService';
import { claimTreasureBox, calcGiftPoints, EARNING_RATES } from '@/services/earningService';
import { sendGiftNotification } from '@/hooks/usePushNotifications';
import { getSupabaseClient } from '@/template';

const { width, height } = Dimensions.get('window');

// ─── PARTY SEATS ───
const PARTY_SEATS = [
  { id: 1, user: 'CosmicRider', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop', filled: true, isMuted: false, isSpeaking: true, role: 'CO-HOST' },
  { id: 2, user: 'Moonlight',   avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop', filled: true, isMuted: false, isSpeaking: false, role: null },
  { id: 3, filled: false, role: null },
  { id: 4, user: 'NeonPulse',   avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', filled: true, isMuted: true,  isSpeaking: false, role: null },
  { id: 5, filled: false, role: null },
  { id: 6, user: 'StarKing',    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop', filled: true, isMuted: false, isSpeaking: false, role: null },
  { id: 7, filled: false, role: null },
  { id: 8, filled: false, role: null },
];

const REACTIONS  = ['❤️','🔥','😍','👑','💯','🎉','🚀','🌹','💎','⭐'];
const STICKER_ROW = ['😄','🥰','😂','🤩','😎','🥳','👏','🙌'];

// ─── BEAUTY FILTERS ───
const BEAUTY_FILTERS = [
  { id: 'none',    name: 'Original', icon: '👤', overlay: 'rgba(0,0,0,0)' },
  { id: 'smooth',  name: 'Smooth',   icon: '✨', overlay: 'rgba(255,220,255,0.08)' },
  { id: 'bright',  name: 'Bright',   icon: '☀️', overlay: 'rgba(255,255,200,0.12)' },
  { id: 'warm',    name: 'Warm',     icon: '🌅', overlay: 'rgba(255,160,60,0.12)' },
  { id: 'cool',    name: 'Cool',     icon: '❄️', overlay: 'rgba(100,180,255,0.12)' },
  { id: 'rosy',    name: 'Rosy',     icon: '🌸', overlay: 'rgba(255,100,150,0.12)' },
  { id: 'vivid',   name: 'Vivid',    icon: '🎨', overlay: 'rgba(120,0,255,0.08)' },
  { id: 'natural', name: 'Natural',  icon: '🌿', overlay: 'rgba(100,200,100,0.08)' },
];

// ─── SOUND EFFECTS ───
const SOUND_EFFECTS = [
  { id: 'crowd',     name: 'Crowd',      icon: '👥', desc: 'Audience cheering' },
  { id: 'applause',  name: 'Applause',   icon: '👏', desc: 'Clapping' },
  { id: 'laugh',     name: 'Laugh',      icon: '😂', desc: 'Audience laughter' },
  { id: 'drum',      name: 'Drum Roll',  icon: '🥁', desc: 'Dramatic buildup' },
  { id: 'fanfare',   name: 'Fanfare',    icon: '🎺', desc: 'Victory horn' },
  { id: 'firework',  name: 'Firework',   icon: '🎆', desc: 'Celebration pop' },
  { id: 'alarm',     name: 'Alarm',      icon: '🚨', desc: 'Alert sound' },
  { id: 'bell',      name: 'Bell',       icon: '🔔', desc: 'Notification ding' },
  { id: 'boo',       name: 'Boo',        icon: '😤', desc: 'Audience boo' },
  { id: 'wow',       name: 'Wow',        icon: '😮', desc: 'Wow reaction' },
  { id: 'airhorn',   name: 'Air Horn',   icon: '📯', desc: 'Loud horn' },
  { id: 'kissing',   name: 'Kiss',       icon: '💋', desc: 'Kiss sound' },
];

// ─── CAMERA EFFECTS ───
const CAMERA_EFFECTS = [
  { id: 'none',    name: 'None',       icon: '📷' },
  { id: 'bokeh',   name: 'Bokeh',      icon: '🌫️' },
  { id: 'mirror',  name: 'Mirror',     icon: '🪞' },
  { id: 'wide',    name: 'Wide',       icon: '🔭' },
  { id: 'zoom',    name: 'Zoom In',    icon: '🔍' },
  { id: 'face',    name: 'Face Cam',   icon: '🤳' },
];

// ─── IN-ROOM GAMES ───
const LIVE_GAMES = [
  { id: 'guess',      name: 'Number Guess', icon: '🔢', desc: 'Pick 1-10',       color: Colors.secondary },
  { id: 'poll',       name: 'Live Poll',    icon: '📊', desc: 'Vote now',         color: Colors.primary   },
  { id: 'trivia',     name: 'Trivia',       icon: '🧠', desc: 'Answer 3 Qs',     color: Colors.success   },
  { id: 'roulette',   name: 'Roulette',     icon: '🎡', desc: 'Spin to win',      color: Colors.gold      },
  { id: 'flip',       name: 'Coin Flip',    icon: '🪙', desc: 'Heads/Tails',      color: '#FF8C00'        },
  { id: 'slots',      name: 'Slots',        icon: '🎰', desc: 'Match 3',          color: '#FF8C00'        },
];

// ─── RAIN PARTICLE ───
interface RainParticle {
  id: string; icon: string; x: number;
  anim: Animated.Value; scale: Animated.Value; opacity: Animated.Value;
  side: 'left' | 'right'; color: string;
}

function PKGiftRain({ particles }: { particles: RainParticle[] }) {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {particles.map(p => (
        <Animated.View key={p.id} style={[styles.rainParticle, {
          left: p.x, opacity: p.opacity,
          transform: [
            { translateY: p.anim.interpolate({ inputRange: [0,1], outputRange: [-60, height * 0.65] }) },
            { scale: p.scale },
            { rotate: p.anim.interpolate({ inputRange:[0,0.5,1], outputRange:['0deg', p.side==='left'?'-25deg':'25deg','0deg'] }) },
          ],
        }]}>
          <Text style={[styles.rainIcon, { textShadowColor: p.color }]}>{p.icon}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

// ─── MINI GAMES ───
function NumberGuessGame({ onWin, onClose }: { onWin:(a:number)=>void; onClose:()=>void }) {
  const [guess, setGuess]     = useState('');
  const [secret]              = useState(Math.floor(Math.random()*10)+1);
  const [hint, setHint]       = useState('Pick a number 1–10 to win 50💎');
  const [attempts, setAttempts] = useState(3);
  const [done, setDone]       = useState(false);
  const shakeAnim             = useRef(new Animated.Value(0)).current;
  const shake = () => Animated.sequence([
    Animated.timing(shakeAnim,{toValue:8,duration:60,useNativeDriver:true}),
    Animated.timing(shakeAnim,{toValue:-8,duration:60,useNativeDriver:true}),
    Animated.timing(shakeAnim,{toValue:0,duration:60,useNativeDriver:true}),
  ]).start();
  const handleGuess = (n:number) => {
    if (done) return;
    const left = attempts-1; setAttempts(left);
    if (n===secret) { setHint('🎉 Correct! +50💎'); setDone(true); onWin(50); }
    else if (left<=0) { setHint(`❌ It was ${secret}!`); setDone(true); shake(); }
    else { setHint(n<secret?`📈 Too low! ${left} left`:`📉 Too high! ${left} left`); shake(); }
    setGuess(String(n));
  };
  return (
    <View style={gS.wrap}>
      <Pressable style={gS.close} onPress={onClose}><MaterialIcons name="close" size={18} color={Colors.textMuted}/></Pressable>
      <Text style={gS.title}>🔢 Number Guess</Text>
      <Animated.Text style={[gS.hint,{transform:[{translateX:shakeAnim}]}]}>{hint}</Animated.Text>
      <View style={gS.attRow}>{[1,2,3].map(i=><View key={i} style={[gS.att, i>attempts && gS.attUsed]}/>)}</View>
      <View style={gS.numGrid}>
        {Array.from({length:10},(_,i)=>i+1).map(n=>(
          <Pressable key={n} style={[gS.numBtn, guess===String(n)&&gS.numBtnSel, done&&n===secret&&gS.numBtnWin]} onPress={()=>handleGuess(n)} disabled={done}>
            <Text style={[gS.numText, done&&n===secret?{color:'#FFF'}:{}]}>{n}</Text>
          </Pressable>
        ))}
      </View>
      {done ? <Pressable style={gS.actionBtn} onPress={onClose}><Text style={gS.actionBtnText}>Close</Text></Pressable> : null}
    </View>
  );
}

function PollGame({ onClose }: { onClose:()=>void }) {
  const [voted, setVoted]   = useState<number|null>(null);
  const [votes, setVotes]   = useState([1284,987]);
  const total = votes.reduce((s,v)=>s+v,0);
  const vote = (i:number) => { if (voted!==null) return; setVoted(i); setVotes(v=>v.map((x,j)=>j===i?x+1:x)); };
  const labels = ['Team Host 🎤','Team Opponent ⚔️'];
  return (
    <View style={gS.wrap}>
      <Pressable style={gS.close} onPress={onClose}><MaterialIcons name="close" size={18} color={Colors.textMuted}/></Pressable>
      <Text style={gS.title}>📊 Live Poll</Text>
      <Text style={gS.hint}>Who are you supporting?</Text>
      {labels.map((label,i)=>{
        const pct = Math.round((votes[i]/(total+1))*100);
        return (
          <Pressable key={i} style={[gS.pollOpt, voted===i&&{borderColor:i===0?Colors.primary:Colors.secondary}]} onPress={()=>vote(i)}>
            <View style={[gS.pollFill,{width:`${pct}%` as any, backgroundColor:(i===0?Colors.primary:Colors.secondary)+'35'}]}/>
            <Text style={{fontSize:16}}>{i===0?'🔴':'🔵'}</Text>
            <Text style={gS.pollLabel}>{label}</Text>
            <Text style={[gS.pollPct,{color:i===0?Colors.primary:Colors.secondary}]}>{pct}%</Text>
            {voted===i?<MaterialIcons name="check-circle" size={16} color={i===0?Colors.primary:Colors.secondary}/>:null}
          </Pressable>
        );
      })}
      <Text style={gS.pollTotal}>{(total+(voted!==null?1:0)).toLocaleString()} votes</Text>
    </View>
  );
}

function TriviaGame({ onWin, onClose }: { onWin:(a:number)=>void; onClose:()=>void }) {
  const QUESTIONS = [
    {q:'Which country has the most live streaming users?',opts:['USA','China','India','Brazil'],ans:1},
    {q:'What does "PK" stand for in live streaming?',opts:['Player Kill','Point King','Peak Karma','Pro King'],ans:0},
    {q:'How many diamonds = 1 USD approx on most platforms?',opts:['100','50','10','1'],ans:0},
  ];
  const [qi,setQi]           = useState(0);
  const [selected,setSelected] = useState<number|null>(null);
  const [score,setScore]     = useState(0);
  const [done,setDone]       = useState(false);
  const q = QUESTIONS[qi];
  const choose = (i:number) => {
    if (selected!==null) return;
    setSelected(i);
    if (i===q.ans) setScore(s=>s+1);
    setTimeout(()=>{
      if (qi<QUESTIONS.length-1) { setQi(j=>j+1); setSelected(null); }
      else { setDone(true); if (score+(i===q.ans?1:0)>=2) onWin(100); }
    },900);
  };
  return (
    <View style={gS.wrap}>
      <Pressable style={gS.close} onPress={onClose}><MaterialIcons name="close" size={18} color={Colors.textMuted}/></Pressable>
      <Text style={gS.title}>🧠 Trivia ({qi+1}/{QUESTIONS.length})</Text>
      {done ? (
        <>
          <Text style={gS.hint}>{score>=2?`🎉 ${score}/3 Correct! +100💎`:`😔 ${score}/3 — Try again!`}</Text>
          <Pressable style={gS.actionBtn} onPress={onClose}><Text style={gS.actionBtnText}>Done</Text></Pressable>
        </>
      ):(
        <>
          <Text style={[gS.hint,{fontSize:FontSize.sm,lineHeight:18}]}>{q.q}</Text>
          {q.opts.map((opt,i)=>(
            <Pressable key={i} style={[gS.pollOpt,
              selected!==null&&i===q.ans?{borderColor:Colors.success,backgroundColor:Colors.success+'20'}:null,
              selected===i&&i!==q.ans?{borderColor:Colors.error,backgroundColor:Colors.error+'20'}:null,
            ]} onPress={()=>choose(i)} disabled={selected!==null}>
              <Text style={gS.pollLabel}>{String.fromCharCode(65+i)}. {opt}</Text>
            </Pressable>
          ))}
        </>
      )}
    </View>
  );
}

// Roulette mini-game for live room
const ROULETTE_PRIZES = [
  {label:'💰 100',value:100,color:Colors.gold},
  {label:'🌹 10', value:10, color:Colors.primary},
  {label:'💣 0',  value:0,  color:Colors.error},
  {label:'⭐ 30', value:30, color:'#FFCC00'},
  {label:'👑 500',value:500,color:Colors.secondary},
  {label:'🎁 50', value:50, color:Colors.success},
  {label:'💎 200',value:200,color:Colors.diamond},
  {label:'🍀 80', value:80, color:'#00A000'},
];
function MiniRoulette({ onWin, onClose }: { onWin:(a:number)=>void; onClose:()=>void }) {
  const [result, setResult] = useState<typeof ROULETTE_PRIZES[0]|null>(null);
  const [spinning, setSpinning] = useState(false);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const doSpin = () => {
    if (spinning) return;
    setSpinning(true); setResult(null);
    const total = ROULETTE_PRIZES.reduce((s,p)=>s+1,0);
    const picked = ROULETTE_PRIZES[Math.floor(Math.random()*ROULETTE_PRIZES.length)];
    spinAnim.setValue(0);
    Animated.timing(spinAnim,{toValue:360*6,duration:3500,useNativeDriver:true}).start(()=>{
      setSpinning(false); setResult(picked);
      if (picked.value>0) onWin(picked.value);
    });
  };
  const rot = spinAnim.interpolate({inputRange:[0,360*6],outputRange:['0deg',`${360*6}deg`]});
  return (
    <View style={gS.wrap}>
      <Pressable style={gS.close} onPress={onClose}><MaterialIcons name="close" size={18} color={Colors.textMuted}/></Pressable>
      <Text style={gS.title}>🎡 Mini Roulette</Text>
      <Animated.View style={[gS.wheel,{transform:[{rotate:rot}]}]}>
        <Text style={{fontSize:52}}>🎡</Text>
      </Animated.View>
      {result ? (
        <View style={[gS.resultBadge,{borderColor:result.value>0?Colors.gold:Colors.error,backgroundColor:result.value>0?Colors.gold+'20':Colors.error+'20'}]}>
          <Text style={[gS.resultText,{color:result.value>0?Colors.gold:Colors.error}]}>
            {result.value>0?`🎉 ${result.label}! Won ${result.value}💎`:'💣 Missed! Try again!'}
          </Text>
        </View>
      ) : null}
      <View style={gS.prizeGrid}>
        {ROULETTE_PRIZES.map(p=>(
          <View key={p.label} style={[gS.prizeChip,{borderColor:p.color+'50'}]}>
            <Text style={[gS.prizeText,{color:p.color}]}>{p.label}</Text>
          </View>
        ))}
      </View>
      <Pressable style={[gS.actionBtn,{backgroundColor:Colors.gold},spinning&&{opacity:0.5}]} onPress={doSpin} disabled={spinning}>
        <Text style={[gS.actionBtnText,{color:'#000'}]}>{spinning?'🎡 Spinning...':'🎡 Spin!'}</Text>
      </Pressable>
    </View>
  );
}

// Coin Flip mini-game
function MiniCoinFlip({ onWin, onClose }: { onWin:(a:number)=>void; onClose:()=>void }) {
  const [choice,setChoice]   = useState<'heads'|'tails'|null>(null);
  const [result,setResult]   = useState<'heads'|'tails'|null>(null);
  const [flipping,setFlipping] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const flip = () => {
    if (!choice||flipping) return;
    setFlipping(true); setResult(null);
    flipAnim.setValue(0);
    Animated.timing(flipAnim,{toValue:1,duration:900,useNativeDriver:true}).start(()=>{
      const r = Math.random()>0.5?'heads':'tails';
      setResult(r); if(r===choice) onWin(50);
      setFlipping(false);
    });
  };
  const scaleX = flipAnim.interpolate({inputRange:[0,0.25,0.5,0.75,1],outputRange:[1,0.1,1,0.1,1]});
  return (
    <View style={gS.wrap}>
      <Pressable style={gS.close} onPress={onClose}><MaterialIcons name="close" size={18} color={Colors.textMuted}/></Pressable>
      <Text style={gS.title}>🪙 Coin Flip</Text>
      <Animated.View style={[gS.coinWrap,{transform:[{scaleX}]}]}>
        <Text style={{fontSize:52}}>{result==='tails'?'🦅':'🪙'}</Text>
      </Animated.View>
      <View style={gS.flipChoices}>
        <Pressable style={[gS.flipChoice,choice==='heads'&&gS.flipChoiceActive]} onPress={()=>setChoice('heads')}>
          <Text style={{fontSize:28}}>🪙</Text>
          <Text style={gS.flipLabel}>Heads</Text>
        </Pressable>
        <Pressable style={[gS.flipChoice,choice==='tails'&&gS.flipChoiceActive]} onPress={()=>setChoice('tails')}>
          <Text style={{fontSize:28}}>🦅</Text>
          <Text style={gS.flipLabel}>Tails</Text>
        </Pressable>
      </View>
      {result ? (
        <View style={[gS.resultBadge,{borderColor:result===choice?Colors.success:Colors.error,backgroundColor:result===choice?Colors.success+'25':Colors.error+'25'}]}>
          <Text style={[gS.resultText,{color:result===choice?Colors.success:Colors.error}]}>{result===choice?`🎉 ${result}! +50💎`:`💣 ${result}!`}</Text>
        </View>
      ) : null}
      <Pressable style={[gS.actionBtn,{backgroundColor:Colors.gold},(!choice||flipping)&&{opacity:0.5}]} onPress={flip} disabled={!choice||flipping}>
        <Text style={[gS.actionBtnText,{color:'#000'}]}>{flipping?'⚡ Flipping...':'⚡ Flip!'}</Text>
      </Pressable>
    </View>
  );
}

// Slots mini game
const SLOT_SYM = ['🍒','🍋','🍊','🍇','💎','⭐','🔔','💰'];
function MiniSlots({ onWin, onClose }: { onWin:(a:number)=>void; onClose:()=>void }) {
  const [reels,setReels] = useState(['🎰','🎰','🎰']);
  const [spinning,setSpinning] = useState(false);
  const [result,setResult] = useState('');
  const spin = () => {
    if (spinning) return;
    setSpinning(true); setResult('');
    setTimeout(()=>{
      const nR = Array.from({length:3},()=>SLOT_SYM[Math.floor(Math.random()*SLOT_SYM.length)]);
      setReels(nR);
      const match3 = nR[0]===nR[1]&&nR[1]===nR[2];
      const match2 = nR[0]===nR[1]||nR[1]===nR[2]||nR[0]===nR[2];
      if (match3){setResult(`🎉 Jackpot! +100💎`);onWin(100);}
      else if (match2){setResult('✨ Pair! +30💎');onWin(30);}
      else setResult('No match. Try again!');
      setSpinning(false);
    },1500);
  };
  return (
    <View style={gS.wrap}>
      <Pressable style={gS.close} onPress={onClose}><MaterialIcons name="close" size={18} color={Colors.textMuted}/></Pressable>
      <Text style={gS.title}>🎰 Slots</Text>
      <View style={gS.reelsRow}>
        {reels.map((sym,i)=>(
          <View key={i} style={gS.reelCell}>
            <Text style={{fontSize:40}}>{spinning?SLOT_SYM[Math.floor(Math.random()*SLOT_SYM.length)]:sym}</Text>
          </View>
        ))}
      </View>
      {result ? (
        <View style={[gS.resultBadge,{borderColor:result.includes('Jackpot')||result.includes('Pair')?Colors.gold:Colors.textMuted}]}>
          <Text style={[gS.resultText,{color:result.includes('No')?Colors.textMuted:Colors.gold}]}>{result}</Text>
        </View>
      ) : null}
      <Pressable style={[gS.actionBtn,spinning&&{opacity:0.5}]} onPress={spin} disabled={spinning}>
        <Text style={gS.actionBtnText}>{spinning?'🎰 Spinning...':'🎰 Spin!'}</Text>
      </Pressable>
    </View>
  );
}

export default function LiveRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showAlert } = useAlert();
  const { currentUser, updateDiamonds, toggleFollow } = useApp();
  const { user } = useAuth();
  const room = MOCK_LIVE_ROOMS.find(r => r.id === id) || MOCK_LIVE_ROOMS[0];
  const roomIdStr = id || 'room001';

  const { messages: dbMessages, loading: chatLoading, sending, sendMsg } = useRoomChat(roomIdStr, user?.id);

  // Real-time chat polling every 2 seconds
  const chatPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [rtMessages, setRtMessages] = useState<any[]>([]);
  const supabase = getSupabaseClient();
  useEffect(() => {
    const pollChat = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*, sender:sender_id(username, display_name, avatar_url, vip_level)')
        .eq('room_id', roomIdStr)
        .order('created_at', { ascending: false })
        .limit(30);
      if (data && data.length > 0) setRtMessages(data.reverse());
    };
    pollChat();
    chatPollRef.current = setInterval(pollChat, 2000);
    return () => { if (chatPollRef.current) clearInterval(chatPollRef.current); };
  }, [roomIdStr]);
  const {
    messages: mockMessages, viewers, duration, inputText, setInputText,
    showGiftPanel, setShowGiftPanel,
    pkHostScore, setPkHostScore, pkOpponentScore, setPkOpponentScore,
  } = useLiveRoom(roomIdStr);

  const allMessages = rtMessages.length > 0 ? rtMessages : (dbMessages.length > 0 ? dbMessages : mockMessages);

  // ── Panels & UI state ──
  const [showReactions, setShowReactions]   = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<{id:string;emoji:string;x:number;anim:Animated.Value}[]>([]);
  const [activeGame, setActiveGame]         = useState<string|null>(null);
  const [showMultiStream, setShowMultiStream] = useState(false);
  const [pkTimeLeft, setPkTimeLeft]         = useState(600);
  const [activeTab, setActiveTab]           = useState<'chat'|'gifts'|'rank'>('chat');
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [giftLeaderboard, setGiftLeaderboard] = useState<any[]>([]);
  const [inputFocused, setInputFocused]     = useState(false);
  const [isFollowing, setIsFollowing]       = useState(false);
  const [giftTarget, setGiftTarget]         = useState<'host'|'opponent'>('host');

  // ── Camera Controls ──
  const [isCameraOn, setIsCameraOn]     = useState(true);
  const [isMicOn, setIsMicOn]           = useState(true);
  const [isFrontCam, setIsFrontCam]     = useState(true);
  const [flashOn, setFlashOn]           = useState(false);
  const [showCameraPanel, setShowCameraPanel] = useState(false);
  const [activeCamEffect, setActiveCamEffect] = useState('none');
  const [zoomLevel, setZoomLevel]       = useState(1);

  // ── Beauty Effects ──
  const [showBeautyPanel, setShowBeautyPanel] = useState(false);
  const [activeFilter, setActiveFilter]   = useState('none');
  const [beautyLevel, setBeautyLevel]     = useState(50);
  const [smoothLevel, setSmoothLevel]     = useState(60);
  const [whitenLevel, setWhitenLevel]     = useState(40);
  const [slimFace, setSlimFace]           = useState(false);
  const [bigEyes, setBigEyes]             = useState(false);
  const [lipColor, setLipColor]           = useState(false);

  // ── Sound Effects ──
  const [showSoundPanel, setShowSoundPanel] = useState(false);
  const [playingSound, setPlayingSound]   = useState<string|null>(null);
  const [soundVolume, setSoundVolume]     = useState(80);
  const [voiceEffect, setVoiceEffect]     = useState<string|null>(null);

  // ── Games Panel ──
  const [showGamesPanel, setShowGamesPanel] = useState(false);

  // ── More Panel ──
  const [showMorePanel, setShowMorePanel] = useState(false);

  // ── Earnings ──
  const [sessionStartTime] = useState(Date.now());
  const [sessionPoints, setSessionPoints] = useState(0);
  const [giftPointsTotal, setGiftPointsTotal] = useState(0);
  const [showEarningsOverlay, setShowEarningsOverlay] = useState(false);
  const [sessionDurationMin, setSessionDurationMin] = useState(0);
  const earningBarAnim = useRef(new Animated.Value(0)).current;

  // ── Treasure ──
  const [treasureVisible, setTreasureVisible] = useState(false);
  const [treasureDailyCount, setTreasureDailyCount] = useState(0);
  const [showTreasureAnim, setShowTreasureAnim] = useState(false);
  const [treasureClaimed, setTreasureClaimed] = useState(0);
  const treasurePulse     = useRef(new Animated.Value(1)).current;
  const treasureChestOpen = useRef(new Animated.Value(0)).current;
  const treasureCoinsAnim = useRef(new Animated.Value(0)).current;

  const flatListRef      = useRef<FlatList>(null);
  const announcementAnim = useRef(new Animated.Value(1)).current;
  const pkBarAnim        = useRef(new Animated.Value(0.5)).current;
  const pkPulseAnim      = useRef(new Animated.Value(1)).current;
  const pkLeaderFlash    = useRef(new Animated.Value(0)).current;
  const [rainParticles, setRainParticles] = useState<RainParticle[]>([]);
  const [pkBurstActive, setPkBurstActive] = useState(false);
  const speakingAnim     = useRef(new Animated.Value(1)).current;

  // ─── Animations ───
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(speakingAnim,{toValue:1.18,duration:400,useNativeDriver:true}),
      Animated.timing(speakingAnim,{toValue:1,duration:400,useNativeDriver:true}),
    ])).start();
  },[]);

  useEffect(() => {
    const t = setInterval(()=>{
      const mins = Math.floor((Date.now()-sessionStartTime)/60000);
      setSessionDurationMin(mins);
      const pts = Math.floor((mins/60)*EARNING_RATES.stream_per_hour);
      setSessionPoints(pts);
      const pct = Math.min(pts/20000,1);
      Animated.timing(earningBarAnim,{toValue:pct,duration:800,useNativeDriver:false}).start();
    },30000);
    return ()=>clearInterval(t);
  },[sessionStartTime]);

  useEffect(() => {
    const showTreasure = () => {
      if (treasureDailyCount<EARNING_RATES.treasure_box_max_daily) {
        setTreasureVisible(true);
        Animated.loop(Animated.sequence([
          Animated.timing(treasurePulse,{toValue:1.18,duration:500,useNativeDriver:true}),
          Animated.timing(treasurePulse,{toValue:1,duration:500,useNativeDriver:true}),
        ])).start();
        setTimeout(()=>setTreasureVisible(false),30000);
      }
    };
    const interval = setInterval(showTreasure,5*60*1000);
    const demo = setTimeout(showTreasure,8000);
    return ()=>{clearInterval(interval);clearTimeout(demo);};
  },[treasureDailyCount]);

  const handleClaimTreasure = async () => {
    if (showTreasureAnim) return;
    setTreasureVisible(false); setShowTreasureAnim(true);
    treasureChestOpen.setValue(0); treasureCoinsAnim.setValue(0);
    Animated.sequence([
      Animated.spring(treasureChestOpen,{toValue:1,useNativeDriver:true,tension:80}),
      Animated.timing(treasureCoinsAnim,{toValue:1,duration:700,useNativeDriver:true}),
    ]).start();
    let coins = EARNING_RATES.treasure_box_coins;
    if (user?.id) {
      const result = await claimTreasureBox(user.id);
      if (result.error) { showAlert('Max Reached',result.error); setShowTreasureAnim(false); return; }
      coins = result.coins; setTreasureDailyCount(result.dailyCount);
    } else setTreasureDailyCount(d=>d+1);
    setTreasureClaimed(c=>c+coins);
    setTimeout(()=>{ setShowTreasureAnim(false); showAlert('📦 Treasure Claimed!',`+${coins} S-Coins!`); },1400);
  };

  useEffect(() => {
    if (!room.isPK) return;
    const t = setInterval(()=>setPkTimeLeft(s=>Math.max(0,s-1)),1000);
    return ()=>clearInterval(t);
  },[room.isPK]);

  useEffect(() => {
    if (!room.isPK) return;
    const t = setInterval(()=>{
      if (Math.random()>0.55) triggerGiftRain('💎','left');
      if (Math.random()>0.65) triggerGiftRain('🌌','right');
    },3200);
    return ()=>clearInterval(t);
  },[room.isPK]);

  useEffect(() => {
    if (!showAnnouncement) return;
    const t = setTimeout(()=>{
      Animated.timing(announcementAnim,{toValue:0,duration:500,useNativeDriver:true}).start(()=>setShowAnnouncement(false));
    },5000);
    return ()=>clearTimeout(t);
  },[]);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(pkPulseAnim,{toValue:1.08,duration:200,useNativeDriver:true}),
      Animated.timing(pkPulseAnim,{toValue:1,duration:200,useNativeDriver:true}),
    ]).start();
    const total = pkHostScore+pkOpponentScore;
    const pct = total>0?pkHostScore/total:0.5;
    Animated.spring(pkBarAnim,{toValue:pct,useNativeDriver:false,tension:60,friction:10}).start();
  },[pkHostScore,pkOpponentScore]);

  useEffect(() => {
    if (allMessages.length>0) setTimeout(()=>flatListRef.current?.scrollToEnd({animated:true}),100);
  },[allMessages.length]);

  useEffect(() => {
    if (activeTab==='rank') {
      fetchRoomGiftLeaderboard(roomIdStr).then(({data})=>{ if(data.length>0) setGiftLeaderboard(data); });
    }
  },[activeTab]);

  // ─── Gift Rain ───
  const triggerGiftRain = useCallback((icon:string,side:'left'|'right',count=8)=>{
    const COLORS: Record<string,string> = {
      '💎':Colors.diamond,'🌌':Colors.secondary,'🔥':Colors.live,
      '👑':Colors.gold,'🚀':Colors.primary,'🌹':'#FF4088','⭐':Colors.gold,
    };
    const particles: RainParticle[] = [];
    const baseX = side==='left'?16:width*0.5;
    for (let i=0;i<count;i++){
      const anim=new Animated.Value(0); const scale=new Animated.Value(0.3+Math.random()*0.7); const opacity=new Animated.Value(1);
      const pid=`rp_${Date.now()}_${i}_${Math.random().toString(36).slice(2)}`;
      particles.push({id:pid,icon,x:baseX+Math.random()*(width*0.42),anim,scale,opacity,side,color:COLORS[icon]||Colors.primary});
      const delay=i*55;
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(anim,{toValue:1,duration:1500+Math.random()*700,useNativeDriver:true}),
          Animated.sequence([
            Animated.timing(scale,{toValue:1.2+Math.random()*0.5,duration:350,useNativeDriver:true}),
            Animated.timing(scale,{toValue:0.2,duration:900,useNativeDriver:true}),
          ]),
          Animated.sequence([
            Animated.delay(1000),
            Animated.timing(opacity,{toValue:0,duration:500,useNativeDriver:true}),
          ]),
        ]),
      ]).start();
      setTimeout(()=>setRainParticles(p=>p.filter(x=>x.id!==pid)),delay+2400);
    }
    setRainParticles(prev=>[...prev,...particles]);
    setPkBurstActive(true);
    Animated.sequence([
      Animated.timing(pkLeaderFlash,{toValue:1,duration:150,useNativeDriver:true}),
      Animated.timing(pkLeaderFlash,{toValue:0,duration:350,useNativeDriver:true}),
    ]).start();
    setTimeout(()=>setPkBurstActive(false),700);
  },[]);

  const sendReaction = (emoji:string) => {
    setShowReactions(false);
    const rid=`r_${Date.now()}`;
    const anim=new Animated.Value(0);
    setFloatingReactions(prev=>[...prev,{id:rid,emoji,x:40+Math.random()*(width-120),anim}]);
    Animated.timing(anim,{toValue:1,duration:2200,useNativeDriver:true}).start(()=>
      setFloatingReactions(prev=>prev.filter(r=>r.id!==rid))
    );
  };

  const handleSendMessage = async () => {
    const text=inputText.trim(); if (!text) return;
    setInputText(''); await sendMsg(text,'text');
  };

  const handleSendGift = async (giftId:string,price:number,giftIcon:string,giftName:string) => {
    if (currentUser.diamonds<price) {
      showAlert('Not Enough Diamonds','Recharge to send gifts!',[
        {text:'Recharge',onPress:()=>router.push('/recharge')},
        {text:'Cancel',style:'cancel'},
      ]);
      return;
    }
    updateDiamonds(-price);
    setShowGiftPanel(false);
    const pts=calcGiftPoints(price);
    if (pts>0) setGiftPointsTotal(g=>g+pts);
    if (price>=100) sendGiftNotification(currentUser.username,giftName,giftIcon,price).catch(()=>{});
    const count=price>=5000?24:price>=1000?16:price>=100?12:7;
    triggerGiftRain(giftIcon,'left',Math.ceil(count/2));
    triggerGiftRain(giftIcon,'right',Math.floor(count/2));
    if (room.isPK&&price>0) {
      if (giftTarget==='host') {
        const ns=pkHostScore+price; setPkHostScore?.(ns);
        await updatePKScore(roomIdStr,ns,pkOpponentScore);
      } else {
        const ns=pkOpponentScore+price; setPkOpponentScore?.(ns);
        await updatePKScore(roomIdStr,pkHostScore,ns);
      }
    }
    await addDiamondsEarned(roomIdStr,price);
    if (user?.id) await sendRoomGift(user.id,roomIdStr,giftId,giftName,giftIcon,price,giftTarget);
    await sendMsg(`Sent ${giftIcon} ${giftName}!`,'gift',{id:giftId,icon:giftIcon,name:giftName});
  };

  // ─── Sound effect trigger ───
  const triggerSound = (soundId: string) => {
    setPlayingSound(soundId);
    // Visual feedback + reaction in chat
    const sound = SOUND_EFFECTS.find(s=>s.id===soundId);
    if (sound) sendMsg(`${sound.icon} ${sound.name} effect played!`,'system',{});
    setTimeout(()=>setPlayingSound(null),1500);
  };

  // ─── Voice Effects ───
  const VOICE_EFFECTS = [
    {id:'none',  name:'Normal',    icon:'🎤'},
    {id:'deep',  name:'Deep',      icon:'🦁'},
    {id:'high',  name:'Chipmunk',  icon:'🐿️'},
    {id:'robot', name:'Robot',     icon:'🤖'},
    {id:'echo',  name:'Echo',      icon:'🌊'},
    {id:'loud',  name:'Megaphone', icon:'📢'},
  ];

  const pkTotal   = pkHostScore+pkOpponentScore;
  const pkPercent = pkTotal>0?pkHostScore/pkTotal:0.5;
  const pkMins    = Math.floor(pkTimeLeft/60);
  const pkSecs    = pkTimeLeft%60;
  const activeFilterData = BEAUTY_FILTERS.find(f=>f.id===activeFilter);

  const renderMessage = ({item}:{item:any}) => {
    const senderName   = item.sender?.display_name||item.sender?.username||item.username||'User';
    const senderAvatar = item.sender?.avatar_url||item.avatar;
    const vipLevel     = item.sender?.vip_level||0;
    const vipColors    = ['','#CD7F32','#C0C0C0','#FFCC00','#00DFFF','#FF2E8B'];
    if (item.type==='system'||item.type==='notification'||item.type==='join') {
      return <View style={styles.systemMsg}><Text style={styles.systemMsgText}>🔔 {senderName} {item.text}</Text></View>;
    }
    if (item.type==='gift') {
      return (
        <View style={styles.giftMsg}>
          {senderAvatar?<Image source={{uri:senderAvatar}} style={styles.msgAv} contentFit="cover"/>:null}
          <View style={styles.giftMsgBubble}>
            <Text style={[styles.giftMsgUser, vipLevel>0?{color:vipColors[vipLevel]}:null]}>{senderName}</Text>
            <Text style={styles.giftMsgText}> sent </Text>
            <Text style={{fontSize:14}}>{item.gift_icon||item.giftIcon||'🎁'}</Text>
            <Text style={styles.giftMsgName}> {item.gift_name||item.giftName}</Text>
            <View style={styles.giftPriceTag}><Text style={styles.giftPriceTagText}>💎{item.gift_price||item.giftPrice||0}</Text></View>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.chatMsg}>
        {senderAvatar?<Image source={{uri:senderAvatar}} style={styles.msgAv} contentFit="cover"/>:null}
        <View style={styles.chatBubble}>
          {vipLevel>0?<View style={[styles.vipMsgTag,{backgroundColor:vipColors[vipLevel]+'30',borderColor:vipColors[vipLevel]+'60'}]}><Text style={[styles.vipMsgText,{color:vipColors[vipLevel]}]}>VIP{vipLevel}</Text></View>:null}
          <Text style={[styles.msgUser,vipLevel>0?{color:vipColors[Math.min(vipLevel,5)]}:null]}>{senderName}: </Text>
          <Text style={styles.msgText}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Background + Beauty Overlay */}
      <Image source={{uri:room.thumbnail}} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={200}/>
      {activeFilterData && activeFilterData.id!=='none' ? (
        <View style={[StyleSheet.absoluteFillObject, {backgroundColor:activeFilterData.overlay}]} pointerEvents="none"/>
      ) : null}
      <View style={[StyleSheet.absoluteFillObject, styles.bgOverlay]}/>
      <PKGiftRain particles={rainParticles}/>

      {/* Floating Reactions */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {floatingReactions.map(r=>(
          <Animated.View key={r.id} style={[styles.floatReaction,{
            left:r.x, bottom:220,
            opacity:r.anim.interpolate({inputRange:[0,0.7,1],outputRange:[1,1,0]}),
            transform:[{translateY:r.anim.interpolate({inputRange:[0,1],outputRange:[0,-280]})}],
          }]}>
            <Text style={{fontSize:30}}>{r.emoji}</Text>
          </Animated.View>
        ))}
      </View>

      <SafeAreaView style={{flex:1}} edges={['top']}>
        <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={0}>

          {/* ── TOP BAR ── */}
          <View style={styles.topBar}>
            <View style={styles.hostInfo}>
              <Pressable onPress={()=>router.push(`/user/${room.hostId||'u001'}`)}>
                <Image source={{uri:room.hostAvatar}} style={styles.hostAv} contentFit="cover"/>
              </Pressable>
              <View style={{flex:1}}>
                <View style={styles.hostNameRow}>
                  <Text style={styles.hostName} numberOfLines={1}>{room.hostName}</Text>
                  <View style={styles.vipBadge}><Text style={styles.vipBadgeText}>👑V5</Text></View>
                  {room.isPK?<View style={styles.pkTag}><Text style={styles.pkTagText}>⚔️PK</Text></View>:null}
                  {room.isParty?<View style={[styles.pkTag,{backgroundColor:Colors.secondary}]}><Text style={styles.pkTagText}>🎉 Party</Text></View>:null}
                </View>
                <Text style={styles.roomTitle} numberOfLines={1}>{room.title}</Text>
              </View>
              <Pressable style={[styles.followBtn, isFollowing&&styles.followBtnActive]}
                onPress={()=>{setIsFollowing(!isFollowing);toggleFollow(room.hostId||'u001');}}>
                <Text style={styles.followBtnText}>{isFollowing?'✓ Following':'+ Follow'}</Text>
              </Pressable>
            </View>
            <View style={styles.topRight}>
              <View style={styles.viewerBadge}>
                <View style={styles.viewerDot}/>
                <Text style={styles.viewerText}>{Math.max(0,viewers).toLocaleString()}</Text>
              </View>
              <View style={styles.timerBadge}><Text style={styles.timerText}>{duration}</Text></View>
              <Pressable style={styles.iconBtn} onPress={()=>setShowMultiStream(true)}>
                <MaterialIcons name="grid-view" size={16} color="#FFF"/>
              </Pressable>
              <Pressable style={styles.iconBtn} onPress={()=>showAlert('Share','Stream link copied to clipboard!')}>
                <MaterialIcons name="share" size={16} color="#FFF"/>
              </Pressable>
              <Pressable style={styles.iconBtn} onPress={()=>router.back()}>
                <MaterialIcons name="close" size={16} color="#FFF"/>
              </Pressable>
            </View>
          </View>

          {/* ── HOST CONTROL BAR (camera/mic/beauty row) ── */}
          {currentUser.isHost ? (
            <View style={styles.hostControlBar}>
              {/* Camera toggle */}
              <Pressable style={[styles.hostCtrlBtn, !isCameraOn&&styles.hostCtrlBtnOff]} onPress={()=>setIsCameraOn(!isCameraOn)}>
                <MaterialIcons name={isCameraOn?'videocam':'videocam-off'} size={16} color={isCameraOn?'#FFF':Colors.error}/>
                <Text style={[styles.hostCtrlLabel,!isCameraOn&&{color:Colors.error}]}>Cam</Text>
              </Pressable>
              {/* Mic toggle */}
              <Pressable style={[styles.hostCtrlBtn, !isMicOn&&styles.hostCtrlBtnOff]} onPress={()=>setIsMicOn(!isMicOn)}>
                <MaterialIcons name={isMicOn?'mic':'mic-off'} size={16} color={isMicOn?'#FFF':Colors.error}/>
                <Text style={[styles.hostCtrlLabel,!isMicOn&&{color:Colors.error}]}>Mic</Text>
              </Pressable>
              {/* Flip camera */}
              <Pressable style={styles.hostCtrlBtn} onPress={()=>{setIsFrontCam(!isFrontCam);showAlert('Camera Flipped',`Now using ${!isFrontCam?'front':'rear'} camera`);}}>
                <MaterialIcons name="flip-camera-ios" size={16} color="#FFF"/>
                <Text style={styles.hostCtrlLabel}>Flip</Text>
              </Pressable>
              {/* Flash */}
              <Pressable style={[styles.hostCtrlBtn, flashOn&&{backgroundColor:Colors.gold+'40'}]} onPress={()=>setFlashOn(!flashOn)}>
                <MaterialIcons name={flashOn?'flash-on':'flash-off'} size={16} color={flashOn?Colors.gold:'#FFF'}/>
                <Text style={[styles.hostCtrlLabel,flashOn&&{color:Colors.gold}]}>Flash</Text>
              </Pressable>
              {/* Beauty */}
              <Pressable style={[styles.hostCtrlBtn,showBeautyPanel&&{backgroundColor:Colors.primary+'40'}]} onPress={()=>{setShowBeautyPanel(!showBeautyPanel);setShowSoundPanel(false);setShowCameraPanel(false);setShowGamesPanel(false);setShowMorePanel(false);}}>
                <MaterialIcons name="face-retouching-natural" size={16} color={activeFilter!=='none'?Colors.primary:'#FFF'}/>
                <Text style={[styles.hostCtrlLabel,activeFilter!=='none'&&{color:Colors.primary}]}>Beauty</Text>
              </Pressable>
              {/* Sound */}
              <Pressable style={[styles.hostCtrlBtn,showSoundPanel&&{backgroundColor:Colors.secondary+'40'}]} onPress={()=>{setShowSoundPanel(!showSoundPanel);setShowBeautyPanel(false);setShowCameraPanel(false);setShowGamesPanel(false);setShowMorePanel(false);}}>
                <MaterialIcons name="surround-sound" size={16} color={showSoundPanel?Colors.secondary:'#FFF'}/>
                <Text style={[styles.hostCtrlLabel,showSoundPanel&&{color:Colors.secondary}]}>Sound</Text>
              </Pressable>
              {/* Camera effects */}
              <Pressable style={[styles.hostCtrlBtn,showCameraPanel&&{backgroundColor:Colors.diamond+'30'}]} onPress={()=>{setShowCameraPanel(!showCameraPanel);setShowBeautyPanel(false);setShowSoundPanel(false);setShowGamesPanel(false);setShowMorePanel(false);}}>
                <MaterialIcons name="auto-fix-high" size={16} color={activeCamEffect!=='none'?Colors.diamond:'#FFF'}/>
                <Text style={[styles.hostCtrlLabel,activeCamEffect!=='none'&&{color:Colors.diamond}]}>FX</Text>
              </Pressable>
              {/* More */}
              <Pressable style={styles.hostCtrlBtn} onPress={()=>{setShowMorePanel(!showMorePanel);setShowBeautyPanel(false);setShowSoundPanel(false);setShowCameraPanel(false);setShowGamesPanel(false);}}>
                <MaterialIcons name="more-horiz" size={16} color="#FFF"/>
                <Text style={styles.hostCtrlLabel}>More</Text>
              </Pressable>
            </View>
          ) : null}

          {/* ── BEAUTY PANEL ── */}
          {showBeautyPanel ? (
            <View style={styles.beautyPanel}>
              <View style={styles.beautyPanelHeader}>
                <Text style={styles.beautyPanelTitle}>✨ Beauty Effects</Text>
                <Pressable onPress={()=>setShowBeautyPanel(false)}>
                  <MaterialIcons name="close" size={18} color={Colors.textMuted}/>
                </Pressable>
              </View>
              {/* Filters row */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,paddingHorizontal:8,marginBottom:8}}>
                {BEAUTY_FILTERS.map(f=>(
                  <Pressable key={f.id} style={[styles.filterChip, activeFilter===f.id&&styles.filterChipActive]} onPress={()=>setActiveFilter(f.id)}>
                    <Text style={{fontSize:18}}>{f.icon}</Text>
                    <Text style={[styles.filterChipLabel,activeFilter===f.id&&{color:Colors.primary}]}>{f.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              {/* Sliders */}
              <View style={styles.beautySliders}>
                {[
                  {label:'Beauty',val:beautyLevel,set:setBeautyLevel,color:Colors.primary},
                  {label:'Smooth',val:smoothLevel,set:setSmoothLevel,color:Colors.secondary},
                  {label:'Whiten',val:whitenLevel,set:setWhitenLevel,color:Colors.diamond},
                ].map(s=>(
                  <View key={s.label} style={styles.sliderRow}>
                    <Text style={styles.sliderLabel}>{s.label}</Text>
                    <View style={styles.sliderTrack}>
                      <Pressable
                        style={[styles.sliderFill,{width:`${s.val}%` as any,backgroundColor:s.color}]}
                        onPress={()=>s.set(Math.min(100,s.val+10))}
                      />
                    </View>
                    <Text style={styles.sliderVal}>{s.val}%</Text>
                  </View>
                ))}
              </View>
              {/* Toggles */}
              <View style={styles.beautyToggles}>
                {[
                  {label:'Slim Face',val:slimFace,set:setSlimFace,icon:'🫠'},
                  {label:'Big Eyes', val:bigEyes,  set:setBigEyes, icon:'👀'},
                  {label:'Lip Color',val:lipColor, set:setLipColor,icon:'💄'},
                ].map(t=>(
                  <Pressable key={t.label} style={[styles.beautyToggle,t.val&&styles.beautyToggleActive]} onPress={()=>t.set(!t.val)}>
                    <Text style={{fontSize:14}}>{t.icon}</Text>
                    <Text style={[styles.beautyToggleLabel,t.val&&{color:Colors.primary}]}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {/* ── SOUND PANEL ── */}
          {showSoundPanel ? (
            <View style={styles.soundPanel}>
              <View style={styles.beautyPanelHeader}>
                <Text style={styles.beautyPanelTitle}>🔊 Sound Effects</Text>
                <Pressable onPress={()=>setShowSoundPanel(false)}>
                  <MaterialIcons name="close" size={18} color={Colors.textMuted}/>
                </Pressable>
              </View>
              <Text style={styles.soundSectionLabel}>🎵 Effect Sounds</Text>
              <View style={styles.soundGrid}>
                {SOUND_EFFECTS.map(s=>(
                  <Pressable key={s.id} style={[styles.soundBtn, playingSound===s.id&&styles.soundBtnActive]} onPress={()=>triggerSound(s.id)}>
                    <Text style={{fontSize:24}}>{s.icon}</Text>
                    <Text style={[styles.soundBtnLabel, playingSound===s.id&&{color:Colors.primary}]}>{s.name}</Text>
                    {playingSound===s.id?<View style={styles.soundPlayingDot}/>:null}
                  </Pressable>
                ))}
              </View>
              <Text style={styles.soundSectionLabel}>🎤 Voice Effects</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,paddingHorizontal:4}}>
                {VOICE_EFFECTS.map(v=>(
                  <Pressable key={v.id} style={[styles.voiceBtn, voiceEffect===v.id&&styles.voiceBtnActive]} onPress={()=>{setVoiceEffect(v.id);showAlert(`${v.icon} ${v.name}`,`Voice effect "${v.name}" applied to your microphone!`);}}>
                    <Text style={{fontSize:22}}>{v.icon}</Text>
                    <Text style={[styles.voiceBtnLabel,voiceEffect===v.id&&{color:Colors.secondary}]}>{v.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.volumeRow}>
                <MaterialIcons name="volume-up" size={16} color={Colors.textMuted}/>
                <View style={styles.volumeTrack}>
                  <Pressable style={[styles.volumeFill,{width:`${soundVolume}%` as any}]} onPress={()=>setSoundVolume(v=>Math.min(100,v+10))}/>
                </View>
                <Text style={styles.volumeLabel}>{soundVolume}%</Text>
              </View>
            </View>
          ) : null}

          {/* ── CAMERA FX PANEL ── */}
          {showCameraPanel ? (
            <View style={styles.cameraPanel}>
              <View style={styles.beautyPanelHeader}>
                <Text style={styles.beautyPanelTitle}>📷 Camera Effects</Text>
                <Pressable onPress={()=>setShowCameraPanel(false)}>
                  <MaterialIcons name="close" size={18} color={Colors.textMuted}/>
                </Pressable>
              </View>
              <View style={styles.camEffectGrid}>
                {CAMERA_EFFECTS.map(e=>(
                  <Pressable key={e.id} style={[styles.camEffectBtn, activeCamEffect===e.id&&styles.camEffectBtnActive]} onPress={()=>{setActiveCamEffect(e.id);showAlert(`${e.icon} ${e.name}`,`${e.name} camera effect applied!`);}}>
                    <Text style={{fontSize:26}}>{e.icon}</Text>
                    <Text style={[styles.camEffectLabel,activeCamEffect===e.id&&{color:Colors.diamond}]}>{e.name}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.soundSectionLabel}>Zoom Level</Text>
              <View style={styles.zoomRow}>
                {[1,1.5,2,3].map(z=>(
                  <Pressable key={z} style={[styles.zoomBtn,zoomLevel===z&&styles.zoomBtnActive]} onPress={()=>{setZoomLevel(z);showAlert(`Zoom ${z}x`,`Camera zoomed to ${z}x`);}}>
                    <Text style={[styles.zoomLabel,zoomLevel===z&&{color:Colors.diamond}]}>{z}x</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {/* ── MORE PANEL ── */}
          {showMorePanel ? (
            <View style={styles.morePanel}>
              <View style={styles.beautyPanelHeader}>
                <Text style={styles.beautyPanelTitle}>⚙️ More Options</Text>
                <Pressable onPress={()=>setShowMorePanel(false)}>
                  <MaterialIcons name="close" size={18} color={Colors.textMuted}/>
                </Pressable>
              </View>
              <View style={styles.morePanelGrid}>
                {[
                  {icon:'🖼️',label:'Wallpaper',   onPress:()=>showAlert('Wallpaper','Choose stream background')},
                  {icon:'📺',label:'Multi-Stream', onPress:()=>{setShowMorePanel(false);setShowMultiStream(true);}},
                  {icon:'⚔️',label:'Start PK',     onPress:()=>showAlert('PK Battle','Invite opponent to PK battle')},
                  {icon:'🎉',label:'Party Mode',    onPress:()=>showAlert('Party Mode','Switch to party room mode')},
                  {icon:'🔒',label:'Lock Room',     onPress:()=>showAlert('Lock Room','Set password to lock your room')},
                  {icon:'📌',label:'Pin Message',   onPress:()=>showAlert('Pin Message','Pin announcement to top of chat')},
                  {icon:'🚫',label:'Mute All',      onPress:()=>showAlert('Mute All','Muted all viewers in room')},
                  {icon:'📊',label:'Analytics',     onPress:()=>setShowEarningsOverlay(true)},
                ].map(a=>(
                  <Pressable key={a.label} style={styles.morePanelBtn} onPress={()=>{setShowMorePanel(false);a.onPress();}}>
                    <Text style={{fontSize:26}}>{a.icon}</Text>
                    <Text style={styles.morePanelLabel}>{a.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {/* ── Mini Earnings Bar ── */}
          {currentUser.isHost&&sessionPoints>0 ? (
            <Pressable style={styles.earningsBar} onPress={()=>setShowEarningsOverlay(true)}>
              <Text style={styles.earningBarIcon}>💰</Text>
              <View style={styles.earningBarTrack}>
                <Animated.View style={[styles.earningBarFill,{
                  width:earningBarAnim.interpolate({inputRange:[0,1],outputRange:['0%','100%']}),
                }]}/>
              </View>
              <Text style={styles.earningBarText}>+{sessionPoints.toLocaleString()}pts</Text>
            </Pressable>
          ) : null}

          {/* Announcement */}
          {showAnnouncement ? (
            <Animated.View style={[styles.announcement,{opacity:announcementAnim}]}>
              <MaterialIcons name="campaign" size={13} color={Colors.gold}/>
              <Text style={styles.announcementText} numberOfLines={1}>
                {'🎉 Welcome! Send gifts to support '}{room.hostName}{' — PK battle is LIVE!'}
              </Text>
              <Pressable onPress={()=>setShowAnnouncement(false)}>
                <MaterialIcons name="close" size={13} color={Colors.gold}/>
              </Pressable>
            </Animated.View>
          ) : null}

          {/* ── PK BAR ── */}
          {room.isPK ? (
            <Animated.View style={[styles.pkBar,
              pkBurstActive?{borderColor:Colors.live+'80',shadowOpacity:0.9,shadowRadius:20}:null,
            ]}>
              <View style={styles.pkSide}>
                <Animated.View style={{transform:[{scale:pkBurstActive?pkPulseAnim:new Animated.Value(1)}]}}>
                  <Image source={{uri:room.hostAvatar}} style={[styles.pkAv,{borderColor:Colors.primary}]} contentFit="cover"/>
                  {pkPercent>=0.5?<View style={styles.pkLeadBadge}><Text style={styles.pkLeadText}>👑</Text></View>:null}
                </Animated.View>
                <Text style={styles.pkName} numberOfLines={1}>{room.hostName.split(' ')[0]}</Text>
                <Animated.Text style={[styles.pkScore,{
                  opacity:pkLeaderFlash.interpolate({inputRange:[0,1],outputRange:[1,0.2]}),
                }]}>{pkHostScore.toLocaleString()}</Animated.Text>
              </View>
              <View style={styles.pkCenter}>
                <View style={styles.pkTimerRow}>
                  <View style={styles.pkLiveDot}/>
                  <Text style={[styles.pkTimerText, pkTimeLeft<=60?{color:Colors.live}:null]}>
                    {pkMins}:{pkSecs.toString().padStart(2,'0')}
                  </Text>
                  {pkBurstActive?<Text style={styles.pkFireText}>🔥</Text>:null}
                </View>
                <View style={styles.pkBarOuter}>
                  <Animated.View style={[styles.pkBarFillLeft,{flex:pkBarAnim}]}/>
                  <View style={styles.pkVsCircle}><Text style={styles.pkVsText}>VS</Text></View>
                  <Animated.View style={[styles.pkBarFillRight,{
                    flex:pkBarAnim.interpolate({inputRange:[0,1],outputRange:[1,0]}),
                  }]}/>
                </View>
                {pkBurstActive?<View style={styles.pkRainLabel}><Text style={styles.pkRainLabelText}>🌧 GIFT RAIN!</Text></View>:null}
                <Text style={styles.pkStatusText}>
                  {pkPercent>0.6?'🏆 Dominating!':pkPercent>0.5?'📈 Leading':pkPercent<0.4?'📉 Behind':'⚖️ Tied'}
                </Text>
              </View>
              <View style={[styles.pkSide,{alignItems:'flex-end'}]}>
                <Animated.View style={{transform:[{scale:pkBurstActive?pkPulseAnim:new Animated.Value(1)}]}}>
                  <Image source={{uri:'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop'}} style={[styles.pkAv,{borderColor:Colors.secondary}]} contentFit="cover"/>
                  {pkPercent<0.5?<View style={[styles.pkLeadBadge,{right:0,left:undefined}]}><Text style={styles.pkLeadText}>👑</Text></View>:null}
                </Animated.View>
                <Text style={styles.pkName} numberOfLines={1}>{room.pkOpponent?.split(' ')[0]||'Opponent'}</Text>
                <Text style={[styles.pkScore,{color:Colors.secondary}]}>{pkOpponentScore.toLocaleString()}</Text>
              </View>
            </Animated.View>
          ) : null}

          {/* ── PARTY SEATS ── */}
          {room.isParty ? (
            <View style={styles.seatsRow}>
              {PARTY_SEATS.map((seat:any)=>(
                <Pressable key={seat.id} style={styles.seat}
                  onPress={()=>showAlert(
                    seat.user||'Empty Seat',
                    seat.user?`${seat.role||''} ${seat.isMuted?'🔇 Muted':'🎤 Active'}`:'Request this mic seat?',
                    seat.user
                      ?[{text:'🎁 Gift',onPress:()=>setShowGiftPanel(true)},{text:'View',onPress:()=>router.push(`/user/${seat.id}`)},{text:'Close',style:'cancel'}]
                      :[{text:'Request Seat',onPress:()=>showAlert('Requested!','Seat request sent.')},{text:'Cancel',style:'cancel'}]
                  )}
                >
                  {seat.filled&&seat.avatar ? (
                    <View style={styles.seatFilled}>
                      <Animated.View style={[styles.seatRing,seat.isSpeaking?{transform:[{scale:speakingAnim}],borderColor:Colors.success}:null]}>
                        <Image source={{uri:seat.avatar}} style={styles.seatAv} contentFit="cover"/>
                      </Animated.View>
                      {seat.role==='CO-HOST'?<View style={styles.coHostBadge}><Text style={styles.coHostText}>CO</Text></View>:null}
                      <View style={[styles.micBadge,seat.isMuted?styles.micMuted:styles.micOn]}>
                        <MaterialIcons name={seat.isMuted?'mic-off':'graphic-eq'} size={8} color="#FFF"/>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.emptySeat}>
                      <MaterialIcons name="add" size={18} color={Colors.textMuted}/>
                      <Text style={styles.emptyText}>{seat.id}</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          ) : null}

          {/* ── BOTTOM AREA ── */}
          <View style={styles.bottomArea}>
            <View style={styles.tabRow}>
              {(['chat','gifts','rank'] as const).map(tab=>(
                <Pressable key={tab} style={[styles.tabBtn,activeTab===tab&&styles.tabBtnActive]} onPress={()=>setActiveTab(tab)}>
                  <Text style={[styles.tabText,activeTab===tab&&styles.tabTextActive]}>
                    {tab==='chat'?'💬 Chat':tab==='gifts'?'🎁 Gifts':'🏆 Rank'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {activeTab==='chat' ? (
              <FlatList
                ref={flatListRef}
                data={allMessages.slice(-25)}
                keyExtractor={(item,i)=>item.id||String(i)}
                style={styles.chatList}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={()=>flatListRef.current?.scrollToEnd({animated:true})}
                renderItem={renderMessage}
                ListEmptyComponent={
                  chatLoading
                    ?<ActivityIndicator size="small" color={Colors.primary} style={{marginTop:20}}/>
                    :<Text style={styles.noMsgsText}>Be the first to say hello! 👋</Text>
                }
              />
            ) : null}

            {activeTab==='gifts' ? (
              <View style={styles.giftsTabWrap}>
                {room.isPK ? (
                  <View style={styles.giftTargetRow}>
                    <Text style={styles.giftTargetLabel}>Gift target:</Text>
                    {(['host','opponent'] as const).map(t=>(
                      <Pressable key={t} style={[styles.giftTargetBtn,giftTarget===t&&styles.giftTargetBtnActive]} onPress={()=>setGiftTarget(t)}>
                        <Text style={[styles.giftTargetText,giftTarget===t&&styles.giftTargetTextActive]}>
                          {t==='host'?`🔴 ${room.hostName.split(' ')[0]}`:`🔵 ${room.pkOpponent?.split(' ')[0]||'Opp'}`}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                <View style={styles.giftGrid}>
                  {GIFTS.map(gift=>(
                    <Pressable key={gift.id}
                      style={({pressed})=>[styles.giftCell,pressed?{opacity:0.75,transform:[{scale:0.92}]}:null,currentUser.diamonds<gift.price?{opacity:0.5}:null]}
                      onPress={()=>handleSendGift(gift.id,gift.price,gift.icon,gift.name)}
                    >
                      <Text style={styles.giftCellIcon}>{gift.icon}</Text>
                      <Text style={styles.giftCellName}>{gift.name}</Text>
                      <View style={styles.giftCellPrice}><Text style={styles.giftCellPriceText}>💎{gift.price}</Text></View>
                    </Pressable>
                  ))}
                </View>
                {room.isPK ? (
                  <Pressable style={styles.rainDemoBtn} onPress={()=>{triggerGiftRain('🌌','left',14);triggerGiftRain('🔥','right',14);}}>
                    <Text style={styles.rainDemoBtnText}>🌧 Trigger Gift Rain Demo</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {activeTab==='rank' ? (
              <ScrollView style={styles.rankList} showsVerticalScrollIndicator={false}>
                {(giftLeaderboard.length>0?giftLeaderboard:[
                  {username:'CosmicFan',avatar_url:'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80',total:5000},
                  {username:'StarGifter',avatar_url:'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80',total:2000},
                  {username:'NightFan',avatar_url:'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80',total:1500},
                ]).map((r:any,i:number)=>(
                  <View key={i} style={styles.rankItem}>
                    <Text style={styles.rankPos}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}</Text>
                    <Image source={{uri:r.avatar_url}} style={styles.rankAv} contentFit="cover"/>
                    <Text style={styles.rankName}>{r.username}</Text>
                    <Text style={styles.rankDiamonds}>💎 {(r.total||0).toLocaleString()}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            {showReactions ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stickerStrip} contentContainerStyle={{paddingHorizontal:Spacing.md,gap:Spacing.xs}}>
                {REACTIONS.map(e=>(
                  <Pressable key={e} style={styles.stickerBtn} onPress={()=>sendReaction(e)}>
                    <Text style={{fontSize:24}}>{e}</Text>
                  </Pressable>
                ))}
                {STICKER_ROW.map(e=>(
                  <Pressable key={`s_${e}`} style={styles.stickerBtn} onPress={()=>{sendMsg(e);setShowReactions(false);}}>
                    <Text style={{fontSize:24}}>{e}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            {/* ── INPUT ROW ── */}
            <View style={styles.inputRow}>
              <Pressable style={styles.inputBtn} onPress={()=>setShowReactions(!showReactions)}>
                <Text style={{fontSize:22}}>😊</Text>
              </Pressable>
              <TextInput
                style={styles.chatInput}
                placeholder="Say something..."
                placeholderTextColor="rgba(255,255,255,0.38)"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSendMessage}
                returnKeyType="send"
                onFocus={()=>setInputFocused(true)}
                onBlur={()=>setInputFocused(false)}
              />
              {/* Games button */}
              <Pressable style={styles.inputBtn} onPress={()=>{
                setShowGamesPanel(!showGamesPanel);
                setShowBeautyPanel(false);setShowSoundPanel(false);setShowCameraPanel(false);setShowMorePanel(false);
              }}>
                <Text style={{fontSize:22}}>🎮</Text>
              </Pressable>
              {/* Gift button */}
              <Pressable style={styles.inputBtn} onPress={()=>setActiveTab('gifts')}>
                <Text style={{fontSize:22}}>🎁</Text>
              </Pressable>
              {/* Send */}
              <Pressable
                style={[styles.sendBtn,(!inputText.trim()||sending)&&styles.sendBtnOff]}
                onPress={handleSendMessage}
                disabled={!inputText.trim()||sending}
              >
                <MaterialIcons name="send" size={16} color="#FFF"/>
              </Pressable>
            </View>

            {/* ── GAMES PANEL ── */}
            {showGamesPanel ? (
              <View style={styles.gamesPanel}>
                <View style={styles.beautyPanelHeader}>
                  <Text style={styles.beautyPanelTitle}>🎮 In-Room Games</Text>
                  <Pressable onPress={()=>setShowGamesPanel(false)}>
                    <MaterialIcons name="close" size={18} color={Colors.textMuted}/>
                  </Pressable>
                </View>
                <View style={styles.livegameGrid}>
                  {LIVE_GAMES.map(g=>(
                    <Pressable key={g.id} style={[styles.livegameBtn,{borderColor:g.color+'50'}]}
                      onPress={()=>{setShowGamesPanel(false);setActiveGame(g.id);}}>
                      <View style={[styles.livegameIcon,{backgroundColor:g.color+'20'}]}>
                        <Text style={{fontSize:28}}>{g.icon}</Text>
                      </View>
                      <Text style={[styles.livegameName,{color:g.color}]}>{g.name}</Text>
                      <Text style={styles.livegameDesc}>{g.desc}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable style={styles.allGamesBtn} onPress={()=>{setShowGamesPanel(false);router.push('/games');}}>
                  <Text style={styles.allGamesBtnText}>🎯 All Games & Casino →</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ── TREASURE BOX ── */}
      {treasureVisible&&!showTreasureAnim ? (
        <Animated.View style={[styles.treasureWrap,{transform:[{scale:treasurePulse}]}]}>
          <Pressable style={styles.treasureBtn} onPress={handleClaimTreasure}>
            <Text style={{fontSize:32}}>📦</Text>
            <View style={styles.treasureBadge}><Text style={styles.treasureBadgeText}>FREE</Text></View>
          </Pressable>
          <Text style={styles.treasureLabel}>{EARNING_RATES.treasure_box_max_daily-treasureDailyCount} left</Text>
        </Animated.View>
      ) : null}

      {/* ── TREASURE CLAIM ANIMATION ── */}
      {showTreasureAnim ? (
        <View style={styles.treasureAnimOverlay} pointerEvents="none">
          <Animated.View style={[styles.treasureAnimBox,{transform:[{scale:treasureChestOpen}]}]}>
            <Text style={{fontSize:64}}>📦</Text>
          </Animated.View>
          <Animated.View style={[styles.treasureCoinsWrap,{
            opacity:treasureCoinsAnim,
            transform:[{translateY:treasureCoinsAnim.interpolate({inputRange:[0,1],outputRange:[20,-60]})}],
          }]}>
            <Text style={styles.treasureCoinsBig}>+{EARNING_RATES.treasure_box_coins}🪙</Text>
            <Text style={styles.treasureCoinsLabel}>S-Coins Earned!</Text>
          </Animated.View>
        </View>
      ) : null}

      {/* ── EARNINGS OVERLAY ── */}
      {showEarningsOverlay ? (
        <View style={styles.earningsOverlay}>
          <View style={styles.earningsCard}>
            <View style={styles.earningsCardHeader}>
              <Text style={styles.earningsCardTitle}>💰 Session Earnings</Text>
              <Pressable onPress={()=>setShowEarningsOverlay(false)} style={styles.earningsClose}>
                <MaterialIcons name="close" size={20} color={Colors.textPrimary}/>
              </Pressable>
            </View>
            {[
              {icon:'⏱',label:'Stream Duration',  val:`${sessionDurationMin} minutes`, color:Colors.textPrimary},
              {icon:'🎤',label:'Stream Points',    val:`+${sessionPoints.toLocaleString()} pts`,color:Colors.gold},
              {icon:'🎁',label:'Gift Points (70%)',val:`+${giftPointsTotal.toLocaleString()} pts`,color:Colors.primary},
              {icon:'📦',label:'Treasure Coins',   val:`+${treasureClaimed} 🪙`,          color:Colors.success},
            ].map(row=>(
              <View key={row.label} style={styles.earningsRow}>
                <Text style={{fontSize:28}}>{row.icon}</Text>
                <View style={{flex:1}}>
                  <Text style={styles.earningsRowLabel}>{row.label}</Text>
                  <Text style={[styles.earningsRowVal,{color:row.color}]}>{row.val}</Text>
                </View>
              </View>
            ))}
            <View style={styles.earningsDivider}/>
            <View style={styles.earningsTotalRow}>
              <Text style={styles.earningsTotalLabel}>Total This Session</Text>
              <Text style={styles.earningsTotalVal}>{(sessionPoints+giftPointsTotal).toLocaleString()} pts</Text>
            </View>
            <Text style={styles.earningsConvRate}>10,000 pts = $1 USD</Text>
            <View style={styles.earningsCardBtns}>
              <Pressable style={styles.earningsClaimBtn} onPress={()=>{
                setShowEarningsOverlay(false);
                showAlert('🎉 Rewards Saved!',`+${(sessionPoints+giftPointsTotal).toLocaleString()} pts added to your account.`);
              }}>
                <Text style={styles.earningsClaimBtnText}>✅ Claim Rewards</Text>
              </Pressable>
              <Pressable style={styles.earningsViewBtn} onPress={()=>{setShowEarningsOverlay(false);router.push('/daily-tasks');}}>
                <Text style={styles.earningsViewBtnText}>📊 View Tasks</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {/* ── GAME MODAL ── */}
      <Modal visible={activeGame!==null} transparent animationType="slide">
        <Pressable style={styles.modalBg} onPress={()=>setActiveGame(null)}>
          <Pressable style={styles.gameCard} onPress={e=>e.stopPropagation()}>
            {/* Game tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6,paddingHorizontal:4,marginBottom:Spacing.sm}}>
              {LIVE_GAMES.map(g=>(
                <Pressable key={g.id} style={[styles.gameTab, activeGame===g.id&&[styles.gameTabActive,{backgroundColor:g.color}]]} onPress={()=>setActiveGame(g.id)}>
                  <Text style={{fontSize:14}}>{g.icon}</Text>
                  <Text style={[styles.gameTabText,activeGame===g.id&&{color:'#FFF'}]}>{g.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {activeGame==='guess'    ? <NumberGuessGame onWin={a=>{updateDiamonds(a);}} onClose={()=>setActiveGame(null)}/> : null}
            {activeGame==='poll'     ? <PollGame onClose={()=>setActiveGame(null)}/> : null}
            {activeGame==='trivia'   ? <TriviaGame onWin={a=>{updateDiamonds(a);}} onClose={()=>setActiveGame(null)}/> : null}
            {activeGame==='roulette' ? <MiniRoulette onWin={a=>{updateDiamonds(a);}} onClose={()=>setActiveGame(null)}/> : null}
            {activeGame==='flip'     ? <MiniCoinFlip onWin={a=>{updateDiamonds(a);}} onClose={()=>setActiveGame(null)}/> : null}
            {activeGame==='slots'    ? <MiniSlots onWin={a=>{updateDiamonds(a);}} onClose={()=>setActiveGame(null)}/> : null}
            <Pressable style={styles.moreGamesLink} onPress={()=>{setActiveGame(null);router.push('/games');}}>
              <Text style={styles.moreGamesLinkText}>🎰 Play Full Games Hub →</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── MULTI-STREAM MODAL ── */}
      <Modal visible={showMultiStream} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.multiCard}>
            <View style={styles.multiHeader}>
              <Text style={styles.multiTitle}>📺 Multi-Stream View</Text>
              <Pressable onPress={()=>setShowMultiStream(false)}>
                <MaterialIcons name="close" size={22} color={Colors.textPrimary}/>
              </Pressable>
            </View>
            <View style={styles.multiGrid}>
              {MOCK_LIVE_ROOMS.slice(0,4).map(r=>(
                <Pressable key={r.id} style={styles.multiCell} onPress={()=>{setShowMultiStream(false);router.push(`/live/${r.id}`);}}>
                  <Image source={{uri:r.thumbnail}} style={StyleSheet.absoluteFillObject} contentFit="cover"/>
                  <View style={styles.multiOverlay}>
                    <View style={styles.multiLiveDot}><Text style={styles.multiLiveText}>LIVE</Text></View>
                    <Text style={styles.multiHost} numberOfLines={1}>{r.hostName}</Text>
                    <Text style={styles.multiViewers}>👁 {(r.viewers/1000).toFixed(1)}K</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── GAME COMPONENT STYLES ───
const gS = StyleSheet.create({
  wrap:           {gap:Spacing.sm},
  close:          {position:'absolute',top:-4,right:-4,width:32,height:32,alignItems:'center',justifyContent:'center'},
  title:          {color:Colors.textPrimary,fontSize:FontSize.lg,fontWeight:FontWeight.bold,textAlign:'center'},
  hint:           {color:Colors.gold,fontSize:FontSize.md,textAlign:'center',fontWeight:FontWeight.semibold},
  attRow:         {flexDirection:'row',justifyContent:'center',gap:Spacing.sm},
  att:            {width:14,height:14,borderRadius:7,backgroundColor:Colors.success},
  attUsed:        {backgroundColor:Colors.error},
  numGrid:        {flexDirection:'row',flexWrap:'wrap',gap:Spacing.sm,justifyContent:'center'},
  numBtn:         {width:50,height:50,borderRadius:25,backgroundColor:Colors.surfaceElevated,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:Colors.cardBorder},
  numBtnSel:      {backgroundColor:Colors.primary+'30',borderColor:Colors.primary},
  numBtnWin:      {backgroundColor:Colors.success,borderColor:Colors.success},
  numText:        {color:Colors.textPrimary,fontSize:FontSize.md,fontWeight:FontWeight.bold},
  pollOpt:        {flexDirection:'row',alignItems:'center',backgroundColor:Colors.surfaceElevated,borderRadius:BorderRadius.md,padding:Spacing.sm,gap:Spacing.sm,overflow:'hidden',position:'relative',borderWidth:1.5,borderColor:Colors.cardBorder},
  pollFill:       {position:'absolute',left:0,top:0,bottom:0,borderRadius:BorderRadius.md},
  pollLabel:      {flex:1,color:Colors.textPrimary,fontSize:FontSize.sm,fontWeight:FontWeight.semibold},
  pollPct:        {fontWeight:FontWeight.black,fontSize:FontSize.sm},
  pollTotal:      {color:Colors.textMuted,fontSize:FontSize.xs,textAlign:'center'},
  actionBtn:      {backgroundColor:Colors.primary,borderRadius:BorderRadius.pill,padding:Spacing.sm,alignItems:'center'},
  actionBtnText:  {color:'#FFF',fontSize:FontSize.sm,fontWeight:FontWeight.bold},
  wheel:          {alignSelf:'center',marginVertical:Spacing.sm},
  prizeGrid:      {flexDirection:'row',flexWrap:'wrap',gap:6,justifyContent:'center'},
  prizeChip:      {borderWidth:1,borderRadius:BorderRadius.pill,paddingHorizontal:8,paddingVertical:3},
  prizeText:      {fontSize:11,fontWeight:FontWeight.bold},
  resultBadge:    {borderWidth:2,borderRadius:BorderRadius.md,padding:Spacing.md,alignItems:'center',width:'100%'},
  resultText:     {fontWeight:FontWeight.bold,fontSize:FontSize.md,textAlign:'center'},
  coinWrap:       {alignSelf:'center',width:80,height:80,borderRadius:40,backgroundColor:Colors.surface,borderWidth:3,borderColor:Colors.gold,alignItems:'center',justifyContent:'center'},
  flipChoices:    {flexDirection:'row',gap:Spacing.md},
  flipChoice:     {flex:1,alignItems:'center',paddingVertical:Spacing.md,borderRadius:BorderRadius.lg,backgroundColor:Colors.surfaceElevated,borderWidth:2,borderColor:Colors.cardBorder,gap:4},
  flipChoiceActive:{borderColor:Colors.gold,backgroundColor:Colors.gold+'20'},
  flipLabel:      {color:Colors.textPrimary,fontSize:FontSize.xs,fontWeight:FontWeight.bold},
  reelsRow:       {flexDirection:'row',gap:Spacing.md,alignItems:'center',justifyContent:'center',backgroundColor:Colors.surface,borderRadius:BorderRadius.lg,padding:Spacing.md,borderWidth:2,borderColor:Colors.gold},
  reelCell:       {width:72,height:72,backgroundColor:Colors.bgSecondary,borderRadius:BorderRadius.md,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:Colors.cardBorder},
});

// ─── MAIN STYLES ───
const styles = StyleSheet.create({
  container:    {flex:1,backgroundColor:'#000'},
  bgOverlay:    {backgroundColor:'rgba(0,0,0,0.38)'},
  rainParticle: {position:'absolute',zIndex:200},
  rainIcon:     {fontSize:26,textShadowOffset:{width:0,height:0},textShadowRadius:8},
  floatReaction:{position:'absolute',zIndex:999},
  // Top Bar
  topBar:       {flexDirection:'row',justifyContent:'space-between',padding:Spacing.sm,gap:Spacing.xs},
  hostInfo:     {flexDirection:'row',alignItems:'center',gap:Spacing.xs,flex:1},
  hostAv:       {width:42,height:42,borderRadius:21,borderWidth:2,borderColor:Colors.primary},
  hostNameRow:  {flexDirection:'row',alignItems:'center',gap:4},
  hostName:     {color:'#FFF',fontSize:FontSize.xs,fontWeight:FontWeight.bold,maxWidth:80},
  vipBadge:     {backgroundColor:Colors.gold+'30',borderRadius:4,paddingHorizontal:4,paddingVertical:1},
  vipBadgeText: {color:Colors.gold,fontSize:8,fontWeight:FontWeight.black},
  pkTag:        {backgroundColor:Colors.live,borderRadius:4,paddingHorizontal:4,paddingVertical:1},
  pkTagText:    {color:'#FFF',fontSize:8,fontWeight:FontWeight.black},
  roomTitle:    {color:'rgba(255,255,255,0.65)',fontSize:9},
  followBtn:    {backgroundColor:Colors.primary,paddingHorizontal:Spacing.sm,paddingVertical:4,borderRadius:BorderRadius.pill},
  followBtnActive:{backgroundColor:'rgba(255,255,255,0.15)',borderWidth:1,borderColor:'rgba(255,255,255,0.4)'},
  followBtnText:{color:'#FFF',fontSize:9,fontWeight:FontWeight.bold},
  topRight:     {flexDirection:'row',alignItems:'center',gap:4},
  viewerBadge:  {flexDirection:'row',alignItems:'center',gap:3,backgroundColor:'rgba(0,0,0,0.5)',paddingHorizontal:7,paddingVertical:3,borderRadius:BorderRadius.pill},
  viewerDot:    {width:5,height:5,borderRadius:3,backgroundColor:Colors.live},
  viewerText:   {color:'#FFF',fontSize:10},
  timerBadge:   {backgroundColor:'rgba(0,0,0,0.5)',paddingHorizontal:7,paddingVertical:3,borderRadius:BorderRadius.pill},
  timerText:    {color:Colors.gold,fontSize:10,fontWeight:FontWeight.bold},
  iconBtn:      {width:28,height:28,borderRadius:14,backgroundColor:'rgba(0,0,0,0.5)',alignItems:'center',justifyContent:'center'},
  // Host Control Bar
  hostControlBar:{flexDirection:'row',backgroundColor:'rgba(0,0,0,0.65)',paddingHorizontal:Spacing.sm,paddingVertical:5,gap:4,borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,0.08)'},
  hostCtrlBtn:  {alignItems:'center',paddingHorizontal:8,paddingVertical:4,borderRadius:BorderRadius.sm,backgroundColor:'rgba(255,255,255,0.1)',gap:2,minWidth:42},
  hostCtrlBtnOff:{backgroundColor:Colors.error+'20'},
  hostCtrlLabel:{color:'rgba(255,255,255,0.75)',fontSize:8,fontWeight:FontWeight.medium},
  // Beauty Panel
  beautyPanel:  {backgroundColor:'rgba(10,0,20,0.97)',padding:Spacing.sm,borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,0.1)'},
  beautyPanelHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8},
  beautyPanelTitle:{color:Colors.textPrimary,fontSize:FontSize.sm,fontWeight:FontWeight.bold},
  filterChip:   {alignItems:'center',gap:3,paddingHorizontal:10,paddingVertical:6,borderRadius:BorderRadius.md,backgroundColor:'rgba(255,255,255,0.08)',borderWidth:1,borderColor:'rgba(255,255,255,0.12)'},
  filterChipActive:{borderColor:Colors.primary,backgroundColor:Colors.primary+'20'},
  filterChipLabel:{color:'rgba(255,255,255,0.7)',fontSize:9},
  beautySliders:{gap:6,marginBottom:8},
  sliderRow:    {flexDirection:'row',alignItems:'center',gap:8},
  sliderLabel:  {color:'rgba(255,255,255,0.6)',fontSize:9,width:44},
  sliderTrack:  {flex:1,height:6,backgroundColor:'rgba(255,255,255,0.1)',borderRadius:3,overflow:'hidden'},
  sliderFill:   {height:'100%',borderRadius:3},
  sliderVal:    {color:'rgba(255,255,255,0.6)',fontSize:9,width:26,textAlign:'right'},
  beautyToggles:{flexDirection:'row',gap:6},
  beautyToggle: {flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4,paddingVertical:6,borderRadius:BorderRadius.md,backgroundColor:'rgba(255,255,255,0.08)',borderWidth:1,borderColor:'rgba(255,255,255,0.12)'},
  beautyToggleActive:{backgroundColor:Colors.primary+'20',borderColor:Colors.primary},
  beautyToggleLabel:{color:'rgba(255,255,255,0.7)',fontSize:9},
  // Sound Panel
  soundPanel:   {backgroundColor:'rgba(10,0,20,0.97)',padding:Spacing.sm,borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,0.1)'},
  soundSectionLabel:{color:'rgba(255,255,255,0.5)',fontSize:9,fontWeight:FontWeight.semibold,marginBottom:6,textTransform:'uppercase',letterSpacing:0.8},
  soundGrid:    {flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:8},
  soundBtn:     {width:(width-Spacing.sm*2-6*3)/4,alignItems:'center',paddingVertical:6,borderRadius:BorderRadius.md,backgroundColor:'rgba(255,255,255,0.08)',gap:3,borderWidth:1,borderColor:'rgba(255,255,255,0.08)',position:'relative'},
  soundBtnActive:{backgroundColor:Colors.primary+'30',borderColor:Colors.primary},
  soundBtnLabel:{color:'rgba(255,255,255,0.7)',fontSize:8,textAlign:'center'},
  soundPlayingDot:{position:'absolute',top:4,right:4,width:6,height:6,borderRadius:3,backgroundColor:Colors.success},
  voiceBtn:     {alignItems:'center',paddingHorizontal:10,paddingVertical:6,borderRadius:BorderRadius.md,backgroundColor:'rgba(255,255,255,0.08)',gap:2,borderWidth:1,borderColor:'rgba(255,255,255,0.08)'},
  voiceBtnActive:{backgroundColor:Colors.secondary+'20',borderColor:Colors.secondary},
  voiceBtnLabel:{color:'rgba(255,255,255,0.7)',fontSize:8},
  volumeRow:    {flexDirection:'row',alignItems:'center',gap:8,marginTop:8},
  volumeTrack:  {flex:1,height:5,backgroundColor:'rgba(255,255,255,0.1)',borderRadius:3,overflow:'hidden'},
  volumeFill:   {height:'100%',borderRadius:3,backgroundColor:Colors.secondary},
  volumeLabel:  {color:'rgba(255,255,255,0.6)',fontSize:9,width:28,textAlign:'right'},
  // Camera Panel
  cameraPanel:  {backgroundColor:'rgba(10,0,20,0.97)',padding:Spacing.sm,borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,0.1)'},
  camEffectGrid:{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:8},
  camEffectBtn: {width:(width-Spacing.sm*2-6*2)/3,alignItems:'center',paddingVertical:8,borderRadius:BorderRadius.md,backgroundColor:'rgba(255,255,255,0.08)',gap:3,borderWidth:1,borderColor:'rgba(255,255,255,0.08)'},
  camEffectBtnActive:{backgroundColor:Colors.diamond+'20',borderColor:Colors.diamond},
  camEffectLabel:{color:'rgba(255,255,255,0.7)',fontSize:9},
  zoomRow:      {flexDirection:'row',gap:8},
  zoomBtn:      {flex:1,alignItems:'center',paddingVertical:8,borderRadius:BorderRadius.md,backgroundColor:'rgba(255,255,255,0.08)',borderWidth:1,borderColor:'rgba(255,255,255,0.08)'},
  zoomBtnActive:{backgroundColor:Colors.diamond+'20',borderColor:Colors.diamond},
  zoomLabel:    {color:'rgba(255,255,255,0.7)',fontSize:FontSize.sm,fontWeight:FontWeight.bold},
  // More Panel
  morePanel:    {backgroundColor:'rgba(10,0,20,0.97)',padding:Spacing.sm,borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,0.1)'},
  morePanelGrid:{flexDirection:'row',flexWrap:'wrap',gap:6},
  morePanelBtn: {width:(width-Spacing.sm*2-6*3)/4,alignItems:'center',paddingVertical:8,borderRadius:BorderRadius.md,backgroundColor:'rgba(255,255,255,0.08)',gap:3},
  morePanelLabel:{color:'rgba(255,255,255,0.7)',fontSize:8,textAlign:'center'},
  // Earnings bar
  earningsBar:  {flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'rgba(0,0,0,0.55)',borderRadius:BorderRadius.pill,paddingHorizontal:Spacing.sm,paddingVertical:4,marginHorizontal:Spacing.md,marginBottom:4,borderWidth:1,borderColor:Colors.gold+'40'},
  earningBarIcon:{fontSize:12},
  earningBarTrack:{flex:1,height:5,backgroundColor:'rgba(255,255,255,0.15)',borderRadius:3,overflow:'hidden'},
  earningBarFill:{height:'100%',backgroundColor:Colors.gold,borderRadius:3},
  earningBarText:{color:Colors.gold,fontSize:10,fontWeight:FontWeight.bold},
  announcement: {flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'rgba(255,215,0,0.12)',borderWidth:1,borderColor:'rgba(255,215,0,0.28)',marginHorizontal:Spacing.md,borderRadius:BorderRadius.sm,paddingHorizontal:Spacing.sm,paddingVertical:4,marginBottom:4},
  announcementText:{flex:1,color:Colors.gold,fontSize:10},
  // PK Bar
  pkBar:        {flexDirection:'row',marginHorizontal:Spacing.sm,borderRadius:BorderRadius.lg,padding:Spacing.sm,backgroundColor:'rgba(0,0,0,0.7)',marginBottom:Spacing.xs,borderWidth:1,borderColor:'rgba(233,30,140,0.35)',shadowColor:Colors.live,shadowOffset:{width:0,height:0},shadowOpacity:0.4,shadowRadius:8,elevation:8},
  pkSide:       {width:80,alignItems:'flex-start',gap:2,position:'relative'},
  pkAv:         {width:36,height:36,borderRadius:18,borderWidth:2},
  pkLeadBadge:  {position:'absolute',top:-6,left:-4,backgroundColor:Colors.gold+'30',borderRadius:8,paddingHorizontal:3,paddingVertical:1},
  pkLeadText:   {fontSize:9},
  pkName:       {color:'rgba(255,255,255,0.85)',fontSize:9,fontWeight:FontWeight.semibold},
  pkScore:      {color:Colors.gold,fontSize:FontSize.sm,fontWeight:FontWeight.black},
  pkCenter:     {flex:1,alignItems:'center',gap:3},
  pkTimerRow:   {flexDirection:'row',alignItems:'center',gap:5},
  pkLiveDot:    {width:6,height:6,borderRadius:3,backgroundColor:Colors.live},
  pkTimerText:  {color:Colors.live,fontSize:FontSize.sm,fontWeight:FontWeight.black},
  pkFireText:   {fontSize:14},
  pkBarOuter:   {width:'100%',height:16,flexDirection:'row',borderRadius:8,overflow:'hidden',backgroundColor:'rgba(0,0,0,0.35)'},
  pkBarFillLeft:{height:'100%',backgroundColor:Colors.primary,shadowColor:Colors.primary,elevation:3},
  pkBarFillRight:{height:'100%',backgroundColor:Colors.secondary,shadowColor:Colors.secondary,elevation:3},
  pkVsCircle:   {position:'absolute',alignSelf:'center',left:'50%',transform:[{translateX:-11}],backgroundColor:'#000',borderRadius:11,width:22,height:22,alignItems:'center',justifyContent:'center',zIndex:10,borderWidth:1.5,borderColor:Colors.live},
  pkVsText:     {color:Colors.live,fontSize:7,fontWeight:FontWeight.black},
  pkRainLabel:  {backgroundColor:Colors.live+'25',borderRadius:BorderRadius.pill,paddingHorizontal:8,paddingVertical:2},
  pkRainLabelText:{color:Colors.live,fontSize:9,fontWeight:FontWeight.black,letterSpacing:1},
  pkStatusText: {color:'rgba(255,255,255,0.6)',fontSize:8},
  // Party Seats
  seatsRow:     {flexDirection:'row',paddingHorizontal:Spacing.sm,gap:6,marginBottom:6},
  seat:         {alignItems:'center'},
  seatFilled:   {position:'relative'},
  seatRing:     {borderWidth:2,borderColor:Colors.primary,borderRadius:24,padding:1},
  seatAv:       {width:42,height:42,borderRadius:21},
  coHostBadge:  {position:'absolute',top:-6,left:'50%',transform:[{translateX:-10}],backgroundColor:Colors.gold,borderRadius:4,paddingHorizontal:4,paddingVertical:1},
  coHostText:   {color:'#000',fontSize:7,fontWeight:FontWeight.black},
  micBadge:     {position:'absolute',bottom:0,right:0,width:15,height:15,borderRadius:8,alignItems:'center',justifyContent:'center',borderWidth:1.5,borderColor:'rgba(0,0,0,0.5)'},
  micOn:        {backgroundColor:Colors.success},
  micMuted:     {backgroundColor:Colors.error},
  emptySeat:    {width:46,height:46,borderRadius:23,borderWidth:1.5,borderColor:Colors.cardBorder,borderStyle:'dashed',alignItems:'center',justifyContent:'center',backgroundColor:'rgba(0,0,0,0.3)',gap:0},
  emptyText:    {color:Colors.textMuted,fontSize:8},
  // Bottom / Chat
  bottomArea:   {flex:1,justifyContent:'flex-end'},
  tabRow:       {flexDirection:'row',paddingHorizontal:Spacing.sm,gap:5,marginBottom:5},
  tabBtn:       {paddingHorizontal:Spacing.sm,paddingVertical:4,borderRadius:BorderRadius.pill,backgroundColor:'rgba(0,0,0,0.45)'},
  tabBtnActive: {backgroundColor:Colors.primary},
  tabText:      {color:'rgba(255,255,255,0.55)',fontSize:11,fontWeight:FontWeight.medium},
  tabTextActive:{color:'#FFF',fontWeight:FontWeight.bold},
  chatList:     {maxHeight:185,paddingHorizontal:Spacing.sm},
  noMsgsText:   {color:'rgba(255,255,255,0.4)',fontSize:11,textAlign:'center',paddingVertical:20},
  systemMsg:    {marginBottom:4},
  systemMsgText:{color:'rgba(255,255,255,0.5)',fontSize:10,backgroundColor:'rgba(0,0,0,0.3)',borderRadius:8,paddingHorizontal:8,paddingVertical:2,alignSelf:'flex-start'},
  giftMsg:      {flexDirection:'row',alignItems:'center',marginBottom:5,gap:5},
  msgAv:        {width:20,height:20,borderRadius:10},
  giftMsgBubble:{flexDirection:'row',alignItems:'center',backgroundColor:'rgba(233,30,140,0.18)',borderRadius:8,paddingHorizontal:8,paddingVertical:3,gap:2},
  giftMsgUser:  {color:Colors.primary,fontSize:11,fontWeight:FontWeight.bold},
  giftMsgText:  {color:'rgba(255,255,255,0.7)',fontSize:11},
  giftMsgName:  {color:Colors.gold,fontSize:11,fontWeight:FontWeight.semibold},
  giftPriceTag: {backgroundColor:'rgba(0,212,255,0.2)',borderRadius:4,paddingHorizontal:4,paddingVertical:1},
  giftPriceTagText:{color:Colors.diamond,fontSize:9,fontWeight:FontWeight.bold},
  chatMsg:      {flexDirection:'row',alignItems:'flex-start',marginBottom:4,gap:5},
  chatBubble:   {flexDirection:'row',flexWrap:'wrap',alignItems:'center',backgroundColor:'rgba(0,0,0,0.38)',borderRadius:8,paddingHorizontal:8,paddingVertical:3,gap:2,flex:1},
  vipMsgTag:    {borderRadius:3,paddingHorizontal:3,paddingVertical:0,borderWidth:0.5},
  vipMsgText:   {fontSize:8,fontWeight:FontWeight.black},
  msgUser:      {color:Colors.primary,fontSize:11,fontWeight:FontWeight.bold},
  msgText:      {color:'rgba(255,255,255,0.88)',fontSize:11},
  giftsTabWrap: {paddingHorizontal:Spacing.sm,maxHeight:230},
  giftTargetRow:{flexDirection:'row',alignItems:'center',gap:Spacing.sm,marginBottom:Spacing.xs},
  giftTargetLabel:{color:'rgba(255,255,255,0.6)',fontSize:10},
  giftTargetBtn:{paddingHorizontal:Spacing.sm,paddingVertical:3,borderRadius:BorderRadius.pill,backgroundColor:'rgba(0,0,0,0.4)',borderWidth:1,borderColor:'rgba(255,255,255,0.2)'},
  giftTargetBtnActive:{backgroundColor:Colors.primary,borderColor:Colors.primary},
  giftTargetText:{color:'rgba(255,255,255,0.6)',fontSize:10},
  giftTargetTextActive:{color:'#FFF',fontWeight:FontWeight.bold},
  giftGrid:     {flexDirection:'row',flexWrap:'wrap',gap:6},
  giftCell:     {width:(width-Spacing.sm*2-6*4)/5,alignItems:'center',backgroundColor:'rgba(0,0,0,0.5)',borderRadius:BorderRadius.sm,padding:6,gap:2,borderWidth:1,borderColor:'rgba(255,255,255,0.1)'},
  giftCellIcon: {fontSize:24},
  giftCellName: {color:'rgba(255,255,255,0.7)',fontSize:8,textAlign:'center'},
  giftCellPrice:{backgroundColor:'rgba(0,212,255,0.2)',borderRadius:3,paddingHorizontal:4,paddingVertical:1},
  giftCellPriceText:{color:Colors.diamond,fontSize:8,fontWeight:FontWeight.bold},
  rainDemoBtn:  {marginTop:Spacing.xs,alignItems:'center',paddingVertical:6,backgroundColor:Colors.live+'20',borderRadius:BorderRadius.pill,borderWidth:1,borderColor:Colors.live+'50'},
  rainDemoBtnText:{color:Colors.live,fontSize:FontSize.xs,fontWeight:FontWeight.bold},
  rankList:     {maxHeight:185,paddingHorizontal:Spacing.sm},
  rankItem:     {flexDirection:'row',alignItems:'center',paddingVertical:5,borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,0.07)',gap:8},
  rankPos:      {width:26,fontSize:14,textAlign:'center'},
  rankAv:       {width:28,height:28,borderRadius:14,borderWidth:1.5,borderColor:Colors.primary},
  rankName:     {flex:1,color:'rgba(255,255,255,0.85)',fontSize:11,fontWeight:FontWeight.semibold},
  rankDiamonds: {color:Colors.diamond,fontSize:11,fontWeight:FontWeight.bold},
  stickerStrip: {maxHeight:52,backgroundColor:'rgba(0,0,0,0.55)',borderTopWidth:1,borderTopColor:'rgba(255,255,255,0.1)'},
  stickerBtn:   {width:44,height:44,alignItems:'center',justifyContent:'center'},
  inputRow:     {flexDirection:'row',alignItems:'center',paddingHorizontal:Spacing.sm,paddingBottom:Spacing.md,paddingTop:6,gap:6},
  inputBtn:     {width:38,height:38,alignItems:'center',justifyContent:'center'},
  chatInput:    {flex:1,backgroundColor:'rgba(255,255,255,0.12)',borderRadius:BorderRadius.pill,paddingHorizontal:Spacing.md,paddingVertical:8,color:'#FFF',fontSize:FontSize.sm},
  sendBtn:      {width:36,height:36,borderRadius:18,backgroundColor:Colors.primary,alignItems:'center',justifyContent:'center'},
  sendBtnOff:   {backgroundColor:'rgba(255,255,255,0.15)'},
  // Games Panel
  gamesPanel:   {backgroundColor:'rgba(10,0,20,0.97)',padding:Spacing.sm,borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,0.1)'},
  livegameGrid: {flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:8},
  livegameBtn:  {width:(width-Spacing.sm*2-6*2)/3,alignItems:'center',paddingVertical:8,borderRadius:BorderRadius.md,backgroundColor:'rgba(255,255,255,0.06)',borderWidth:1,gap:4},
  livegameIcon: {width:48,height:48,borderRadius:24,alignItems:'center',justifyContent:'center'},
  livegameName: {fontSize:10,fontWeight:FontWeight.bold,textAlign:'center'},
  livegameDesc: {color:'rgba(255,255,255,0.5)',fontSize:8,textAlign:'center'},
  allGamesBtn:  {alignItems:'center',paddingVertical:7,backgroundColor:Colors.primary+'25',borderRadius:BorderRadius.pill,borderWidth:1,borderColor:Colors.primary+'60'},
  allGamesBtnText:{color:Colors.primary,fontSize:FontSize.xs,fontWeight:FontWeight.bold},
  // Modals
  modalBg:      {flex:1,backgroundColor:'rgba(0,0,0,0.75)',justifyContent:'flex-end'},
  gameCard:     {backgroundColor:Colors.surface,borderTopLeftRadius:BorderRadius.xl,borderTopRightRadius:BorderRadius.xl,padding:Spacing.lg,gap:Spacing.sm,minHeight:320,borderTopWidth:1,borderColor:Colors.primary+'40',maxHeight:height*0.8},
  gameTab:      {flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:Spacing.sm,paddingVertical:6,borderRadius:BorderRadius.pill,backgroundColor:Colors.surfaceElevated,borderWidth:1,borderColor:Colors.cardBorder},
  gameTabActive:{borderColor:'transparent'},
  gameTabText:  {color:Colors.textSecondary,fontSize:FontSize.xs,fontWeight:FontWeight.semibold},
  moreGamesLink:{alignItems:'center',paddingVertical:Spacing.sm,borderTopWidth:1,borderTopColor:Colors.cardBorder,marginTop:Spacing.xs},
  moreGamesLinkText:{color:Colors.primary,fontSize:FontSize.sm,fontWeight:FontWeight.bold},
  multiCard:    {backgroundColor:Colors.surface,borderTopLeftRadius:BorderRadius.xl,borderTopRightRadius:BorderRadius.xl,padding:Spacing.lg},
  multiHeader:  {flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:Spacing.md},
  multiTitle:   {color:Colors.textPrimary,fontSize:FontSize.lg,fontWeight:FontWeight.bold},
  multiGrid:    {flexDirection:'row',flexWrap:'wrap',gap:Spacing.sm},
  multiCell:    {width:(width-Spacing.lg*2-Spacing.sm)/2,height:130,borderRadius:BorderRadius.md,overflow:'hidden',position:'relative',backgroundColor:Colors.surface},
  multiOverlay: {...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,0.42)',padding:Spacing.sm,justifyContent:'space-between'},
  multiLiveDot: {backgroundColor:Colors.live,borderRadius:4,paddingHorizontal:6,paddingVertical:1,alignSelf:'flex-start'},
  multiLiveText:{color:'#FFF',fontSize:8,fontWeight:FontWeight.black},
  multiHost:    {color:'#FFF',fontSize:11,fontWeight:FontWeight.bold},
  multiViewers: {color:'rgba(255,255,255,0.75)',fontSize:9},
  // Treasure
  treasureWrap:       {position:'absolute',right:12,top:height*0.28,alignItems:'center',zIndex:500},
  treasureBtn:        {width:58,height:58,borderRadius:29,backgroundColor:'rgba(0,0,0,0.75)',alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:Colors.gold,shadowColor:Colors.gold,shadowOffset:{width:0,height:0},shadowOpacity:0.9,shadowRadius:12,elevation:10,position:'relative'},
  treasureBadge:      {position:'absolute',top:-4,right:-4,backgroundColor:Colors.success,borderRadius:8,paddingHorizontal:5,paddingVertical:2},
  treasureBadgeText:  {color:'#FFF',fontSize:7,fontWeight:FontWeight.black},
  treasureLabel:      {color:Colors.gold,fontSize:9,fontWeight:FontWeight.bold,marginTop:3},
  treasureAnimOverlay:{...StyleSheet.absoluteFillObject,alignItems:'center',justifyContent:'center',zIndex:600,backgroundColor:'rgba(0,0,0,0.5)'},
  treasureAnimBox:    {alignItems:'center',justifyContent:'center'},
  treasureCoinsWrap:  {alignItems:'center',gap:6,marginTop:16},
  treasureCoinsBig:   {fontSize:32,fontWeight:FontWeight.black,color:Colors.gold},
  treasureCoinsLabel: {color:Colors.gold,fontSize:FontSize.md,fontWeight:FontWeight.bold},
  // Earnings overlay
  earningsOverlay:    {...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,0.78)',zIndex:800,alignItems:'center',justifyContent:'center',padding:Spacing.md},
  earningsCard:       {backgroundColor:Colors.surface,borderRadius:BorderRadius.xl,padding:Spacing.lg,width:'100%',gap:Spacing.sm,borderWidth:1,borderColor:Colors.gold+'40'},
  earningsCardHeader: {flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:Spacing.xs},
  earningsCardTitle:  {color:Colors.textPrimary,fontSize:FontSize.lg,fontWeight:FontWeight.bold},
  earningsClose:      {width:36,height:36,borderRadius:18,backgroundColor:Colors.bgSecondary,alignItems:'center',justifyContent:'center'},
  earningsRow:        {flexDirection:'row',alignItems:'center',gap:Spacing.md,backgroundColor:Colors.bgSecondary,borderRadius:BorderRadius.md,padding:Spacing.sm},
  earningsRowLabel:   {color:Colors.textMuted,fontSize:FontSize.xs},
  earningsRowVal:     {color:Colors.textPrimary,fontSize:FontSize.lg,fontWeight:FontWeight.bold},
  earningsDivider:    {height:1,backgroundColor:Colors.cardBorder},
  earningsTotalRow:   {flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  earningsTotalLabel: {color:Colors.textPrimary,fontSize:FontSize.md,fontWeight:FontWeight.bold},
  earningsTotalVal:   {color:Colors.gold,fontSize:FontSize.xxl,fontWeight:FontWeight.black},
  earningsConvRate:   {color:Colors.textMuted,fontSize:FontSize.xs,textAlign:'center'},
  earningsCardBtns:   {flexDirection:'row',gap:Spacing.sm},
  earningsClaimBtn:   {flex:1,backgroundColor:Colors.primary,borderRadius:BorderRadius.pill,paddingVertical:Spacing.md,alignItems:'center'},
  earningsClaimBtnText:{color:'#FFF',fontSize:FontSize.sm,fontWeight:FontWeight.bold},
  earningsViewBtn:    {flex:1,borderWidth:1,borderColor:Colors.cardBorder,borderRadius:BorderRadius.pill,paddingVertical:Spacing.md,alignItems:'center'},
  earningsViewBtnText:{color:Colors.textSecondary,fontSize:FontSize.sm,fontWeight:FontWeight.semibold},
});
