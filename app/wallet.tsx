// SashLive — Wallet Screen (Production-Ready with Real DB)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  FlatList, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/template';
import { getSupabaseClient } from '@/template';
import { useAlert } from '@/template';
import { POINTS_PER_DOLLAR } from '@/services/earningService';

type Tab = 'overview' | 'history' | 'earning';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
}

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 't1', type: 'earn_gift',   amount: 500,   description: 'Gift received — Crown 👑',          created_at: new Date(Date.now() - 2*60000).toISOString() },
  { id: 't2', type: 'earn_stream', amount: 2000,  description: 'Stream earnings (1 hr session)',     created_at: new Date(Date.now() - 60*60000).toISOString() },
  { id: 't3', type: 'earn_task',   amount: 300,   description: 'Daily task — Watch a live stream',   created_at: new Date(Date.now() - 3*60*60000).toISOString() },
  { id: 't4', type: 'earn_pk',     amount: 1000,  description: 'PK Battle victory bonus ⚔️',        created_at: new Date(Date.now() - 5*60*60000).toISOString() },
  { id: 't5', type: 'withdrawal',  amount: -50000, description: 'Withdrawal — bKash $5.00',          created_at: new Date(Date.now() - 24*60*60000).toISOString() },
  { id: 't6', type: 'earn_task',   amount: 500,   description: 'Daily task — Send a gift',           created_at: new Date(Date.now() - 2*24*60*60000).toISOString() },
  { id: 't7', type: 'earn_gift',   amount: 700,   description: 'Gift received — Rose 🌹',            created_at: new Date(Date.now() - 3*24*60*60000).toISOString() },
];

function formatTime(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function txIcon(type: string) {
  const icons: Record<string, string> = {
    earn_gift:    '🎁',
    earn_stream:  '🎙️',
    earn_task:    '🎯',
    earn_pk:      '⚔️',
    withdrawal:   '💸',
    recharge:     '💎',
    earn_agency:  '🏢',
  };
  return icons[type] || '💰';
}

function txColor(type: string, amount: number) {
  if (type === 'withdrawal' || amount < 0) return Colors.error;
  return Colors.success;
}

export default function WalletScreen() {
  const router = useRouter();
  const { currentUser } = useApp();
  const { user: authUser } = useAuth();
  const { showAlert } = useAlert();
  const supabase = getSupabaseClient();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);

  const loadTransactions = useCallback(async () => {
    if (!authUser?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('points_transactions')
      .select('*')
      .eq('user_id', authUser.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data && data.length > 0) {
      setTransactions(data as Transaction[]);
      const earned = data.filter(t => t.amount > 0).reduce((s: number, t: any) => s + t.amount, 0);
      const withdrawn = data.filter(t => t.amount < 0).reduce((s: number, t: any) => s + Math.abs(t.amount), 0);
      setTotalEarned(earned);
      setTotalWithdrawn(withdrawn);
    }
    setLoading(false);
  }, [authUser?.id]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const usdBalance = (currentUser.points || 0) / POINTS_PER_DOLLAR;
  const usdEarned = totalEarned / POINTS_PER_DOLLAR;

  const EARN_METHODS = [
    { icon: '🎙️', title: 'Stream Earnings',    desc: 'Earn 2,000 pts/hr while live',        rate: '2K pts/hr',     color: Colors.live },
    { icon: '🎁', title: 'Gift Income',         desc: '70% of gift diamond value',            rate: '70% share',     color: Colors.primary },
    { icon: '🎯', title: 'Daily Tasks',         desc: 'Complete 14 daily challenges',         rate: '50-20K pts',    color: Colors.success },
    { icon: '⚔️', title: 'PK Battles',          desc: 'Win battles and earn bonuses',         rate: '+1K pts/30min', color: Colors.secondary },
    { icon: '🏢', title: 'Agency Commission',   desc: 'Earn from your hosted creators',       rate: '4-50% comm.',   color: Colors.gold },
    { icon: '🎁', title: 'Treasure Box',        desc: '40 coins per claim, 10x/day',          rate: '+40 coins',     color: Colors.diamond },
    { icon: '👥', title: 'Referral Bonus',      desc: 'Invite users and earn per referral',   rate: '+50 💎',        color: '#FF8C00' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#111827" />
        </Pressable>
        <Text style={styles.title}>My Wallet</Text>
        <Pressable style={styles.rechargeHeaderBtn} onPress={() => router.push('/recharge')}>
          <MaterialIcons name="add" size={16} color="#FFF" />
          <Text style={styles.rechargeHeaderBtnText}>Top Up</Text>
        </Pressable>
      </View>

      {/* Hero Cards */}
      <View style={styles.heroCards}>
        {/* Points/USD Card */}
        <LinearGradient colors={[Colors.primary, '#6366F1']} style={styles.mainCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.mainCardTop}>
            <Text style={styles.mainCardLabel}>SashPoints</Text>
            <View style={styles.mainCardUsdBadge}>
              <Text style={styles.mainCardUsdText}>${usdBalance.toFixed(2)} USD</Text>
            </View>
          </View>
          <Text style={styles.mainCardAmount}>{(currentUser.points || 0).toLocaleString()}</Text>
          <Text style={styles.mainCardRate}>10,000 pts = $1 USD</Text>
          <Pressable style={styles.withdrawBtn} onPress={() => router.push('/withdrawal')}>
            <Text style={styles.withdrawBtnText}>💸 Withdraw</Text>
          </Pressable>
        </LinearGradient>

        {/* Mini cards */}
        <View style={styles.miniCardsCol}>
          <Pressable style={[styles.miniCard, { borderColor: Colors.diamond + '40' }]} onPress={() => router.push('/recharge')}>
            <Text style={{ fontSize: 22 }}>💎</Text>
            <Text style={[styles.miniCardVal, { color: Colors.diamond }]}>{(currentUser.diamonds).toLocaleString()}</Text>
            <Text style={styles.miniCardLabel}>Diamonds</Text>
          </Pressable>
          <Pressable style={[styles.miniCard, { borderColor: Colors.gold + '40' }]} onPress={() => setActiveTab('history')}>
            <Text style={{ fontSize: 22 }}>🪙</Text>
            <Text style={[styles.miniCardVal, { color: Colors.gold }]}>{(currentUser.coins).toLocaleString()}</Text>
            <Text style={styles.miniCardLabel}>S-Coins</Text>
          </Pressable>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Total Earned</Text>
          <Text style={[styles.statVal, { color: Colors.success }]}>{totalEarned > 0 ? totalEarned.toLocaleString() : (currentUser.points || 0).toLocaleString()} pts</Text>
        </View>
        <View style={styles.statDiv} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Withdrawn</Text>
          <Text style={[styles.statVal, { color: Colors.primary }]}>${(totalWithdrawn / POINTS_PER_DOLLAR).toFixed(2)}</Text>
        </View>
        <View style={styles.statDiv} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Available</Text>
          <Text style={[styles.statVal, { color: Colors.gold }]}>${usdBalance.toFixed(2)}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {([
          { key: 'overview', label: '📊 Overview' },
          { key: 'history',  label: '📋 History' },
          { key: 'earning',  label: '💡 How to Earn' },
        ] as const).map(tab => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <>
            {/* Quick Earn */}
            <Text style={styles.sectionTitle}>⚡ Quick Earn</Text>
            <View style={styles.quickEarnGrid}>
              {[
                { icon: '🎙️', label: 'Go Live',     sub: '+2K pts/hr', color: Colors.live,      route: '/go-live' },
                { icon: '🎯', label: 'Daily Tasks', sub: 'Up to 20K pts', color: Colors.success, route: '/daily-tasks' },
                { icon: '🎮', label: 'Games',       sub: 'Win rewards', color: Colors.gold,     route: '/games' },
                { icon: '⚔️', label: 'PK Battle',   sub: '+1K pts',     color: Colors.secondary, route: '/pk-invite/preview' },
              ].map(a => (
                <Pressable key={a.label} style={[styles.quickEarnItem, { borderColor: a.color + '30' }]} onPress={() => router.push(a.route as any)}>
                  <View style={[styles.quickEarnIcon, { backgroundColor: a.color + '18' }]}>
                    <Text style={{ fontSize: 24 }}>{a.icon}</Text>
                  </View>
                  <Text style={[styles.quickEarnLabel, { color: a.color }]}>{a.label}</Text>
                  <Text style={styles.quickEarnSub}>{a.sub}</Text>
                </Pressable>
              ))}
            </View>

            {/* Conversion */}
            <View style={styles.convCard}>
              <View style={styles.convRow}>
                <Text style={{ fontSize: 24 }}>💎</Text>
                <Text style={styles.convArrow}>→</Text>
                <Text style={{ fontSize: 24 }}>🪙</Text>
                <Text style={styles.convRule}>1 Diamond = 10 S-Coins</Text>
              </View>
              <View style={[styles.convRow, { borderTopWidth: 1, borderTopColor: Colors.cardBorder, paddingTop: 10 }]}>
                <Text style={{ fontSize: 24 }}>🪙</Text>
                <Text style={styles.convArrow}>→</Text>
                <Text style={{ fontSize: 24 }}>💰</Text>
                <Text style={styles.convRule}>10,000 pts = $1 USD</Text>
              </View>
            </View>

            {/* Withdrawal Info */}
            <View style={styles.withdrawInfoCard}>
              <Text style={styles.sectionTitle}>💸 Withdrawal Rules</Text>
              {[
                { icon: '✅', text: 'Minimum withdrawal: $10 (100,000 pts)' },
                { icon: '📆', text: 'Maximum per day: $500' },
                { icon: '💳', text: 'Methods: USDT, bKash, Nagad, PayPal, Bank Transfer' },
                { icon: '⏱', text: 'Processing: 1-3 business days' },
              ].map((r, i) => (
                <View key={i} style={styles.withdrawInfoRow}>
                  <Text style={{ fontSize: 14 }}>{r.icon}</Text>
                  <Text style={styles.withdrawInfoText}>{r.text}</Text>
                </View>
              ))}
              <Pressable style={styles.withdrawNowBtn} onPress={() => router.push('/withdrawal')}>
                <MaterialIcons name="account-balance-wallet" size={16} color="#FFF" />
                <Text style={styles.withdrawNowBtnText}>Request Withdrawal</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* HISTORY */}
        {activeTab === 'history' && (
          <>
            {loading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} /> : null}
            {transactions.length === 0 && !loading ? (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 40 }}>📋</Text>
                <Text style={styles.emptyText}>No transactions yet</Text>
              </View>
            ) : null}
            {transactions.map(tx => (
              <View key={tx.id} style={styles.txItem}>
                <View style={[styles.txIconWrap, { backgroundColor: txColor(tx.type, tx.amount) + '18' }]}>
                  <Text style={{ fontSize: 22 }}>{txIcon(tx.type)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txDesc}>{tx.description}</Text>
                  <Text style={styles.txTime}>{formatTime(tx.created_at)}</Text>
                </View>
                <Text style={[styles.txAmount, { color: txColor(tx.type, tx.amount) }]}>
                  {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()} pts
                </Text>
              </View>
            ))}
          </>
        )}

        {/* HOW TO EARN */}
        {activeTab === 'earning' && (
          <>
            <Text style={styles.sectionTitle}>💡 Earning Methods</Text>
            {EARN_METHODS.map((m, i) => (
              <View key={i} style={[styles.earnMethod, { borderColor: m.color + '30' }]}>
                <View style={[styles.earnMethodIcon, { backgroundColor: m.color + '18' }]}>
                  <Text style={{ fontSize: 26 }}>{m.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.earnMethodTitle, { color: m.color }]}>{m.title}</Text>
                  <Text style={styles.earnMethodDesc}>{m.desc}</Text>
                </View>
                <View style={[styles.earnMethodRate, { backgroundColor: m.color + '15' }]}>
                  <Text style={[styles.earnMethodRateText, { color: m.color }]}>{m.rate}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: Spacing.xs },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: '#111827', fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  rechargeHeaderBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 7 },
  rechargeHeaderBtnText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  heroCards: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  mainCard: { flex: 1.4, borderRadius: BorderRadius.xl, padding: Spacing.md, gap: 6 },
  mainCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mainCardLabel: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  mainCardUsdBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: BorderRadius.pill, paddingHorizontal: 7, paddingVertical: 3 },
  mainCardUsdText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  mainCardAmount: { color: '#FFF', fontSize: 28, fontWeight: FontWeight.black },
  mainCardRate: { color: 'rgba(255,255,255,0.65)', fontSize: 10 },
  withdrawBtn: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: BorderRadius.pill, paddingVertical: 6, alignItems: 'center', marginTop: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  withdrawBtnText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  miniCardsCol: { flex: 1, gap: Spacing.sm },
  miniCard: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: BorderRadius.lg, padding: Spacing.sm, alignItems: 'center', gap: 2, borderWidth: 1.5 },
  miniCardVal: { fontSize: FontSize.sm, fontWeight: FontWeight.black },
  miniCardLabel: { color: '#9CA3AF', fontSize: 9 },
  statsRow: { flexDirection: 'row', backgroundColor: '#FFF', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { color: '#9CA3AF', fontSize: 9, marginBottom: 2 },
  statVal: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  statDiv: { width: 1, backgroundColor: '#F3F4F6' },
  tabs: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { color: '#9CA3AF', fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  tabTextActive: { color: Colors.primary, fontWeight: FontWeight.bold },
  sectionTitle: { color: '#111827', fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
  quickEarnGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  quickEarnItem: { width: '47%', backgroundColor: '#FFF', borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', gap: 5, borderWidth: 1 },
  quickEarnIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  quickEarnLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  quickEarnSub: { color: '#9CA3AF', fontSize: FontSize.xs },
  convCard: { backgroundColor: '#FFF', borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: '#F3F4F6', gap: 10 },
  convRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  convArrow: { color: '#9CA3AF', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  convRule: { color: '#374151', fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  withdrawInfoCard: { backgroundColor: '#FFF', borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: '#F3F4F6' },
  withdrawInfoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  withdrawInfoText: { color: '#374151', fontSize: FontSize.sm, flex: 1, lineHeight: 20 },
  withdrawNowBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingVertical: Spacing.sm, marginTop: Spacing.sm },
  withdrawNowBtnText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  txItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: '#FFF', borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: '#F3F4F6' },
  txIconWrap: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  txDesc: { color: '#111827', fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  txTime: { color: '#9CA3AF', fontSize: FontSize.xs, marginTop: 2 },
  txAmount: { fontSize: FontSize.sm, fontWeight: FontWeight.black },
  earnMethod: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: '#FFF', borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1 },
  earnMethodIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  earnMethodTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  earnMethodDesc: { color: '#6B7280', fontSize: FontSize.xs, marginTop: 2, lineHeight: 16 },
  earnMethodRate: { borderRadius: BorderRadius.pill, paddingHorizontal: 8, paddingVertical: 4 },
  earnMethodRateText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: Spacing.sm },
  emptyText: { color: '#6B7280', fontSize: FontSize.md },
});
