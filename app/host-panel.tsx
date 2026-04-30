// SashLive — Host Panel
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { useAlert } from '@/template';

const { width } = Dimensions.get('window');

type HostTab = 'dashboard' | 'earnings' | 'schedule' | 'apply';

const EARNING_HISTORY = [
  { id: '1', date: 'Today',      coins: 2400, streams: 2, duration: '3h 12m' },
  { id: '2', date: 'Yesterday',  coins: 1800, streams: 1, duration: '2h 45m' },
  { id: '3', date: 'Mon Apr 14', coins: 3200, streams: 3, duration: '5h 30m' },
  { id: '4', date: 'Sun Apr 13', coins: 900,  streams: 1, duration: '1h 20m' },
  { id: '5', date: 'Sat Apr 12', coins: 4100, streams: 2, duration: '4h 15m' },
];

const SCHEDULE = [
  { day: 'Today',     time: '8:00 PM', title: 'Chill Night Stream', status: 'scheduled' },
  { day: 'Tomorrow',  time: '9:00 PM', title: 'PK Battle Night',    status: 'scheduled' },
  { day: 'Thursday',  time: '7:30 PM', title: 'Q&A + Gifts',        status: 'scheduled' },
  { day: 'Friday',    time: '10:00 PM', title: 'Party Room',        status: 'scheduled' },
];

export default function HostPanelScreen() {
  const router = useRouter();
  const { currentUser } = useApp();
  const { showAlert } = useAlert();
  const [activeTab, setActiveTab] = useState<HostTab>(currentUser.isHost ? 'dashboard' : 'apply');

  const totalCoins = EARNING_HISTORY.reduce((s, e) => s + e.coins, 0);
  const totalStreams = EARNING_HISTORY.reduce((s, e) => s + e.streams, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Host Panel</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      {currentUser.isHost && (
        <View style={styles.tabs}>
          {([
            { key: 'dashboard', label: 'Dashboard' },
            { key: 'earnings',  label: 'Earnings'  },
            { key: 'schedule',  label: 'Schedule'  },
          ] as const).map(tab => (
            <Pressable key={tab.key} style={[styles.tab, activeTab === tab.key && styles.tabActive]} onPress={() => setActiveTab(tab.key)}>
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {!currentUser.isHost || activeTab === 'apply' ? (
          <>
            <View style={styles.applyBanner}>
              <Text style={{ fontSize: 56 }}>🎤</Text>
              <Text style={styles.applyTitle}>Become a SashLive Host</Text>
              <Text style={styles.applyDesc}>Start earning S-Coins by going live, receiving gifts, and building your audience.</Text>
            </View>

            <Text style={styles.sectionTitle}>💰 Host Benefits</Text>
            {[
              { icon: '🪙', title: 'Earn S-Coins',        desc: 'Earn coins from gifts received during live streams' },
              { icon: '💎', title: 'Diamond Bonuses',     desc: 'Hit streaming targets for bonus diamond rewards' },
              { icon: '👑', title: 'VIP Priority',         desc: 'Get featured placement in the Explore page' },
              { icon: '🏆', title: 'Weekly Leaderboard',  desc: 'Top hosts earn special prizes weekly' },
              { icon: '📊', title: 'Analytics Dashboard', desc: 'Track your performance and audience growth' },
              { icon: '🏢', title: 'Agency Support',      desc: 'Join an agency for mentoring and support' },
            ].map((b, i) => (
              <View key={i} style={styles.benefitItem}>
                <Text style={{ fontSize: 22 }}>{b.icon}</Text>
                <View>
                  <Text style={styles.benefitTitle}>{b.title}</Text>
                  <Text style={styles.benefitDesc}>{b.desc}</Text>
                </View>
              </View>
            ))}

            <Text style={styles.sectionTitle}>📋 Requirements</Text>
            <View style={styles.requirementsCard}>
              {[
                '✓ Account must be at least 7 days old',
                '✓ Complete your profile with photo',
                '✓ Agree to Community Guidelines',
                '✓ Minimum age: 18 years',
              ].map((r, i) => (
                <Text key={i} style={styles.requirementItem}>{r}</Text>
              ))}
            </View>

            <Pressable style={styles.applyBtn} onPress={() => showAlert('Application Submitted!', 'Your host application is under review. You will be notified within 24-48 hours.')}>
              <Text style={styles.applyBtnText}>🎤 Apply to Become Host</Text>
            </Pressable>
          </>
        ) : activeTab === 'dashboard' ? (
          <>
            {/* Host Card */}
            <View style={styles.hostCard}>
              <Image source={{ uri: currentUser.avatar }} style={styles.hostCardAv} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.hostCardName}>{currentUser.displayName}</Text>
                <View style={styles.hostStatusRow}>
                  <View style={styles.activeHostBadge}><View style={styles.activeDot} /><Text style={styles.activeHostText}>Active Host</Text></View>
                </View>
              </View>
              <Pressable style={styles.goLiveBtn} onPress={() => router.push('/go-live')}>
                <View style={styles.goLiveDot} /><Text style={styles.goLiveBtnText}>Go Live</Text>
              </Pressable>
            </View>

            {/* Stats */}
            <View style={styles.statsGrid}>
              {[
                { label: 'Total Streams', value: String(totalStreams),         icon: '🎥', color: Colors.primary },
                { label: 'Total S-Coins', value: totalCoins.toLocaleString(), icon: '🪙', color: Colors.gold },
                { label: 'Total Viewers', value: '28.4K',                     icon: '👁', color: Colors.diamond },
                { label: 'Total Gifts',   value: '4,892',                      icon: '🎁', color: Colors.secondary },
              ].map(s => (
                <View key={s.label} style={[styles.statCard, { borderColor: s.color + '40' }]}>
                  <Text style={{ fontSize: 24 }}>{s.icon}</Text>
                  <Text style={[styles.statCardVal, { color: s.color }]}>{s.value}</Text>
                  <Text style={styles.statCardLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            <Pressable style={styles.withdrawRow} onPress={() => router.push('/withdrawal')}>
              <View>
                <Text style={styles.withdrawRowLabel}>Available to Withdraw</Text>
                <Text style={styles.withdrawRowAmount}>{currentUser.coins.toLocaleString()} 🪙</Text>
              </View>
              <View style={styles.withdrawBtn}>
                <Text style={styles.withdrawBtnText}>Withdraw</Text>
                <MaterialIcons name="chevron-right" size={16} color="#FFF" />
              </View>
            </Pressable>

            <Text style={styles.sectionTitle}>📊 Performance Tips</Text>
            {[
              { tip: 'Stream at peak hours (8–10 PM local time)', icon: '⏰' },
              { tip: 'Announce streams in advance on your profile', icon: '📢' },
              { tip: 'Engage with chat and call viewers by name', icon: '💬' },
              { tip: 'Use PK battles to boost visibility', icon: '⚔️' },
            ].map((t, i) => (
              <View key={i} style={styles.tipItem}>
                <Text style={{ fontSize: 18 }}>{t.icon}</Text>
                <Text style={styles.tipText}>{t.tip}</Text>
              </View>
            ))}
          </>
        ) : activeTab === 'earnings' ? (
          <>
            <View style={styles.totalEarningsCard}>
              <Text style={styles.totalEarningsLabel}>Total Earnings (This Week)</Text>
              <Text style={styles.totalEarningsAmount}>{totalCoins.toLocaleString()} 🪙</Text>
              <Text style={styles.totalEarningsSub}>≈ ${(totalCoins / 100).toFixed(2)} USD</Text>
            </View>
            {EARNING_HISTORY.map(e => (
              <View key={e.id} style={styles.earningRow}>
                <View style={styles.earningIconWrap}><Text style={{ fontSize: 20 }}>📺</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.earningDate}>{e.date}</Text>
                  <Text style={styles.earningMeta}>{e.streams} streams · {e.duration}</Text>
                </View>
                <Text style={styles.earningCoins}>+{e.coins.toLocaleString()} 🪙</Text>
              </View>
            ))}
            <Pressable style={styles.withdrawFullBtn} onPress={() => router.push('/withdrawal')}>
              <Text style={styles.withdrawFullBtnText}>💸 Withdraw All Earnings</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.scheduleHeader}>
              <Text style={styles.sectionTitle}>📅 Upcoming Streams</Text>
              <Pressable style={styles.addScheduleBtn} onPress={() => showAlert('Schedule Stream', 'Stream scheduling coming soon!')}>
                <MaterialIcons name="add" size={18} color="#FFF" />
              </Pressable>
            </View>
            {SCHEDULE.map((s, i) => (
              <View key={i} style={styles.scheduleCard}>
                <View style={styles.scheduleTimeWrap}>
                  <Text style={styles.scheduleDay}>{s.day}</Text>
                  <Text style={styles.scheduleTime}>{s.time}</Text>
                </View>
                <View style={styles.scheduleDivider} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.scheduleTitle}>{s.title}</Text>
                  <View style={[styles.scheduleBadge, { backgroundColor: Colors.success + '25' }]}>
                    <Text style={[styles.scheduleBadgeText, { color: Colors.success }]}>{s.status}</Text>
                  </View>
                </View>
                <Pressable style={styles.editScheduleBtn}>
                  <MaterialIcons name="edit" size={16} color={Colors.textMuted} />
                </Pressable>
              </View>
            ))}
          </>
        )}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  title: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  tabs: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm },
  tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  tabTextActive: { color: '#FFF', fontWeight: FontWeight.bold },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  applyBanner: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.primary + '40' },
  applyTitle: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  applyDesc: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
  benefitItem: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start', marginBottom: Spacing.sm, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  benefitTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  benefitDesc: { color: Colors.textMuted, fontSize: FontSize.xs },
  requirementsCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.cardBorder, gap: Spacing.sm },
  requirementItem: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 22 },
  applyBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingVertical: Spacing.md, alignItems: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  applyBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  hostCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md, gap: Spacing.md, borderWidth: 1, borderColor: Colors.cardBorder },
  hostCardAv: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: Colors.primary },
  hostCardName: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  hostStatusRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
  activeHostBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.success + '20', borderRadius: BorderRadius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  activeHostText: { color: Colors.success, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  goLiveBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  goLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  goLiveBtnText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  statCard: { width: (width - Spacing.md * 2 - Spacing.sm) / 2, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: 4, borderWidth: 1 },
  statCardVal: { fontSize: FontSize.xl, fontWeight: FontWeight.black },
  statCardLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  withdrawRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.gold + '40' },
  withdrawRowLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  withdrawRowAmount: { color: Colors.gold, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  withdrawBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  withdrawBtnText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  tipItem: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm, alignItems: 'flex-start' },
  tipText: { flex: 1, color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
  totalEarningsCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.gold + '30', gap: 4 },
  totalEarningsLabel: { color: Colors.textMuted, fontSize: FontSize.sm },
  totalEarningsAmount: { color: Colors.gold, fontSize: 44, fontWeight: FontWeight.black },
  totalEarningsSub: { color: Colors.textMuted, fontSize: FontSize.xs },
  earningRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  earningIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  earningDate: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  earningMeta: { color: Colors.textMuted, fontSize: FontSize.xs },
  earningCoins: { color: Colors.gold, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  withdrawFullBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  withdrawFullBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  scheduleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  addScheduleBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  scheduleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder, gap: Spacing.sm },
  scheduleTimeWrap: { alignItems: 'center', width: 68 },
  scheduleDay: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  scheduleTime: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.black },
  scheduleDivider: { width: 1, height: 40, backgroundColor: Colors.cardBorder },
  scheduleTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, marginBottom: 4 },
  scheduleBadge: { borderRadius: BorderRadius.pill, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  scheduleBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  editScheduleBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
