// SashLive — Withdrawal with Points System (10,000 pts = $1, min $10, max $500/day)
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  Modal, Animated, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/template';
import { useAlert } from '@/template';
import {
  submitWithdrawal, fetchPointsHistory,
  POINTS_PER_DOLLAR, MIN_WITHDRAWAL_POINTS, MAX_DAILY_WITHDRAWAL_USD,
  pointsToUSD, usdToPoints,
} from '@/services/earningService';

const { width } = Dimensions.get('window');

type Method = 'usdt' | 'bkash' | 'nagad' | 'paypal' | 'bank';

const METHODS = [
  { id: 'usdt',   name: 'USDT TRC20',      icon: '₮',  color: '#26A17B', placeholder: 'TRC20 wallet address (T...)' },
  { id: 'bkash',  name: 'bKash',           icon: '📱', color: '#E2136E', placeholder: '+880 1X-XXXX-XXXX' },
  { id: 'nagad',  name: 'Nagad',           icon: '💰', color: '#F7941D', placeholder: '+880 1X-XXXX-XXXX' },
  { id: 'bank',   name: 'Bank Transfer',   icon: '🏦', color: '#1565C0', placeholder: 'Account no. / IBAN' },
  { id: 'paypal', name: 'PayPal',          icon: '🅿️', color: '#003087', placeholder: 'PayPal email address' },
];

const HISTORY_TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  earn_stream:        { label: 'Live Stream',    color: Colors.success, icon: '🎤' },
  earn_gift:          { label: 'Gift Received',  color: Colors.primary, icon: '🎁' },
  earn_task:          { label: 'Task Reward',    color: Colors.gold,    icon: '🎯' },
  earn_pk:            { label: 'PK Battle',      color: Colors.live,    icon: '⚔️' },
  earn_chat:          { label: 'Video Call',     color: Colors.secondary, icon: '📹' },
  agency_commission:  { label: 'Agency Comm.',   color: Colors.diamond, icon: '🏢' },
  withdrawal:         { label: 'Withdrawal',     color: Colors.error,   icon: '💸' },
};

export default function WithdrawalScreen() {
  const router = useRouter();
  const { currentUser, updatePoints } = useApp();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [step, setStep] = useState<'main' | 'confirm' | 'success'>('main');
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null);
  const [pointsInput, setPointsInput] = useState('');
  const [accountInfo, setAccountInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [txHistory, setTxHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'withdraw' | 'history'>('withdraw');
  const [refId, setRefId] = useState('');
  const successAnim = useRef(new Animated.Value(0)).current;

  const method = METHODS.find(m => m.id === selectedMethod);
  const pointsNum = parseInt(pointsInput.replace(/,/g, '')) || 0;
  const usdAmount = pointsToUSD(pointsNum);
  const userPoints = currentUser.points || 0;
  const canWithdraw = userPoints >= MIN_WITHDRAWAL_POINTS;

  useEffect(() => {
    if (user?.id && activeTab === 'history') loadHistory();
  }, [user?.id, activeTab]);

  const loadHistory = async () => {
    if (!user?.id) return;
    setLoadingHistory(true);
    const { data } = await fetchPointsHistory(user.id, 30);
    setTxHistory(data);
    setLoadingHistory(false);
  };

  const handleSubmit = async () => {
    if (!selectedMethod) { showAlert('Select Method', 'Choose a withdrawal method.'); return; }
    if (pointsNum < MIN_WITHDRAWAL_POINTS) {
      showAlert('Minimum Not Met', `Minimum withdrawal: ${MIN_WITHDRAWAL_POINTS.toLocaleString()} pts ($${pointsToUSD(MIN_WITHDRAWAL_POINTS).toFixed(0)})`);
      return;
    }
    if (usdAmount > MAX_DAILY_WITHDRAWAL_USD) {
      showAlert('Daily Limit', `Maximum daily withdrawal: $${MAX_DAILY_WITHDRAWAL_USD}`);
      return;
    }
    if (pointsNum > userPoints) { showAlert('Insufficient Points', 'You do not have enough points.'); return; }
    if (!accountInfo.trim()) { showAlert('Account Info', 'Enter your account details.'); return; }
    setStep('confirm');
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    const newRefId = `WD-${Date.now().toString().slice(-8)}`;
    setRefId(newRefId);

    if (user?.id) {
      const { error } = await submitWithdrawal(user.id, pointsNum, selectedMethod!, accountInfo);
      if (error) {
        setSubmitting(false);
        setStep('main');
        showAlert('Withdrawal Failed', error);
        return;
      }
    }

    // Local deduction
    updatePoints(-pointsNum);
    setSubmitting(false);
    setStep('success');
    successAnim.setValue(0);
    Animated.spring(successAnim, { toValue: 1, useNativeDriver: true, tension: 60 }).start();
  };

  const reset = () => {
    setStep('main');
    setPointsInput('');
    setAccountInfo('');
    setSelectedMethod(null);
  };

  const QUICK_AMOUNTS = [
    MIN_WITHDRAWAL_POINTS,
    MIN_WITHDRAWAL_POINTS * 2,
    MIN_WITHDRAWAL_POINTS * 5,
    Math.min(usdToPoints(MAX_DAILY_WITHDRAWAL_USD), userPoints),
  ].filter((v, i, arr) => arr.indexOf(v) === i && v > 0);

  if (step === 'confirm') {
    return (
      <SafeAreaView style={S.container} edges={['top']}>
        <View style={S.header}>
          <Pressable onPress={() => setStep('main')}><MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} /></Pressable>
          <Text style={S.title}>Confirm Withdrawal</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={S.scroll}>
          <View style={S.confirmCard}>
            <Text style={{ fontSize: 48 }}>💸</Text>
            <Text style={S.confirmTitle}>Review Your Request</Text>
            <View style={S.confirmRows}>
              {[
                { label: 'Amount',    val: `${pointsNum.toLocaleString()} pts` },
                { label: 'USD Value', val: `$${usdAmount.toFixed(2)} USD` },
                { label: 'Method',    val: method?.name || '' },
                { label: 'Account',  val: accountInfo },
                { label: 'Processing', val: '1–7 business days' },
              ].map(r => (
                <View key={r.label} style={S.confirmRow}>
                  <Text style={S.confirmLabel}>{r.label}</Text>
                  <Text style={S.confirmVal}>{r.val}</Text>
                </View>
              ))}
              <View style={S.confirmDiv} />
              <View style={S.confirmRow}>
                <Text style={S.confirmKeyBold}>You Receive</Text>
                <Text style={[S.confirmValBold, { color: Colors.success }]}>${usdAmount.toFixed(2)}</Text>
              </View>
            </View>
            <View style={S.confirmNotice}>
              <MaterialIcons name="info-outline" size={14} color={Colors.textMuted} />
              <Text style={S.confirmNoticeText}>Ensure account details are correct. Incorrect info may delay your payment.</Text>
            </View>
          </View>
          <Pressable
            style={[S.confirmBtn, submitting && { opacity: 0.6 }]}
            onPress={handleConfirm}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={S.confirmBtnText}>✅ Confirm Withdrawal</Text>}
          </Pressable>
          <Pressable style={S.cancelBtn} onPress={() => setStep('main')}>
            <Text style={S.cancelBtnText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === 'success') {
    return (
      <SafeAreaView style={[S.container, { alignItems: 'center', justifyContent: 'center' }]} edges={['top', 'bottom']}>
        <Animated.View style={[S.successCard, { transform: [{ scale: successAnim }], opacity: successAnim }]}>
          <Text style={{ fontSize: 72 }}>✅</Text>
          <Text style={S.successTitle}>Request Submitted!</Text>
          <Text style={S.successDesc}>
            Your withdrawal of{' '}
            <Text style={{ color: Colors.gold, fontWeight: FontWeight.bold }}>{pointsNum.toLocaleString()} pts</Text>
            {' '}(${usdAmount.toFixed(2)}) via{' '}
            <Text style={{ color: Colors.primary }}>{method?.name}</Text>
            {' '}has been submitted.
          </Text>
          <View style={S.successRef}>
            <Text style={S.successRefLabel}>Reference ID</Text>
            <Text style={S.successRefVal}>{refId}</Text>
          </View>
          <View style={S.successTimeline}>
            {[
              { icon: '✅', label: 'Submitted',    done: true },
              { icon: '🔍', label: 'Under Review',  done: false },
              { icon: '💸', label: 'Processed',     done: false },
              { icon: '🏦', label: 'Sent to You',   done: false },
            ].map((t, i) => (
              <View key={t.label} style={S.timelineItem}>
                <View style={[S.timelineDot, t.done && S.timelineDotActive]}>
                  <Text style={{ fontSize: 12 }}>{t.icon}</Text>
                </View>
                <Text style={[S.timelineLabel, t.done && { color: Colors.success }]}>{t.label}</Text>
                {i < 3 && <View style={S.timelineLine} />}
              </View>
            ))}
          </View>
          <Text style={S.successNote}>Processing: 1–7 business days. Max $500/day.</Text>
          <Pressable style={S.successBtn} onPress={() => { reset(); router.back(); }}>
            <Text style={S.successBtnText}>Done</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <View style={S.header}>
        <Pressable onPress={() => router.back()}><MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} /></Pressable>
        <Text style={S.title}>💸 Withdrawal</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab bar */}
      <View style={S.tabBar}>
        {(['withdraw', 'history'] as const).map(t => (
          <Pressable key={t} style={[S.tab, activeTab === t && S.tabActive]} onPress={() => setActiveTab(t)}>
            <Text style={[S.tabText, activeTab === t && S.tabTextActive]}>
              {t === 'withdraw' ? '💸 Withdraw' : '📋 History'}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'withdraw' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scroll}>
          {/* Balance card */}
          <View style={S.balanceCard}>
            <View style={{ flex: 1 }}>
              <Text style={S.balanceLabel}>Your Points Balance</Text>
              <Text style={S.balanceAmount}>{userPoints.toLocaleString()}</Text>
              <Text style={S.balanceUnit}>points</Text>
              <Text style={S.balanceUsd}>≈ ${pointsToUSD(userPoints).toFixed(2)} USD</Text>
            </View>
            <View style={S.balanceRight}>
              <View style={S.convChip}>
                <Text style={S.convChipText}>10,000 pts = $1</Text>
              </View>
              {!canWithdraw && (
                <View style={[S.convChip, { borderColor: Colors.error + '40', backgroundColor: Colors.error + '15' }]}>
                  <Text style={[S.convChipText, { color: Colors.error }]}>
                    Need {(MIN_WITHDRAWAL_POINTS - userPoints).toLocaleString()} more pts
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Rules card */}
          <View style={S.rulesCard}>
            <Text style={S.rulesTitle}>📜 Withdrawal Rules</Text>
            <View style={S.rulesList}>
              {[
                { icon: '💰', text: `Minimum: ${MIN_WITHDRAWAL_POINTS.toLocaleString()} pts = $${pointsToUSD(MIN_WITHDRAWAL_POINTS).toFixed(0)} USD` },
                { icon: '📈', text: `Maximum: $${MAX_DAILY_WITHDRAWAL_USD} per day` },
                { icon: '📅', text: 'Processing: 1–7 business days' },
                { icon: '🪙', text: '10,000 points = 1 US Dollar' },
                { icon: '📋', text: 'Points from tasks must be claimed before midnight (BD time)' },
              ].map(r => (
                <View key={r.text} style={S.ruleItem}>
                  <Text style={{ fontSize: 14 }}>{r.icon}</Text>
                  <Text style={S.ruleText}>{r.text}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Method selection */}
          <Text style={S.sectionTitle}>Select Method</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm }}>
            {METHODS.map(m => (
              <Pressable
                key={m.id}
                style={[S.methodCard, selectedMethod === m.id && { borderColor: m.color, borderWidth: 2.5, backgroundColor: m.color + '12' }]}
                onPress={() => setSelectedMethod(m.id as Method)}
              >
                <Text style={{ fontSize: 28 }}>{m.icon}</Text>
                <Text style={[S.methodName, selectedMethod === m.id && { color: m.color }]}>{m.name}</Text>
                {selectedMethod === m.id && (
                  <View style={[S.methodCheck, { backgroundColor: m.color }]}>
                    <MaterialIcons name="check" size={11} color="#FFF" />
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>

          {/* Amount input */}
          <Text style={S.sectionTitle}>Points Amount</Text>
          <View style={S.amountWrap}>
            <TextInput
              style={S.amountInput}
              placeholder="Enter points amount..."
              placeholderTextColor={Colors.textMuted}
              value={pointsInput}
              onChangeText={v => setPointsInput(v.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
            />
            <View style={S.amountUsd}>
              <Text style={[S.amountUsdText, { color: pointsNum >= MIN_WITHDRAWAL_POINTS ? Colors.success : Colors.textMuted }]}>
                ${usdAmount.toFixed(2)}
              </Text>
            </View>
          </View>
          <View style={S.quickRow}>
            {QUICK_AMOUNTS.map(a => (
              <Pressable key={a} style={[S.quickBtn, pointsInput === String(a) && S.quickBtnActive]} onPress={() => setPointsInput(String(a))}>
                <Text style={[S.quickBtnText, pointsInput === String(a) && S.quickBtnTextActive]}>
                  {a === usdToPoints(MAX_DAILY_WITHDRAWAL_USD) || a === userPoints ? 'Max' : `${(a / 1000).toFixed(0)}K`}
                </Text>
                <Text style={[S.quickBtnSub, pointsInput === String(a) && { color: '#FFF' }]}>${pointsToUSD(a).toFixed(0)}</Text>
              </Pressable>
            ))}
          </View>

          {/* Account details */}
          {selectedMethod && (
            <>
              <Text style={S.sectionTitle}>{method?.name} Account Details</Text>
              <TextInput
                style={S.accountInput}
                placeholder={method?.placeholder || ''}
                placeholderTextColor={Colors.textMuted}
                value={accountInfo}
                onChangeText={setAccountInfo}
                autoCapitalize="none"
              />
            </>
          )}

          {/* Summary */}
          {pointsNum >= MIN_WITHDRAWAL_POINTS && selectedMethod && (
            <View style={S.summaryCard}>
              <Text style={S.summaryTitle}>📋 Summary</Text>
              <View style={S.summaryRow}><Text style={S.summaryKey}>Points to withdraw</Text><Text style={S.summaryVal}>{pointsNum.toLocaleString()} pts</Text></View>
              <View style={S.summaryRow}><Text style={S.summaryKey}>USD Equivalent</Text><Text style={S.summaryVal}>${usdAmount.toFixed(2)}</Text></View>
              <View style={S.summaryRow}><Text style={S.summaryKey}>Method</Text><Text style={S.summaryVal}>{method?.name}</Text></View>
              <View style={S.summaryRow}><Text style={S.summaryKey}>Processing Fee</Text><Text style={[S.summaryVal, { color: Colors.success }]}>Free</Text></View>
              <View style={S.summaryDiv} />
              <View style={S.summaryRow}>
                <Text style={[S.summaryKey, { fontWeight: FontWeight.bold, color: Colors.textPrimary }]}>You Receive</Text>
                <Text style={[S.summaryVal, { color: Colors.success, fontSize: FontSize.lg, fontWeight: FontWeight.black }]}>${usdAmount.toFixed(2)}</Text>
              </View>
            </View>
          )}

          <Pressable
            style={[S.submitBtn, (!canWithdraw || !selectedMethod || pointsNum < MIN_WITHDRAWAL_POINTS || !accountInfo.trim()) && { opacity: 0.45 }]}
            onPress={handleSubmit}
            disabled={!canWithdraw || !selectedMethod || pointsNum < MIN_WITHDRAWAL_POINTS || !accountInfo.trim()}
          >
            <Text style={S.submitBtnText}>💸 Submit Withdrawal Request</Text>
          </Pressable>

          {!canWithdraw && (
            <View style={S.earnMoreCard}>
              <Text style={{ fontSize: 32 }}>🎯</Text>
              <View style={{ flex: 1 }}>
                <Text style={S.earnMoreTitle}>Need more points?</Text>
                <Text style={S.earnMoreSub}>Go live, complete tasks, win PK battles and receive gifts!</Text>
              </View>
              <Pressable style={S.earnMoreBtn} onPress={() => router.push('/daily-tasks')}>
                <Text style={S.earnMoreBtnText}>Earn</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      ) : (
        // ── History Tab ──
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scroll}>
          <View style={S.historyHeader}>
            <Text style={S.historyTitle}>Points History</Text>
            <Text style={[S.historyBalance, { color: Colors.primary }]}>
              Balance: {userPoints.toLocaleString()} pts
            </Text>
          </View>
          {loadingHistory ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
          ) : txHistory.length === 0 ? (
            <View style={S.historyEmpty}>
              <Text style={{ fontSize: 48 }}>📋</Text>
              <Text style={S.historyEmptyText}>No transactions yet</Text>
              <Text style={S.historyEmptySub}>Start earning points by going live!</Text>
            </View>
          ) : (
            txHistory.map(tx => {
              const conf = HISTORY_TYPE_LABELS[tx.type] || { label: tx.type, color: Colors.textMuted, icon: '•' };
              return (
                <View key={tx.id} style={S.txRow}>
                  <View style={[S.txIcon, { backgroundColor: conf.color + '20' }]}>
                    <Text style={{ fontSize: 18 }}>{conf.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.txType}>{conf.label}</Text>
                    <Text style={S.txDesc} numberOfLines={1}>{tx.description}</Text>
                    <Text style={S.txDate}>{new Date(tx.created_at).toLocaleDateString()}</Text>
                  </View>
                  <Text style={[S.txAmount, { color: tx.amount >= 0 ? Colors.success : Colors.error }]}>
                    {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()} pts
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  title: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  tabBar: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm },
  tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  tabTextActive: { color: '#FFF', fontWeight: FontWeight.bold },
  scroll: { padding: Spacing.md, paddingBottom: 100 },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.sm, marginTop: Spacing.xs },
  // Balance
  balanceCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.gold + '40' },
  balanceLabel: { color: Colors.textMuted, fontSize: FontSize.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceAmount: { color: Colors.gold, fontSize: 44, fontWeight: FontWeight.black, lineHeight: 52 },
  balanceUnit: { color: Colors.textMuted, fontSize: FontSize.sm },
  balanceUsd: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 4, fontWeight: FontWeight.semibold },
  balanceRight: { gap: Spacing.xs, alignItems: 'flex-end' },
  convChip: { borderRadius: BorderRadius.pill, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: Colors.gold + '40', backgroundColor: Colors.gold + '15' },
  convChipText: { color: Colors.gold, fontSize: 10, fontWeight: FontWeight.bold },
  // Rules
  rulesCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.primary + '30', gap: Spacing.sm },
  rulesTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  rulesList: { gap: 6 },
  ruleItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  ruleText: { color: Colors.textSecondary, fontSize: FontSize.xs, flex: 1, lineHeight: 18 },
  // Method
  methodCard: { width: 90, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.sm, alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: Colors.cardBorder, position: 'relative', minHeight: 80, justifyContent: 'center' },
  methodName: { color: Colors.textSecondary, fontSize: 10, fontWeight: FontWeight.bold, textAlign: 'center' },
  methodCheck: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  // Amount
  amountWrap: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.cardBorder, overflow: 'hidden', marginBottom: Spacing.sm },
  amountInput: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.xxl, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontWeight: FontWeight.bold },
  amountUsd: { backgroundColor: Colors.surfaceElevated, paddingHorizontal: Spacing.sm, justifyContent: 'center', minWidth: 70, alignItems: 'center' },
  amountUsdText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  quickRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.md, flexWrap: 'wrap' },
  quickBtn: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.cardBorder, alignItems: 'center', minWidth: 56 },
  quickBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  quickBtnText: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  quickBtnTextActive: { color: '#FFF' },
  quickBtnSub: { color: Colors.textMuted, fontSize: 9 },
  accountInput: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 12, color: Colors.textPrimary, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: Spacing.md },
  // Summary
  summaryCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.cardBorder, gap: 8 },
  summaryTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryKey: { color: Colors.textMuted, fontSize: FontSize.sm },
  summaryVal: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  summaryDiv: { height: 1, backgroundColor: Colors.cardBorder },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingVertical: Spacing.md, alignItems: 'center', marginBottom: Spacing.md, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  submitBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  earnMoreCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.primary + '15', borderRadius: BorderRadius.xl, padding: Spacing.md, borderWidth: 1, borderColor: Colors.primary + '30' },
  earnMoreTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  earnMoreSub: { color: Colors.textMuted, fontSize: FontSize.xs, lineHeight: 16 },
  earnMoreBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm },
  earnMoreBtnText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  // Confirm step
  confirmCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderColor: Colors.primary + '30', marginBottom: Spacing.lg },
  confirmTitle: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  confirmRows: { width: '100%', gap: 8 },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between' },
  confirmLabel: { color: Colors.textMuted, fontSize: FontSize.sm },
  confirmVal: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.medium, maxWidth: '55%', textAlign: 'right' },
  confirmDiv: { height: 1, backgroundColor: Colors.cardBorder },
  confirmKeyBold: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  confirmValBold: { fontSize: FontSize.xl, fontWeight: FontWeight.black },
  confirmNotice: { flexDirection: 'row', gap: 6, backgroundColor: Colors.bgSecondary, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'flex-start' },
  confirmNoticeText: { flex: 1, color: Colors.textMuted, fontSize: FontSize.xs, lineHeight: 16 },
  confirmBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingVertical: Spacing.md, alignItems: 'center', marginBottom: Spacing.sm },
  confirmBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  cancelBtn: { paddingVertical: Spacing.sm, alignItems: 'center' },
  cancelBtnText: { color: Colors.textMuted, fontSize: FontSize.sm },
  // Success step
  successCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', gap: Spacing.md, width: '90%', borderWidth: 1, borderColor: Colors.success + '40' },
  successTitle: { color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  successDesc: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 22 },
  successRef: { backgroundColor: Colors.bgSecondary, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', width: '100%', gap: 4 },
  successRefLabel: { color: Colors.textMuted, fontSize: FontSize.xs, textTransform: 'uppercase', letterSpacing: 1 },
  successRefVal: { color: Colors.primary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  successTimeline: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', position: 'relative' },
  timelineItem: { alignItems: 'center', gap: 4, flex: 1 },
  timelineDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, borderWidth: 2, borderColor: Colors.cardBorder, alignItems: 'center', justifyContent: 'center' },
  timelineDotActive: { borderColor: Colors.success, backgroundColor: Colors.success + '20' },
  timelineLabel: { color: Colors.textMuted, fontSize: 9, textAlign: 'center', fontWeight: FontWeight.semibold },
  timelineLine: { position: 'absolute', right: 0, top: 17, width: '40%', height: 2, backgroundColor: Colors.cardBorder },
  successNote: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center' },
  successBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxl },
  successBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  // History tab
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  historyTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  historyBalance: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  historyEmpty: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md },
  historyEmptyText: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  historyEmptySub: { color: Colors.textMuted, fontSize: FontSize.sm },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  txIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  txType: { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  txDesc: { color: Colors.textMuted, fontSize: FontSize.xs },
  txDate: { color: Colors.textMuted, fontSize: 10 },
  txAmount: { fontSize: FontSize.sm, fontWeight: FontWeight.black },
});
