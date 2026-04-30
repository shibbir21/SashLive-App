// SashLive — VIP Store
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { VIP_LEVELS } from '@/constants/config';
import { MOCK_VIP_ITEMS } from '@/services/mockData';
import { useApp } from '@/contexts/AppContext';
import { useAlert } from '@/template';

const { width } = Dimensions.get('window');

type Category = 'all' | 'frame' | 'effect' | 'gift' | 'special';

const EXTRA_ITEMS = [
  { id: 'vip7', name: 'Rose Petal',    type: 'gift',    icon: '🌸', description: 'Exclusive gift available in VIP store', price: 1200, duration: null,  color: '#FF69B4' },
  { id: 'vip8', name: 'Blue Lightning', type: 'effect', icon: '⚡', description: 'Electric entry special effect',          price: 2500, duration: 14,   color: '#4169E1' },
  { id: 'vip9', name: 'Star Trail',    type: 'frame',   icon: '💫', description: 'Animated star trail avatar frame',       price: 800,  duration: 30,   color: '#FFCC00' },
  { id: 'vip10', name: 'VIP Party',    type: 'special', icon: '🎊', description: 'Party room background effect',           price: 4500, duration: 7,    color: Colors.primary },
];

const ALL_ITEMS = [...MOCK_VIP_ITEMS, ...EXTRA_ITEMS];

export default function VIPStoreScreen() {
  const router = useRouter();
  const { currentUser, updateDiamonds } = useApp();
  const { showAlert } = useAlert();
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [selectedItem, setSelectedItem] = useState<typeof ALL_ITEMS[0] | null>(null);
  const [ownedItems, setOwnedItems] = useState<string[]>([]);

  const categories: { key: Category; label: string; icon: string }[] = [
    { key: 'all',     label: 'All',     icon: '🛍️' },
    { key: 'frame',   label: 'Frames',  icon: '🖼️' },
    { key: 'effect',  label: 'Effects', icon: '✨' },
    { key: 'gift',    label: 'Gifts',   icon: '🎁' },
    { key: 'special', label: 'Special', icon: '⭐' },
  ];

  const currentVip = VIP_LEVELS.find(v => v.level === currentUser.vipLevel) || VIP_LEVELS[0];
  const nextVip = VIP_LEVELS.find(v => v.level === currentUser.vipLevel + 1);
  const filtered = activeCategory === 'all' ? ALL_ITEMS : ALL_ITEMS.filter(i => i.type === activeCategory);

  const handlePurchase = (item: typeof ALL_ITEMS[0]) => {
    if (currentUser.diamonds < item.price) {
      showAlert('Not Enough Diamonds', `You need ${item.price} 💎 to buy this item.`, [
        { text: 'Recharge', onPress: () => { setSelectedItem(null); router.push('/recharge'); } },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    showAlert(`Purchase ${item.name}?`, `${item.price} 💎 will be deducted from your wallet.${item.duration ? `\nValid for ${item.duration} days.` : ''}`, [
      {
        text: 'Confirm',
        onPress: () => {
          updateDiamonds(-item.price);
          setOwnedItems(prev => [...prev, item.id]);
          setSelectedItem(null);
          showAlert('Purchase Successful! 🎉', `${item.icon} ${item.name} has been activated!`);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>👑 VIP Store</Text>
        <Pressable style={styles.walletChip} onPress={() => router.push('/wallet')}>
          <Text>💎</Text>
          <Text style={styles.walletChipText}>{currentUser.diamonds.toLocaleString()}</Text>
        </Pressable>
      </View>

      {/* VIP Status */}
      <View style={styles.vipStatusCard}>
        <Text style={{ fontSize: 24 }}>{currentVip.badge}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.vipStatusName, { color: currentVip.color }]}>VIP {currentVip.name}</Text>
          {nextVip && <Text style={styles.vipStatusNext}>Next: {nextVip.name} {nextVip.badge}</Text>}
        </View>
        <View style={styles.vipStatusProgress}>
          <View style={styles.vipProgressBar}>
            <View style={[styles.vipProgressFill, { width: '68%', backgroundColor: currentVip.color }]} />
          </View>
          <Text style={styles.vipProgressText}>68%</Text>
        </View>
      </View>

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catContent} style={styles.catScroll}>
        {categories.map(cat => (
          <Pressable
            key={cat.key}
            style={[styles.catChip, activeCategory === cat.key && styles.catChipActive]}
            onPress={() => setActiveCategory(cat.key)}
          >
            <Text style={styles.catIcon}>{cat.icon}</Text>
            <Text style={[styles.catLabel, activeCategory === cat.key && styles.catLabelActive]}>{cat.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
        {filtered.map(item => {
          const owned = ownedItems.includes(item.id);
          return (
            <Pressable
              key={item.id}
              style={[styles.itemCard, { borderColor: item.color + '50' }, owned && styles.itemCardOwned]}
              onPress={() => setSelectedItem(item)}
            >
              {owned && <View style={styles.ownedBadge}><Text style={styles.ownedBadgeText}>✓ Owned</Text></View>}
              <View style={[styles.itemIconBg, { backgroundColor: item.color + '20' }]}>
                <Text style={{ fontSize: 40 }}>{item.icon}</Text>
              </View>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
              {item.duration && <Text style={styles.itemDuration}>⏱ {item.duration} days</Text>}
              <View style={[styles.priceBtn, { backgroundColor: owned ? Colors.surfaceElevated : item.color }, owned && { borderWidth: 1, borderColor: Colors.cardBorder }]}>
                <Text style={[styles.priceBtnText, owned && { color: Colors.textMuted }]}>
                  {owned ? 'Equipped' : `💎 ${item.price.toLocaleString()}`}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={selectedItem !== null} transparent animationType="slide">
        <Pressable style={styles.modalBg} onPress={() => setSelectedItem(null)}>
          <Pressable style={styles.modalCard} onPress={e => e.stopPropagation()}>
            {selectedItem && (
              <>
                <View style={[styles.modalIconBg, { backgroundColor: selectedItem.color + '25' }]}>
                  <Text style={{ fontSize: 60 }}>{selectedItem.icon}</Text>
                </View>
                <Text style={styles.modalName}>{selectedItem.name}</Text>
                <Text style={styles.modalType}>{selectedItem.type.toUpperCase()}</Text>
                <Text style={styles.modalDesc}>{selectedItem.description}</Text>
                {selectedItem.duration && (
                  <View style={styles.modalDetail}>
                    <MaterialIcons name="access-time" size={14} color={Colors.textMuted} />
                    <Text style={styles.modalDetailText}>Valid for {selectedItem.duration} days</Text>
                  </View>
                )}
                <View style={styles.modalPriceRow}>
                  <Text style={styles.modalPriceLabel}>Price</Text>
                  <Text style={styles.modalPrice}>💎 {selectedItem.price.toLocaleString()}</Text>
                </View>
                <Pressable
                  style={[styles.modalBuyBtn, { backgroundColor: selectedItem.color }, ownedItems.includes(selectedItem.id) && styles.modalBuyBtnOwned]}
                  onPress={() => ownedItems.includes(selectedItem.id) ? setSelectedItem(null) : handlePurchase(selectedItem)}
                >
                  <Text style={styles.modalBuyBtnText}>
                    {ownedItems.includes(selectedItem.id) ? '✓ Already Owned' : `Buy for 💎 ${selectedItem.price.toLocaleString()}`}
                  </Text>
                </Pressable>
                <Pressable style={styles.modalCancelBtn} onPress={() => setSelectedItem(null)}>
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  title: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  walletChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surface, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: Colors.cardBorder },
  walletChipText: { color: Colors.diamond, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  vipStatusCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.md, borderWidth: 1, borderColor: Colors.gold + '40' },
  vipStatusName: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  vipStatusNext: { color: Colors.textMuted, fontSize: FontSize.xs },
  vipStatusProgress: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vipProgressBar: { width: 80, height: 5, backgroundColor: Colors.surfaceElevated, borderRadius: 3, overflow: 'hidden' },
  vipProgressFill: { height: '100%', borderRadius: 3 },
  vipProgressText: { color: Colors.textMuted, fontSize: FontSize.xs },
  catScroll: { maxHeight: 52, marginBottom: Spacing.xs },
  catContent: { paddingHorizontal: Spacing.md, gap: Spacing.sm, alignItems: 'center', paddingVertical: 6 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catIcon: { fontSize: 14 },
  catLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  catLabelActive: { color: '#FFF', fontWeight: FontWeight.semibold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xxl },
  itemCard: { width: (width - Spacing.md * 2 - Spacing.sm) / 2, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.md, alignItems: 'center', gap: Spacing.xs, borderWidth: 1.5, position: 'relative', overflow: 'visible' },
  itemCardOwned: { borderColor: Colors.success + '60', backgroundColor: Colors.success + '08' },
  ownedBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: Colors.success, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  ownedBadgeText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.bold },
  itemIconBg: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  itemName: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold, textAlign: 'center' },
  itemDesc: { color: Colors.textMuted, fontSize: 10, textAlign: 'center', lineHeight: 14 },
  itemDuration: { color: Colors.textMuted, fontSize: 10 },
  priceBtn: { borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: 6, marginTop: 4 },
  priceBtnText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', gap: Spacing.md, borderTopWidth: 1, borderColor: Colors.cardBorder },
  modalIconBg: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  modalName: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  modalType: { color: Colors.textMuted, fontSize: FontSize.xs, letterSpacing: 2 },
  modalDesc: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  modalDetail: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  modalDetailText: { color: Colors.textMuted, fontSize: FontSize.xs },
  modalPriceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, padding: Spacing.md },
  modalPriceLabel: { color: Colors.textMuted, fontSize: FontSize.sm },
  modalPrice: { color: Colors.diamond, fontSize: FontSize.xl, fontWeight: FontWeight.black },
  modalBuyBtn: { width: '100%', borderRadius: BorderRadius.pill, paddingVertical: Spacing.md, alignItems: 'center' },
  modalBuyBtnOwned: { backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.cardBorder },
  modalBuyBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  modalCancelBtn: { paddingVertical: Spacing.sm },
  modalCancelBtnText: { color: Colors.textMuted, fontSize: FontSize.sm },
});
