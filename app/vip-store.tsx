// SashLive — VIP Store with Real Tier Purchases, Badges, Chat Colors & Profile Frames
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal,
  Animated, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { useAlert } from '@/template';
import { useAuth } from '@/template';
import { getSupabaseClient } from '@/template';

const { width } = Dimensions.get('window');

// ── VIP Tiers with real perks, frame, badge, chat color ──
const VIP_TIERS = [
  {
    level: 1,
    name: 'Bronze VIP',
    badge: '🥉',
    color: '#CD7F32',
    gradient: ['#CD7F32', '#A0522D'] as [string, string],
    diamonds: 500,
    chatColor: '#CD7F32',
    frame: '🟫',
    perks: ['Bronze chat color', 'Bronze avatar frame', 'Access to Bronze exclusive gifts', 'Priority room entry'],
    exclusive: ['Bronze Rose', 'Bronze Star'],
    monthlyBonus: 50,
  },
  {
    level: 2,
    name: 'Silver VIP',
    badge: '🥈',
    color: '#C0C0C0',
    gradient: ['#C0C0C0', '#808080'] as [string, string],
    diamonds: 2000,
    chatColor: '#C0C0C0',
    frame: '⬜',
    perks: ['Silver chat color', 'Silver avatar frame', 'Exclusive silver entry effect', '2x daily task bonus', 'VIP room access'],
    exclusive: ['Silver Moon', 'Silver Wind'],
    monthlyBonus: 150,
  },
  {
    level: 3,
    name: 'Gold VIP',
    badge: '⭐',
    color: Colors.gold,
    gradient: [Colors.gold, '#FF8C00'] as [string, string],
    diamonds: 8000,
    chatColor: Colors.gold,
    frame: '🟡',
    perks: ['Gold chat color & bold', 'Animated gold frame', 'Gold sparkle entry', '3x daily bonus', 'VIP lounge access', 'Featured in home carousel'],
    exclusive: ['Gold Crown', 'Gold Dragon'],
    monthlyBonus: 400,
  },
  {
    level: 4,
    name: 'Diamond VIP',
    badge: '💎',
    color: Colors.diamond,
    gradient: [Colors.diamond, '#0099CC'] as [string, string],
    diamonds: 25000,
    chatColor: Colors.diamond,
    frame: '🔷',
    perks: ['Diamond cyan chat color', 'Animated diamond frame', 'Diamond burst entry', '5x daily bonus', 'All VIP rooms', 'Profile highlight badge', 'Priority gift animations'],
    exclusive: ['Diamond Rocket', 'Diamond Galaxy'],
    monthlyBonus: 1000,
  },
  {
    level: 5,
    name: 'Crown VIP',
    badge: '👑',
    color: Colors.primary,
    gradient: [Colors.primary, Colors.secondary] as [string, string],
    diamonds: 80000,
    chatColor: Colors.primary,
    frame: '💜',
    perks: ['Crown magenta chat + glow', 'Animated crown frame', 'Dragon fire entry FX', '10x daily bonus', 'Crown exclusive lounge', 'Global profile spotlight', 'All exclusive gifts', 'Monthly diamond bonus'],
    exclusive: ['Crown Universe', 'Crown Throne'],
    monthlyBonus: 3000,
  },
];

// ── Store items (cosmetics) ──
const STORE_ITEMS = [
  { id: 'frame_star',     name: 'Star Frame',       icon: '⭐', type: 'frame',   price: 800,   color: Colors.gold,      duration: 30,   vipRequired: 0 },
  { id: 'frame_heart',    name: 'Heart Frame',       icon: '💗', type: 'frame',   price: 1200,  color: '#FF4488',        duration: 30,   vipRequired: 0 },
  { id: 'frame_galaxy',   name: 'Galaxy Frame',      icon: '🌌', type: 'frame',   price: 3000,  color: Colors.secondary, duration: 30,   vipRequired: 2 },
  { id: 'frame_crown',    name: 'Crown Frame',       icon: '👑', type: 'frame',   price: 8000,  color: Colors.gold,      duration: 30,   vipRequired: 4 },
  { id: 'effect_rose',    name: 'Rose Entry',        icon: '🌹', type: 'effect',  price: 500,   color: '#FF4088',        duration: 7,    vipRequired: 0 },
  { id: 'effect_dragon',  name: 'Dragon Entry',      icon: '🐉', type: 'effect',  price: 5000,  color: Colors.live,      duration: 14,   vipRequired: 3 },
  { id: 'effect_stars',   name: 'Shooting Stars',    icon: '🌠', type: 'effect',  price: 2000,  color: Colors.diamond,   duration: 14,   vipRequired: 1 },
  { id: 'bg_neon',        name: 'Neon City',         icon: '🏙️', type: 'bg',      price: 1500,  color: Colors.primary,   duration: 14,   vipRequired: 1 },
  { id: 'bg_ocean',       name: 'Deep Ocean',        icon: '🌊', type: 'bg',      price: 2500,  color: Colors.diamond,   duration: 14,   vipRequired: 2 },
  { id: 'chat_color_gold',name: 'Gold Chat',         icon: '💛', type: 'chat',    price: 1000,  color: Colors.gold,      duration: 30,   vipRequired: 0 },
  { id: 'chat_color_cyan', name: 'Cyan Chat',        icon: '🩵', type: 'chat',    price: 2000,  color: Colors.diamond,   duration: 30,   vipRequired: 2 },
  { id: 'gift_throne',    name: 'Royal Throne',      icon: '🪑', type: 'gift',    price: 6000,  color: Colors.gold,      duration: null, vipRequired: 3 },
  { id: 'gift_spaceship', name: 'Spaceship',         icon: '🛸', type: 'gift',    price: 4000,  color: Colors.diamond,   duration: null, vipRequired: 2 },
  { id: 'badge_hot',      name: 'HOT Badge',         icon: '🔥', type: 'badge',   price: 300,   color: Colors.live,      duration: 7,    vipRequired: 0 },
  { id: 'badge_new',      name: 'RISING Badge',      icon: '📈', type: 'badge',   price: 500,   color: Colors.success,   duration: 14,   vipRequired: 0 },
];

type ItemType = 'all' | 'frame' | 'effect' | 'chat' | 'gift' | 'badge' | 'bg';

function VIPTierCard({
  tier, isOwned, isCurrent, onBuy, onPress,
}: {
  tier: typeof VIP_TIERS[0];
  isOwned: boolean;
  isCurrent: boolean;
  onBuy: () => void;
  onPress: () => void;
}) {
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (isCurrent) {
      Animated.loop(Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
      ])).start();
    }
  }, [isCurrent]);

  return (
    <Pressable
      style={[T.card, { borderColor: tier.color + '60' }, isCurrent && { borderColor: tier.color, borderWidth: 2.5 }]}
      onPress={onPress}
      onPressIn={() => Animated.spring(bounceAnim, { toValue: 0.96, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(bounceAnim, { toValue: 1, useNativeDriver: true, tension: 200 }).start()}
    >
      <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
        <LinearGradient colors={tier.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={T.cardGrad}>
          {isCurrent && (
            <Animated.View style={[T.currentBadge, { opacity: glowAnim }]}>
              <Text style={T.currentBadgeText}>✓ CURRENT</Text>
            </Animated.View>
          )}
          {isOwned && !isCurrent && (
            <View style={[T.currentBadge, { backgroundColor: Colors.success }]}>
              <Text style={T.currentBadgeText}>✓ OWNED</Text>
            </View>
          )}

          {/* Tier header */}
          <View style={T.cardHeader}>
            <Text style={{ fontSize: 40 }}>{tier.badge}</Text>
            <View style={{ flex: 1 }}>
              <Text style={T.cardName}>{tier.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <View style={[T.chatColorDot, { backgroundColor: tier.chatColor }]} />
                <Text style={T.chatColorLabel}>Chat: </Text>
                <Text style={[T.chatColorLabel, { color: tier.chatColor, fontWeight: FontWeight.bold }]}>{tier.name}</Text>
              </View>
            </View>
            <View style={T.priceTag}>
              <Text style={T.priceTagText}>💎 {tier.diamonds.toLocaleString()}</Text>
            </View>
          </View>

          {/* Perks */}
          <View style={T.perksWrap}>
            {tier.perks.slice(0, 4).map((perk, i) => (
              <View key={i} style={T.perkRow}>
                <Text style={{ fontSize: 10 }}>✓</Text>
                <Text style={T.perkText}>{perk}</Text>
              </View>
            ))}
          </View>

          {/* Exclusive gifts + monthly bonus */}
          <View style={T.exclusiveRow}>
            <View style={T.exclusiveChip}>
              <Text style={T.exclusiveText}>🎁 Exclusive: {tier.exclusive.join(', ')}</Text>
            </View>
            <View style={[T.exclusiveChip, { backgroundColor: Colors.gold + '30' }]}>
              <Text style={[T.exclusiveText, { color: Colors.gold }]}>+{tier.monthlyBonus}💎/mo bonus</Text>
            </View>
          </View>

          {/* Buy button */}
          <Pressable
            style={[T.buyBtn, isOwned && T.buyBtnOwned]}
            onPress={isOwned ? undefined : onBuy}
            disabled={isOwned}
          >
            <Text style={[T.buyBtnText, isOwned && { color: Colors.textMuted }]}>
              {isOwned ? `${tier.badge} Activated` : `Upgrade to ${tier.name}`}
            </Text>
          </Pressable>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

export default function VIPStoreScreen() {
  const router = useRouter();
  const { currentUser, updateDiamonds, updateUser } = useApp();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [activeTab, setActiveTab] = useState<'vip' | 'shop'>('vip');
  const [itemFilter, setItemFilter] = useState<ItemType>('all');
  const [ownedItems, setOwnedItems] = useState<string[]>([]);
  const [ownedVipLevels, setOwnedVipLevels] = useState<number[]>(
    currentUser.vipLevel > 0 ? Array.from({ length: currentUser.vipLevel }, (_, i) => i + 1) : []
  );
  const [selectedItem, setSelectedItem] = useState<typeof STORE_ITEMS[0] | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const currentVip = VIP_TIERS.find(t => t.level === currentUser.vipLevel) || null;
  const nextVip = VIP_TIERS.find(t => t.level === (currentUser.vipLevel || 0) + 1);

  const handleBuyVIP = async (tier: typeof VIP_TIERS[0]) => {
    if (currentUser.diamonds < tier.diamonds) {
      showAlert('Not Enough Diamonds', `You need ${tier.diamonds.toLocaleString()} 💎 to unlock ${tier.name}.`, [
        { text: '💎 Recharge', onPress: () => router.push('/recharge') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }

    showAlert(
      `Upgrade to ${tier.name}?`,
      `${tier.diamonds.toLocaleString()} 💎 will be deducted.\n\nYou get:\n${tier.perks.slice(0, 3).join('\n')}\n\n+${tier.monthlyBonus}💎 monthly bonus`,
      [
        {
          text: `${tier.badge} Confirm`,
          onPress: async () => {
            setPurchasing(true);
            updateDiamonds(-tier.diamonds);
            setOwnedVipLevels(prev => [...new Set([...prev, tier.level])]);
            updateUser({ vipLevel: Math.max(currentUser.vipLevel, tier.level) });

            if (user?.id) {
              const supabase = getSupabaseClient();
              await supabase
                .from('user_profiles')
                .update({ vip_level: Math.max(currentUser.vipLevel, tier.level) })
                .eq('id', user.id);
            }
            setPurchasing(false);
            showAlert(`${tier.badge} Welcome to ${tier.name}!`, `Your chat color is now ${tier.name}! Enjoy all premium perks.`);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleBuyItem = (item: typeof STORE_ITEMS[0]) => {
    if ((currentUser.vipLevel || 0) < item.vipRequired) {
      showAlert('VIP Required', `This item requires VIP Level ${item.vipRequired}. Upgrade your VIP to unlock it!`);
      return;
    }
    if (currentUser.diamonds < item.price) {
      showAlert('Not Enough Diamonds', `You need ${item.price} 💎`, [
        { text: '💎 Recharge', onPress: () => router.push('/recharge') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }

    showAlert(
      `Buy ${item.name}?`,
      `${item.price} 💎${item.duration ? ` · Valid ${item.duration} days` : ' · Permanent'}`,
      [
        {
          text: 'Buy',
          onPress: () => {
            updateDiamonds(-item.price);
            setOwnedItems(prev => [...prev, item.id]);
            setSelectedItem(null);
            showAlert('🎉 Purchased!', `${item.icon} ${item.name} activated!`);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const filteredItems = itemFilter === 'all' ? STORE_ITEMS : STORE_ITEMS.filter(i => i.type === itemFilter);

  const ITEM_TABS: { key: ItemType; label: string; icon: string }[] = [
    { key: 'all',    label: 'All',     icon: '🛍️' },
    { key: 'frame',  label: 'Frames',  icon: '🖼️' },
    { key: 'effect', label: 'Effects', icon: '✨' },
    { key: 'chat',   label: 'Chat',    icon: '💬' },
    { key: 'gift',   label: 'Gifts',   icon: '🎁' },
    { key: 'badge',  label: 'Badges',  icon: '📛' },
    { key: 'bg',     label: 'Rooms',   icon: '🏠' },
  ];

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      {/* Header */}
      <Animated.View style={[S.header, { opacity: headerAnim }]}>
        <Pressable onPress={() => router.back()} style={S.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={S.title}>👑 VIP Store</Text>
          <Text style={S.subtitle}>
            {currentVip ? `${currentVip.badge} ${currentVip.name}` : 'No VIP · Free tier'}
          </Text>
        </View>
        <Pressable style={S.walletChip} onPress={() => router.push('/wallet')}>
          <Text>💎</Text>
          <Text style={S.walletChipText}>{currentUser.diamonds.toLocaleString()}</Text>
        </Pressable>
      </Animated.View>

      {/* Current VIP banner */}
      {currentVip ? (
        <LinearGradient colors={currentVip.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.currentVIPBanner}>
          <Text style={{ fontSize: 32 }}>{currentVip.badge}</Text>
          <View style={{ flex: 1 }}>
            <Text style={S.currentVIPName}>{currentVip.name} Member</Text>
            <Text style={S.currentVIPSub}>Chat color: <Text style={{ color: currentVip.chatColor, fontWeight: FontWeight.bold }}>{currentVip.name}</Text></Text>
          </View>
          <View style={S.currentVIPBonus}>
            <Text style={S.currentVIPBonusText}>+{currentVip.monthlyBonus}💎/mo</Text>
          </View>
        </LinearGradient>
      ) : (
        <View style={S.noVIPBanner}>
          <Text style={{ fontSize: 22 }}>👑</Text>
          <View style={{ flex: 1 }}>
            <Text style={S.noVIPTitle}>Unlock VIP Benefits</Text>
            <Text style={S.noVIPSub}>Get chat colors, frames, entry effects & more</Text>
          </View>
        </View>
      )}

      {/* Tab selector */}
      <View style={S.tabRow}>
        <Pressable style={[S.tab, activeTab === 'vip' && S.tabActive]} onPress={() => setActiveTab('vip')}>
          <Text style={[S.tabText, activeTab === 'vip' && S.tabTextActive]}>👑 VIP Tiers</Text>
        </Pressable>
        <Pressable style={[S.tab, activeTab === 'shop' && S.tabActive]} onPress={() => setActiveTab('shop')}>
          <Text style={[S.tabText, activeTab === 'shop' && S.tabTextActive]}>🛍️ Item Shop</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}>

        {/* ── VIP TIERS ── */}
        {activeTab === 'vip' && (
          <>
            {/* Chat color preview */}
            <View style={S.chatPreview}>
              <Text style={S.chatPreviewLabel}>Chat Preview</Text>
              <View style={S.chatPreviewRow}>
                {VIP_TIERS.map(tier => (
                  <View key={tier.level} style={S.chatPreviewItem}>
                    <View style={[S.chatColorDot, { backgroundColor: tier.chatColor }]} />
                    <Text style={[S.chatPreviewName, { color: tier.chatColor }]} numberOfLines={1}>{tier.badge}</Text>
                    <Text style={S.chatPreviewLvl}>Lv{tier.level}</Text>
                  </View>
                ))}
              </View>
              <View style={S.chatMsgPreview}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                  Your name:{' '}
                  <Text style={{ color: currentVip?.chatColor || Colors.textMuted, fontWeight: FontWeight.bold }}>
                    {currentUser.displayName}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)' }}> {currentVip ? `is ${currentVip.name}` : '(no VIP)'}</Text>
                </Text>
              </View>
            </View>

            {/* VIP tier cards */}
            {VIP_TIERS.map(tier => (
              <VIPTierCard
                key={tier.level}
                tier={tier}
                isOwned={ownedVipLevels.includes(tier.level)}
                isCurrent={currentUser.vipLevel === tier.level}
                onBuy={() => handleBuyVIP(tier)}
                onPress={() => handleBuyVIP(tier)}
              />
            ))}

            {/* Comparison table */}
            <View style={S.compareCard}>
              <Text style={S.compareTitle}>📊 Feature Comparison</Text>
              <View style={S.compareRow}>
                <Text style={[S.compareCell, S.compareCellHeader, { flex: 1.6 }]}>Feature</Text>
                {VIP_TIERS.map(t => (
                  <Text key={t.level} style={[S.compareCell, S.compareCellHeader, { color: t.color }]}>{t.badge}</Text>
                ))}
              </View>
              {[
                { label: 'Chat Color', vals: ['🟫', '⬜', '🟡', '🔷', '💜'] },
                { label: 'Avatar Frame', vals: ['Basic', 'Silver', 'Gold', 'Diamond', 'Crown'] },
                { label: 'Entry Effect', vals: ['—', '✓', '✓✓', '✓✓✓', '🐉'] },
                { label: 'Daily Bonus', vals: ['1x', '2x', '3x', '5x', '10x'] },
                { label: 'Exclusive Gifts', vals: ['2', '4', '6', '8', '∞'] },
              ].map(row => (
                <View key={row.label} style={[S.compareRow, { backgroundColor: Colors.bgSecondary }]}>
                  <Text style={[S.compareCell, { flex: 1.6, color: Colors.textSecondary }]}>{row.label}</Text>
                  {row.vals.map((v, i) => (
                    <Text key={i} style={[S.compareCell, { color: VIP_TIERS[i].color }]}>{v}</Text>
                  ))}
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── ITEM SHOP ── */}
        {activeTab === 'shop' && (
          <>
            {/* Filter tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.xs, marginBottom: Spacing.md }}>
              {ITEM_TABS.map(tab => (
                <Pressable
                  key={tab.key}
                  style={[S.filterChip, itemFilter === tab.key && S.filterChipActive]}
                  onPress={() => setItemFilter(tab.key)}
                >
                  <Text style={{ fontSize: 14 }}>{tab.icon}</Text>
                  <Text style={[S.filterChipText, itemFilter === tab.key && S.filterChipTextActive]}>{tab.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Items grid */}
            <View style={S.itemGrid}>
              {filteredItems.map(item => {
                const owned = ownedItems.includes(item.id);
                const locked = (currentUser.vipLevel || 0) < item.vipRequired;
                return (
                  <Pressable
                    key={item.id}
                    style={[S.itemCard, { borderColor: item.color + '50' }, owned && S.itemCardOwned, locked && S.itemCardLocked]}
                    onPress={() => setSelectedItem(item)}
                  >
                    {owned && <View style={S.ownedBadge}><Text style={S.ownedBadgeText}>✓</Text></View>}
                    {locked && (
                      <View style={S.lockedBadge}>
                        <MaterialIcons name="lock" size={10} color="#FFF" />
                        <Text style={S.lockedBadgeText}>VIP{item.vipRequired}</Text>
                      </View>
                    )}
                    <View style={[S.itemIconBg, { backgroundColor: item.color + '20' }]}>
                      <Text style={{ fontSize: 36 }}>{item.icon}</Text>
                    </View>
                    <Text style={S.itemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={S.itemType}>{item.type.toUpperCase()}</Text>
                    {item.duration ? <Text style={S.itemDuration}>{item.duration}d</Text> : null}
                    <View style={[S.itemPriceBtn, { backgroundColor: owned ? Colors.surfaceElevated : item.color + '30', borderColor: item.color + '50' }]}>
                      <Text style={[S.itemPriceBtnText, { color: owned ? Colors.textMuted : item.color }]}>
                        {owned ? '✓ Active' : `💎 ${item.price.toLocaleString()}`}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Item Detail Modal */}
      <Modal visible={selectedItem !== null} transparent animationType="slide" onRequestClose={() => setSelectedItem(null)}>
        <Pressable style={S.modalBg} onPress={() => setSelectedItem(null)}>
          <View style={S.modalCard}>
            {selectedItem ? (
              <>
                <View style={[S.modalIconBg, { backgroundColor: selectedItem.color + '20' }]}>
                  <Text style={{ fontSize: 60 }}>{selectedItem.icon}</Text>
                </View>
                <Text style={S.modalName}>{selectedItem.name}</Text>
                <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
                  <View style={[S.modalTypeBadge, { backgroundColor: selectedItem.color + '25', borderColor: selectedItem.color + '50' }]}>
                    <Text style={[S.modalTypeText, { color: selectedItem.color }]}>{selectedItem.type.toUpperCase()}</Text>
                  </View>
                  {selectedItem.duration ? (
                    <View style={S.modalTypeBadge}>
                      <MaterialIcons name="access-time" size={11} color={Colors.textMuted} />
                      <Text style={S.modalTypeText}>{selectedItem.duration} days</Text>
                    </View>
                  ) : (
                    <View style={S.modalTypeBadge}>
                      <Text style={[S.modalTypeText, { color: Colors.success }]}>Permanent</Text>
                    </View>
                  )}
                  {selectedItem.vipRequired > 0 && (
                    <View style={[S.modalTypeBadge, { borderColor: Colors.gold + '50', backgroundColor: Colors.gold + '15' }]}>
                      <Text style={[S.modalTypeText, { color: Colors.gold }]}>VIP{selectedItem.vipRequired}+</Text>
                    </View>
                  )}
                </View>

                <View style={S.modalPriceRow}>
                  <Text style={S.modalPriceLabel}>Price</Text>
                  <Text style={[S.modalPrice, { color: selectedItem.color }]}>💎 {selectedItem.price.toLocaleString()}</Text>
                </View>
                <View style={S.modalBalanceRow}>
                  <Text style={S.modalBalLabel}>Your Balance</Text>
                  <Text style={[S.modalBalVal, { color: currentUser.diamonds >= selectedItem.price ? Colors.success : Colors.error }]}>
                    💎 {currentUser.diamonds.toLocaleString()}
                  </Text>
                </View>

                <Pressable
                  style={[S.modalBuyBtn, { backgroundColor: selectedItem.color },
                    ownedItems.includes(selectedItem.id) && S.modalBuyBtnOwned,
                    (currentUser.vipLevel || 0) < selectedItem.vipRequired && { backgroundColor: Colors.textMuted }
                  ]}
                  onPress={() => {
                    if (ownedItems.includes(selectedItem.id)) { setSelectedItem(null); return; }
                    handleBuyItem(selectedItem);
                  }}
                  disabled={purchasing}
                >
                  {purchasing ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={[S.modalBuyBtnText, ownedItems.includes(selectedItem.id) && { color: Colors.textMuted }]}>
                      {ownedItems.includes(selectedItem.id)
                        ? '✓ Already Owned'
                        : (currentUser.vipLevel || 0) < selectedItem.vipRequired
                          ? `🔒 Requires VIP ${selectedItem.vipRequired}`
                          : `Buy · 💎 ${selectedItem.price.toLocaleString()}`
                      }
                    </Text>
                  )}
                </Pressable>
                <Pressable style={S.modalCancelBtn} onPress={() => setSelectedItem(null)}>
                  <Text style={S.modalCancelBtnText}>Cancel</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// Tier card styles
const T = StyleSheet.create({
  card: { borderRadius: BorderRadius.xl, overflow: 'hidden', marginBottom: Spacing.md, borderWidth: 1.5 },
  cardGrad: { padding: Spacing.lg, gap: Spacing.sm, position: 'relative' },
  currentBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: BorderRadius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  currentBadgeText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black, letterSpacing: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardName: { color: '#FFF', fontSize: FontSize.lg, fontWeight: FontWeight.black, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  chatColorDot: { width: 10, height: 10, borderRadius: 5 },
  chatColorLabel: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs },
  priceTag: { backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: BorderRadius.pill, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  priceTagText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.black },
  perksWrap: { gap: 4 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  perkText: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.xs, lineHeight: 18 },
  exclusiveRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  exclusiveChip: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: BorderRadius.pill, paddingHorizontal: 8, paddingVertical: 4 },
  exclusiveText: { color: 'rgba(255,255,255,0.8)', fontSize: 10 },
  buyBtn: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: BorderRadius.pill, paddingVertical: Spacing.sm, alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' },
  buyBtnOwned: { backgroundColor: 'rgba(0,0,0,0.25)', borderColor: 'rgba(255,255,255,0.2)' },
  buyBtnText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.black },
});

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  subtitle: { color: Colors.textMuted, fontSize: FontSize.xs },
  walletChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surface, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderWidth: 1, borderColor: Colors.cardBorder },
  walletChipText: { color: Colors.diamond, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  currentVIPBanner: { marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderRadius: BorderRadius.lg, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  currentVIPName: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  currentVIPSub: { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.xs },
  currentVIPBonus: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  currentVIPBonusText: { color: Colors.gold, fontSize: 10, fontWeight: FontWeight.bold },
  noVIPBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.gold + '40' },
  noVIPTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  noVIPSub: { color: Colors.textMuted, fontSize: FontSize.xs },
  tabRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.xs },
  tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  tabTextActive: { color: '#FFF', fontWeight: FontWeight.bold },
  chatPreview: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.cardBorder, gap: Spacing.sm },
  chatPreviewLabel: { color: Colors.textMuted, fontSize: FontSize.xs, textTransform: 'uppercase', letterSpacing: 1, fontWeight: FontWeight.bold },
  chatPreviewRow: { flexDirection: 'row', justifyContent: 'space-around' },
  chatPreviewItem: { alignItems: 'center', gap: 3 },
  chatColorDot: { width: 12, height: 12, borderRadius: 6 },
  chatPreviewName: { fontSize: 16 },
  chatPreviewLvl: { color: Colors.textMuted, fontSize: 9 },
  chatMsgPreview: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: BorderRadius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder },
  compareCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.md, borderWidth: 1, borderColor: Colors.cardBorder, gap: Spacing.xs, marginBottom: Spacing.md },
  compareTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.xs },
  compareRow: { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.sm, paddingVertical: 5 },
  compareCell: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.xs, textAlign: 'center' },
  compareCellHeader: { color: Colors.textMuted, fontWeight: FontWeight.bold, fontSize: 9 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { color: Colors.textSecondary, fontSize: FontSize.xs },
  filterChipTextActive: { color: '#FFF', fontWeight: FontWeight.bold },
  itemGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  itemCard: { width: (width - Spacing.md * 2 - Spacing.sm) / 2, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.md, alignItems: 'center', gap: 5, borderWidth: 1.5, position: 'relative', overflow: 'hidden' },
  itemCardOwned: { borderColor: Colors.success + '70', backgroundColor: Colors.success + '08' },
  itemCardLocked: { opacity: 0.65 },
  ownedBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: Colors.success, borderRadius: 8, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  ownedBadgeText: { color: '#FFF', fontSize: 10, fontWeight: FontWeight.black },
  lockedBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: Colors.textMuted, borderRadius: BorderRadius.pill, paddingHorizontal: 5, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', gap: 2 },
  lockedBadgeText: { color: '#FFF', fontSize: 8, fontWeight: FontWeight.bold },
  itemIconBg: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  itemName: { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: FontWeight.bold, textAlign: 'center' },
  itemType: { color: Colors.textMuted, fontSize: 9, letterSpacing: 0.5 },
  itemDuration: { color: Colors.textMuted, fontSize: 9 },
  itemPriceBtn: { borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 5, marginTop: 2, borderWidth: 1 },
  itemPriceBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', gap: Spacing.md, paddingBottom: 44, borderTopWidth: 1, borderColor: Colors.cardBorder },
  modalIconBg: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  modalName: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  modalTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: BorderRadius.pill, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.bgSecondary },
  modalTypeText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  modalPriceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', backgroundColor: Colors.bgSecondary, borderRadius: BorderRadius.md, padding: Spacing.md },
  modalPriceLabel: { color: Colors.textMuted, fontSize: FontSize.sm },
  modalPrice: { fontSize: FontSize.xl, fontWeight: FontWeight.black },
  modalBalanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 4 },
  modalBalLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  modalBalVal: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  modalBuyBtn: { width: '100%', borderRadius: BorderRadius.pill, paddingVertical: Spacing.md, alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  modalBuyBtnOwned: { backgroundColor: Colors.surfaceElevated },
  modalBuyBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  modalCancelBtn: { paddingVertical: Spacing.sm },
  modalCancelBtnText: { color: Colors.textMuted, fontSize: FontSize.sm },
});
