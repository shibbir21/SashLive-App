// SashLive — Full Games Hub: ALL games including Ocean Hunt, Fruit Roulette, Golden Wheel, Lucky Number, Greedy + originals
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  Animated, Dimensions, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { useAlert } from '@/template';

const { width } = Dimensions.get('window');

// ── Card System ──
type Suit = '♠' | '♥' | '♦' | '♣';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
interface Card { rank: Rank; suit: Suit; value: number }
const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const RANK_VALUES: Record<Rank, number> = { 'A':14,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13 };
function createDeck(): Card[] {
  const d: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ rank:r, suit:s, value:RANK_VALUES[r] });
  return d.sort(() => Math.random() - 0.5);
}
function CardView({ card, hidden=false }: { card:Card; hidden?:boolean }) {
  const red = card.suit==='♥'||card.suit==='♦';
  return (
    <View style={[gS.card, hidden && gS.cardHidden]}>
      {hidden ? <Text style={gS.cardBack}>🂠</Text> : (
        <><Text style={[gS.cardRank,{color:red?'#DC143C':'#1a1a1a'}]}>{card.rank}</Text>
        <Text style={[gS.cardSuit,{color:red?'#DC143C':'#1a1a1a'}]}>{card.suit}</Text></>
      )}
    </View>
  );
}

// ── OCEAN HUNT ──
const OCEAN_GRID = 20;
const FISH_TYPES = [
  { emoji: '🐟', name: 'Fish',     coins: 5,   prob: 40 },
  { emoji: '🐠', name: 'Clownfish',coins: 10,  prob: 25 },
  { emoji: '🦈', name: 'Shark',    coins: 50,  prob: 8  },
  { emoji: '🐡', name: 'Puffer',   coins: 15,  prob: 15 },
  { emoji: '🐬', name: 'Dolphin',  coins: 30,  prob: 7  },
  { emoji: '🦑', name: 'Squid',    coins: 20,  prob: 5  },
];
function OceanHunt({ onWin, bet }: { onWin:(a:number)=>void; bet:number }) {
  const [cells, setCells] = useState<Array<{type:'fish'|'empty'|'bomb';fish?:typeof FISH_TYPES[0];revealed:boolean}>>(() => {
    return Array.from({length:OCEAN_GRID}, (_, i) => {
      const r = Math.random()*100;
      if (r < 5) return {type:'bomb',revealed:false};
      if (r < 35) {
        const ft = FISH_TYPES[Math.floor(Math.random()*FISH_TYPES.length)];
        return {type:'fish',fish:ft,revealed:false};
      }
      return {type:'empty',revealed:false};
    });
  });
  const [caught, setCaught] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [totalWon, setTotalWon] = useState(0);
  const bounceAnims = useRef(Array.from({length:OCEAN_GRID}, () => new Animated.Value(1))).current;

  const tap = (i:number) => {
    if (cells[i].revealed||gameOver) return;
    const c = cells[i];
    const newCells = [...cells];
    newCells[i] = {...c, revealed:true};
    setCells(newCells);
    Animated.sequence([
      Animated.timing(bounceAnims[i], {toValue:1.3,duration:100,useNativeDriver:true}),
      Animated.spring(bounceAnims[i], {toValue:1,useNativeDriver:true,tension:200}),
    ]).start();
    if (c.type==='bomb') { setGameOver(true); return; }
    if (c.type==='fish' && c.fish) {
      const w = c.fish.coins;
      setCaught(n=>n+1);
      setTotalWon(t=>t+w);
      onWin(w);
    }
  };

  const cellContent = (c: typeof cells[0], i:number) => {
    if (!c.revealed) return <Text style={{fontSize:22}}>🌊</Text>;
    if (c.type==='bomb') return <Text style={{fontSize:22}}>💣</Text>;
    if (c.type==='fish') return <Text style={{fontSize:22}}>{c.fish?.emoji}</Text>;
    return <Text style={{fontSize:16,color:Colors.textMuted}}>·</Text>;
  };

  return (
    <View style={gS.oceanContainer}>
      <View style={gS.oceanHeader}>
        <Text style={gS.oceanStat}>🎣 Caught: {caught}</Text>
        <Text style={gS.oceanStat}>🪙 Won: +{totalWon}</Text>
        {gameOver && <Text style={[gS.oceanStat,{color:Colors.error}]}>💣 Bomb!</Text>}
      </View>
      <View style={gS.oceanGrid}>
        {cells.map((c,i) => (
          <Animated.View key={i} style={{transform:[{scale:bounceAnims[i]}]}}>
            <Pressable
              style={[gS.oceanCell,
                c.revealed&&c.type==='bomb'&&{backgroundColor:Colors.error+'30',borderColor:Colors.error},
                c.revealed&&c.type==='fish'&&{backgroundColor:Colors.success+'20',borderColor:Colors.success},
                c.revealed&&c.type==='empty'&&{backgroundColor:Colors.surfaceElevated},
                gameOver&&!c.revealed&&{opacity:0.5},
              ]}
              onPress={() => tap(i)}
              disabled={c.revealed||gameOver}
            >
              {cellContent(c,i)}
            </Pressable>
          </Animated.View>
        ))}
      </View>
      <View style={gS.fishLegend}>
        {FISH_TYPES.slice(0,4).map(f => (
          <View key={f.emoji} style={gS.fishLegendItem}>
            <Text style={{fontSize:14}}>{f.emoji}</Text>
            <Text style={gS.fishCoins}>+{f.coins}🪙</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── FRUIT ROULETTE ──
const FRUITS = [
  {emoji:'🍒',name:'Cherry',  mult:2,  color:'#DC143C'},
  {emoji:'🍋',name:'Lemon',   mult:1,  color:'#FFD700'},
  {emoji:'🍊',name:'Orange',  mult:2,  color:'#FF8C00'},
  {emoji:'🍇',name:'Grape',   mult:3,  color:'#9B30FF'},
  {emoji:'🍓',name:'Berry',   mult:4,  color:'#FF4488'},
  {emoji:'🍉',name:'Melon',   mult:5,  color:'#00A000'},
  {emoji:'🍑',name:'Peach',   mult:1,  color:'#FFAA55'},
  {emoji:'💎',name:'Diamond', mult:10, color:'#00DFFF'},
];
function FruitRoulette({ onWin, bet }: { onWin:(a:number)=>void; bet:number }) {
  const [reels, setReels] = useState([FRUITS[0],FRUITS[0],FRUITS[0]]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState('');
  const [multiplier, setMultiplier] = useState(0);
  const reelAnims = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  const bounceAnim = useRef(new Animated.Value(1)).current;

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setResult('');
    setMultiplier(0);
    reelAnims.forEach((a,i) => {
      a.setValue(0);
      Animated.timing(a, { toValue:1, duration:900+i*300, useNativeDriver:true }).start();
    });
    setTimeout(() => {
      const newReels = Array.from({length:3}, () => FRUITS[Math.floor(Math.random()*FRUITS.length)]);
      setReels(newReels);
      const match3 = newReels[0].name===newReels[1].name&&newReels[1].name===newReels[2].name;
      const match2 = newReels[0].name===newReels[1].name||newReels[1].name===newReels[2].name||newReels[0].name===newReels[2].name;
      if (match3) {
        const w = bet*newReels[0].mult*3;
        setResult(`🎉 3x ${newReels[0].emoji}! +${w}💎`);
        setMultiplier(newReels[0].mult*3);
        onWin(w);
        Animated.sequence([Animated.timing(bounceAnim,{toValue:1.2,duration:200,useNativeDriver:true}),Animated.spring(bounceAnim,{toValue:1,useNativeDriver:true})]).start();
      } else if (match2) {
        const matchFruit = newReels[0].name===newReels[1].name?newReels[0]:newReels[1].name===newReels[2].name?newReels[1]:newReels[0];
        const w = bet*matchFruit.mult;
        setResult(`✨ 2x ${matchFruit.emoji}! +${w}💎`);
        setMultiplier(matchFruit.mult);
        onWin(w);
      } else {
        setResult('No match. Try again! 🍀');
      }
      setSpinning(false);
    }, 1800);
  };

  return (
    <View style={gS.fruitContainer}>
      <Animated.View style={[gS.fruitMachine, {transform:[{scale:bounceAnim}]}]}>
        <View style={gS.fruitReels}>
          {reels.map((fruit,i) => {
            const rot = reelAnims[i].interpolate({inputRange:[0,1],outputRange:['0deg','720deg']});
            return (
              <Animated.View key={i} style={[gS.fruitReel, spinning&&{transform:[{rotate:rot}]}]}>
                <Text style={{fontSize:44}}>{fruit.emoji}</Text>
              </Animated.View>
            );
          })}
        </View>
        <View style={gS.fruitPayline} />
      </Animated.View>
      {result!==''&&(
        <View style={[gS.resultBadge,{borderColor:multiplier>0?Colors.gold:Colors.textMuted,backgroundColor:multiplier>0?Colors.gold+'20':Colors.surface}]}>
          <Text style={[gS.resultText,{color:multiplier>0?Colors.gold:Colors.textMuted}]}>{result}</Text>
        </View>
      )}
      <View style={gS.fruitLegend}>
        {FRUITS.map(f=>(
          <View key={f.emoji} style={[gS.fruitLegendItem,{borderColor:f.color+'40'}]}>
            <Text style={{fontSize:14}}>{f.emoji}</Text>
            <Text style={[gS.fruitMult,{color:f.color}]}>{f.mult}x</Text>
          </View>
        ))}
      </View>
      <Pressable style={[gS.spinBtn,spinning&&{opacity:0.6}]} onPress={spin} disabled={spinning}>
        <Text style={gS.spinBtnText}>{spinning?'🎰 Spinning...':` 🎰 Spin (${bet}💎)`}</Text>
      </Pressable>
    </View>
  );
}

// ── GOLDEN WHEEL ──
const WHEEL_PRIZES = [
  {label:'💰 100', value:100, color:'#FFD700', prob:5 },
  {label:'🌹 10',  value:10,  color:'#FF2E8B', prob:30},
  {label:'💣 0',   value:0,   color:'#FF4444', prob:20},
  {label:'⭐ 30',  value:30,  color:'#FFCC00', prob:20},
  {label:'👑 500', value:500, color:'#9B30FF', prob:2 },
  {label:'🚀 200', value:200, color:'#FF8C00', prob:5 },
  {label:'🎁 50',  value:50,  color:'#00E676', prob:10},
  {label:'💎 1000',value:1000,color:'#00DFFF', prob:2 },
  {label:'🍀 80',  value:80,  color:'#00A000', prob:6 },
];
function GoldenWheel({ onWin, bet }: { onWin:(a:number)=>void; bet:number }) {
  const [result, setResult] = useState<typeof WHEEL_PRIZES[0]|null>(null);
  const [spinning, setSpinning] = useState(false);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const doSpin = () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    glowAnim.setValue(0);
    const total = WHEEL_PRIZES.reduce((s,p)=>s+p.prob,0);
    let rand = Math.random()*total, picked = WHEEL_PRIZES[0];
    for (const p of WHEEL_PRIZES) { rand-=p.prob; if (rand<=0) { picked=p; break; } }
    const pickedIdx = WHEEL_PRIZES.indexOf(picked);
    const segAngle = 360/WHEEL_PRIZES.length;
    const targetAngle = 360*8 + (segAngle*pickedIdx) + segAngle/2;
    spinAnim.setValue(0);
    Animated.timing(spinAnim, { toValue:targetAngle, duration:4000, useNativeDriver:true }).start(() => {
      setSpinning(false);
      setResult(picked);
      if (picked.value>0) {
        onWin(picked.value);
        Animated.loop(Animated.sequence([
          Animated.timing(glowAnim,{toValue:1,duration:400,useNativeDriver:true}),
          Animated.timing(glowAnim,{toValue:0,duration:400,useNativeDriver:true}),
        ]), {iterations:3}).start();
      }
    });
  };

  const rotation = spinAnim.interpolate({inputRange:[0,360],outputRange:['0deg','360deg']});
  const COLORS = WHEEL_PRIZES.map(p=>p.color);

  return (
    <View style={gS.gwContainer}>
      <View style={gS.gwWheelWrap}>
        <Animated.View style={[gS.gwWheel,{transform:[{rotate:rotation}]}]}>
          {WHEEL_PRIZES.map((p,i) => {
            const angle = (360/WHEEL_PRIZES.length)*i;
            return (
              <View key={i} style={[gS.gwSegment,{transform:[{rotate:`${angle}deg`}],backgroundColor:p.color+'25',borderTopColor:p.color}]}>
                <Text style={[gS.gwSegLabel,{transform:[{rotate:`${360/WHEEL_PRIZES.length/2}deg`}]}]}>{p.label.split(' ')[0]}</Text>
              </View>
            );
          })}
          <View style={gS.gwCenter}><Text style={{fontSize:24}}>⭐</Text></View>
        </Animated.View>
        <Animated.View style={[gS.gwPointer,{opacity:glowAnim.interpolate({inputRange:[0,1],outputRange:[1,0.3]})}]}>
          <Text style={{fontSize:22}}>⬇️</Text>
        </Animated.View>
      </View>
      {result&&(
        <View style={[gS.resultBadge,{borderColor:result.color,backgroundColor:result.color+'25'}]}>
          <Text style={[gS.resultText,{color:result.color}]}>
            {result.value>0?`🎉 ${result.label}!`:'💣 Missed! Try again!'}
          </Text>
        </View>
      )}
      <View style={gS.gwPrizeRow}>
        {WHEEL_PRIZES.slice(0,4).map(p=>(
          <View key={p.label} style={[gS.gwPrizeChip,{borderColor:p.color+'50'}]}>
            <Text style={[gS.gwPrizeText,{color:p.color}]}>{p.label}</Text>
          </View>
        ))}
      </View>
      <Pressable style={[gS.spinBtn,{backgroundColor:Colors.gold},spinning&&{opacity:0.6}]} onPress={doSpin} disabled={spinning}>
        <Text style={[gS.spinBtnText,{color:'#000'}]}>{spinning?'🎡 Spinning...':` 🎡 Spin (${bet}💎)`}</Text>
      </Pressable>
    </View>
  );
}

// ── LUCKY NUMBER ──
const LUCKY_COLORS = [{label:'🔴 Red',key:'red'},{label:'⚫ Black',key:'black'},{label:'🟢 Green',key:'green'}];
function LuckyNumber({ onWin, bet }: { onWin:(a:number)=>void; bet:number }) {
  const [chosenNum, setChosenNum] = useState<number|null>(null);
  const [chosenColor, setChosenColor] = useState<string|null>(null);
  const [result, setResult] = useState<number|null>(null);
  const [resultColor, setResultColor] = useState('');
  const [outcome, setOutcome] = useState('');
  const [spinning, setSpinning] = useState(false);
  const ballAnim = useRef(new Animated.Value(0)).current;
  const RED_NUMS = [1,2,3,4,5,6,7,8,9,10,12,14,16,18,20,22,24,26,28,30];

  const play = () => {
    if (!chosenNum&&!chosenColor||spinning) return;
    setSpinning(true); setOutcome('');
    ballAnim.setValue(0);
    Animated.timing(ballAnim,{toValue:1,duration:2000,useNativeDriver:true}).start(() => {
      const num = Math.floor(Math.random()*37);
      const color = num===0?'green':RED_NUMS.includes(num)?'red':'black';
      setResult(num); setResultColor(color);
      let won = false;
      if (chosenNum!==null&&num===chosenNum) { won=true; onWin(bet*35); setOutcome(`🎉 ${num}! Jackpot! +${bet*35}💎`); }
      else if (chosenColor&&color===chosenColor) { won=true; onWin(bet*2); setOutcome(`✨ ${color.toUpperCase()} ${num}! +${bet*2}💎`); }
      else setOutcome(`${num} ${color.toUpperCase()} — No win`);
      setSpinning(false);
    });
  };

  const spin = ballAnim.interpolate({inputRange:[0,1],outputRange:['0deg','1440deg']});
  const colorCode = {red:'#DC143C',black:'#333',green:'#00A000'};

  return (
    <View style={gS.lnContainer}>
      <View style={gS.lnBallWrap}>
        <Animated.View style={[gS.lnBall,result!==null&&{backgroundColor:colorCode[resultColor as keyof typeof colorCode]||'#666'},{transform:[{rotate:spin}]}]}>
          <Text style={gS.lnBallNum}>{result!==null?result:'?'}</Text>
        </Animated.View>
      </View>
      <Text style={gS.lnLabel}>Pick a Number (35x win):</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6,paddingVertical:4}}>
        {Array.from({length:37},(_,i)=>i).map(n=>(
          <Pressable key={n} style={[gS.lnNumBtn,chosenNum===n&&{borderColor:Colors.gold,backgroundColor:Colors.gold+'25'},n===0&&{borderColor:'#00A000'}]} onPress={()=>{setChosenNum(n);setChosenColor(null);}}>
            <Text style={[gS.lnNumText,{color:n===0?'#00A000':RED_NUMS.includes(n)?'#DC143C':Colors.textSecondary}]}>{n}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={gS.lnLabel}>Or Pick a Color (2x win):</Text>
      <View style={gS.lnColorRow}>
        {LUCKY_COLORS.map(c=>(
          <Pressable key={c.key} style={[gS.lnColorBtn,chosenColor===c.key&&{borderColor:Colors.gold,backgroundColor:Colors.gold+'20'}]} onPress={()=>{setChosenColor(c.key);setChosenNum(null);}}>
            <Text style={gS.lnColorText}>{c.label}</Text>
          </Pressable>
        ))}
      </View>
      {outcome&&(
        <View style={[gS.resultBadge,{borderColor:outcome.includes('Jackpot')||outcome.includes('win')?Colors.success:Colors.error,backgroundColor:outcome.includes('No')?Colors.error+'20':Colors.success+'20'}]}>
          <Text style={[gS.resultText,{color:outcome.includes('No')?Colors.error:Colors.success}]}>{outcome}</Text>
        </View>
      )}
      <Pressable style={[gS.spinBtn,{backgroundColor:Colors.error},(!chosenNum&&!chosenColor||spinning)&&{opacity:0.5}]} onPress={play} disabled={!chosenNum&&!chosenColor||spinning}>
        <Text style={gS.spinBtnText}>{spinning?'🎲 Drawing...':`🎯 Play (${bet}💎)`}</Text>
      </Pressable>
    </View>
  );
}

// ── GREEDY (Multiply or Bust) ──
function Greedy({ onWin, bet }: { onWin:(a:number)=>void; bet:number }) {
  const [multiplier, setMultiplier] = useState(1);
  const [currentWin, setCurrentWin] = useState(bet);
  const [status, setStatus] = useState<'idle'|'playing'|'won'|'busted'>('idle');
  const [history, setHistory] = useState<string[]>([]);
  const [dice, setDice] = useState<number[]>([]);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const BUST_CHANCE = 0.28 + multiplier * 0.04;

  useEffect(() => {
    if (status==='playing') {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim,{toValue:1.12,duration:300,useNativeDriver:true}),
        Animated.timing(pulseAnim,{toValue:1,duration:300,useNativeDriver:true}),
      ])).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  const start = () => { setStatus('playing'); setMultiplier(1); setCurrentWin(bet); setHistory([]); setDice([]); };
  const roll = () => {
    const d = [Math.ceil(Math.random()*6), Math.ceil(Math.random()*6)];
    setDice(d);
    const bust = Math.random()<BUST_CHANCE;
    if (bust) {
      setStatus('busted');
      setHistory(prev=>[...prev,'💣 Bust!']);
    } else {
      const newMult = parseFloat((multiplier*1.5).toFixed(1));
      const newWin = Math.floor(bet*newMult);
      setMultiplier(newMult);
      setCurrentWin(newWin);
      setHistory(prev=>[...prev,`×${newMult} → ${newWin}💎`]);
    }
  };
  const cashOut = () => {
    onWin(currentWin);
    setStatus('won');
    setHistory(prev=>[...prev,`✅ Cashed out: +${currentWin}💎`]);
  };
  const diceEmoji = (n:number) => ['⚀','⚁','⚂','⚃','⚄','⚅'][n-1];

  return (
    <View style={gS.greedyContainer}>
      <Animated.View style={[gS.greedyDisplay,{transform:[{scale:status==='playing'?pulseAnim:new Animated.Value(1)}],
        borderColor:status==='busted'?Colors.error:status==='won'?Colors.success:Colors.gold}]}>
        <Text style={gS.greedyMult}>{status==='busted'?'💣 BUST':status==='won'?'✅ WON':`×${multiplier}`}</Text>
        <Text style={[gS.greedyWin,{color:status==='busted'?Colors.error:Colors.gold}]}>
          {status==='busted'?'You lost!':status==='won'?`+${currentWin}💎`:`${currentWin}💎`}
        </Text>
        {dice.length>0&&<View style={{flexDirection:'row',gap:8}}>{dice.map((d,i)=><Text key={i} style={{fontSize:28}}>{diceEmoji(d)}</Text>)}</View>}
      </Animated.View>
      {history.length>0&&(
        <ScrollView style={gS.greedyHistory} showsVerticalScrollIndicator={false}>
          {history.map((h,i)=>(
            <Text key={i} style={[gS.greedyHistoryItem,h.includes('Bust')&&{color:Colors.error},h.includes('Cashed')&&{color:Colors.success}]}>{h}</Text>
          ))}
        </ScrollView>
      )}
      <Text style={gS.greedyWarning}>Bust chance: {Math.round(BUST_CHANCE*100)}% · Keep rolling to multiply!</Text>
      <View style={gS.greedyBtns}>
        {status==='idle'&&<Pressable style={[gS.greedyBtn,{backgroundColor:Colors.primary}]} onPress={start}><Text style={gS.greedyBtnText}>▶ Start ({bet}💎)</Text></Pressable>}
        {status==='playing'&&(
          <>
            <Pressable style={[gS.greedyBtn,{backgroundColor:Colors.success,flex:1}]} onPress={cashOut}><Text style={gS.greedyBtnText}>💰 Cash Out</Text></Pressable>
            <Pressable style={[gS.greedyBtn,{backgroundColor:Colors.error,flex:1}]} onPress={roll}><Text style={gS.greedyBtnText}>🎲 Roll!</Text></Pressable>
          </>
        )}
        {(status==='won'||status==='busted')&&<Pressable style={[gS.greedyBtn,{backgroundColor:Colors.secondary}]} onPress={start}><Text style={gS.greedyBtnText}>🔄 Play Again</Text></Pressable>}
      </View>
    </View>
  );
}

// ── TEEN PATTI ──
function TeenPatti({ onWin, bet }: { onWin:(a:number)=>void; bet:number }) {
  const [deck] = useState(()=>createDeck());
  const [idx, setIdx] = useState(0);
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [dealerCards, setDealerCards] = useState<Card[]>([]);
  const [state, setState] = useState<'deal'|'playing'|'reveal'|'done'>('deal');
  const [result, setResult] = useState('');
  const handScore = (cards:Card[]) => {
    const vals = cards.map(c=>c.value).sort((a,b)=>b-a);
    const suits = cards.map(c=>c.suit);
    const flush = suits.every(s=>s===suits[0]);
    const sorted = [...vals].sort((a,b)=>a-b);
    const straight = sorted[2]-sorted[0]===2&&sorted[1]-sorted[0]===1;
    const counts: Record<number,number> = {};
    vals.forEach(v=>counts[v]=(counts[v]||0)+1);
    const maxCount = Math.max(...Object.values(counts));
    if (flush&&straight) return 7; if (maxCount===3) return 6; if (straight) return 5;
    if (flush) return 4; if (maxCount===2) return 3; return vals.reduce((a,b)=>a+b,0)/100;
  };
  const deal = () => { const d=[...deck]; const pC=[d[idx],d[idx+2],d[idx+4]],dC=[d[idx+1],d[idx+3],d[idx+5]]; setPlayerCards(pC);setDealerCards(dC);setIdx(i=>i+6);setState('playing'); };
  const call = () => { setState('reveal'); const ps=handScore(playerCards),ds=handScore(dealerCards); setTimeout(()=>{ if(ps>ds){setResult(`🎉 Win! +${bet*2}💎`);onWin(bet*2);}else if(ps<ds){setResult('💣 Dealer Wins!');}else{setResult('🤝 Tie!');onWin(bet);} setState('done'); },600); };
  const fold = () => { setState('done'); setResult(`📂 Folded!`); };
  const HAND_NAMES=['','','','Pair','Flush','Straight','Three of a Kind','Straight Flush'];
  return (
    <View style={gS.tpContainer}>
      <View style={gS.tpSection}><Text style={gS.tpLabel}>🃏 DEALER</Text><View style={gS.tpCards}>{state==='deal'?[0,1,2].map(i=><View key={i} style={gS.cardEmpty}/>):dealerCards.map((c,i)=><CardView key={i} card={c} hidden={state==='playing'}/>)}</View></View>
      <View style={gS.tpDivider}><Text style={gS.tpDividerText}>⚔️ Teen Patti</Text></View>
      <View style={gS.tpSection}><Text style={gS.tpLabel}>👤 YOU</Text><View style={gS.tpCards}>{state==='deal'?[0,1,2].map(i=><View key={i} style={gS.cardEmpty}/>):playerCards.map((c,i)=><CardView key={i} card={c}/>)}</View>{state==='playing'&&<Text style={gS.handHint}>{HAND_NAMES[Math.floor(handScore(playerCards))]||'High Card'}</Text>}</View>
      {state==='done'&&result&&<View style={[gS.resultBadge,{borderColor:result.includes('Win')?Colors.success:result.includes('Tie')?Colors.warning:Colors.error,backgroundColor:result.includes('Win')?Colors.success+'25':result.includes('Tie')?Colors.warning+'25':Colors.error+'25'}]}><Text style={[gS.resultText,{color:result.includes('Win')?Colors.success:result.includes('Tie')?Colors.warning:Colors.error}]}>{result}</Text></View>}
      <View style={gS.tpActions}>
        {state==='deal'&&<Pressable style={[gS.tpBtn,{backgroundColor:Colors.primary}]} onPress={deal}><Text style={gS.tpBtnText}>🃏 Deal ({bet}💎)</Text></Pressable>}
        {state==='playing'&&<><Pressable style={[gS.tpBtn,{backgroundColor:Colors.success,flex:1}]} onPress={call}><Text style={gS.tpBtnText}>📣 Call</Text></Pressable><Pressable style={[gS.tpBtn,{backgroundColor:Colors.error,flex:1}]} onPress={fold}><Text style={gS.tpBtnText}>📂 Fold</Text></Pressable></>}
      </View>
    </View>
  );
}

// ── SLOT MACHINE ──
const SLOT_SYMBOLS=['🍒','🍋','🍊','🍇','💎','⭐','🔔','💰','🎰','👑'];
const SLOT_PAYOUTS:Record<string,number>={'💎💎💎':50,'👑👑👑':30,'💰💰💰':20,'🔔🔔🔔':15,'⭐⭐⭐':10,'🍒🍒🍒':8,'🍇🍇🍇':6,'🍊🍊🍊':5,'🍋🍋🍋':4};
function SlotMachine({onWin,bet}:{onWin:(a:number)=>void;bet:number}){const[reels,setReels]=useState(['🎰','🎰','🎰']);const[spinning,setSpinning]=useState(false);const[result,setResult]=useState('');const[mult,setMult]=useState(0);const spinAnims=[useRef(new Animated.Value(0)).current,useRef(new Animated.Value(0)).current,useRef(new Animated.Value(0)).current];const spin=()=>{if(spinning)return;setSpinning(true);setResult('');setMult(0);spinAnims.forEach((a,i)=>{a.setValue(0);Animated.timing(a,{toValue:1,duration:1000+i*400,useNativeDriver:true}).start();});setTimeout(()=>{const nR=Array.from({length:3},()=>SLOT_SYMBOLS[Math.floor(Math.random()*SLOT_SYMBOLS.length)]);setReels(nR);const combo=nR.join('');const payout=SLOT_PAYOUTS[combo]||(nR[0]===nR[1]||nR[1]===nR[2]?2:0);if(payout>0){const w=bet*payout;setResult(`🎉 ${payout}x WIN! +${w}💎`);setMult(payout);onWin(w);}else{setResult('No win.');}setSpinning(false);},1800);};return(<View style={gS.slotContainer}><View style={gS.slotMachine}><View style={gS.slotLights}>{Array.from({length:8}).map((_,i)=><View key={i} style={[gS.slotLight,{backgroundColor:spinning?(i%2===0?Colors.gold:Colors.primary):Colors.cardBorder}]}/>)}</View><View style={gS.reelsRow}>{reels.map((sym,i)=>{const rotate=spinAnims[i].interpolate({inputRange:[0,0.5,1],outputRange:['0deg','360deg','720deg']});return(<Animated.View key={i} style={[gS.reelCell,{transform:[{rotate:spinning?rotate:'0deg'}]}]}><Text style={gS.reelSym}>{sym}</Text></Animated.View>);})}</View><View style={gS.payline}/></View>{result&&<View style={[gS.resultBadge,{borderColor:mult>0?Colors.gold:Colors.textMuted,backgroundColor:mult>0?Colors.gold+'20':Colors.surface}]}><Text style={[gS.resultText,{color:mult>0?Colors.gold:Colors.textMuted}]}>{result}</Text></View>}<Pressable style={[gS.spinBtn,spinning&&{opacity:0.6}]} onPress={spin} disabled={spinning}><Text style={gS.spinBtnText}>{spinning?'🎰 Spinning...':`🎰 Spin (${bet}💎)`}</Text></Pressable></View>);}

// ── DICE BATTLE ──
function DiceBattle({onWin,bet}:{onWin:(a:number)=>void;bet:number}){const[myDice,setMyDice]=useState([1,1]);const[oppDice,setOppDice]=useState([1,1]);const[rolling,setRolling]=useState(false);const[result,setResult]=useState<'win'|'lose'|'draw'|null>(null);const shakeAnim=useRef(new Animated.Value(0)).current;const roll=()=>{if(rolling)return;setRolling(true);setResult(null);Animated.sequence([...Array.from({length:6},(_,i)=>Animated.timing(shakeAnim,{toValue:i%2===0?12:-12,duration:60,useNativeDriver:true})),Animated.timing(shakeAnim,{toValue:0,duration:60,useNativeDriver:true})]).start();setTimeout(()=>{const my=[Math.ceil(Math.random()*6),Math.ceil(Math.random()*6)];const opp=[Math.ceil(Math.random()*6),Math.ceil(Math.random()*6)];setMyDice(my);setOppDice(opp);const r=my[0]+my[1]>opp[0]+opp[1]?'win':my[0]+my[1]<opp[0]+opp[1]?'lose':'draw';setResult(r);if(r==='win')onWin(bet*2);setRolling(false);},700);};const de=(n:number)=>['⚀','⚁','⚂','⚃','⚄','⚅'][n-1];return(<View style={gS.diceContainer}><View style={gS.diceBoard}><View style={gS.dicePlayer}><Text style={gS.diceLabel}>YOU</Text><Animated.View style={[gS.dicePair,{transform:[{translateX:shakeAnim}]}]}>{myDice.map((d,i)=><Text key={i} style={gS.diceEmoji}>{de(d)}</Text>)}</Animated.View><Text style={gS.diceSum}>{myDice[0]+myDice[1]}</Text></View><View style={gS.diceVs}><Text style={gS.diceVsText}>VS</Text></View><View style={gS.dicePlayer}><Text style={gS.diceLabel}>OPP</Text><Animated.View style={[gS.dicePair,{transform:[{translateX:shakeAnim}]}]}>{oppDice.map((d,i)=><Text key={i} style={gS.diceEmoji}>{de(d)}</Text>)}</Animated.View><Text style={gS.diceSum}>{oppDice[0]+oppDice[1]}</Text></View></View>{result&&<View style={[gS.resultBadge,{borderColor:result==='win'?Colors.success:result==='lose'?Colors.error:Colors.warning,backgroundColor:result==='win'?Colors.success+'25':result==='lose'?Colors.error+'25':Colors.warning+'25'}]}><Text style={[gS.resultText,{color:result==='win'?Colors.success:result==='lose'?Colors.error:Colors.warning}]}>{result==='win'?`🎉 Win! +${bet*2}💎`:result==='lose'?'💣 Lose!':'🤝 Draw!'}</Text></View>}<Pressable style={[gS.spinBtn,{backgroundColor:Colors.secondary},rolling&&{opacity:0.6}]} onPress={roll} disabled={rolling}><Text style={gS.spinBtnText}>{rolling?'🎲 Rolling...':`🎲 Roll (${bet}💎)`}</Text></Pressable></View>);}

// ── COIN FLIP ──
function CoinFlip({onWin,bet}:{onWin:(a:number)=>void;bet:number}){const[choice,setChoice]=useState<'heads'|'tails'|null>(null);const[result,setResult]=useState<'heads'|'tails'|null>(null);const[flipping,setFlipping]=useState(false);const flipAnim=useRef(new Animated.Value(0)).current;const flip=()=>{if(!choice||flipping)return;setFlipping(true);setResult(null);flipAnim.setValue(0);Animated.timing(flipAnim,{toValue:1,duration:900,useNativeDriver:true}).start(()=>{const r=Math.random()>0.5?'heads':'tails';setResult(r);if(r===choice)onWin(bet*2);setFlipping(false);});};const scaleX=flipAnim.interpolate({inputRange:[0,0.25,0.5,0.75,1],outputRange:[1,0.1,1,0.1,1]});return(<View style={gS.flipContainer}><Animated.View style={[gS.coinWrap,{transform:[{scaleX}]}]}><Text style={gS.coinEmoji}>{result==='tails'?'🦅':'🪙'}</Text></Animated.View><Text style={gS.flipInstruction}>Choose:</Text><View style={gS.flipChoices}><Pressable style={[gS.flipChoice,choice==='heads'&&gS.flipChoiceActive]} onPress={()=>setChoice('heads')}><Text style={{fontSize:32}}>🪙</Text><Text style={gS.flipChoiceText}>Heads</Text></Pressable><Pressable style={[gS.flipChoice,choice==='tails'&&gS.flipChoiceActive]} onPress={()=>setChoice('tails')}><Text style={{fontSize:32}}>🦅</Text><Text style={gS.flipChoiceText}>Tails</Text></Pressable></View>{result&&<View style={[gS.resultBadge,{borderColor:result===choice?Colors.success:Colors.error,backgroundColor:result===choice?Colors.success+'25':Colors.error+'25'}]}><Text style={{color:result===choice?Colors.success:Colors.error,fontWeight:FontWeight.bold,fontSize:FontSize.md}}>{result===choice?`🎉 ${result}! +${bet*2}💎`:`💣 ${result}!`}</Text></View>}<Pressable style={[gS.spinBtn,{backgroundColor:Colors.gold},(!choice||flipping)&&{opacity:0.5}]} onPress={flip} disabled={!choice||flipping}><Text style={[gS.spinBtnText,{color:'#000'}]}>{flipping?'⚡ Flipping...':`⚡ Flip (${bet}💎)`}</Text></Pressable></View>);}

// ── BLACKJACK ──
function Blackjack({onWin,bet}:{onWin:(a:number)=>void;bet:number}){const[deck]=useState(()=>createDeck());const[playerH,setPlayerH]=useState<Card[]>([]);const[dealerH,setDealerH]=useState<Card[]>([]);const[state,setState]=useState<'idle'|'playing'|'done'>('idle');const[result,setResult]=useState('');const[di,setDi]=useState(0);const cv=(h:Card[])=>{let s=0,a=0;for(const c of h){if(c.rank==='A'){s+=11;a++;}else s+=Math.min(10,c.value);}while(s>21&&a>0){s-=10;a--;}return s;};const start=()=>{const pH=[deck[di],deck[di+2]],dH=[deck[di+1],deck[di+3]];setPlayerH(pH);setDealerH(dH);setDi(i=>i+4);setState('playing');setResult('');};const hit=()=>{if(state!=='playing')return;const nH=[...playerH,deck[di]];setPlayerH(nH);setDi(i=>i+1);if(cv(nH)>21)finish(nH,dealerH,di+1);};const stand=()=>finish(playerH,dealerH,di);const finish=(pH:Card[],dH:Card[],idx:number)=>{let dealer=[...dH],d2=idx;while(cv(dealer)<17)dealer.push(deck[d2++]);setDealerH(dealer);setDi(d2);const ps=cv(pH),ds=cv(dealer);setState('done');if(ps>21)setResult('💣 Bust!');else if(ds>21){setResult(`🎉 Dealer busts! +${bet*2}💎`);onWin(bet*2);}else if(ps>ds){setResult(`🃏 Win! ${ps} vs ${ds} +${bet*2}💎`);onWin(bet*2);}else if(ps===ds){setResult(`🤝 Push!`);onWin(bet);}else setResult(`💣 Lose! ${ps} vs ${ds}`);};return(<View style={gS.bjContainer}><View style={gS.bjSection}><Text style={gS.bjLabel}>🤵 Dealer {state!=='idle'?`(${state==='playing'?'?':cv(dealerH)})`:''}</Text><View style={gS.bjCards}>{state==='idle'?<Text style={gS.bjEmpty}>Start a game</Text>:dealerH.map((c,i)=><CardView key={i} card={c} hidden={state==='playing'&&i>0}/>)}</View></View><View style={gS.bjDivider}/><View style={gS.bjSection}><Text style={gS.bjLabel}>👤 You {state!=='idle'?`(${cv(playerH)})`:''}</Text><View style={gS.bjCards}>{state==='idle'?<Text style={gS.bjEmpty}>Press Deal to start</Text>:playerH.map((c,i)=><CardView key={i} card={c}/>)}</View></View>{result&&<View style={[gS.resultBadge,{borderColor:result.includes('Win')||result.includes('bust')?Colors.success:result.includes('Push')?Colors.warning:Colors.error,backgroundColor:result.includes('Win')||result.includes('bust')?Colors.success+'25':result.includes('Push')?Colors.warning+'25':Colors.error+'25'}]}><Text style={[gS.resultText,{color:result.includes('Win')||result.includes('bust')?Colors.success:result.includes('Push')?Colors.warning:Colors.error}]}>{result}</Text></View>}<View style={gS.bjBtns}>{(state==='idle'||state==='done')&&<Pressable style={[gS.bjBtn,{backgroundColor:Colors.primary,flex:1}]} onPress={start}><Text style={gS.bjBtnText}>🃏 Deal ({bet}💎)</Text></Pressable>}{state==='playing'&&<><Pressable style={[gS.bjBtn,{backgroundColor:Colors.success,flex:1}]} onPress={hit}><Text style={gS.bjBtnText}>Hit</Text></Pressable><Pressable style={[gS.bjBtn,{backgroundColor:Colors.error,flex:1}]} onPress={stand}><Text style={gS.bjBtnText}>Stand</Text></Pressable></>}</View></View>);}

// ── ALL GAMES LIST ──
const ALL_GAMES = [
  { id:'ocean_hunt',   name:'Ocean Hunt',     icon:'🐟', desc:'Hunt fish to win coins',         color:'#006994', minBet:5,  maxWin:'50x', category:'Reward' },
  { id:'fruit_roul',   name:'Fruit Roulette',  icon:'🎰', desc:'Match 3 fruits to win big',      color:'#FF8C00', minBet:5,  maxWin:'30x', category:'Casino' },
  { id:'golden_wheel', name:'Golden Wheel',    icon:'🎡', desc:'Spin wheel of fortune',           color:'#FFD700', minBet:10, maxWin:'1000x',category:'Luck' },
  { id:'lucky_num',    name:'Lucky Number',    icon:'🔢', desc:'Pick number or color, win 35x',  color:'#DC143C', minBet:10, maxWin:'35x', category:'Luck' },
  { id:'greedy',       name:'Greedy',          icon:'💰', desc:'Roll to multiply — or bust!',    color:'#FF6B00', minBet:20, maxWin:'∞',   category:'Skill' },
  { id:'teen_patti',   name:'Teen Patti',       icon:'🃏', desc:'Classic 3-card Indian poker',    color:'#E91E8C', minBet:20, maxWin:'2x',  category:'Card' },
  { id:'slots',        name:'Slots',            icon:'🎰', desc:'Pull & match symbols',            color:'#9B30FF', minBet:5,  maxWin:'50x', category:'Casino' },
  { id:'dice',         name:'Dice Battle',      icon:'🎲', desc:'Roll dice, beat opponent',        color:'#7C3AED', minBet:20, maxWin:'6x',  category:'Luck' },
  { id:'blackjack',    name:'Blackjack 21',     icon:'🃏', desc:'Beat dealer to 21',              color:'#00E676', minBet:20, maxWin:'2x',  category:'Card' },
  { id:'flip',         name:'Coin Flip',        icon:'🪙', desc:'Heads or tails 50/50',            color:'#FFCC00', minBet:5,  maxWin:'2x',  category:'Luck' },
];

export default function GamesScreen() {
  const router = useRouter();
  const { currentUser, updateDiamonds, updateCoins } = useApp();
  const { showAlert } = useAlert();
  const [activeGame, setActiveGame] = useState<string|null>(null);
  const [bet, setBet] = useState(10);
  const [activeCategory, setActiveCategory] = useState('All');
  const [winHistory, setWinHistory] = useState<{game:string;amount:number}[]>([]);
  const [totalNet, setTotalNet] = useState(0);
  const headerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(headerAnim,{toValue:1,duration:600,useNativeDriver:true}).start(); }, []);

  const categories = ['All','Reward','Casino','Luck','Card','Skill'];
  const filtered = activeCategory==='All'?ALL_GAMES:ALL_GAMES.filter(g=>g.category===activeCategory);

  const handleWin = useCallback((amount:number) => {
    const net = amount-bet;
    updateDiamonds(net > 0 ? net : 0);
    if (activeGame==='ocean_hunt') updateCoins(amount);
    setTotalNet(t=>t+net);
    setWinHistory(prev=>[{game:activeGame||'',amount},...prev.slice(0,4)]);
    if (amount>bet*10) showAlert(`🎉 Mega Win! +${amount}💎`, `${amount} diamonds added!`);
  }, [bet, activeGame, updateDiamonds, updateCoins]);

  const handlePlay = useCallback((gameId:string) => {
    const game = ALL_GAMES.find(g=>g.id===gameId);
    const minBet = game?.minBet||5;
    if (bet<minBet) { showAlert('Min Bet', `Min bet: ${minBet}💎`); setBet(minBet); return; }
    if (currentUser.diamonds<bet) {
      showAlert('Not Enough Diamonds', 'Recharge to play!', [
        {text:'Recharge',onPress:()=>router.push('/recharge')},
        {text:'Cancel',style:'cancel'},
      ]);
      return;
    }
    updateDiamonds(-bet);
    setActiveGame(gameId);
  }, [bet, currentUser.diamonds, updateDiamonds, router]);

  const renderGame = () => {
    const props = { onWin:handleWin, bet };
    switch (activeGame) {
      case 'ocean_hunt':   return <OceanHunt {...props} />;
      case 'fruit_roul':   return <FruitRoulette {...props} />;
      case 'golden_wheel': return <GoldenWheel {...props} />;
      case 'lucky_num':    return <LuckyNumber {...props} />;
      case 'greedy':       return <Greedy {...props} />;
      case 'teen_patti':   return <TeenPatti {...props} />;
      case 'slots':        return <SlotMachine {...props} />;
      case 'dice':         return <DiceBattle {...props} />;
      case 'blackjack':    return <Blackjack {...props} />;
      case 'flip':         return <CoinFlip {...props} />;
      default: return null;
    }
  };
  const activeGameInfo = ALL_GAMES.find(g=>g.id===activeGame);

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <View style={S.header}>
        <Pressable onPress={()=>activeGame?setActiveGame(null):router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={S.headerTitle}>{activeGame?`${activeGameInfo?.icon} ${activeGameInfo?.name}`:'🎮 Games & Casino'}</Text>
        <View style={S.headerRight}>
          <Pressable style={S.walletChip} onPress={()=>router.push('/wallet')}>
            <Text>💎</Text><Text style={S.walletText}>{currentUser.diamonds.toLocaleString()}</Text>
          </Pressable>
          <Pressable style={[S.walletChip,{borderColor:Colors.success+'40'}]} onPress={()=>router.push('/daily-tasks')}>
            <Text>🎯</Text><Text style={[S.walletText,{color:Colors.success}]}>Tasks</Text>
          </Pressable>
        </View>
      </View>

      {activeGame ? (
        <ScrollView contentContainerStyle={S.gameContent}>
          <View style={S.betSection}>
            <Text style={S.betLabel}>Bet: </Text>
            {[5,10,20,50,100,200].map(b=>(
              <Pressable key={b} style={[S.betChip,bet===b&&S.betChipActive]} onPress={()=>setBet(b)}>
                <Text style={[S.betChipText,bet===b&&S.betChipTextActive]}>{b}💎</Text>
              </Pressable>
            ))}
          </View>
          {renderGame()}
          <View style={S.gameActions}>
            <Pressable style={S.playAgainBtn} onPress={()=>handlePlay(activeGame)}>
              <Text style={S.playAgainText}>🔄 Play Again ({bet}💎)</Text>
            </Pressable>
            <Pressable style={S.backToGamesBtn} onPress={()=>setActiveGame(null)}>
              <Text style={S.backToGamesBtnText}>← All Games</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scroll}>
          <Animated.View style={[S.statsBar,{opacity:headerAnim}]}>
            {[
              {val:currentUser.diamonds.toLocaleString(),label:'Balance',color:Colors.diamond},
              {val:totalNet>0?`+${totalNet}`:'0',label:"Today's Net",color:Colors.success},
              {val:winHistory.length,label:'Rounds',color:Colors.gold},
            ].map((s,i)=>(
              <React.Fragment key={s.label}>
                {i>0&&<View style={S.statDiv}/>}
                <View style={S.statItem}><Text style={[S.statVal,{color:s.color}]}>{s.val}</Text><Text style={S.statLbl}>{s.label}</Text></View>
              </React.Fragment>
            ))}
          </Animated.View>

          {winHistory.length>0&&(
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.historyScroll} contentContainerStyle={{paddingHorizontal:Spacing.md,gap:Spacing.xs}}>
              {winHistory.map((w,i)=><View key={i} style={S.historyChip}><Text style={S.historyText}>+{w.amount}💎 {w.game}</Text></View>)}
            </ScrollView>
          )}

          <View style={S.betSection}>
            <Text style={S.sectionTitle}>💰 Bet Amount</Text>
            <View style={S.betRow}>
              {[5,10,20,50,100,200].map(b=>(
                <Pressable key={b} style={[S.betChip,bet===b&&S.betChipActive]} onPress={()=>setBet(b)}>
                  <Text style={[S.betChipText,bet===b&&S.betChipTextActive]}>{b}💎</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.catRow}>
            {categories.map(c=>(
              <Pressable key={c} style={[S.catChip,activeCategory===c&&S.catChipActive]} onPress={()=>setActiveCategory(c)}>
                <Text style={[S.catChipText,activeCategory===c&&S.catChipTextActive]}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={S.sectionTitle}>🎮 Choose a Game</Text>
          <View style={S.gamesGrid}>
            {filtered.map(game=>(
              <Pressable key={game.id} style={({pressed})=>[S.gameCard,{borderColor:game.color+'40'},pressed&&{opacity:0.85,transform:[{scale:0.97}]}]} onPress={()=>handlePlay(game.id)}>
                <View style={[S.gameIconBg,{backgroundColor:game.color+'20'}]}>
                  <Text style={{fontSize:40}}>{game.icon}</Text>
                </View>
                <View style={[S.categoryTag,{backgroundColor:game.color+'20'}]}>
                  <Text style={[S.categoryTagText,{color:game.color}]}>{game.category}</Text>
                </View>
                <Text style={S.gameName}>{game.name}</Text>
                <Text style={S.gameDesc}>{game.desc}</Text>
                <View style={S.gameFooter}>
                  <Text style={S.gameBet}>Min: {game.minBet}💎</Text>
                  <View style={[S.maxWinBadge,{backgroundColor:game.color+'20'}]}>
                    <Text style={[S.maxWinText,{color:game.color}]}>Up to {game.maxWin}</Text>
                  </View>
                </View>
                <Pressable style={[S.playBtn,{backgroundColor:game.color}]} onPress={()=>handlePlay(game.id)}>
                  <Text style={S.playBtnText}>▶ Play Now</Text>
                </Pressable>
              </Pressable>
            ))}
          </View>

          {/* Daily Tasks Banner */}
          <Pressable style={S.tasksBanner} onPress={()=>router.push('/daily-tasks')}>
            <Text style={{fontSize:32}}>🎯</Text>
            <View style={{flex:1}}>
              <Text style={S.tasksBannerTitle}>Daily Tasks & Earn</Text>
              <Text style={S.tasksBannerSub}>Complete tasks to earn Points, S-Coins & Diamonds!</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={Colors.primary} />
          </Pressable>

          <View style={S.disclaimer}>
            <MaterialIcons name="info-outline" size={14} color={Colors.textMuted} />
            <Text style={S.disclaimerText}>For entertainment. Diamonds are virtual. 18+. Play responsibly.</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Shared game styles ──
const gS = StyleSheet.create({
  card:{width:46,height:64,backgroundColor:'#FFF',borderRadius:8,alignItems:'center',justifyContent:'center',borderWidth:1.5,borderColor:'#DDD',shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.2,shadowRadius:4,elevation:3},
  cardHidden:{backgroundColor:'#1a1a2e',borderColor:'#333'},
  cardBack:{fontSize:36,color:'#FFF'},
  cardRank:{fontSize:16,fontWeight:FontWeight.black,lineHeight:20},
  cardSuit:{fontSize:18,lineHeight:20},
  cardEmpty:{width:46,height:64,backgroundColor:Colors.surfaceElevated,borderRadius:8,borderWidth:1.5,borderColor:Colors.cardBorder,borderStyle:'dashed'},
  // Ocean Hunt
  oceanContainer:{gap:Spacing.md,width:'100%'},
  oceanHeader:{flexDirection:'row',justifyContent:'space-evenly',backgroundColor:Colors.surface,borderRadius:BorderRadius.md,padding:Spacing.sm,borderWidth:1,borderColor:'#006994'+'40'},
  oceanStat:{color:Colors.textPrimary,fontSize:FontSize.sm,fontWeight:FontWeight.bold},
  oceanGrid:{flexDirection:'row',flexWrap:'wrap',gap:4,justifyContent:'center'},
  oceanCell:{width:(width-Spacing.md*2-4*4)/5-4,height:(width-Spacing.md*2-4*4)/5-4,backgroundColor:'#006994'+'20',borderRadius:BorderRadius.sm,alignItems:'center',justifyContent:'center',borderWidth:1.5,borderColor:'#006994'+'40'},
  fishLegend:{flexDirection:'row',flexWrap:'wrap',gap:8,justifyContent:'center'},
  fishLegendItem:{alignItems:'center',gap:2,backgroundColor:Colors.surface,borderRadius:BorderRadius.sm,padding:6},
  fishCoins:{color:Colors.success,fontSize:10,fontWeight:FontWeight.bold},
  // Fruit Roulette
  fruitContainer:{alignItems:'center',gap:Spacing.md,width:'100%'},
  fruitMachine:{backgroundColor:Colors.surface,borderRadius:BorderRadius.xl,padding:Spacing.md,borderWidth:2,borderColor:Colors.gold,width:'100%',alignItems:'center',gap:Spacing.sm},
  fruitReels:{flexDirection:'row',gap:Spacing.md,alignItems:'center',justifyContent:'center'},
  fruitReel:{width:80,height:80,backgroundColor:Colors.bgSecondary,borderRadius:BorderRadius.md,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:Colors.cardBorder},
  fruitPayline:{height:3,backgroundColor:Colors.gold,width:'90%',borderRadius:2},
  fruitLegend:{flexDirection:'row',flexWrap:'wrap',gap:6,justifyContent:'center'},
  fruitLegendItem:{alignItems:'center',backgroundColor:Colors.surface,borderRadius:BorderRadius.sm,padding:6,borderWidth:1},
  fruitMult:{fontSize:10,fontWeight:FontWeight.bold},
  // Golden Wheel
  gwContainer:{alignItems:'center',gap:Spacing.md,width:'100%'},
  gwWheelWrap:{position:'relative',width:220,height:220,alignItems:'center',justifyContent:'center'},
  gwWheel:{width:210,height:210,borderRadius:105,borderWidth:4,borderColor:Colors.gold,backgroundColor:Colors.surface,alignItems:'center',justifyContent:'center',overflow:'hidden',position:'relative'},
  gwSegment:{position:'absolute',width:'50%',height:4,transformOrigin:'right center',top:'50%',borderTopWidth:2},
  gwSegLabel:{color:Colors.textPrimary,fontSize:8,fontWeight:FontWeight.bold,paddingLeft:4},
  gwCenter:{position:'absolute',width:50,height:50,borderRadius:25,backgroundColor:Colors.bg,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:Colors.gold},
  gwPointer:{position:'absolute',top:-6},
  gwPrizeRow:{flexDirection:'row',flexWrap:'wrap',gap:6,justifyContent:'center'},
  gwPrizeChip:{borderWidth:1,borderRadius:BorderRadius.pill,paddingHorizontal:8,paddingVertical:3},
  gwPrizeText:{fontSize:11,fontWeight:FontWeight.bold},
  // Lucky Number
  lnContainer:{alignItems:'center',gap:Spacing.md,width:'100%'},
  lnBallWrap:{width:100,height:100,borderRadius:50,backgroundColor:Colors.surface,borderWidth:3,borderColor:Colors.primary,alignItems:'center',justifyContent:'center'},
  lnBall:{width:80,height:80,borderRadius:40,backgroundColor:'#333',alignItems:'center',justifyContent:'center'},
  lnBallNum:{color:'#FFF',fontSize:28,fontWeight:FontWeight.black},
  lnLabel:{color:Colors.textMuted,fontSize:FontSize.xs,alignSelf:'flex-start'},
  lnNumBtn:{width:36,height:36,borderRadius:18,backgroundColor:Colors.surface,alignItems:'center',justifyContent:'center',borderWidth:1.5,borderColor:Colors.cardBorder},
  lnNumText:{fontSize:11,fontWeight:FontWeight.bold},
  lnColorRow:{flexDirection:'row',gap:Spacing.sm,width:'100%'},
  lnColorBtn:{flex:1,alignItems:'center',paddingVertical:Spacing.sm,borderRadius:BorderRadius.md,backgroundColor:Colors.surface,borderWidth:1.5,borderColor:Colors.cardBorder},
  lnColorText:{color:Colors.textPrimary,fontSize:FontSize.sm,fontWeight:FontWeight.bold},
  // Greedy
  greedyContainer:{gap:Spacing.md,width:'100%',alignItems:'center'},
  greedyDisplay:{backgroundColor:Colors.surface,borderRadius:BorderRadius.xl,padding:Spacing.xl,alignItems:'center',gap:Spacing.sm,borderWidth:2,borderColor:Colors.gold,width:'100%'},
  greedyMult:{color:Colors.gold,fontSize:40,fontWeight:FontWeight.black},
  greedyWin:{fontSize:FontSize.xl,fontWeight:FontWeight.bold},
  greedyHistory:{maxHeight:100,width:'100%',backgroundColor:Colors.surface,borderRadius:BorderRadius.md,padding:Spacing.sm,borderWidth:1,borderColor:Colors.cardBorder},
  greedyHistoryItem:{color:Colors.textSecondary,fontSize:FontSize.xs,paddingVertical:3,borderBottomWidth:1,borderBottomColor:Colors.cardBorder},
  greedyWarning:{color:Colors.textMuted,fontSize:FontSize.xs,textAlign:'center'},
  greedyBtns:{flexDirection:'row',gap:Spacing.md,width:'100%'},
  greedyBtn:{flex:1,alignItems:'center',paddingVertical:Spacing.md,borderRadius:BorderRadius.pill},
  greedyBtnText:{color:'#FFF',fontSize:FontSize.md,fontWeight:FontWeight.bold},
  // Teen Patti
  tpContainer:{gap:Spacing.md,width:'100%'},
  tpSection:{backgroundColor:Colors.surface,borderRadius:BorderRadius.lg,padding:Spacing.md,borderWidth:1,borderColor:Colors.cardBorder,gap:Spacing.sm},
  tpLabel:{color:Colors.textMuted,fontSize:FontSize.xs,fontWeight:FontWeight.black,letterSpacing:1.5},
  tpCards:{flexDirection:'row',gap:Spacing.sm,justifyContent:'center'},
  tpDivider:{backgroundColor:Colors.surfaceElevated,borderRadius:BorderRadius.md,padding:Spacing.sm,alignItems:'center',borderWidth:1,borderColor:Colors.primary+'40'},
  tpDividerText:{color:Colors.primary,fontSize:FontSize.sm,fontWeight:FontWeight.bold},
  tpActions:{flexDirection:'row',gap:Spacing.md},
  tpBtn:{flex:1,alignItems:'center',paddingVertical:Spacing.md,borderRadius:BorderRadius.pill,flexDirection:'row',justifyContent:'center',gap:6},
  tpBtnText:{color:'#FFF',fontSize:FontSize.md,fontWeight:FontWeight.bold},
  handHint:{color:Colors.gold,fontSize:FontSize.xs,fontWeight:FontWeight.bold,textAlign:'center'},
  // Slots
  slotContainer:{alignItems:'center',gap:Spacing.md,width:'100%'},
  slotMachine:{backgroundColor:Colors.surface,borderRadius:BorderRadius.xl,padding:Spacing.md,borderWidth:2,borderColor:Colors.gold,width:'100%',alignItems:'center',gap:Spacing.sm},
  slotLights:{flexDirection:'row',gap:Spacing.sm},
  slotLight:{width:12,height:12,borderRadius:6},
  reelsRow:{flexDirection:'row',gap:Spacing.md,alignItems:'center',justifyContent:'center'},
  reelCell:{width:72,height:72,backgroundColor:Colors.bgSecondary,borderRadius:BorderRadius.md,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:Colors.cardBorder},
  reelSym:{fontSize:40},
  payline:{height:3,backgroundColor:Colors.primary,width:'90%',borderRadius:2},
  // Dice
  diceContainer:{alignItems:'center',gap:Spacing.md,width:'100%'},
  diceBoard:{flexDirection:'row',alignItems:'center',gap:Spacing.lg,backgroundColor:Colors.surface,borderRadius:BorderRadius.xl,padding:Spacing.xl,borderWidth:1,borderColor:Colors.cardBorder,width:'100%'},
  dicePlayer:{flex:1,alignItems:'center',gap:8},
  diceLabel:{color:Colors.textMuted,fontSize:FontSize.xs,fontWeight:FontWeight.black,letterSpacing:1.5},
  dicePair:{flexDirection:'row',gap:Spacing.sm},
  diceEmoji:{fontSize:40},
  diceSum:{color:Colors.textPrimary,fontSize:FontSize.xxl,fontWeight:FontWeight.black},
  diceVs:{backgroundColor:Colors.primary+'25',borderRadius:BorderRadius.md,width:40,height:40,alignItems:'center',justifyContent:'center'},
  diceVsText:{color:Colors.primary,fontSize:FontSize.xs,fontWeight:FontWeight.black},
  // Coin Flip
  flipContainer:{alignItems:'center',gap:Spacing.md,width:'100%'},
  coinWrap:{backgroundColor:Colors.surface,borderRadius:50,width:100,height:100,alignItems:'center',justifyContent:'center',borderWidth:3,borderColor:Colors.gold},
  coinEmoji:{fontSize:56},
  flipInstruction:{color:Colors.textMuted,fontSize:FontSize.sm},
  flipChoices:{flexDirection:'row',gap:Spacing.md,width:'100%'},
  flipChoice:{flex:1,alignItems:'center',paddingVertical:Spacing.md,borderRadius:BorderRadius.lg,backgroundColor:Colors.surface,borderWidth:2,borderColor:Colors.cardBorder,gap:4},
  flipChoiceActive:{borderColor:Colors.gold,backgroundColor:Colors.gold+'20'},
  flipChoiceText:{color:Colors.textPrimary,fontSize:FontSize.sm,fontWeight:FontWeight.bold},
  // Blackjack
  bjContainer:{gap:Spacing.sm,width:'100%'},
  bjSection:{backgroundColor:Colors.surface,borderRadius:BorderRadius.lg,padding:Spacing.md,borderWidth:1,borderColor:Colors.cardBorder,gap:Spacing.sm},
  bjLabel:{color:Colors.textMuted,fontSize:FontSize.sm,fontWeight:FontWeight.bold},
  bjCards:{flexDirection:'row',gap:Spacing.sm,flexWrap:'wrap',minHeight:64},
  bjEmpty:{color:Colors.textMuted,fontSize:FontSize.xs,alignSelf:'center'},
  bjDivider:{height:1,backgroundColor:Colors.cardBorder,marginVertical:4},
  bjBtns:{flexDirection:'row',gap:Spacing.md},
  bjBtn:{flex:1,alignItems:'center',paddingVertical:Spacing.md,borderRadius:BorderRadius.pill},
  bjBtnText:{color:'#FFF',fontSize:FontSize.md,fontWeight:FontWeight.bold},
  // Shared
  resultBadge:{borderWidth:2,borderRadius:BorderRadius.md,padding:Spacing.md,alignItems:'center',width:'100%'},
  resultText:{fontWeight:FontWeight.bold,fontSize:FontSize.md,textAlign:'center'},
  spinBtn:{backgroundColor:Colors.primary,borderRadius:BorderRadius.pill,paddingVertical:Spacing.md,paddingHorizontal:Spacing.xl,alignItems:'center',width:'100%'},
  spinBtnText:{color:'#FFF',fontSize:FontSize.md,fontWeight:FontWeight.bold},
});

const S = StyleSheet.create({
  container:{flex:1,backgroundColor:Colors.bg},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:Spacing.md,paddingVertical:Spacing.sm},
  headerTitle:{color:Colors.textPrimary,fontSize:FontSize.lg,fontWeight:FontWeight.bold,flex:1,marginHorizontal:Spacing.sm},
  headerRight:{flexDirection:'row',gap:Spacing.xs},
  walletChip:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:Colors.surface,borderRadius:BorderRadius.pill,paddingHorizontal:Spacing.sm,paddingVertical:4,borderWidth:1,borderColor:Colors.cardBorder},
  walletText:{color:Colors.diamond,fontSize:FontSize.xs,fontWeight:FontWeight.bold},
  scroll:{padding:Spacing.md,paddingBottom:Spacing.xxl},
  gameContent:{padding:Spacing.md,paddingBottom:Spacing.xxl,alignItems:'center',gap:Spacing.md},
  statsBar:{flexDirection:'row',backgroundColor:Colors.surface,borderRadius:BorderRadius.lg,padding:Spacing.md,marginBottom:Spacing.md,borderWidth:1,borderColor:Colors.cardBorder},
  statItem:{flex:1,alignItems:'center'},
  statVal:{fontSize:FontSize.lg,fontWeight:FontWeight.black},
  statLbl:{color:Colors.textMuted,fontSize:10},
  statDiv:{width:1,backgroundColor:Colors.cardBorder,marginVertical:4},
  historyScroll:{marginBottom:Spacing.sm,maxHeight:36},
  historyChip:{backgroundColor:Colors.success+'20',borderRadius:BorderRadius.pill,paddingHorizontal:Spacing.sm,paddingVertical:4,borderWidth:1,borderColor:Colors.success+'50'},
  historyText:{color:Colors.success,fontSize:FontSize.xs,fontWeight:FontWeight.semibold},
  betSection:{marginBottom:Spacing.md},
  sectionTitle:{color:Colors.textPrimary,fontSize:FontSize.lg,fontWeight:FontWeight.bold,marginBottom:Spacing.sm},
  betRow:{flexDirection:'row',gap:Spacing.xs,flexWrap:'wrap'},
  betLabel:{color:Colors.textMuted,fontSize:FontSize.sm,alignSelf:'center'},
  betChip:{paddingHorizontal:Spacing.md,paddingVertical:Spacing.sm,borderRadius:BorderRadius.pill,backgroundColor:Colors.surface,borderWidth:1.5,borderColor:Colors.cardBorder},
  betChipActive:{backgroundColor:Colors.primary,borderColor:Colors.primary},
  betChipText:{color:Colors.textSecondary,fontSize:FontSize.sm,fontWeight:FontWeight.semibold},
  betChipTextActive:{color:'#FFF'},
  catRow:{paddingHorizontal:Spacing.md,gap:Spacing.sm,marginBottom:Spacing.sm},
  catChip:{paddingHorizontal:Spacing.md,paddingVertical:Spacing.sm,borderRadius:BorderRadius.pill,backgroundColor:Colors.surface,borderWidth:1,borderColor:Colors.cardBorder},
  catChipActive:{backgroundColor:Colors.secondary,borderColor:Colors.secondary},
  catChipText:{color:Colors.textSecondary,fontSize:FontSize.sm},
  catChipTextActive:{color:'#FFF',fontWeight:FontWeight.bold},
  gamesGrid:{flexDirection:'row',flexWrap:'wrap',gap:Spacing.sm,marginBottom:Spacing.lg},
  gameCard:{width:(width-Spacing.md*2-Spacing.sm)/2,backgroundColor:Colors.surface,borderRadius:BorderRadius.xl,padding:Spacing.md,gap:6,borderWidth:1.5},
  gameIconBg:{width:68,height:68,borderRadius:34,alignItems:'center',justifyContent:'center'},
  categoryTag:{alignSelf:'flex-start',borderRadius:BorderRadius.pill,paddingHorizontal:Spacing.xs,paddingVertical:2},
  categoryTagText:{fontSize:10,fontWeight:FontWeight.bold},
  gameName:{color:Colors.textPrimary,fontSize:FontSize.md,fontWeight:FontWeight.bold},
  gameDesc:{color:Colors.textMuted,fontSize:FontSize.xs,lineHeight:16},
  gameFooter:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  gameBet:{color:Colors.textMuted,fontSize:FontSize.xs},
  maxWinBadge:{borderRadius:BorderRadius.pill,paddingHorizontal:7,paddingVertical:2},
  maxWinText:{fontSize:FontSize.xs,fontWeight:FontWeight.bold},
  playBtn:{borderRadius:BorderRadius.pill,paddingVertical:8,alignItems:'center',marginTop:4},
  playBtnText:{color:'#FFF',fontSize:FontSize.xs,fontWeight:FontWeight.bold},
  gameActions:{gap:Spacing.sm,width:'100%',marginTop:Spacing.md},
  playAgainBtn:{backgroundColor:Colors.primary,borderRadius:BorderRadius.pill,paddingVertical:Spacing.md,alignItems:'center'},
  playAgainText:{color:'#FFF',fontSize:FontSize.md,fontWeight:FontWeight.bold},
  backToGamesBtn:{paddingVertical:Spacing.sm,borderRadius:BorderRadius.pill,borderWidth:1,borderColor:Colors.cardBorder,alignItems:'center'},
  backToGamesBtnText:{color:Colors.textMuted,fontSize:FontSize.sm},
  tasksBanner:{flexDirection:'row',alignItems:'center',gap:Spacing.md,backgroundColor:Colors.primary+'15',borderRadius:BorderRadius.xl,padding:Spacing.md,marginBottom:Spacing.md,borderWidth:1,borderColor:Colors.primary+'30'},
  tasksBannerTitle:{color:Colors.textPrimary,fontSize:FontSize.sm,fontWeight:FontWeight.bold},
  tasksBannerSub:{color:Colors.textMuted,fontSize:FontSize.xs},
  disclaimer:{flexDirection:'row',gap:Spacing.sm,backgroundColor:Colors.surface,borderRadius:BorderRadius.md,padding:Spacing.md,borderWidth:1,borderColor:Colors.cardBorder},
  disclaimerText:{flex:1,color:Colors.textMuted,fontSize:FontSize.xs,lineHeight:16},
});
