// SashLive — Admin Dashboard: Recharge approvals, withdrawals, user management, live monitor
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal,
  ActivityIndicator, TextInput, RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useAlert } from '@/template';
import { useAuth } from '@/template';
import { getSupabaseClient } from '@/template';
import { useApp } from '@/contexts/AppContext';

const { width } = Dimensions.get('window');

type AdminTab = 'overview' | 'recharge' | 'withdrawal' | 'users' | 'live';

interface RechargeRequest {
  id: string;
  user_id: string;
  amount_diamonds: number;
  payment_method: string;
  payment_ref: string;
  proof_url: string;
  plan_price: string;
  wallet_address: string;
  notes: string;
  status: string;
  created_at: string;
  user?: { username: string; display_name: string; avatar_url: string; email: string };
}

interface WithdrawalRequest {
  id: string;
  user_id: string;
  points_amount: number;
  usd_amount: number;
  method: string;
  account_details: string;
  status: string;
  created_at: string;
  user?: { username: string; display_name: string; avatar_url: string };
}

export default function AdminDashboard() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { user } = useAuth();
  const { currentUser } = useApp();
  const supabase = getSupabaseClient();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [rechargeRequests, setRechargeRequests] = useState<RechargeRequest[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [liveRooms, setLiveRooms] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0, activeStreams: 0, pendingRecharge: 0, pendingWithdrawal: 0,
    totalDiamondsToday: 0, totalPointsToday: 0,
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const loadData = useCallback(async () => {
    setLoading(true);

    // Load recharge requests
    const { data: recharges } = await supabase
      .from('recharge_requests')
      .select('*, user:user_id(username, display_name, avatar_url, email)')
      .order('created_at', { ascending: false })
      .limit(50);

    // Load withdrawal requests
    const { data: withdrawals } = await supabase
      .from('withdrawal_requests')
      .select('*, user:user_id(username, display_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(50);

    // Load users
    const { data: userList } = await supabase
      .from('user_profiles')
      .select('id, username, display_name, avatar_url, diamonds, points, is_host, vip_level, followers, created_at, is_online, is_admin')
      .order('diamonds', { ascending: false })
      .limit(30);

    // Load live rooms
    const { data: rooms } = await supabase
      .from('live_rooms')
      .select('*, host:host_id(username, display_name, avatar_url)')
      .eq('is_live', true)
      .order('viewers', { ascending: false });

    setRechargeRequests((recharges || []) as RechargeRequest[]);
    setWithdrawalRequests((withdrawals || []) as WithdrawalRequest[]);
    setUsers(userList || []);
    setLiveRooms(rooms || []);

    const pending_r = (recharges || []).filter(r => r.status === 'pending').length;
    const pending_w = (withdrawals || []).filter(w => w.status === 'pending').length;

    setStats({
      totalUsers: userList?.length || 0,
      activeStreams: rooms?.length || 0,
      pendingRecharge: pending_r,
      pendingWithdrawal: pending_w,
      totalDiamondsToday: (recharges || []).reduce((s: number, r: any) => s + (r.amount_diamonds || 0), 0),
      totalPointsToday: (withdrawals || []).reduce((s: number, w: any) => s + (w.points_amount || 0), 0),
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleApproveRecharge = async (req: RechargeRequest) => {
    showAlert(
      'Approve Recharge?',
      `User: ${req.user?.display_name || req.user_id}\nAmount: ${req.amount_diamonds.toLocaleString()} 💎\nMethod: ${req.payment_method}`,
      [
        {
          text: 'Approve & Credit',
          onPress: async () => {
            setProcessing(true);

            // Update request status
            await supabase.from('recharge_requests').update({
              status: 'approved',
              reviewed_by: user?.id,
              reviewed_at: new Date().toISOString(),
              notes: reviewNotes || 'Approved by admin',
            }).eq('id', req.id);

            // Credit diamonds to user
            const { data: profile } = await supabase
              .from('user_profiles').select('diamonds').eq('id', req.user_id).single();
            if (profile) {
              await supabase.from('user_profiles').update({
                diamonds: (profile.diamonds || 0) + req.amount_diamonds,
              }).eq('id', req.user_id);
            }

            setRechargeRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved' } : r));
            setSelectedRequest(null);
            setProcessing(false);
            showAlert('✅ Approved!', `${req.amount_diamonds.toLocaleString()} 💎 credited to ${req.user?.display_name}`);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleRejectRecharge = async (req: RechargeRequest) => {
    showAlert('Reject Request?', 'This will reject the recharge request.', [
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('recharge_requests').update({
            status: 'rejected',
            reviewed_by: user?.id,
            reviewed_at: new Date().toISOString(),
            notes: reviewNotes || 'Rejected by admin',
          }).eq('id', req.id);
          setRechargeRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'rejected' } : r));
          setSelectedRequest(null);
          showAlert('Rejected', 'Request has been rejected.');
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleApproveWithdrawal = async (req: WithdrawalRequest) => {
    showAlert(
      'Approve Withdrawal?',
      `User: ${req.user?.display_name}\n$${req.usd_amount} via ${req.method}\nAccount: ${req.account_details}`,
      [
        {
          text: 'Approve & Pay',
          onPress: async () => {
            setProcessing(true);
            await supabase.from('withdrawal_requests').update({
              status: 'approved',
              reviewed_by: user?.id,
              reviewed_at: new Date().toISOString(),
            }).eq('id', req.id);
            setWithdrawalRequests(prev => prev.map(w => w.id === req.id ? { ...w, status: 'approved' } : w));
            setSelectedRequest(null);
            setProcessing(false);
            showAlert('✅ Approved!', `Withdrawal of $${req.usd_amount} approved.`);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleRejectWithdrawal = async (req: WithdrawalRequest) => {
    setProcessing(true);
    // Refund points
    const { data: profile } = await supabase.from('user_profiles').select('points').eq('id', req.user_id).single();
    if (profile) {
      await supabase.from('user_profiles').update({ points: (profile.points || 0) + req.points_amount }).eq('id', req.user_id);
    }
    await supabase.from('withdrawal_requests').update({
      status: 'rejected',
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', req.id);
    setWithdrawalRequests(prev => prev.map(w => w.id === req.id ? { ...w, status: 'rejected' } : w));
    setSelectedRequest(null);
    setProcessing(false);
    showAlert('Rejected', 'Points refunded to user.');
  };

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    showAlert(`${currentIsAdmin ? 'Remove Admin' : 'Make Admin'}?`, 'This will change the admin status.', [
      {
        text: 'Confirm',
        onPress: async () => {
          await supabase.from('user_profiles').update({ is_admin: !currentIsAdmin }).eq('id', userId);
          setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: !currentIsAdmin } : u));
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const filteredRecharges = rechargeRequests.filter(r => statusFilter === 'all' || r.status === statusFilter);
  const filteredWithdrawals = withdrawalRequests.filter(w => statusFilter === 'all' || w.status === statusFilter);
  const filteredUsers = users.filter(u =>
    !searchUser || u.username?.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(searchUser.toLowerCase())
  );

  const statusColor = (s: string) => s === 'approved' ? Colors.success : s === 'rejected' ? Colors.error : Colors.gold;

  const TABS: { key: AdminTab; label: string; icon: string; badge?: number }[] = [
    { key: 'overview',    label: 'Overview',   icon: '📊' },
    { key: 'recharge',    label: 'Recharge',   icon: '💎', badge: stats.pendingRecharge },
    { key: 'withdrawal',  label: 'Withdrawal', icon: '💸', badge: stats.pendingWithdrawal },
    { key: 'users',       label: 'Users',      icon: '👥' },
    { key: 'live',        label: 'Live',       icon: '🔴', badge: stats.activeStreams },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View>
          <Text style={styles.title}>🛡️ Admin Dashboard</Text>
          <Text style={styles.subtitle}>SashLive Control Panel</Text>
        </View>
        <Pressable style={styles.refreshBtn} onPress={onRefresh}>
          <MaterialIcons name="refresh" size={20} color={Colors.primary} />
        </Pressable>
      </View>

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
        {TABS.map(tab => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={{ fontSize: 14 }}>{tab.icon}</Text>
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            {tab.badge ? (
              <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{tab.badge}</Text></View>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <>
            <View style={styles.statsGrid}>
              {[
                { icon: '👥', label: 'Users',         val: stats.totalUsers.toLocaleString(),               color: Colors.primary },
                { icon: '🔴', label: 'Live Rooms',    val: stats.activeStreams.toString(),                   color: Colors.live },
                { icon: '💎', label: 'Pending Top-Up', val: stats.pendingRecharge.toString(),                color: Colors.gold },
                { icon: '💸', label: 'Pending Payout', val: stats.pendingWithdrawal.toString(),              color: Colors.secondary },
                { icon: '💰', label: 'Diamonds Today', val: stats.totalDiamondsToday.toLocaleString(),       color: Colors.diamond },
                { icon: '🏆', label: 'Pts Withdrawn',  val: stats.totalPointsToday.toLocaleString(),         color: Colors.success },
              ].map(s => (
                <View key={s.label} style={[styles.statCard, { borderColor: s.color + '40' }]}>
                  <Text style={{ fontSize: 28 }}>{s.icon}</Text>
                  <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Quick action cards */}
            <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
            <View style={styles.quickActionGrid}>
              {[
                { icon: '💎', label: 'Review Recharges', badge: stats.pendingRecharge, color: Colors.gold, onPress: () => setActiveTab('recharge') },
                { icon: '💸', label: 'Review Payouts', badge: stats.pendingWithdrawal, color: Colors.secondary, onPress: () => setActiveTab('withdrawal') },
                { icon: '🔴', label: 'Monitor Streams', badge: stats.activeStreams, color: Colors.live, onPress: () => setActiveTab('live') },
                { icon: '👥', label: 'Manage Users', badge: 0, color: Colors.primary, onPress: () => setActiveTab('users') },
              ].map(a => (
                <Pressable key={a.label} style={[styles.quickAction, { borderColor: a.color + '40' }]} onPress={a.onPress}>
                  <Text style={{ fontSize: 28 }}>{a.icon}</Text>
                  <Text style={[styles.quickActionLabel, { color: a.color }]}>{a.label}</Text>
                  {a.badge > 0 && <View style={[styles.quickActionBadge, { backgroundColor: a.color }]}><Text style={styles.quickActionBadgeText}>{a.badge}</Text></View>}
                </Pressable>
              ))}
            </View>

            {/* Recent live activity */}
            <Text style={styles.sectionTitle}>🔴 Recent Live Rooms</Text>
            {liveRooms.slice(0, 3).map(room => (
              <Pressable key={room.id} style={styles.activityRow} onPress={() => router.push(`/live/${room.id}`)}>
                <Image source={{ uri: room.host?.avatar_url || '' }} style={styles.activityAv} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityTitle} numberOfLines={1}>{room.title}</Text>
                  <Text style={styles.activitySub}>{room.host?.display_name} · {room.viewers} viewers</Text>
                </View>
                <View style={styles.liveTag}><Text style={styles.liveTagText}>LIVE</Text></View>
              </Pressable>
            ))}
          </>
        )}

        {/* RECHARGE REQUESTS */}
        {activeTab === 'recharge' && (
          <>
            <View style={styles.filterRow}>
              {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
                <Pressable key={s} style={[styles.filterChip, statusFilter === s && styles.filterChipActive]} onPress={() => setStatusFilter(s)}>
                  <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {loading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} /> : null}

            {filteredRecharges.length === 0 && !loading ? (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 40 }}>✅</Text>
                <Text style={styles.emptyText}>No {statusFilter} requests</Text>
              </View>
            ) : null}

            {filteredRecharges.map(req => (
              <View key={req.id} style={[styles.requestCard, { borderColor: statusColor(req.status) + '40' }]}>
                <View style={styles.requestHeader}>
                  <Image source={{ uri: req.user?.avatar_url || '' }} style={styles.requestAv} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.requestName}>{req.user?.display_name || req.user_id}</Text>
                    <Text style={styles.requestSub}>@{req.user?.username} · {new Date(req.created_at).toLocaleDateString()}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor(req.status) + '25', borderColor: statusColor(req.status) + '60' }]}>
                    <Text style={[styles.statusBadgeText, { color: statusColor(req.status) }]}>{req.status.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.requestDetails}>
                  <View style={styles.requestDetailItem}>
                    <Text style={styles.requestDetailLabel}>Diamonds</Text>
                    <Text style={[styles.requestDetailVal, { color: Colors.diamond }]}>💎 {req.amount_diamonds.toLocaleString()}</Text>
                  </View>
                  <View style={styles.requestDetailItem}>
                    <Text style={styles.requestDetailLabel}>Price</Text>
                    <Text style={[styles.requestDetailVal, { color: Colors.success }]}>{req.plan_price || 'N/A'}</Text>
                  </View>
                  <View style={styles.requestDetailItem}>
                    <Text style={styles.requestDetailLabel}>Method</Text>
                    <Text style={styles.requestDetailVal}>{req.payment_method}</Text>
                  </View>
                  {req.payment_ref ? (
                    <View style={styles.requestDetailItem}>
                      <Text style={styles.requestDetailLabel}>Ref</Text>
                      <Text style={styles.requestDetailVal} numberOfLines={1}>{req.payment_ref}</Text>
                    </View>
                  ) : null}
                </View>

                {req.proof_url ? (
                  <Pressable style={styles.proofBtn} onPress={() => setSelectedRequest({ ...req, type: 'proof' })}>
                    <MaterialIcons name="image" size={16} color={Colors.primary} />
                    <Text style={styles.proofBtnText}>View Payment Proof</Text>
                  </Pressable>
                ) : null}

                {req.status === 'pending' ? (
                  <View style={styles.requestActions}>
                    <Pressable style={styles.rejectBtn} onPress={() => handleRejectRecharge(req)}>
                      <MaterialIcons name="close" size={16} color={Colors.error} />
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </Pressable>
                    <Pressable style={styles.approveBtn} onPress={() => handleApproveRecharge(req)}>
                      <MaterialIcons name="check" size={16} color="#FFF" />
                      <Text style={styles.approveBtnText}>Approve & Credit</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
          </>
        )}

        {/* WITHDRAWAL REQUESTS */}
        {activeTab === 'withdrawal' && (
          <>
            <View style={styles.filterRow}>
              {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
                <Pressable key={s} style={[styles.filterChip, statusFilter === s && styles.filterChipActive]} onPress={() => setStatusFilter(s)}>
                  <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {filteredWithdrawals.length === 0 && !loading ? (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 40 }}>✅</Text>
                <Text style={styles.emptyText}>No {statusFilter} requests</Text>
              </View>
            ) : null}

            {filteredWithdrawals.map(req => (
              <View key={req.id} style={[styles.requestCard, { borderColor: statusColor(req.status) + '40' }]}>
                <View style={styles.requestHeader}>
                  <Image source={{ uri: req.user?.avatar_url || '' }} style={styles.requestAv} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.requestName}>{req.user?.display_name || req.user_id}</Text>
                    <Text style={styles.requestSub}>{new Date(req.created_at).toLocaleDateString()}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor(req.status) + '25', borderColor: statusColor(req.status) + '60' }]}>
                    <Text style={[styles.statusBadgeText, { color: statusColor(req.status) }]}>{req.status.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.requestDetails}>
                  <View style={styles.requestDetailItem}>
                    <Text style={styles.requestDetailLabel}>Amount</Text>
                    <Text style={[styles.requestDetailVal, { color: Colors.success }]}>${req.usd_amount}</Text>
                  </View>
                  <View style={styles.requestDetailItem}>
                    <Text style={styles.requestDetailLabel}>Points</Text>
                    <Text style={[styles.requestDetailVal, { color: Colors.gold }]}>{req.points_amount.toLocaleString()}</Text>
                  </View>
                  <View style={styles.requestDetailItem}>
                    <Text style={styles.requestDetailLabel}>Method</Text>
                    <Text style={styles.requestDetailVal}>{req.method}</Text>
                  </View>
                </View>

                <View style={styles.accountBox}>
                  <Text style={styles.accountBoxLabel}>Account Details:</Text>
                  <Text style={styles.accountBoxVal}>{req.account_details}</Text>
                </View>

                {req.status === 'pending' ? (
                  <View style={styles.requestActions}>
                    <Pressable style={styles.rejectBtn} onPress={() => handleRejectWithdrawal(req)}>
                      <MaterialIcons name="close" size={16} color={Colors.error} />
                      <Text style={styles.rejectBtnText}>Reject + Refund</Text>
                    </Pressable>
                    <Pressable style={styles.approveBtn} onPress={() => handleApproveWithdrawal(req)}>
                      <MaterialIcons name="check" size={16} color="#FFF" />
                      <Text style={styles.approveBtnText}>Approve & Pay</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
          </>
        )}

        {/* USERS */}
        {activeTab === 'users' && (
          <>
            <View style={styles.searchBar}>
              <MaterialIcons name="search" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search users..."
                placeholderTextColor={Colors.textMuted}
                value={searchUser}
                onChangeText={setSearchUser}
              />
            </View>

            {filteredUsers.map(u => (
              <View key={u.id} style={styles.userRow}>
                <View style={styles.userAvWrap}>
                  <Image source={{ uri: u.avatar_url || '' }} style={styles.userAv} contentFit="cover" />
                  {u.is_online && <View style={styles.userOnlineDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.userName}>{u.display_name || u.username}</Text>
                    {u.is_admin && <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>ADMIN</Text></View>}
                    {u.is_host && <View style={[styles.adminBadge, { backgroundColor: Colors.live + '25', borderColor: Colors.live + '50' }]}><Text style={[styles.adminBadgeText, { color: Colors.live }]}>HOST</Text></View>}
                  </View>
                  <Text style={styles.userSub}>@{u.username} · 💎{(u.diamonds || 0).toLocaleString()} · VIP{u.vip_level || 0}</Text>
                  <Text style={styles.userSub}>{(u.followers || 0).toLocaleString()} followers</Text>
                </View>
                <View style={styles.userActions}>
                  <Pressable
                    style={[styles.userActionBtn, u.is_admin && { backgroundColor: Colors.primary + '20' }]}
                    onPress={() => handleToggleAdmin(u.id, u.is_admin)}
                  >
                    <MaterialIcons name={u.is_admin ? 'admin-panel-settings' : 'person'} size={16} color={u.is_admin ? Colors.primary : Colors.textMuted} />
                  </Pressable>
                  <Pressable style={styles.userActionBtn} onPress={() => router.push(`/user/${u.id}` as any)}>
                    <MaterialIcons name="open-in-new" size={16} color={Colors.textMuted} />
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}

        {/* LIVE MONITOR */}
        {activeTab === 'live' && (
          <>
            <View style={styles.liveStatsRow}>
              <View style={styles.liveStatCard}>
                <Text style={styles.liveStatVal}>{liveRooms.length}</Text>
                <Text style={styles.liveStatLabel}>Active Rooms</Text>
              </View>
              <View style={styles.liveStatCard}>
                <Text style={[styles.liveStatVal, { color: Colors.diamond }]}>
                  {liveRooms.reduce((s, r) => s + (r.viewers || 0), 0).toLocaleString()}
                </Text>
                <Text style={styles.liveStatLabel}>Total Viewers</Text>
              </View>
              <View style={styles.liveStatCard}>
                <Text style={[styles.liveStatVal, { color: Colors.gold }]}>
                  {liveRooms.filter(r => r.is_pk).length}
                </Text>
                <Text style={styles.liveStatLabel}>PK Battles</Text>
              </View>
            </View>

            {liveRooms.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 40 }}>📡</Text>
                <Text style={styles.emptyText}>No active streams right now</Text>
              </View>
            ) : null}

            {liveRooms.map(room => (
              <Pressable key={room.id} style={styles.liveRoomCard} onPress={() => router.push(`/live/${room.id}` as any)}>
                <View style={styles.liveRoomLeft}>
                  <Image source={{ uri: room.host?.avatar_url || '' }} style={styles.liveRoomAv} contentFit="cover" />
                  <View style={styles.liveRoomLiveDot} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.liveRoomTitle} numberOfLines={1}>{room.title}</Text>
                  <Text style={styles.liveRoomHost}>{room.host?.display_name}</Text>
                  <View style={styles.liveRoomStats}>
                    <Text style={styles.liveRoomStat}>👁 {(room.viewers || 0).toLocaleString()}</Text>
                    <Text style={styles.liveRoomStat}>💎 {(room.diamonds_earned || 0).toLocaleString()}</Text>
                    {room.is_pk && <View style={[styles.liveRoomBadge, { backgroundColor: Colors.live }]}><Text style={styles.liveRoomBadgeText}>PK</Text></View>}
                    {room.is_party && <View style={[styles.liveRoomBadge, { backgroundColor: Colors.secondary }]}><Text style={styles.liveRoomBadgeText}>PARTY</Text></View>}
                  </View>
                </View>
                <Pressable
                  style={styles.viewBtn}
                  onPress={() => showAlert('End Stream?', 'Force end this stream?', [
                    {
                      text: 'Force End',
                      style: 'destructive',
                      onPress: async () => {
                        await supabase.from('live_rooms').update({ is_live: false, ended_at: new Date().toISOString() }).eq('id', room.id);
                        setLiveRooms(prev => prev.filter(r => r.id !== room.id));
                      },
                    },
                    { text: 'Cancel', style: 'cancel' },
                  ])}
                >
                  <MaterialIcons name="stop-circle" size={20} color={Colors.error} />
                </Pressable>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>

      {/* Proof Image Modal */}
      {selectedRequest?.type === 'proof' && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setSelectedRequest(null)}>
          <View style={styles.proofModal}>
            <View style={styles.proofModalCard}>
              <View style={styles.proofModalHeader}>
                <Text style={styles.proofModalTitle}>Payment Proof</Text>
                <Pressable onPress={() => setSelectedRequest(null)}>
                  <MaterialIcons name="close" size={22} color={Colors.textPrimary} />
                </Pressable>
              </View>
              {selectedRequest.proof_url ? (
                <Image source={{ uri: selectedRequest.proof_url }} style={styles.proofImage} contentFit="contain" />
              ) : (
                <View style={styles.noProofBox}>
                  <Text style={styles.noProofText}>No image uploaded</Text>
                </View>
              )}
              {selectedRequest.status === 'pending' ? (
                <View style={styles.requestActions}>
                  <Pressable style={styles.rejectBtn} onPress={() => { setSelectedRequest(null); handleRejectRecharge(selectedRequest); }}>
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </Pressable>
                  <Pressable style={styles.approveBtn} onPress={() => { setSelectedRequest(null); handleApproveRecharge(selectedRequest); }}>
                    <Text style={styles.approveBtnText}>Approve & Credit</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  subtitle: { color: Colors.textMuted, fontSize: FontSize.xs },
  refreshBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  tabBar: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, gap: Spacing.xs },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder, position: 'relative' },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  tabTextActive: { color: '#FFF', fontWeight: FontWeight.bold },
  tabBadge: { backgroundColor: Colors.live, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, minWidth: 16, alignItems: 'center' },
  tabBadgeText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black },
  // Overview
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  statCard: { width: (width - Spacing.md * 2 - Spacing.sm) / 2, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', gap: 4, borderWidth: 1 },
  statVal: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.black },
  statLabel: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center' },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
  quickActionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  quickAction: { width: (width - Spacing.md * 2 - Spacing.sm) / 2, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', gap: 5, borderWidth: 1, position: 'relative' },
  quickActionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, textAlign: 'center' },
  quickActionBadge: { position: 'absolute', top: 8, right: 8, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  quickActionBadgeText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder },
  activityAv: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: Colors.primary },
  activityTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  activitySub: { color: Colors.textMuted, fontSize: FontSize.xs },
  liveTag: { backgroundColor: Colors.live, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  liveTagText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black },
  // Filters
  filterRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.md, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { color: Colors.textSecondary, fontSize: FontSize.xs },
  filterChipTextActive: { color: '#FFF', fontWeight: FontWeight.bold },
  // Request cards
  requestCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1.5, gap: Spacing.sm },
  requestHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  requestAv: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: Colors.primary },
  requestName: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  requestSub: { color: Colors.textMuted, fontSize: FontSize.xs },
  statusBadge: { borderRadius: BorderRadius.pill, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  statusBadgeText: { fontSize: 9, fontWeight: FontWeight.black, letterSpacing: 0.5 },
  requestDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  requestDetailItem: { flex: 1, minWidth: '45%', backgroundColor: Colors.bgSecondary, borderRadius: BorderRadius.sm, padding: Spacing.sm },
  requestDetailLabel: { color: Colors.textMuted, fontSize: 10, marginBottom: 2 },
  requestDetailVal: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  proofBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.primary + '15', borderRadius: BorderRadius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.primary + '40' },
  proofBtnText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  requestActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, borderWidth: 1.5, borderColor: Colors.error },
  rejectBtnText: { color: Colors.error, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  approveBtn: { flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.success },
  approveBtnText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  accountBox: { backgroundColor: Colors.bgSecondary, borderRadius: BorderRadius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder },
  accountBoxLabel: { color: Colors.textMuted, fontSize: 10, marginBottom: 2 },
  accountBoxVal: { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  // Users
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: Spacing.md },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.sm },
  userRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder, gap: Spacing.sm },
  userAvWrap: { position: 'relative' },
  userAv: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: Colors.primary },
  userOnlineDot: { position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.bg },
  userName: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  userSub: { color: Colors.textMuted, fontSize: FontSize.xs },
  adminBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, backgroundColor: Colors.primary + '25', borderWidth: 1, borderColor: Colors.primary + '50' },
  adminBadgeText: { color: Colors.primary, fontSize: 8, fontWeight: FontWeight.black },
  userActions: { flexDirection: 'row', gap: Spacing.xs },
  userActionBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.cardBorder },
  // Live monitor
  liveStatsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  liveStatCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.cardBorder },
  liveStatVal: { color: Colors.live, fontSize: FontSize.xl, fontWeight: FontWeight.black },
  liveStatLabel: { color: Colors.textMuted, fontSize: 10 },
  liveRoomCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder, gap: Spacing.sm },
  liveRoomLeft: { position: 'relative' },
  liveRoomAv: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: Colors.live },
  liveRoomLiveDot: { position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.live, borderWidth: 2, borderColor: Colors.bg },
  liveRoomTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  liveRoomHost: { color: Colors.textMuted, fontSize: FontSize.xs },
  liveRoomStats: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 2 },
  liveRoomStat: { color: Colors.textMuted, fontSize: FontSize.xs },
  liveRoomBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  liveRoomBadgeText: { color: '#FFF', fontSize: 8, fontWeight: FontWeight.black },
  viewBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.sm },
  // Proof modal
  proofModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: Spacing.md },
  proofModalCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, width: '100%', gap: Spacing.md, borderWidth: 1, borderColor: Colors.cardBorder },
  proofModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  proofModalTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  proofImage: { width: '100%', height: 280, borderRadius: BorderRadius.lg, backgroundColor: Colors.bgSecondary },
  noProofBox: { alignItems: 'center', paddingVertical: Spacing.xxl, backgroundColor: Colors.bgSecondary, borderRadius: BorderRadius.lg },
  noProofText: { color: Colors.textMuted, fontSize: FontSize.sm },
});
