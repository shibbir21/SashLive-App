// SashLive — Full Agency System: recruitment, commissions, tiers, QR sharing, stats
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  Animated, ActivityIndicator, Modal, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/template';
import { useAlert } from '@/template';
import { getSupabaseClient } from '@/template';
import {
  fetchAgencyMembers, addHostToAgency, getAgencyRate, AGENCY_TIERS_RATES,
  pointsToUSD, POINTS_PER_DOLLAR,
} from '@/services/earningService';
import { formatLastSeen } from '@/services/presenceService';

const { width } = Dimensions.get('window');

type AgencyTab = 'overview' | 'hosts' | 'earnings' | 'recruit';

// ── Tier config ──
const TIER_CONFIG = [
  { label: 'Starter',  minHosts: 1,   rate: 0.04, color: '#CD7F32', badge: '🥉', maxHosts: 4  },
  { label: 'Bronze',   minHosts: 5,   rate: 0.08, color: '#CC8844', badge: '🏅', maxHosts: 9  },
  { label: 'Silver',   minHosts: 10,  rate: 0.12, color: '#C0C0C0', badge: '🥈', maxHosts: 19 },
  { label: 'Gold',     minHosts: 20,  rate: 0.20, color: Colors.gold, badge: '🥇', maxHosts: 49 },
  { label: 'Diamond',  minHosts: 50,  rate: 0.35, color: Colors.diamond, badge: '💎', maxHosts: 99 },
  { label: 'Elite',    minHosts: 100, rate: 0.50, color: Colors.secondary, badge: '👑', maxHosts: 999 },
];

function getTierForCount(count: number) {
  return [...TIER_CONFIG].reverse().find(t => count >= t.minHosts) || TIER_CONFIG[0];
}

// ── Mock hosts for unregistered demo ──
const DEMO_HOSTS = [
  { id: 'dh1', host_id: 'u005', username: 'CosmicRider',   display_name: 'Cosmic Rider',   avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop', is_online: false, commission_rate: 0.10, total_earned: 124800, status: 'active', joined_at: '' },
  { id: 'dh2', host_id: 'u007', username: 'GalaxyGoddess', display_name: 'Galaxy Goddess', avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop', is_online: true,  commission_rate: 0.10, total_earned: 98400,  status: 'active', joined_at: '' },
  { id: 'dh3', host_id: 'u009', username: 'RoseQueen',     display_name: 'Rose Queen',     avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop', is_online: true,  commission_rate: 0.10, total_earned: 76200,  status: 'active', joined_at: '' },
  { id: 'dh4', host_id: 'u002', username: 'DragonFire',    display_name: 'Dragon Fire',    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', is_online: false, commission_rate: 0.10, total_earned: 45600,  status: 'active', joined_at: '' },
  { id: 'dh5', host_id: 'u003', username: 'Moonlight',     display_name: 'Moonlight',      avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop', is_online: false, commission_rate: 0.10, total_earned: 12100,  status: 'inactive', joined_at: '' },
];

// ── Bar Chart ──
function EarningsBar({ value, max, color }: { value: number; max: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: value / (max || 1), duration: 900, useNativeDriver: false }).start();
  }, [value, max]);
  return (
    <View style={{ height: 6, backgroundColor: Colors.cardBorder, borderRadius: 3, overflow: 'hidden', flex: 1 }}>
      <Animated.View style={{ height: '100%', backgroundColor: color, borderRadius: 3, width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

// ── QR Code share modal (simulated) ──
function QRShareModal({ visible, onClose, code }: { visible: boolean; onClose: () => void; code: string }) {
  const bounceAnim = useRef(new Animated.Value(0.85)).current;
  useEffect(() => {
    if (visible) {
      Animated.spring(bounceAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }).start();
    }
  }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={M.overlay}>
        <Animated.View style={[M.sheet, { transform: [{ scale: bounceAnim }] }]}>
          <Text style={M.title}>📤 Share Agency Link</Text>
          <View style={M.qrBox}>
            {/* Simulated QR pattern */}
            <View style={M.qrGrid}>
              {Array.from({ length: 49 }).map((_, i) => (
                <View key={i} style={[M.qrCell, { backgroundColor: Math.random() > 0.45 ? '#1a0a2e' : '#FFF' }]} />
              ))}
            </View>
            <Text style={M.qrLabel}>Scan to join agency</Text>
          </View>
          <View style={M.codeBox}>
            <Text style={M.codeLabel}>Agency Code</Text>
            <Text style={M.codeValue}>{code}</Text>
          </View>
          <Text style={M.shareInstruction}>Share this code or QR with streamers to recruit them into your agency.</Text>
          <View style={M.shareRow}>
            {['📋 Copy', '💬 Message', '📱 WhatsApp', '✉️ Email'].map(s => (
              <Pressable key={s} style={M.shareBtn} onPress={onClose}>
                <Text style={M.shareBtnText}>{s}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={M.closeBtn} onPress={onClose}>
            <Text style={M.closeBtnText}>Done</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function AgencyScreen() {
  const router = useRouter();
  const { currentUser, updateUser } = useApp();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [activeTab, setActiveTab] = useState<AgencyTab>('overview');
  const [agencyName, setAgencyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [registered, setRegistered] = useState(currentUser.isAgency);
  const [loading, setLoading] = useState(false);
  const [hosts, setHosts] = useState(DEMO_HOSTS);
  const [showQR, setShowQR] = useState(false);
  const [hostSearch, setHostSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('month');
  const headerAnim = useRef(new Animated.Value(0)).current;

  const activeHosts = hosts.filter(h => h.status === 'active').length;
  const tier = getTierForCount(activeHosts);
  const nextTier = TIER_CONFIG[TIER_CONFIG.indexOf(tier) + 1];

  const totalEarned = hosts.reduce((s, h) => s + (h.total_earned * tier.rate), 0);
  const totalHostEarnings = hosts.reduce((s, h) => s + h.total_earned, 0);
  const monthlyCommission = Math.floor(totalEarned * 0.3);
  const referralCode = `SASH-${(currentUser.username || 'USER').toUpperCase().slice(0, 6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    if (user?.id && registered) loadAgencyData();
  }, [user?.id, registered]);

  const loadAgencyData = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await fetchAgencyMembers(user.id);
    if (data.length > 0) setHosts(data);
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!agencyName.trim()) { showAlert('Agency Name Required', 'Enter your agency name.'); return; }
    setSubmitting(true);
    if (user?.id) {
      const supabase = getSupabaseClient();
      await supabase.from('user_profiles').update({
        is_agent: true,
        agency_name: agencyName.trim(),
        referral_code: referralCode,
      }).eq('id', user.id);
    }
    setSubmitting(false);
    updateUser({ isAgency: true });
    setRegistered(true);
    showAlert('🎉 Agency Registered!', `Welcome to the agency program, ${agencyName}! Start recruiting hosts to earn commissions.`);
  };

  const filteredHosts = hosts.filter(h =>
    h.display_name.toLowerCase().includes(hostSearch.toLowerCase()) ||
    h.username.toLowerCase().includes(hostSearch.toLowerCase())
  );

  const maxEarned = Math.max(...hosts.map(h => h.total_earned), 1);

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <Animated.View style={[S.header, { opacity: headerAnim }]}>
        <Pressable onPress={() => router.back()} style={S.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={S.title}>🏢 Agency Panel</Text>
        <Pressable style={S.headerBtn} onPress={() => setShowQR(true)}>
          <MaterialIcons name="qr-code" size={22} color={Colors.primary} />
        </Pressable>
      </Animated.View>

      {!registered ? (
        // ── Registration View ──
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scroll}>
          {/* Hero */}
          <View style={S.heroBanner}>
            <Text style={{ fontSize: 60 }}>🏢</Text>
            <Text style={S.heroTitle}>Launch Your Agency</Text>
            <Text style={S.heroDesc}>
              Recruit hosts, earn{' '}
              <Text style={{ color: Colors.gold, fontWeight: FontWeight.bold }}>4% – 50%</Text>
              {' '}commission on all their earnings, and grow a talent empire on SashLive.
            </Text>
            <View style={S.earningPreview}>
              <Text style={S.earningPreviewText}>10 hosts × 50K pts/mo = </Text>
              <Text style={[S.earningPreviewAmount, { color: Colors.gold }]}>+50,000 pts commission</Text>
            </View>
          </View>

          {/* Tier progression */}
          <Text style={S.sectionTitle}>📈 Commission Tiers</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm }}>
            {TIER_CONFIG.map((t, i) => (
              <View key={t.label} style={[S.tierCard, { borderColor: t.color + '60', backgroundColor: t.color + '10' }]}>
                <Text style={{ fontSize: 28 }}>{t.badge}</Text>
                <Text style={[S.tierLabel, { color: t.color }]}>{t.label}</Text>
                <Text style={S.tierHosts}>{t.minHosts}+ hosts</Text>
                <View style={[S.tierRateBadge, { backgroundColor: t.color + '25' }]}>
                  <Text style={[S.tierRate, { color: t.color }]}>{(t.rate * 100).toFixed(0)}%</Text>
                </View>
                {i < TIER_CONFIG.length - 1 && (
                  <View style={S.tierArrow}><Text style={{ color: t.color, fontSize: 12 }}>→</Text></View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Benefits */}
          <Text style={S.sectionTitle}>✨ Agency Benefits</Text>
          <View style={S.benefitsGrid}>
            {[
              { icon: '💰', title: '4-50% Commission',  desc: 'Earn on every point your hosts make' },
              { icon: '📊', title: 'Live Dashboard',    desc: 'Real-time host performance analytics' },
              { icon: '🎤', title: 'Host Management',   desc: 'Recruit and manage up to 500 hosts' },
              { icon: '🏆', title: 'Agency Rankings',   desc: 'Compete in monthly leaderboards' },
              { icon: '📤', title: 'QR Recruitment',    desc: 'Custom QR & link for host invites' },
              { icon: '💸', title: 'Fast Withdrawal',   desc: 'Withdraw commission anytime ($10 min)' },
            ].map(b => (
              <View key={b.title} style={S.benefitCard}>
                <Text style={{ fontSize: 28 }}>{b.icon}</Text>
                <Text style={S.benefitTitle}>{b.title}</Text>
                <Text style={S.benefitDesc}>{b.desc}</Text>
              </View>
            ))}
          </View>

          {/* Registration form */}
          <Text style={S.sectionTitle}>📝 Register Your Agency</Text>
          <View style={S.formCard}>
            <Text style={S.formLabel}>Agency Name *</Text>
            <TextInput
              style={S.formInput}
              placeholder="e.g., StarLight Entertainment..."
              placeholderTextColor={Colors.textMuted}
              value={agencyName}
              onChangeText={setAgencyName}
            />
            <Text style={S.formLabel}>Referral Code (optional)</Text>
            <TextInput
              style={S.formInput}
              placeholder="Enter a referral code if you have one..."
              placeholderTextColor={Colors.textMuted}
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="none"
            />
            <View style={S.formRequirements}>
              <Text style={S.reqTitle}>Requirements:</Text>
              {['✓ Active SashLive account', '✓ At least 1 host recruited within 30 days', '✓ Agree to agency terms of service'].map(r => (
                <Text key={r} style={S.reqItem}>{r}</Text>
              ))}
            </View>
            <Pressable
              style={[S.registerBtn, (submitting || !agencyName.trim()) && { opacity: 0.6 }]}
              onPress={handleRegister}
              disabled={submitting || !agencyName.trim()}
            >
              {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={S.registerBtnText}>🚀 Launch Agency</Text>}
            </Pressable>
          </View>
        </ScrollView>
      ) : (
        // ── Agency Dashboard ──
        <>
          {/* Tier status bar */}
          <View style={[S.tierStatusBar, { borderColor: tier.color + '40', backgroundColor: tier.color + '12' }]}>
            <Text style={{ fontSize: 22 }}>{tier.badge}</Text>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[S.tierStatusLabel, { color: tier.color }]}>{tier.label} Agency</Text>
                <View style={[S.commBadge, { backgroundColor: tier.color + '25' }]}>
                  <Text style={[S.commBadgeText, { color: tier.color }]}>{(tier.rate * 100).toFixed(0)}% commission</Text>
                </View>
              </View>
              {nextTier && (
                <Text style={S.tierStatusNext}>
                  {nextTier.minHosts - activeHosts} more hosts for {nextTier.label} ({(nextTier.rate * 100).toFixed(0)}%)
                </Text>
              )}
            </View>
            <Pressable onPress={() => setShowQR(true)} style={S.qrMiniBtn}>
              <MaterialIcons name="qr-code" size={18} color={tier.color} />
            </Pressable>
          </View>

          {/* Tabs */}
          <View style={S.tabs}>
            {([
              { key: 'overview', label: '📊 Overview' },
              { key: 'hosts',    label: `👥 Hosts (${hosts.length})` },
              { key: 'earnings', label: '💰 Earnings' },
              { key: 'recruit',  label: '➕ Recruit' },
            ] as const).map(tab => (
              <Pressable key={tab.key} style={[S.tab, activeTab === tab.key && S.tabActive]} onPress={() => setActiveTab(tab.key)}>
                <Text style={[S.tabText, activeTab === tab.key && S.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            ))}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scroll}>
            {/* ── OVERVIEW ── */}
            {activeTab === 'overview' && (
              <>
                {/* Stats grid */}
                <View style={S.statsGrid}>
                  {[
                    { label: 'Total Hosts',   val: String(hosts.length),               color: Colors.primary,  icon: '👥' },
                    { label: 'Active',        val: String(activeHosts),                 color: Colors.success,  icon: '🟢' },
                    { label: 'Total Commission', val: `${Math.floor(totalEarned).toLocaleString()} pts`, color: Colors.gold, icon: '💰' },
                    { label: 'Monthly',       val: `${monthlyCommission.toLocaleString()} pts`, color: Colors.diamond, icon: '📅' },
                  ].map(s => (
                    <View key={s.label} style={S.statCard}>
                      <Text style={{ fontSize: 22 }}>{s.icon}</Text>
                      <Text style={[S.statVal, { color: s.color }]}>{s.val}</Text>
                      <Text style={S.statLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>

                {/* USD equivalent */}
                <View style={S.usdCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={S.usdLabel}>Total Commission (USD)</Text>
                    <Text style={S.usdAmount}>${pointsToUSD(Math.floor(totalEarned)).toFixed(2)}</Text>
                    <Text style={S.usdRate}>{POINTS_PER_DOLLAR.toLocaleString()} pts = $1 USD</Text>
                  </View>
                  <Pressable style={S.withdrawBtn} onPress={() => router.push('/withdrawal')}>
                    <MaterialIcons name="arrow-upward" size={16} color="#FFF" />
                    <Text style={S.withdrawBtnText}>Withdraw</Text>
                  </Pressable>
                </View>

                {/* Quick actions */}
                <View style={S.quickActions}>
                  {[
                    { icon: '➕', label: 'Invite Host',  onPress: () => setActiveTab('recruit') },
                    { icon: '📊', label: 'Analytics',    onPress: () => setActiveTab('earnings') },
                    { icon: '💸', label: 'Withdraw',     onPress: () => router.push('/withdrawal') },
                    { icon: '🏆', label: 'Leaderboard',  onPress: () => router.push('/leaderboard') },
                  ].map(a => (
                    <Pressable key={a.label} style={S.qaBtn} onPress={a.onPress}>
                      <Text style={{ fontSize: 22 }}>{a.icon}</Text>
                      <Text style={S.qaBtnLabel}>{a.label}</Text>
                    </Pressable>
                  ))}
                </View>

                {/* Tier upgrade card */}
                {nextTier && (
                  <View style={[S.upgradeCard, { borderColor: nextTier.color + '50' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                      <Text style={{ fontSize: 28 }}>{nextTier.badge}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[S.upgradeTitle, { color: nextTier.color }]}>Upgrade to {nextTier.label}</Text>
                        <Text style={S.upgradeDesc}>Recruit {nextTier.minHosts - activeHosts} more hosts → earn {(nextTier.rate * 100).toFixed(0)}% commission (currently {(tier.rate * 100).toFixed(0)}%)</Text>
                      </View>
                    </View>
                    <View style={S.upgradeBar}>
                      <View style={[S.upgradeBarFill, { width: `${Math.min((activeHosts / nextTier.minHosts) * 100, 100)}%`, backgroundColor: nextTier.color }]} />
                    </View>
                    <Text style={[S.upgradeProgress, { color: nextTier.color }]}>{activeHosts}/{nextTier.minHosts} hosts</Text>
                    <Pressable style={[S.upgradeBtn, { backgroundColor: nextTier.color }]} onPress={() => setActiveTab('recruit')}>
                      <Text style={S.upgradeBtnText}>➕ Recruit Hosts</Text>
                    </Pressable>
                  </View>
                )}

                {/* Top performers preview */}
                <Text style={S.sectionTitle}>🌟 Top Performers</Text>
                {hosts.slice(0, 3).map((h, i) => (
                  <Pressable key={h.id} style={S.hostRowPreview} onPress={() => router.push(`/user/${h.host_id}`)}>
                    <Text style={{ fontSize: 16, width: 24 }}>{['🥇', '🥈', '🥉'][i]}</Text>
                    <Image source={{ uri: h.avatar_url }} style={[S.hostAv, { borderColor: h.is_online ? Colors.success : Colors.cardBorder }]} contentFit="cover" />
                    <View style={{ flex: 1 }}>
                      <Text style={S.hostName}>{h.display_name}</Text>
                      <EarningsBar value={h.total_earned} max={maxEarned} color={['#FFD700', '#C0C0C0', '#CD7F32'][i]} />
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={S.hostEarned}>{h.total_earned.toLocaleString()} pts</Text>
                      <Text style={[S.hostComm, { color: Colors.gold }]}>+{Math.floor(h.total_earned * tier.rate).toLocaleString()} comm.</Text>
                    </View>
                  </Pressable>
                ))}
              </>
            )}

            {/* ── HOSTS ── */}
            {activeTab === 'hosts' && (
              <>
                <View style={S.hostsHeader}>
                  <TextInput
                    style={S.hostSearch}
                    placeholder="Search hosts..."
                    placeholderTextColor={Colors.textMuted}
                    value={hostSearch}
                    onChangeText={setHostSearch}
                  />
                  <Pressable style={S.inviteSmBtn} onPress={() => setActiveTab('recruit')}>
                    <MaterialIcons name="person-add" size={16} color="#FFF" />
                    <Text style={S.inviteSmBtnText}>Invite</Text>
                  </Pressable>
                </View>

                {/* Stats row */}
                <View style={S.hostStatsRow}>
                  {[
                    { label: 'Total', val: hosts.length, color: Colors.primary },
                    { label: 'Active', val: activeHosts, color: Colors.success },
                    { label: 'Inactive', val: hosts.length - activeHosts, color: Colors.textMuted },
                  ].map(s => (
                    <View key={s.label} style={[S.hostStatChip, { borderColor: s.color + '40' }]}>
                      <Text style={[S.hostStatVal, { color: s.color }]}>{s.val}</Text>
                      <Text style={S.hostStatLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>

                {loading ? (
                  <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
                ) : (
                  filteredHosts.map((host, i) => (
                    <Pressable key={host.id} style={S.hostCard} onPress={() => router.push(`/user/${host.host_id}`)}>
                      <View style={S.hostCardLeft}>
                        <View style={{ position: 'relative' }}>
                          <Image source={{ uri: host.avatar_url }} style={[S.hostCardAv, { borderColor: host.is_online ? Colors.success : Colors.cardBorder }]} contentFit="cover" />
                          {host.is_online && <View style={S.onlineDot} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <Text style={S.hostCardName}>{host.display_name}</Text>
                            <View style={[S.statusPill, { backgroundColor: host.status === 'active' ? Colors.success + '25' : Colors.cardBorder }]}>
                              <Text style={[S.statusPillText, { color: host.status === 'active' ? Colors.success : Colors.textMuted }]}>{host.status}</Text>
                            </View>
                          </View>
                          <Text style={S.hostCardUsername}>@{host.username}</Text>
                          <EarningsBar value={host.total_earned} max={maxEarned} color={Colors.primary} />
                        </View>
                      </View>
                      <View style={S.hostCardRight}>
                        <Text style={S.hostCardEarned}>{host.total_earned.toLocaleString()}</Text>
                        <Text style={S.hostCardEarnedLabel}>pts earned</Text>
                        <Text style={[S.hostCardComm, { color: Colors.gold }]}>
                          +{Math.floor(host.total_earned * tier.rate).toLocaleString()} pts
                        </Text>
                        <Text style={S.hostCardCommLabel}>your comm.</Text>
                      </View>
                    </Pressable>
                  ))
                )}

                {filteredHosts.length === 0 && !loading && (
                  <View style={S.emptyHosts}>
                    <Text style={{ fontSize: 48 }}>👥</Text>
                    <Text style={S.emptyHostsTitle}>No hosts yet</Text>
                    <Pressable style={S.emptyHostsBtn} onPress={() => setActiveTab('recruit')}>
                      <Text style={S.emptyHostsBtnText}>➕ Recruit Your First Host</Text>
                    </Pressable>
                  </View>
                )}
              </>
            )}

            {/* ── EARNINGS ── */}
            {activeTab === 'earnings' && (
              <>
                {/* Period filter */}
                <View style={S.periodRow}>
                  {(['week', 'month', 'all'] as const).map(p => (
                    <Pressable key={p} style={[S.periodBtn, selectedPeriod === p && S.periodBtnActive]} onPress={() => setSelectedPeriod(p)}>
                      <Text style={[S.periodBtnText, selectedPeriod === p && S.periodBtnTextActive]}>
                        {p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'All Time'}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Main earnings card */}
                <View style={S.earningsCard}>
                  <Text style={S.earningsCardLabel}>Commission Earned</Text>
                  <Text style={S.earningsCardAmount}>{Math.floor(totalEarned).toLocaleString()}</Text>
                  <Text style={S.earningsCardUnit}>points</Text>
                  <View style={S.earningsCardRow}>
                    <Text style={[S.earningsCardUsd, { color: Colors.gold }]}>${pointsToUSD(Math.floor(totalEarned)).toFixed(2)} USD</Text>
                    <Text style={S.earningsCardRate}>at {(tier.rate * 100).toFixed(0)}% rate</Text>
                  </View>
                </View>

                {/* Stats */}
                <View style={S.earningsStats}>
                  {[
                    { label: 'Total Host Earnings', val: `${totalHostEarnings.toLocaleString()} pts`, color: Colors.primary },
                    { label: 'Your Commission',     val: `${Math.floor(totalEarned).toLocaleString()} pts`, color: Colors.gold },
                    { label: 'USD Equivalent',      val: `$${pointsToUSD(Math.floor(totalEarned)).toFixed(2)}`, color: Colors.success },
                    { label: 'Commission Rate',     val: `${(tier.rate * 100).toFixed(0)}%`, color: tier.color },
                  ].map(s => (
                    <View key={s.label} style={S.earningStatRow}>
                      <Text style={S.earningStatLabel}>{s.label}</Text>
                      <Text style={[S.earningStatVal, { color: s.color }]}>{s.val}</Text>
                    </View>
                  ))}
                  <View style={S.earningStatDiv} />
                  <Text style={S.earningNote}>Points collected from tasks must be claimed before midnight (BD time).</Text>
                </View>

                {/* Per-host breakdown */}
                <Text style={S.sectionTitle}>📊 Host Breakdown</Text>
                {hosts.map(h => (
                  <View key={h.id} style={S.earningHostRow}>
                    <Image source={{ uri: h.avatar_url }} style={S.earningHostAv} contentFit="cover" />
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={S.earningHostName}>{h.display_name}</Text>
                        <Text style={[S.earningHostComm, { color: Colors.gold }]}>
                          +{Math.floor(h.total_earned * tier.rate).toLocaleString()} pts
                        </Text>
                      </View>
                      <EarningsBar value={h.total_earned} max={maxEarned} color={Colors.primary} />
                      <Text style={S.earningHostBase}>Host earned: {h.total_earned.toLocaleString()} pts</Text>
                    </View>
                  </View>
                ))}

                <Pressable style={S.fullWithdrawBtn} onPress={() => router.push('/withdrawal')}>
                  <Text style={S.fullWithdrawBtnText}>💸 Withdraw Commission</Text>
                </Pressable>
              </>
            )}

            {/* ── RECRUIT ── */}
            {activeTab === 'recruit' && (
              <>
                <View style={S.recruitHero}>
                  <Text style={{ fontSize: 48 }}>📤</Text>
                  <Text style={S.recruitTitle}>Recruit New Hosts</Text>
                  <Text style={S.recruitDesc}>Share your agency code or QR to invite streamers. Earn {(tier.rate * 100).toFixed(0)}% on everything they make.</Text>
                </View>

                {/* Agency code */}
                <View style={S.codeCard}>
                  <Text style={S.codeCardLabel}>Your Agency Code</Text>
                  <Text style={S.codeCardValue}>{referralCode}</Text>
                  <Pressable style={S.codeShareBtn} onPress={() => setShowQR(true)}>
                    <MaterialIcons name="qr-code" size={18} color="#FFF" />
                    <Text style={S.codeShareBtnText}>Show QR Code</Text>
                  </Pressable>
                </View>

                {/* Share options */}
                <Text style={S.sectionTitle}>📲 Share Via</Text>
                <View style={S.shareGrid}>
                  {[
                    { icon: '💬', label: 'Message',   color: Colors.primary },
                    { icon: '📱', label: 'WhatsApp',  color: '#25D366' },
                    { icon: '📘', label: 'Facebook',  color: '#1877F2' },
                    { icon: '✉️', label: 'Email',     color: Colors.secondary },
                    { icon: '📋', label: 'Copy Link', color: Colors.gold },
                    { icon: '🔗', label: 'More...',   color: Colors.textMuted },
                  ].map(s => (
                    <Pressable key={s.label} style={[S.shareOption, { borderColor: s.color + '40' }]} onPress={() => showAlert(`Share via ${s.label}`, `Agency Code: ${referralCode}`)}>
                      <Text style={{ fontSize: 28 }}>{s.icon}</Text>
                      <Text style={[S.shareOptionLabel, { color: s.color }]}>{s.label}</Text>
                    </Pressable>
                  ))}
                </View>

                {/* How it works */}
                <Text style={S.sectionTitle}>ℹ️ How Recruitment Works</Text>
                <View style={S.howGrid}>
                  {[
                    { step: '1', desc: 'Share your agency code or QR with a streamer' },
                    { step: '2', desc: 'They sign up with your code on SashLive' },
                    { step: '3', desc: 'They become verified as your agency host' },
                    { step: '4', desc: `You earn ${(tier.rate * 100).toFixed(0)}% of every point they make — forever` },
                  ].map(h => (
                    <View key={h.step} style={S.howStep}>
                      <View style={S.howStepNum}><Text style={S.howStepNumText}>{h.step}</Text></View>
                      <Text style={S.howStepDesc}>{h.desc}</Text>
                    </View>
                  ))}
                </View>

                {/* Commission calculator */}
                <View style={S.calcCard}>
                  <Text style={S.calcTitle}>💡 Commission Calculator</Text>
                  {[1, 5, 10, 20, 50].map(n => {
                    const rate = getAgencyRate(n);
                    const monthlyPts = n * 50000;
                    const comm = Math.floor(monthlyPts * rate);
                    return (
                      <View key={n} style={S.calcRow}>
                        <Text style={S.calcLabel}>{n} hosts @ 50K pts/mo</Text>
                        <Text style={[S.calcVal, { color: Colors.gold }]}>
                          +{comm.toLocaleString()} pts/mo ({(rate * 100).toFixed(0)}%)
                        </Text>
                      </View>
                    );
                  })}
                  <Text style={S.calcNote}>= ${(250 * 50000 * 0.50 / POINTS_PER_DOLLAR).toFixed(0)}/mo at Elite tier with 50 hosts!</Text>
                </View>
              </>
            )}
          </ScrollView>
        </>
      )}

      {/* QR Modal */}
      <QRShareModal visible={showQR} onClose={() => setShowQR(false)} code={referralCode} />
    </SafeAreaView>
  );
}

// Modal styles
const M = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
  sheet: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, width: '88%', gap: Spacing.md, borderWidth: 1, borderColor: Colors.primary + '40', alignItems: 'center' },
  title: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  qrBox: { backgroundColor: '#FFF', borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', gap: Spacing.sm },
  qrGrid: { flexDirection: 'row', flexWrap: 'wrap', width: 160, gap: 2 },
  qrCell: { width: 20, height: 20, borderRadius: 2 },
  qrLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  codeBox: { backgroundColor: Colors.bgSecondary, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', gap: 4, width: '100%', borderWidth: 1, borderColor: Colors.primary + '40' },
  codeLabel: { color: Colors.textMuted, fontSize: FontSize.xs, textTransform: 'uppercase', letterSpacing: 1 },
  codeValue: { color: Colors.primary, fontSize: FontSize.xl, fontWeight: FontWeight.black, letterSpacing: 2 },
  shareInstruction: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center', lineHeight: 18 },
  shareRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center' },
  shareBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.primary + '20', borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.primary + '50' },
  shareBtnText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  closeBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, width: '100%', alignItems: 'center' },
  closeBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
});

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold, flex: 1, textAlign: 'center' },
  scroll: { padding: Spacing.md, paddingBottom: 100 },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.sm, marginTop: Spacing.xs },
  // Hero
  heroBanner: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.primary + '30' },
  heroTitle: { color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: FontWeight.black, textAlign: 'center' },
  heroDesc: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 22 },
  earningPreview: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', backgroundColor: Colors.gold + '15', borderRadius: BorderRadius.md, padding: Spacing.sm, gap: 4 },
  earningPreviewText: { color: Colors.textSecondary, fontSize: FontSize.xs },
  earningPreviewAmount: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  // Tiers
  tierCard: { width: 90, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.sm, alignItems: 'center', gap: 4, borderWidth: 1.5, position: 'relative' },
  tierLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  tierHosts: { color: Colors.textMuted, fontSize: 9 },
  tierRateBadge: { borderRadius: BorderRadius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  tierRate: { fontSize: 11, fontWeight: FontWeight.black },
  tierArrow: { position: 'absolute', right: -12, top: '50%' },
  // Benefits
  benefitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  benefitCard: { width: (width - Spacing.md * 2 - Spacing.sm) / 2, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: 4, borderWidth: 1, borderColor: Colors.cardBorder },
  benefitTitle: { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  benefitDesc: { color: Colors.textMuted, fontSize: 10, lineHeight: 14 },
  // Form
  formCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: Spacing.lg },
  formLabel: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  formInput: { backgroundColor: Colors.bgSecondary, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 10, color: Colors.textPrimary, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.cardBorder },
  formRequirements: { backgroundColor: Colors.bgSecondary, borderRadius: BorderRadius.md, padding: Spacing.md, gap: 4, borderWidth: 1, borderColor: Colors.cardBorder },
  reqTitle: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: FontWeight.bold, marginBottom: 2 },
  reqItem: { color: Colors.textMuted, fontSize: FontSize.xs, lineHeight: 18 },
  registerBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  registerBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  // Tier status bar
  tierStatusBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, marginBottom: 2, borderWidth: 1, borderLeftWidth: 0, borderRightWidth: 0 },
  tierStatusLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  tierStatusNext: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 1 },
  commBadge: { borderRadius: BorderRadius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  commBadgeText: { fontSize: 10, fontWeight: FontWeight.black },
  qrMiniBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.cardBorder },
  // Tabs
  tabs: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.xs, marginBottom: Spacing.sm },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: 10, fontWeight: FontWeight.medium },
  tabTextActive: { color: '#FFF', fontWeight: FontWeight.bold },
  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  statCard: { width: (width - Spacing.md * 2 - Spacing.sm) / 2, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: 3, borderWidth: 1, borderColor: Colors.cardBorder, alignItems: 'center' },
  statVal: { fontSize: FontSize.xl, fontWeight: FontWeight.black },
  statLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  usdCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderColor: Colors.gold + '40', marginBottom: Spacing.md },
  usdLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  usdAmount: { color: Colors.gold, fontSize: 32, fontWeight: FontWeight.black },
  usdRate: { color: Colors.textMuted, fontSize: FontSize.xs },
  withdrawBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, flexDirection: 'row', gap: 4, alignItems: 'center' },
  withdrawBtnText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  quickActions: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  qaBtn: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.cardBorder },
  qaBtnLabel: { color: Colors.textSecondary, fontSize: 9, fontWeight: FontWeight.semibold },
  upgradeCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, gap: Spacing.sm, borderWidth: 1.5, marginBottom: Spacing.md },
  upgradeTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  upgradeDesc: { color: Colors.textMuted, fontSize: FontSize.xs, lineHeight: 16 },
  upgradeBar: { height: 6, backgroundColor: Colors.cardBorder, borderRadius: 3, overflow: 'hidden' },
  upgradeBarFill: { height: '100%', borderRadius: 3 },
  upgradeProgress: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  upgradeBtn: { borderRadius: BorderRadius.pill, paddingVertical: Spacing.sm, alignItems: 'center' },
  upgradeBtnText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  hostRowPreview: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  hostAv: { width: 40, height: 40, borderRadius: 20, borderWidth: 2 },
  hostName: { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  hostEarned: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  hostComm: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  // Hosts tab
  hostsHeader: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', marginBottom: Spacing.sm },
  hostSearch: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: 8, color: Colors.textPrimary, fontSize: FontSize.sm, borderWidth: 1, borderColor: Colors.cardBorder },
  inviteSmBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 8 },
  inviteSmBtnText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  hostStatsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  hostStatChip: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', borderWidth: 1 },
  hostStatVal: { fontSize: FontSize.lg, fontWeight: FontWeight.black },
  hostStatLabel: { color: Colors.textMuted, fontSize: 10 },
  hostCard: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: Spacing.sm },
  hostCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  hostCardAv: { width: 44, height: 44, borderRadius: 22, borderWidth: 2 },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.surface },
  hostCardName: { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  hostCardUsername: { color: Colors.textMuted, fontSize: 10, marginBottom: 4 },
  statusPill: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  statusPillText: { fontSize: 9, fontWeight: FontWeight.bold },
  hostCardRight: { alignItems: 'flex-end', gap: 1 },
  hostCardEarned: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.black },
  hostCardEarnedLabel: { color: Colors.textMuted, fontSize: 9 },
  hostCardComm: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  hostCardCommLabel: { color: Colors.textMuted, fontSize: 9 },
  emptyHosts: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md },
  emptyHostsTitle: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  emptyHostsBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl },
  emptyHostsBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  // Earnings tab
  periodRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  periodBtn: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder },
  periodBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  periodBtnText: { color: Colors.textMuted, fontSize: FontSize.xs },
  periodBtnTextActive: { color: '#FFF', fontWeight: FontWeight.bold },
  earningsCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.gold + '40' },
  earningsCardLabel: { color: Colors.textMuted, fontSize: FontSize.sm },
  earningsCardAmount: { color: Colors.gold, fontSize: 48, fontWeight: FontWeight.black },
  earningsCardUnit: { color: Colors.textMuted, fontSize: FontSize.sm },
  earningsCardRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  earningsCardUsd: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  earningsCardRate: { color: Colors.textMuted, fontSize: FontSize.xs },
  earningsStats: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: Spacing.md },
  earningStatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  earningStatLabel: { color: Colors.textMuted, fontSize: FontSize.sm },
  earningStatVal: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  earningStatDiv: { height: 1, backgroundColor: Colors.cardBorder },
  earningNote: { color: Colors.textMuted, fontSize: FontSize.xs, lineHeight: 16 },
  earningHostRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  earningHostAv: { width: 36, height: 36, borderRadius: 18 },
  earningHostName: { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  earningHostComm: { fontSize: FontSize.xs, fontWeight: FontWeight.black },
  earningHostBase: { color: Colors.textMuted, fontSize: 9 },
  fullWithdrawBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.lg, marginBottom: Spacing.lg },
  fullWithdrawBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  // Recruit tab
  recruitHero: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: Spacing.lg },
  recruitTitle: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  recruitDesc: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 22 },
  codeCard: { backgroundColor: Colors.primary + '15', borderRadius: BorderRadius.xl, padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm, borderWidth: 1.5, borderColor: Colors.primary + '50', marginBottom: Spacing.md },
  codeCardLabel: { color: Colors.textMuted, fontSize: FontSize.xs, textTransform: 'uppercase', letterSpacing: 1 },
  codeCardValue: { color: Colors.primary, fontSize: FontSize.xl, fontWeight: FontWeight.black, letterSpacing: 3 },
  codeShareBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
  codeShareBtnText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  shareGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  shareOption: { width: (width - Spacing.md * 2 - Spacing.sm * 2) / 3, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', gap: 4, borderWidth: 1 },
  shareOptionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  howGrid: { gap: Spacing.sm, marginBottom: Spacing.lg },
  howStep: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.cardBorder },
  howStepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  howStepNumText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.black },
  howStepDesc: { flex: 1, color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
  calcCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.gold + '40', marginBottom: Spacing.lg },
  calcTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: 4 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  calcLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  calcVal: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  calcNote: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.bold, textAlign: 'center', marginTop: 4 },
});
