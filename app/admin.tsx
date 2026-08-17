// SashLive — Admin Dashboard: Full management panel with real DB operations
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal,
  ActivityIndicator, TextInput, RefreshControl, Dimensions, Switch, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useAlert } from '@/template';
import { useAuth } from '@/template';
import { getSupabaseClient } from '@/template';
import { useApp } from '@/contexts/AppContext';

const { width } = Dimensions.get('window');

type AdminTab = 'overview' | 'recharge' | 'withdrawal' | 'users' | 'live';

function fmtNum(n: number) {
  return n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n || 0);
}

function timeAgo(iso: string) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export default function AdminDashboard() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { user } = useAuth();
  const { currentUser } = useApp();
  const supabase = getSupabaseClient();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [recharges, setRecharges] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [liveRooms, setLiveRooms] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, activeStreams: 0, pendingRecharge: 0, pendingWithdrawal: 0, totalDiamonds: 0, totalPtsWithdrawn: 0 });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [searchUser, setSearchUser] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [proofModal, setProofModal] = useState<any>(null);
  const [userDetailModal, setUserDetailModal] = useState<any>(null);
  const [reviewNote, setReviewNote] = useState('');

  // ── Animation ──
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [activeTab]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [rRes, wRes, uRes, lRes] = await Promise.all([
      supabase.from('recharge_requests').select('*, user:user_id(username, display_name, avatar_url, email, diamonds)').order('created_at', { ascending: false }).limit(100),
      supabase.from('withdrawal_requests').select('*, user:user_id(username, display_name, avatar_url, points)').order('created_at', { ascending: false }).limit(100),
      supabase.from('user_profiles').select('id, username, display_name, avatar_url, diamonds, points, coins, is_host, vip_level, followers, created_at, is_online, is_admin, is_agent, level, xp').order('diamonds', { ascending: false }).limit(50),
      supabase.from('live_rooms').select('*, host:host_id(username, display_name, avatar_url)').eq('is_live', true).order('viewers', { ascending: false }),
    ]);

    const rData = rRes.data || [];
    const wData = wRes.data || [];
    const uData = uRes.data || [];
    const lData = lRes.data || [];

    setRecharges(rData);
    setWithdrawals(wData);
    setUsers(uData);
    setLiveRooms(lData);
    setStats({
      totalUsers: uData.length,
      activeStreams: lData.length,
      pendingRecharge: rData.filter(r => r.status === 'pending').length,
      pendingWithdrawal: wData.filter(w => w.status === 'pending').length,
      totalDiamonds: rData.reduce((s: number, r: any) => s + (r.amount_diamonds || 0), 0),
      totalPtsWithdrawn: wData.filter(w => w.status === 'approved').reduce((s: number, w: any) => s + (w.points_amount || 0), 0),
    });
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); const t = setInterval(loadData, 30000); return () => clearInterval(t); }, [loadData]);

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const statusColor = (s: string) => s === 'approved' ? Colors.success : s === 'rejected' ? Colors.error : Colors.gold;

  // ── Approve Recharge ──
  const approveRecharge = async (req: any) => {
    setProcessing(req.id);
    await supabase.from('recharge_requests').update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString(), notes: reviewNote || 'Approved' }).eq('id', req.id);
    const { data: profile } = await supabase.from('user_profiles').select('diamonds').eq('id', req.user_id).single();
    if (profile) await supabase.from('user_profiles').update({ diamonds: (profile.diamonds || 0) + req.amount_diamonds }).eq('id', req.user_id);
    setRecharges(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved' } : r));
    setStats(s => ({ ...s, pendingRecharge: Math.max(0, s.pendingRecharge - 1) }));
    setProcessing(null);
    setProofModal(null);
    showAlert('✅ Approved', `💎 ${req.amount_diamonds.toLocaleString()} credited to ${req.user?.display_name || 'user'}`);
  };

  const rejectRecharge = async (req: any) => {
    setProcessing(req.id);
    await supabase.from('recharge_requests').update({ status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString(), notes: reviewNote || 'Rejected' }).eq('id', req.id);
    setRecharges(prev => prev.map(r => r.id === req.id ? { ...r, status: 'rejected' } : r));
    setStats(s => ({ ...s, pendingRecharge: Math.max(0, s.pendingRecharge - 1) }));
    setProcessing(null);
    setProofModal(null);
    showAlert('Rejected', 'Request rejected.');
  };

  const approveWithdrawal = async (req: any) => {
    setProcessing(req.id);
    await supabase.from('withdrawal_requests').update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq('id', req.id);
    setWithdrawals(prev => prev.map(w => w.id === req.id ? { ...w, status: 'approved' } : w));
    setStats(s => ({ ...s, pendingWithdrawal: Math.max(0, s.pendingWithdrawal - 1) }));
    setProcessing(null);
    showAlert('✅ Approved', `$${req.usd_amount} withdrawal approved.`);
  };

  const rejectWithdrawal = async (req: any) => {
    setProcessing(req.id);
    const { data: profile } = await supabase.from('user_profiles').select('points').eq('id', req.user_id).single();
    if (profile) await supabase.from('user_profiles').update({ points: (profile.points || 0) + req.points_amount }).eq('id', req.user_id);
    await supabase.from('withdrawal_requests').update({ status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq('id', req.id);
    setWithdrawals(prev => prev.map(w => w.id === req.id ? { ...w, status: 'rejected' } : w));
    setStats(s => ({ ...s, pendingWithdrawal: Math.max(0, s.pendingWithdrawal - 1) }));
    setProcessing(null);
    showAlert('Rejected', `${req.points_amount.toLocaleString()} pts refunded.`);
  };

  const toggleUserField = async (userId: string, field: string, current: boolean, label: string) => {
    showAlert(`${current ? 'Remove' : 'Grant'} ${label}?`, `Change ${label} status for this user.`, [
      {
        text: 'Confirm', onPress: async () => {
          await supabase.from('user_profiles').update({ [field]: !current }).eq('id', userId);
          setUsers(prev => prev.map(u => u.id === userId ? { ...u, [field]: !current } : u));
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const forceEndStream = async (room: any) => {
    showAlert('Force End Stream?', `End "${room.title}" by ${room.host?.display_name}?`, [
      {
        text: 'Force End', style: 'destructive', onPress: async () => {
          await supabase.from('live_rooms').update({ is_live: false, ended_at: new Date().toISOString() }).eq('id', room.id);
          setLiveRooms(prev => prev.filter(r => r.id !== room.id));
          setStats(s => ({ ...s, activeStreams: Math.max(0, s.activeStreams - 1) }));
          showAlert('Stream Ended', 'The stream has been terminated.');
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const filteredRecharges = recharges.filter(r => statusFilter === 'all' || r.status === statusFilter);
  const filteredWithdrawals = withdrawals.filter(w => statusFilter === 'all' || w.status === statusFilter);
  const filteredUsers = users.filter(u => !searchUser || `${u.username} ${u.display_name}`.toLowerCase().includes(searchUser.toLowerCase()));

  const TABS: { key: AdminTab; label: string; emoji: string; badge?: number }[] = [
    { key: 'overview', label: 'Overview', emoji: '📊' },
    { key: 'recharge', label: 'Top-Ups', emoji: '💎', badge: stats.pendingRecharge },
    { key: 'withdrawal', label: 'Payouts', emoji: '💸', badge: stats.pendingWithdrawal },
    { key: 'users', label: 'Users', emoji: '👥' },
    { key: 'live', label: 'Live', emoji: '🔴', badge: stats.activeStreams },
  ];

  const FilterChips = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.filterRow}>
      {(['all', 'pending', 'approved', 'rejected'] as StatusFilter[]).map(s => (
        <Pressable key={s} style={[S.filterChip, statusFilter === s && S.filterChipActive]} onPress={() => setStatusFilter(s)}>
          <Text style={[S.filterChipText, statusFilter === s && S.filterChipTextActive]}>
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  const StatusBadge = ({ status }: { status: string }) => (
    <View style={[S.statusBadge, { backgroundColor: statusColor(status) + '20', borderColor: statusColor(status) + '50' }]}>
      <Text style={[S.statusBadgeText, { color: statusColor(status) }]}>{status.toUpperCase()}</Text>
    </View>
  );

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={[Colors.primary, '#6366F1']} style={S.header}>
        <Pressable onPress={() => router.back()} style={S.backBtn} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={22} color="#FFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={S.headerTitle}>🛡️ Admin Panel</Text>
          <Text style={S.headerSub}>SashLive Control Center</Text>
        </View>
        <Pressable style={S.headerRefreshBtn} onPress={onRefresh} hitSlop={8}>
          <MaterialIcons name="refresh" size={20} color="#FFF" />
        </Pressable>
      </LinearGradient>

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.tabScrollView} contentContainerStyle={S.tabBar}>
        {TABS.map(tab => (
          <Pressable key={tab.key} style={[S.tab, activeTab === tab.key && S.tabActive]} onPress={() => {
            fadeAnim.setValue(0);
            setActiveTab(tab.key);
          }}>
            <Text style={{ fontSize: 14 }}>{tab.emoji}</Text>
            <Text style={[S.tabText, activeTab === tab.key && S.tabTextActive]}>{tab.label}</Text>
            {tab.badge ? <View style={S.tabBadge}><Text style={S.tabBadgeText}>{tab.badge}</Text></View> : null}
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' ? (
            <>
              {/* Stats Grid */}
              <View style={S.statsGrid}>
                {[
                  { emoji: '👥', label: 'Total Users', val: fmtNum(stats.totalUsers), color: Colors.primary, onPress: () => setActiveTab('users') },
                  { emoji: '🔴', label: 'Live Rooms', val: String(stats.activeStreams), color: Colors.live, onPress: () => setActiveTab('live') },
                  { emoji: '💎', label: 'Pending Top-Up', val: String(stats.pendingRecharge), color: Colors.gold, onPress: () => setActiveTab('recharge') },
                  { emoji: '💸', label: 'Pending Payout', val: String(stats.pendingWithdrawal), color: Colors.secondary, onPress: () => setActiveTab('withdrawal') },
                  { emoji: '💰', label: 'Diamonds Req.', val: fmtNum(stats.totalDiamonds), color: Colors.diamond, onPress: () => setActiveTab('recharge') },
                  { emoji: '🏆', label: 'Pts Paid Out', val: fmtNum(stats.totalPtsWithdrawn), color: Colors.success, onPress: () => setActiveTab('withdrawal') },
                ].map(card => (
                  <Pressable key={card.label} style={[S.statCard, { borderLeftColor: card.color }]} onPress={card.onPress}>
                    <Text style={{ fontSize: 26 }}>{card.emoji}</Text>
                    <Text style={[S.statVal, { color: card.color }]}>{card.val}</Text>
                    <Text style={S.statLabel}>{card.label}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Quick Actions */}
              <Text style={S.sectionTitle}>⚡ Quick Actions</Text>
              <View style={S.quickGrid}>
                {[
                  { emoji: '💎', label: 'Review\nTop-Ups', badge: stats.pendingRecharge, color: Colors.gold, tab: 'recharge' as AdminTab },
                  { emoji: '💸', label: 'Review\nPayouts', badge: stats.pendingWithdrawal, color: Colors.secondary, tab: 'withdrawal' as AdminTab },
                  { emoji: '🔴', label: 'Monitor\nStreams', badge: stats.activeStreams, color: Colors.live, tab: 'live' as AdminTab },
                  { emoji: '👥', label: 'Manage\nUsers', badge: 0, color: Colors.primary, tab: 'users' as AdminTab },
                ].map(a => (
                  <Pressable key={a.label} style={[S.quickCard, { borderColor: a.color + '40' }]} onPress={() => setActiveTab(a.tab)}>
                    <Text style={{ fontSize: 30 }}>{a.emoji}</Text>
                    <Text style={[S.quickCardLabel, { color: a.color }]}>{a.label}</Text>
                    {a.badge > 0 ? <View style={[S.quickBadge, { backgroundColor: a.color }]}><Text style={S.quickBadgeText}>{a.badge}</Text></View> : null}
                  </Pressable>
                ))}
              </View>

              {/* Live rooms preview */}
              {liveRooms.length > 0 ? (
                <>
                  <Text style={S.sectionTitle}>🔴 Active Streams ({liveRooms.length})</Text>
                  {liveRooms.slice(0, 4).map(room => (
                    <Pressable key={room.id} style={S.activityCard} onPress={() => router.push(`/live/${room.id}`)}>
                      <View style={{ position: 'relative' }}>
                        <Image source={{ uri: room.host?.avatar_url || '' }} style={S.activityAv} contentFit="cover" />
                        <View style={S.activityLiveDot} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={S.activityTitle} numberOfLines={1}>{room.title}</Text>
                        <Text style={S.activitySub}>{room.host?.display_name} · 👁 {fmtNum(room.viewers)}</Text>
                      </View>
                      {room.is_pk ? <View style={S.activityBadge}><Text style={S.activityBadgeText}>⚔️ PK</Text></View> : null}
                      <Pressable style={S.endBtn} onPress={() => forceEndStream(room)} hitSlop={8}>
                        <MaterialIcons name="stop-circle" size={22} color={Colors.error} />
                      </Pressable>
                    </Pressable>
                  ))}
                </>
              ) : null}

              {/* Recent pending recharges */}
              {recharges.filter(r => r.status === 'pending').length > 0 ? (
                <>
                  <Text style={[S.sectionTitle, { marginTop: Spacing.md }]}>💎 Pending Recharges</Text>
                  {recharges.filter(r => r.status === 'pending').slice(0, 3).map(req => (
                    <View key={req.id} style={S.miniReqCard}>
                      <Image source={{ uri: req.user?.avatar_url || '' }} style={S.miniReqAv} contentFit="cover" />
                      <View style={{ flex: 1 }}>
                        <Text style={S.miniReqName}>{req.user?.display_name || 'User'}</Text>
                        <Text style={S.miniReqSub}>💎 {req.amount_diamonds.toLocaleString()} · {req.payment_method} · {timeAgo(req.created_at)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <Pressable style={S.miniRejectBtn} onPress={() => rejectRecharge(req)} disabled={!!processing}>
                          <MaterialIcons name="close" size={14} color={Colors.error} />
                        </Pressable>
                        <Pressable style={S.miniApproveBtn} onPress={() => approveRecharge(req)} disabled={!!processing}>
                          {processing === req.id ? <ActivityIndicator size="small" color="#FFF" /> : <MaterialIcons name="check" size={14} color="#FFF" />}
                        </Pressable>
                      </View>
                    </View>
                  ))}
                  {recharges.filter(r => r.status === 'pending').length > 3 ? (
                    <Pressable onPress={() => setActiveTab('recharge')}><Text style={S.seeAllLink}>See all {recharges.filter(r => r.status === 'pending').length} pending →</Text></Pressable>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}

          {/* ── RECHARGE ── */}
          {activeTab === 'recharge' ? (
            <>
              <FilterChips />
              {loading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} /> : null}
              {filteredRecharges.length === 0 && !loading ? (
                <View style={S.emptyState}><Text style={{ fontSize: 48 }}>✅</Text><Text style={S.emptyText}>No {statusFilter} requests</Text></View>
              ) : null}
              {filteredRecharges.map(req => (
                <View key={req.id} style={[S.reqCard, { borderLeftColor: statusColor(req.status) }]}>
                  <View style={S.reqHeader}>
                    <Image source={{ uri: req.user?.avatar_url || '' }} style={S.reqAv} contentFit="cover" />
                    <View style={{ flex: 1 }}>
                      <Text style={S.reqName}>{req.user?.display_name || req.user_id}</Text>
                      <Text style={S.reqSub}>@{req.user?.username} · {timeAgo(req.created_at)}</Text>
                    </View>
                    <StatusBadge status={req.status} />
                  </View>

                  <View style={S.reqDetails}>
                    <View style={S.reqDetailItem}>
                      <Text style={S.reqDetailLabel}>💎 Diamonds</Text>
                      <Text style={[S.reqDetailVal, { color: Colors.diamond }]}>{req.amount_diamonds.toLocaleString()}</Text>
                    </View>
                    <View style={S.reqDetailItem}>
                      <Text style={S.reqDetailLabel}>💰 Price</Text>
                      <Text style={[S.reqDetailVal, { color: Colors.success }]}>{req.plan_price || 'N/A'}</Text>
                    </View>
                    <View style={S.reqDetailItem}>
                      <Text style={S.reqDetailLabel}>📱 Method</Text>
                      <Text style={S.reqDetailVal}>{req.payment_method}</Text>
                    </View>
                    {req.payment_ref ? (
                      <View style={S.reqDetailItem}>
                        <Text style={S.reqDetailLabel}>🔖 Ref</Text>
                        <Text style={S.reqDetailVal} numberOfLines={1}>{req.payment_ref}</Text>
                      </View>
                    ) : null}
                    {req.wallet_address ? (
                      <View style={[S.reqDetailItem, { width: '100%' }]}>
                        <Text style={S.reqDetailLabel}>💳 Wallet</Text>
                        <Text style={S.reqDetailVal} numberOfLines={1}>{req.wallet_address}</Text>
                      </View>
                    ) : null}
                  </View>

                  {req.notes ? (
                    <View style={S.notesBox}><Text style={S.notesText}>📝 {req.notes}</Text></View>
                  ) : null}

                  {req.proof_url ? (
                    <Pressable style={S.proofBtn} onPress={() => setProofModal(req)}>
                      <MaterialIcons name="image" size={15} color={Colors.primary} />
                      <Text style={S.proofBtnText}>View Payment Screenshot</Text>
                      <MaterialIcons name="chevron-right" size={15} color={Colors.primary} />
                    </Pressable>
                  ) : (
                    <View style={[S.proofBtn, { backgroundColor: '#FFF3F3' }]}>
                      <MaterialIcons name="image-not-supported" size={15} color={Colors.error} />
                      <Text style={[S.proofBtnText, { color: Colors.error }]}>No screenshot uploaded</Text>
                    </View>
                  )}

                  {req.status === 'pending' ? (
                    <>
                      <TextInput
                        style={S.noteInput}
                        placeholder="Add review note (optional)..."
                        placeholderTextColor={Colors.textMuted}
                        value={reviewNote}
                        onChangeText={setReviewNote}
                        multiline
                        maxLength={200}
                      />
                      <View style={S.reqActions}>
                        <Pressable style={S.rejectBtn} onPress={() => rejectRecharge(req)} disabled={!!processing}>
                          {processing === req.id ? <ActivityIndicator size="small" color={Colors.error} /> : <><MaterialIcons name="close" size={16} color={Colors.error} /><Text style={S.rejectBtnText}>Reject</Text></>}
                        </Pressable>
                        <Pressable style={S.approveBtn} onPress={() => approveRecharge(req)} disabled={!!processing}>
                          {processing === req.id ? <ActivityIndicator size="small" color="#FFF" /> : <><MaterialIcons name="check" size={16} color="#FFF" /><Text style={S.approveBtnText}>Approve + Credit 💎</Text></>}
                        </Pressable>
                      </View>
                    </>
                  ) : null}
                </View>
              ))}
            </>
          ) : null}

          {/* ── WITHDRAWAL ── */}
          {activeTab === 'withdrawal' ? (
            <>
              <FilterChips />
              {filteredWithdrawals.length === 0 && !loading ? (
                <View style={S.emptyState}><Text style={{ fontSize: 48 }}>✅</Text><Text style={S.emptyText}>No {statusFilter} requests</Text></View>
              ) : null}
              {filteredWithdrawals.map(req => (
                <View key={req.id} style={[S.reqCard, { borderLeftColor: statusColor(req.status) }]}>
                  <View style={S.reqHeader}>
                    <Image source={{ uri: req.user?.avatar_url || '' }} style={S.reqAv} contentFit="cover" />
                    <View style={{ flex: 1 }}>
                      <Text style={S.reqName}>{req.user?.display_name || req.user_id}</Text>
                      <Text style={S.reqSub}>{timeAgo(req.created_at)}</Text>
                    </View>
                    <StatusBadge status={req.status} />
                  </View>

                  <View style={S.reqDetails}>
                    <View style={S.reqDetailItem}>
                      <Text style={S.reqDetailLabel}>💵 Amount</Text>
                      <Text style={[S.reqDetailVal, { color: Colors.success }]}>${Number(req.usd_amount).toFixed(2)}</Text>
                    </View>
                    <View style={S.reqDetailItem}>
                      <Text style={S.reqDetailLabel}>🏆 Points</Text>
                      <Text style={[S.reqDetailVal, { color: Colors.gold }]}>{req.points_amount.toLocaleString()}</Text>
                    </View>
                    <View style={S.reqDetailItem}>
                      <Text style={S.reqDetailLabel}>📱 Method</Text>
                      <Text style={S.reqDetailVal}>{req.method}</Text>
                    </View>
                  </View>

                  <View style={[S.reqDetailItem, { width: '100%', backgroundColor: Colors.bgSecondary || '#F3F4F6', borderRadius: BorderRadius.sm, padding: Spacing.sm, marginTop: 4 }]}>
                    <Text style={S.reqDetailLabel}>💳 Account Details</Text>
                    <Text style={S.reqDetailVal}>{req.account_details}</Text>
                  </View>

                  {req.notes ? <View style={S.notesBox}><Text style={S.notesText}>📝 {req.notes}</Text></View> : null}

                  {req.status === 'pending' ? (
                    <View style={S.reqActions}>
                      <Pressable style={S.rejectBtn} onPress={() => showAlert('Reject & Refund?', 'Points will be refunded to the user.', [
                        { text: 'Reject + Refund', style: 'destructive', onPress: () => rejectWithdrawal(req) },
                        { text: 'Cancel', style: 'cancel' },
                      ])} disabled={!!processing}>
                        <MaterialIcons name="close" size={16} color={Colors.error} />
                        <Text style={S.rejectBtnText}>Reject + Refund</Text>
                      </Pressable>
                      <Pressable style={S.approveBtn} onPress={() => showAlert('Approve & Pay?', `Send $${req.usd_amount} via ${req.method} to:\n${req.account_details}`, [
                        { text: 'Approve & Pay', onPress: () => approveWithdrawal(req) },
                        { text: 'Cancel', style: 'cancel' },
                      ])} disabled={!!processing}>
                        {processing === req.id ? <ActivityIndicator size="small" color="#FFF" /> : <><MaterialIcons name="check" size={16} color="#FFF" /><Text style={S.approveBtnText}>Approve & Pay</Text></>}
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ))}
            </>
          ) : null}

          {/* ── USERS ── */}
          {activeTab === 'users' ? (
            <>
              <View style={S.searchBar}>
                <MaterialIcons name="search" size={18} color={Colors.textMuted} />
                <TextInput style={S.searchInput} placeholder="Search users..." placeholderTextColor={Colors.textMuted} value={searchUser} onChangeText={setSearchUser} />
                {searchUser ? <Pressable onPress={() => setSearchUser('')} hitSlop={8}><MaterialIcons name="close" size={16} color={Colors.textMuted} /></Pressable> : null}
              </View>
              <Text style={S.listCount}>{filteredUsers.length} users found</Text>
              {filteredUsers.map(u => (
                <Pressable key={u.id} style={S.userCard} onPress={() => setUserDetailModal(u)}>
                  <View style={{ position: 'relative' }}>
                    <Image source={{ uri: u.avatar_url || '' }} style={S.userAv} contentFit="cover" />
                    {u.is_online ? <View style={S.userOnlineDot} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <Text style={S.userName}>{u.display_name || u.username}</Text>
                      {u.is_admin ? <View style={[S.badge, { backgroundColor: Colors.primary + '20', borderColor: Colors.primary + '50' }]}><Text style={[S.badgeText, { color: Colors.primary }]}>ADMIN</Text></View> : null}
                      {u.is_host ? <View style={[S.badge, { backgroundColor: Colors.live + '20', borderColor: Colors.live + '50' }]}><Text style={[S.badgeText, { color: Colors.live }]}>HOST</Text></View> : null}
                      {u.is_agent ? <View style={[S.badge, { backgroundColor: Colors.gold + '20', borderColor: Colors.gold + '50' }]}><Text style={[S.badgeText, { color: Colors.gold }]}>AGENT</Text></View> : null}
                    </View>
                    <Text style={S.userSub}>@{u.username}</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
                      <Text style={S.userStat}>💎 {fmtNum(u.diamonds || 0)}</Text>
                      <Text style={S.userStat}>👥 {fmtNum(u.followers || 0)}</Text>
                      <Text style={S.userStat}>VIP {u.vip_level || 0}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <Pressable style={S.userActionBtn} onPress={() => router.push(`/user/${u.id}` as any)} hitSlop={8}>
                      <MaterialIcons name="open-in-new" size={16} color={Colors.textMuted} />
                    </Pressable>
                    <Pressable style={[S.userActionBtn, u.is_admin && { backgroundColor: Colors.primary + '20' }]} onPress={() => toggleUserField(u.id, 'is_admin', u.is_admin, 'Admin')} hitSlop={8}>
                      <MaterialIcons name="admin-panel-settings" size={16} color={u.is_admin ? Colors.primary : Colors.textMuted} />
                    </Pressable>
                  </View>
                </Pressable>
              ))}
            </>
          ) : null}

          {/* ── LIVE MONITOR ── */}
          {activeTab === 'live' ? (
            <>
              <View style={S.liveStatsRow}>
                {[
                  { emoji: '📺', label: 'Active', val: liveRooms.length, color: Colors.live },
                  { emoji: '👁', label: 'Viewers', val: liveRooms.reduce((s, r) => s + (r.viewers || 0), 0), color: Colors.primary },
                  { emoji: '⚔️', label: 'PK Battles', val: liveRooms.filter(r => r.is_pk).length, color: Colors.gold },
                  { emoji: '🎉', label: 'Party Rooms', val: liveRooms.filter(r => r.is_party).length, color: Colors.secondary },
                ].map(stat => (
                  <View key={stat.label} style={S.liveStatCard}>
                    <Text style={{ fontSize: 22 }}>{stat.emoji}</Text>
                    <Text style={[S.liveStatVal, { color: stat.color }]}>{fmtNum(stat.val)}</Text>
                    <Text style={S.liveStatLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>

              {liveRooms.length === 0 ? (
                <View style={S.emptyState}><Text style={{ fontSize: 48 }}>📡</Text><Text style={S.emptyText}>No active streams</Text></View>
              ) : null}

              {liveRooms.map(room => (
                <View key={room.id} style={S.liveRoomCard}>
                  <Pressable style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }} onPress={() => router.push(`/live/${room.id}` as any)}>
                    <View style={{ position: 'relative' }}>
                      <Image source={{ uri: room.host?.avatar_url || '' }} style={S.liveRoomAv} contentFit="cover" />
                      <View style={S.liveRoomLiveDot} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={S.liveRoomTitle} numberOfLines={1}>{room.title}</Text>
                      <Text style={S.liveRoomHost}>{room.host?.display_name}</Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                        <Text style={S.liveRoomStat}>👁 {fmtNum(room.viewers || 0)}</Text>
                        <Text style={S.liveRoomStat}>💎 {fmtNum(room.diamonds_earned || 0)}</Text>
                        {room.is_pk ? <View style={[S.badge, { backgroundColor: Colors.live + '20', borderColor: Colors.live + '50' }]}><Text style={[S.badgeText, { color: Colors.live }]}>PK</Text></View> : null}
                        {room.is_party ? <View style={[S.badge, { backgroundColor: Colors.secondary + '20', borderColor: Colors.secondary + '50' }]}><Text style={[S.badgeText, { color: Colors.secondary }]}>PARTY</Text></View> : null}
                      </View>
                    </View>
                  </Pressable>
                  <Pressable style={S.forceEndBtn} onPress={() => forceEndStream(room)} hitSlop={8}>
                    <MaterialIcons name="stop-circle" size={22} color={Colors.error} />
                    <Text style={S.forceEndText}>End</Text>
                  </Pressable>
                </View>
              ))}
            </>
          ) : null}

        </Animated.View>
      </ScrollView>

      {/* ── Proof Image Modal ── */}
      <Modal visible={!!proofModal} transparent animationType="fade" onRequestClose={() => setProofModal(null)}>
        <View style={S.modalOverlay}>
          <View style={S.modalCard}>
            <View style={S.modalHeader}>
              <Text style={S.modalTitle}>📸 Payment Screenshot</Text>
              <Pressable onPress={() => setProofModal(null)} hitSlop={8}>
                <MaterialIcons name="close" size={22} color={Colors.textPrimary} />
              </Pressable>
            </View>
            {proofModal?.proof_url ? (
              <Image source={{ uri: proofModal.proof_url }} style={S.proofImage} contentFit="contain" />
            ) : (
              <View style={S.noProofBox}>
                <Text style={{ fontSize: 40 }}>🖼️</Text>
                <Text style={S.noProofText}>No screenshot uploaded</Text>
              </View>
            )}
            {proofModal?.screenshot_url ? (
              <Image source={{ uri: proofModal.screenshot_url }} style={S.proofImage} contentFit="contain" />
            ) : null}
            <View style={S.modalInfo}>
              <Text style={S.modalInfoRow}>💎 {proofModal?.amount_diamonds?.toLocaleString()} diamonds</Text>
              <Text style={S.modalInfoRow}>📱 {proofModal?.payment_method}</Text>
              {proofModal?.payment_ref ? <Text style={S.modalInfoRow}>🔖 Ref: {proofModal.payment_ref}</Text> : null}
              {proofModal?.wallet_address ? <Text style={S.modalInfoRow}>💳 {proofModal.wallet_address}</Text> : null}
            </View>
            {proofModal?.status === 'pending' ? (
              <View style={S.reqActions}>
                <Pressable style={S.rejectBtn} onPress={() => rejectRecharge(proofModal)}>
                  <MaterialIcons name="close" size={16} color={Colors.error} />
                  <Text style={S.rejectBtnText}>Reject</Text>
                </Pressable>
                <Pressable style={S.approveBtn} onPress={() => approveRecharge(proofModal)}>
                  <MaterialIcons name="check" size={16} color="#FFF" />
                  <Text style={S.approveBtnText}>Approve + Credit</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ── User Detail Modal ── */}
      <Modal visible={!!userDetailModal} transparent animationType="slide" onRequestClose={() => setUserDetailModal(null)}>
        <Pressable style={S.modalOverlay} onPress={() => setUserDetailModal(null)} />
        <View style={S.userDetailSheet}>
          <View style={S.userDetailHandle} />
          <View style={S.userDetailHeader}>
            <View style={{ position: 'relative' }}>
              <Image source={{ uri: userDetailModal?.avatar_url || '' }} style={S.userDetailAv} contentFit="cover" />
              {userDetailModal?.is_online ? <View style={S.userDetailOnline} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.userDetailName}>{userDetailModal?.display_name || userDetailModal?.username}</Text>
              <Text style={S.userDetailSub}>@{userDetailModal?.username}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                {userDetailModal?.is_admin ? <View style={[S.badge, { backgroundColor: Colors.primary + '20', borderColor: Colors.primary + '50' }]}><Text style={[S.badgeText, { color: Colors.primary }]}>ADMIN</Text></View> : null}
                {userDetailModal?.is_host ? <View style={[S.badge, { backgroundColor: Colors.live + '20', borderColor: Colors.live + '50' }]}><Text style={[S.badgeText, { color: Colors.live }]}>HOST</Text></View> : null}
                {userDetailModal?.is_agent ? <View style={[S.badge, { backgroundColor: Colors.gold + '20', borderColor: Colors.gold + '50' }]}><Text style={[S.badgeText, { color: Colors.gold }]}>AGENT</Text></View> : null}
              </View>
            </View>
          </View>

          <View style={S.userDetailStats}>
            {[
              { label: '💎 Diamonds', val: fmtNum(userDetailModal?.diamonds || 0), color: Colors.diamond },
              { label: '🏆 Points', val: fmtNum(userDetailModal?.points || 0), color: Colors.gold },
              { label: '🪙 Coins', val: fmtNum(userDetailModal?.coins || 0), color: '#F97316' },
              { label: '👥 Followers', val: fmtNum(userDetailModal?.followers || 0), color: Colors.primary },
              { label: '⭐ VIP', val: `Level ${userDetailModal?.vip_level || 0}`, color: '#A78BFA' },
              { label: '🎯 Level', val: `Lv.${userDetailModal?.level || 1}`, color: Colors.success },
            ].map(s => (
              <View key={s.label} style={S.userDetailStat}>
                <Text style={[S.userDetailStatVal, { color: s.color }]}>{s.val}</Text>
                <Text style={S.userDetailStatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          <Text style={[S.sectionTitle, { marginBottom: 10 }]}>Manage Permissions</Text>
          {[
            { field: 'is_admin', label: 'Administrator', emoji: '🛡️', val: userDetailModal?.is_admin },
            { field: 'is_host', label: 'Host Status', emoji: '🎙️', val: userDetailModal?.is_host },
            { field: 'is_agent', label: 'Agent Status', emoji: '🏢', val: userDetailModal?.is_agent },
          ].map(perm => (
            <View key={perm.field} style={S.permRow}>
              <Text style={{ fontSize: 20 }}>{perm.emoji}</Text>
              <Text style={S.permLabel}>{perm.label}</Text>
              <Switch
                value={perm.val}
                onValueChange={() => {
                  if (!userDetailModal) return;
                  toggleUserField(userDetailModal.id, perm.field, perm.val, perm.label);
                  setUserDetailModal((prev: any) => prev ? { ...prev, [perm.field]: !perm.val } : null);
                }}
                trackColor={{ false: Colors.cardBorder, true: Colors.primary + '60' }}
                thumbColor={perm.val ? Colors.primary : '#FFF'}
              />
            </View>
          ))}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <Pressable style={[S.userDetailBtn, { borderColor: Colors.primary, borderWidth: 1.5 }]} onPress={() => { setUserDetailModal(null); router.push(`/user/${userDetailModal?.id}` as any); }}>
              <MaterialIcons name="open-in-new" size={16} color={Colors.primary} />
              <Text style={[S.userDetailBtnText, { color: Colors.primary }]}>View Profile</Text>
            </Pressable>
            <Pressable style={[S.userDetailBtn, { borderColor: Colors.error, borderWidth: 1.5 }]} onPress={() => showAlert('Ban User?', 'This will prevent the user from logging in.', [
              { text: 'Ban', style: 'destructive', onPress: () => setUserDetailModal(null) },
              { text: 'Cancel', style: 'cancel' },
            ])}>
              <MaterialIcons name="block" size={16} color={Colors.error} />
              <Text style={[S.userDetailBtnText, { color: Colors.error }]}>Ban User</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 14, gap: Spacing.sm },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 18 },
  headerTitle: { color: '#FFF', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.xs },
  headerRefreshBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 18 },
  tabScrollView: { backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  tabBar: { paddingHorizontal: Spacing.sm, paddingVertical: 8, gap: Spacing.xs },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.pill, backgroundColor: Colors.bgSecondary || '#F3F4F6', position: 'relative' },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  tabTextActive: { color: '#FFF', fontWeight: FontWeight.bold },
  tabBadge: { backgroundColor: Colors.live, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, minWidth: 16, alignItems: 'center' },
  tabBadgeText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black },
  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  statCard: { width: (width - Spacing.md * 2 - Spacing.sm) / 2, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: 3, borderWidth: 1, borderColor: Colors.cardBorder, borderLeftWidth: 3 },
  statVal: { fontSize: FontSize.xl, fontWeight: FontWeight.black },
  statLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
  // Quick actions
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  quickCard: { width: (width - Spacing.md * 2 - Spacing.sm) / 2, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', gap: 5, borderWidth: 1, position: 'relative' },
  quickCardLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, textAlign: 'center', lineHeight: 16 },
  quickBadge: { position: 'absolute', top: 8, right: 8, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, minWidth: 20, alignItems: 'center' },
  quickBadgeText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black },
  // Activity preview
  activityCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder },
  activityAv: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: Colors.live },
  activityLiveDot: { position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.live, borderWidth: 2, borderColor: Colors.bg },
  activityTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  activitySub: { color: Colors.textMuted, fontSize: FontSize.xs },
  activityBadge: { backgroundColor: Colors.live + '20', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  activityBadgeText: { color: Colors.live, fontSize: 10, fontWeight: FontWeight.bold },
  endBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  seeAllLink: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.medium, textAlign: 'right', marginBottom: Spacing.md },
  // Mini req
  miniReqCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder },
  miniReqAv: { width: 38, height: 38, borderRadius: 19 },
  miniReqName: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  miniReqSub: { color: Colors.textMuted, fontSize: FontSize.xs },
  miniRejectBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.error },
  miniApproveBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center' },
  // Filters
  filterRow: { paddingBottom: Spacing.md, gap: Spacing.xs },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { color: Colors.textSecondary, fontSize: FontSize.xs },
  filterChipTextActive: { color: '#FFF', fontWeight: FontWeight.bold },
  // Request cards
  reqCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.cardBorder, borderLeftWidth: 4, gap: Spacing.sm },
  reqHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  reqAv: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: Colors.primary },
  reqName: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  reqSub: { color: Colors.textMuted, fontSize: FontSize.xs },
  statusBadge: { borderRadius: BorderRadius.pill, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  statusBadgeText: { fontSize: 9, fontWeight: FontWeight.black, letterSpacing: 0.5 },
  reqDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  reqDetailItem: { flex: 1, minWidth: '45%', backgroundColor: Colors.bgSecondary || '#F9FAFB', borderRadius: BorderRadius.sm, padding: Spacing.sm },
  reqDetailLabel: { color: Colors.textMuted, fontSize: 10, marginBottom: 2 },
  reqDetailVal: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  notesBox: { backgroundColor: Colors.bgSecondary || '#F9FAFB', borderRadius: BorderRadius.sm, padding: Spacing.sm, borderLeftWidth: 3, borderLeftColor: Colors.textMuted },
  notesText: { color: Colors.textSecondary, fontSize: FontSize.xs },
  noteInput: { backgroundColor: Colors.bgSecondary || '#F9FAFB', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, color: Colors.textPrimary, fontSize: FontSize.xs, borderWidth: 1, borderColor: Colors.cardBorder, minHeight: 40 },
  proofBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary + '10', borderRadius: BorderRadius.sm, padding: 10, borderWidth: 1, borderColor: Colors.primary + '30' },
  proofBtnText: { flex: 1, color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  reqActions: { flexDirection: 'row', gap: Spacing.sm },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, borderWidth: 1.5, borderColor: Colors.error },
  rejectBtnText: { color: Colors.error, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  approveBtn: { flex: 1.8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.success },
  approveBtnText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  // Users
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: Spacing.sm },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.sm },
  listCount: { color: Colors.textMuted, fontSize: FontSize.xs, marginBottom: Spacing.sm },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder, gap: Spacing.sm },
  userAv: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: Colors.primary },
  userOnlineDot: { position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.surface },
  userName: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  userSub: { color: Colors.textMuted, fontSize: FontSize.xs },
  userStat: { color: Colors.textMuted, fontSize: FontSize.xs },
  userActionBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.cardBorder },
  badge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1 },
  badgeText: { fontSize: 8, fontWeight: FontWeight.black },
  // Live
  liveStatsRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.md },
  liveStatCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', gap: 2, borderWidth: 1, borderColor: Colors.cardBorder },
  liveStatVal: { fontSize: FontSize.lg, fontWeight: FontWeight.black },
  liveStatLabel: { color: Colors.textMuted, fontSize: 9 },
  liveRoomCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder, gap: Spacing.sm },
  liveRoomAv: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: Colors.live },
  liveRoomLiveDot: { position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.live, borderWidth: 2, borderColor: Colors.surface },
  liveRoomTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  liveRoomHost: { color: Colors.textMuted, fontSize: FontSize.xs },
  liveRoomStat: { color: Colors.textMuted, fontSize: FontSize.xs },
  forceEndBtn: { alignItems: 'center', gap: 2, paddingHorizontal: 8 },
  forceEndText: { color: Colors.error, fontSize: 10, fontWeight: FontWeight.bold },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: Spacing.sm },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.sm },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: Spacing.md },
  modalCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, width: '100%', gap: Spacing.md, borderWidth: 1, borderColor: Colors.cardBorder },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  proofImage: { width: '100%', height: 260, borderRadius: BorderRadius.lg, backgroundColor: Colors.bgSecondary || '#F3F4F6' },
  noProofBox: { alignItems: 'center', paddingVertical: 40, backgroundColor: Colors.bgSecondary || '#F3F4F6', borderRadius: BorderRadius.lg, gap: 8 },
  noProofText: { color: Colors.textMuted, fontSize: FontSize.sm },
  modalInfo: { backgroundColor: Colors.bgSecondary || '#F9FAFB', borderRadius: BorderRadius.md, padding: Spacing.md, gap: 4 },
  modalInfoRow: { color: Colors.textSecondary, fontSize: FontSize.sm },
  // User detail sheet
  userDetailSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, paddingBottom: 40, borderTopWidth: 1, borderTopColor: Colors.cardBorder, maxHeight: '85%' },
  userDetailHandle: { width: 40, height: 4, backgroundColor: Colors.cardBorder, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  userDetailHeader: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start', marginBottom: Spacing.md },
  userDetailAv: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, borderColor: Colors.primary },
  userDetailOnline: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.surface },
  userDetailName: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  userDetailSub: { color: Colors.textMuted, fontSize: FontSize.sm },
  userDetailStats: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, backgroundColor: Colors.bgSecondary || '#F9FAFB', borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  userDetailStat: { width: '30%', alignItems: 'center', paddingVertical: 6 },
  userDetailStatVal: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  userDetailStatLabel: { color: Colors.textMuted, fontSize: 10, marginTop: 2, textAlign: 'center' },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  permLabel: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  userDetailBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: BorderRadius.pill },
  userDetailBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
});
