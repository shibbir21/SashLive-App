// SashLive — config with expanded games list
export const APP_CONFIG = {
  name: 'SashLive',
  tagline: 'Go Live. Connect. Earn.',
  version: '1.0.0',
  currency: {
    diamond: 'Diamond',
    coin: 'S-Coin',
    diamondSymbol: '💎',
    coinSymbol: '🪙',
  },
  rechargeRate: 10,
  conversionRate: 100,
  withdrawMin: 100,
  supportEmail: 'support@sashlive.app',
};

export const GIFTS = [
  { id: 'g1',  name: 'Rose',       icon: '🌹',  price: 1,     category: 'basic',   animation: 'float' },
  { id: 'g2',  name: 'Heart',      icon: '💗',  price: 5,     category: 'basic',   animation: 'bounce' },
  { id: 'g3',  name: 'Star',       icon: '⭐',  price: 10,    category: 'basic',   animation: 'spin' },
  { id: 'g4',  name: 'Bomb',       icon: '💣',  price: 20,    category: 'basic',   animation: 'explode' },
  { id: 'g5',  name: 'Crown',      icon: '👑',  price: 50,    category: 'premium', animation: 'glow' },
  { id: 'g6',  name: 'Rocket',     icon: '🚀',  price: 100,   category: 'premium', animation: 'launch' },
  { id: 'g7',  name: 'Diamond',    icon: '💎',  price: 500,   category: 'luxury',  animation: 'explode' },
  { id: 'g8',  name: 'Galaxy',     icon: '🌌',  price: 1000,  category: 'luxury',  animation: 'galaxy' },
  { id: 'g9',  name: 'Dragon',     icon: '🐉',  price: 5000,  category: 'legend',  animation: 'dragon' },
  { id: 'g10', name: 'Universe',   icon: '🌠',  price: 9999,  category: 'legend',  animation: 'universe' },
  { id: 'g11', name: 'Kiss',       icon: '💋',  price: 3,     category: 'basic',   animation: 'float' },
  { id: 'g12', name: 'Balloon',    icon: '🎈',  price: 8,     category: 'basic',   animation: 'float' },
  { id: 'g13', name: 'Cake',       icon: '🎂',  price: 30,    category: 'premium', animation: 'bounce' },
  { id: 'g14', name: 'Sports Car', icon: '🏎️',  price: 2000,  category: 'luxury',  animation: 'drive' },
  { id: 'g15', name: 'Castle',     icon: '🏰',  price: 3000,  category: 'luxury',  animation: 'explode' },
];

export const VIP_LEVELS = [
  { level: 1, name: 'Rookie',   minExp: 0,       color: '#CD7F32', badge: '🥉', perks: ['Basic chat frames'] },
  { level: 2, name: 'Rising',   minExp: 1000,    color: '#C0C0C0', badge: '🥈', perks: ['Silver frame', 'Priority support'] },
  { level: 3, name: 'Star',     minExp: 5000,    color: '#FFCC00', badge: '⭐', perks: ['Gold frame', 'Star badge', 'Room priority'] },
  { level: 4, name: 'Legend',   minExp: 20000,   color: '#00DFFF', badge: '💎', perks: ['Diamond frame', 'Entry FX', 'Exclusive gifts'] },
  { level: 5, name: 'Elite',    minExp: 100000,  color: '#FF2E8B', badge: '👑', perks: ['Crown frame', 'Dragon entry', 'All perks'] },
];

export const RECHARGE_PLANS = [
  { id: 'r1', diamonds: 100,   price: 0.99,  label: 'Trial',    bonus: 0,   popular: false, icon: '💎' },
  { id: 'r2', diamonds: 500,   price: 4.99,  label: 'Starter',  bonus: 10,  popular: false, icon: '💎' },
  { id: 'r3', diamonds: 1200,  price: 9.99,  label: 'Popular',  bonus: 20,  popular: true,  icon: '💎' },
  { id: 'r4', diamonds: 2600,  price: 19.99, label: 'Value',    bonus: 30,  popular: false, icon: '💎' },
  { id: 'r5', diamonds: 6800,  price: 49.99, label: 'Premium',  bonus: 50,  popular: false, icon: '👑' },
  { id: 'r6', diamonds: 14000, price: 99.99, label: 'Elite',    bonus: 100, popular: false, icon: '🌌' },
];

export const GAMES_LIST = [
  { id: 'teen_patti', name: 'Teen Patti',   icon: '🃏', description: 'Classic 3-card Indian poker',   minBet: 20,  color: '#E91E8C', maxWin: '2x' },
  { id: 'slots',      name: 'Slots',         icon: '🎰', description: 'Spin slots to win prizes',      minBet: 5,   color: '#FF8C00', maxWin: '50x' },
  { id: 'roulette',   name: 'Roulette',      icon: '🎡', description: 'Classic casino roulette',       minBet: 10,  color: '#DC143C', maxWin: '35x' },
  { id: 'lucky_spin', name: 'Lucky Spin',    icon: '🎰', description: 'Spin to win diamonds',          minBet: 10,  color: '#FF2E8B', maxWin: '20x' },
  { id: 'dice',       name: 'Dice Battle',   icon: '🎲', description: 'Roll and beat opponents',       minBet: 20,  color: '#9B30FF', maxWin: '6x' },
  { id: 'blackjack',  name: 'Blackjack 21',  icon: '🃏', description: 'Beat dealer to 21',            minBet: 20,  color: '#00E676', maxWin: '2x' },
  { id: 'num_guess',  name: 'Number Guess',  icon: '🔢', description: '3 chances to guess 1–10',      minBet: 10,  color: '#00DFFF', maxWin: '9x' },
  { id: 'flip',       name: 'Coin Flip',     icon: '🪙', description: 'Heads or tails double up',     minBet: 5,   color: '#FFCC00', maxWin: '2x' },
  { id: 'treasure',   name: 'Treasure Hunt', icon: '🗺️', description: 'Find 3 treasures, avoid traps', minBet: 50, color: '#FF8C00', maxWin: '20x' },
];

export const AGENCY_TIERS = [
  { tier: 'Bronze', minHosts: 1,  commission: 5,  badge: '🥉', color: '#CD7F32' },
  { tier: 'Silver', minHosts: 5,  commission: 8,  badge: '🥈', color: '#C0C0C0' },
  { tier: 'Gold',   minHosts: 10, commission: 12, badge: '🥇', color: '#FFCC00' },
  { tier: 'Elite',  minHosts: 20, commission: 15, badge: '👑', color: '#FF2E8B' },
];

export const PAYMENT_METHODS = [
  { id: 'bkash',  name: 'bKash',         icon: '📱', color: '#E2136E', regions: ['BD'] },
  { id: 'nagad',  name: 'Nagad',          icon: '💰', color: '#F7941D', regions: ['BD'] },
  { id: 'bank',   name: 'Bank Transfer',  icon: '🏦', color: '#1565C0', regions: ['ALL'] },
  { id: 'paypal', name: 'PayPal',         icon: '🅿️', color: '#003087', regions: ['ALL'] },
  { id: 'crypto', name: 'USDT/Crypto',    icon: '₿',  color: '#F7931A', regions: ['ALL'] },
  { id: 'visa',   name: 'Visa/Mastercard',icon: '💳', color: '#1A1F71', regions: ['ALL'] },
];

export const LIVE_STREAM_RULES = [
  'No nudity or sexually explicit content',
  'No hate speech or discrimination',
  'No violence or self-harm',
  'No sharing of personal information',
  'No copyright infringement',
  'Be respectful to viewers and other hosts',
];
