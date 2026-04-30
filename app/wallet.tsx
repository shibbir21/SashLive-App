// Powered by OnSpace.AI
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { MOCK_TRANSACTIONS } from '@/services/mockData';
import { useAlert } from '@/template';

type Tab = 'overview' | 'history' | 'withdraw' | 'seller';

export default function WalletScreen() {
  const router = useRouter();
  const { currentUser, updateDiamonds } = useApp();
  const { showAlert } = useAlert();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const handleAdReward = () => {
    updateDiamonds(5);
    showAlert('Reward Earned!', 'You received 5 💎 diamonds for watching the ad!');
  };

  const handleWithdraw = () => {
    if (!withdrawAmount || parseInt(withdrawAmount) < 100) {
      showAlert('Minimum Withdrawal', 'Minimum withdrawal is 100 R-Coins');
      return;
    }
    showAlert('Withdrawal Submitted', `Your withdrawal request for ${withdrawAmount} R-Coins has been submitted and will be processed within 3 business days.`);
    setWithdrawAmount('');
  };

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const txColor = (type: string) => {
    if (type === 'gift_received' || type === 'recharge' || type === 'ad_reward') return Colors.success;
    return Colors.live;
  };

  const txSign = (type: string) => {
    if (type === 'gift_received' || type === 'recharge' || type === 'ad_reward') return '+';
    return '-';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Diamond Wallet</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Balance cards */}
      <View style={styles.balanceRow}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceIcon}>💎</Text>
          <Text style={styles.balanceAmount}>{currentUser.diamonds.toLocaleString()}</Text>
          <Text style={styles.balanceLabel}>Diamonds</Text>
          <Pressable style={styles.rechargeBtn} onPress={() => router.push('/recharge')}>
            <Text style={styles.rechargeBtnText}>Recharge</Text>
          </Pressable>
        </View>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceIcon}>🪙</Text>
          <Text style={[styles.balanceAmount, { color: Colors.coin }]}>{currentUser.coins.toLocaleString()}</Text>
          <Text style={styles.balanceLabel}>R-Coins</Text>
          <Pressable style={[styles.rechargeBtn, { borderColor: Colors.coin }]} onPress={() => setActiveTab('withdraw')}>
            <Text style={[styles.rechargeBtnText, { color: Colors.coin }]}>Withdraw</Text>
          </Pressable>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['overview', 'history', 'withdraw', 'seller'] as Tab[]).map(tab => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xxl }}>
        {activeTab === 'overview' ? (
          <>
            <Text style={styles.sectionTitle}>Earn Diamonds</Text>
            <Pressable style={styles.earnCard} onPress={handleAdReward}>
              <Text style={{ fontSize: 32 }}>📺</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.earnTitle}>Watch Ad</Text>
                <Text style={styles.earnDesc}>Watch a short ad to earn 5 💎 diamonds</Text>
              </View>
              <View style={styles.earnBadge}>
                <Text style={styles.earnBadgeText}>+5 💎</Text>
              </View>
            </Pressable>

            <Pressable style={styles.earnCard}>
              <Text style={{ fontSize: 32 }}>🎁</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.earnTitle}>Referral Program</Text>
                <Text style={styles.earnDesc}>Invite friends with code: {currentUser.referralCode}</Text>
              </View>
              <View style={[styles.earnBadge, { backgroundColor: 'rgba(255,215,0,0.15)' }]}>
                <Text style={[styles.earnBadgeText, { color: Colors.gold }]}>+50 💎</Text>
              </View>
            </Pressable>

            <Text style={styles.sectionTitle}>Quick Recharge</Text>
            <View style={styles.quickRechargeRow}>
              {[100, 500, 1200].map(amount => (
                <Pressable
                  key={amount}
                  style={styles.quickRechargeBtn}
                  onPress={() => router.push('/recharge')}
                >
                  <Text style={styles.quickRechargeAmount}>{amount}</Text>
                  <Text style={styles.quickRechargeIcon}>💎</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Conversion Rate</Text>
            <View style={styles.conversionCard}>
              <Text style={styles.conversionText}>1 💎 Diamond = 10 🪙 R-Coins</Text>
              <Text style={styles.conversionSub}>Coins are earned by hosting and receiving gifts</Text>
            </View>
          </>
        ) : activeTab === 'history' ? (
          <>
            <Text style={styles.sectionTitle}>Transaction History</Text>
            {MOCK_TRANSACTIONS.map(tx => (
              <View key={tx.id} style={styles.txItem}>
                <View style={styles.txIcon}>
                  <Text style={{ fontSize: 20 }}>
                    {tx.type === 'gift_received' ? '🎁' : tx.type === 'recharge' ? '💎' : tx.type === 'gift_sent' ? '↗️' : tx.type === 'withdrawal' ? '💸' : tx.type === 'vip_purchase' ? '👑' : '📺'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txDesc}>{tx.description}</Text>
                  <Text style={styles.txTime}>{formatTime(tx.timestamp)}</Text>
                </View>
                <Text style={[styles.txAmount, { color: txColor(tx.type) }]}>
                  {txSign(tx.type)}{Math.abs(tx.amount)} {tx.currency === 'diamond' ? '💎' : '🪙'}
                </Text>
              </View>
            ))}
          </>
        ) : activeTab === 'withdraw' ? (
          <>
            <Text style={styles.sectionTitle}>Withdrawal Request</Text>
            <View style={styles.withdrawCard}>
              <Text style={styles.withdrawLabel}>Available R-Coins</Text>
              <Text style={styles.withdrawBalance}>{currentUser.coins.toLocaleString()} 🪙</Text>
              <Text style={styles.withdrawMin}>Minimum: 100 coins</Text>
            </View>

            <Text style={styles.inputLabel}>Withdrawal Amount (R-Coins)</Text>
            <TextInput
              style={styles.withdrawInput}
              placeholder="Enter amount..."
              placeholderTextColor={Colors.textMuted}
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Payment Method</Text>
            <View style={styles.paymentOptions}>
              {['Bank Transfer', 'PayPal', 'Crypto'].map(method => (
                <Pressable key={method} style={styles.paymentOption}>
                  <Text style={styles.paymentOptionText}>{method}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.withdrawBtn} onPress={handleWithdraw}>
              <Text style={styles.withdrawBtnText}>Submit Withdrawal Request</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Offline Coin Seller</Text>
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerInfoIcon}>🏪</Text>
              <Text style={styles.sellerInfoTitle}>Manual Recharge System</Text>
              <Text style={styles.sellerInfoDesc}>Submit payment proof and get coins without an online payment gateway — perfect for regions without digital payments.</Text>
            </View>

            <Text style={styles.inputLabel}>Your Payment Amount</Text>
            <TextInput
              style={styles.withdrawInput}
              placeholder="Enter amount paid..."
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Payment Proof / Reference Number</Text>
            <TextInput
              style={[styles.withdrawInput, { height: 80 }]}
              placeholder="Enter transaction reference..."
              placeholderTextColor={Colors.textMuted}
              multiline
            />

            <Pressable style={styles.withdrawBtn} onPress={() => showAlert('Request Submitted', 'Your offline recharge request has been submitted. Admin will verify and credit coins within 24 hours.')}>
              <Text style={styles.withdrawBtnText}>Submit Recharge Request</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  title: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  balanceRow: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  balanceCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.cardBorder },
  balanceIcon: { fontSize: 32 },
  balanceAmount: { color: Colors.diamond, fontSize: FontSize.xxl, fontWeight: FontWeight.black },
  balanceLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  rechargeBtn: { marginTop: 4, borderWidth: 1, borderColor: Colors.diamond, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: 4 },
  rechargeBtnText: { color: Colors.diamond, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  tabs: { flexDirection: 'row', paddingHorizontal: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.xs },
  tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm },
  tabActive: { backgroundColor: Colors.surface, borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  tabTextActive: { color: Colors.primary, fontWeight: FontWeight.bold },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
  earnCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.md, borderWidth: 1, borderColor: Colors.cardBorder },
  earnTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  earnDesc: { color: Colors.textMuted, fontSize: FontSize.xs },
  earnBadge: { backgroundColor: 'rgba(0,212,255,0.15)', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.pill },
  earnBadgeText: { color: Colors.diamond, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  quickRechargeRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  quickRechargeBtn: { flex: 1, alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.cardBorder, gap: 4 },
  quickRechargeAmount: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  quickRechargeIcon: { fontSize: 20 },
  conversionCard: { backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.cardBorder },
  conversionText: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, marginBottom: 4 },
  conversionSub: { color: Colors.textMuted, fontSize: FontSize.xs },
  txItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  txIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  txDesc: { color: Colors.textPrimary, fontSize: FontSize.sm },
  txTime: { color: Colors.textMuted, fontSize: FontSize.xs },
  txAmount: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  withdrawCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.cardBorder },
  withdrawLabel: { color: Colors.textMuted, fontSize: FontSize.sm },
  withdrawBalance: { color: Colors.coin, fontSize: FontSize.xxl, fontWeight: FontWeight.black },
  withdrawMin: { color: Colors.textMuted, fontSize: FontSize.xs },
  inputLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: 6, marginTop: Spacing.sm },
  withdrawInput: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, color: Colors.textPrimary, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: Spacing.sm },
  paymentOptions: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  paymentOption: { flex: 1, alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder },
  paymentOptionText: { color: Colors.textSecondary, fontSize: FontSize.xs },
  withdrawBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, padding: Spacing.md, alignItems: 'center' },
  withdrawBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  sellerInfo: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.cardBorder, gap: Spacing.sm },
  sellerInfoIcon: { fontSize: 48 },
  sellerInfoTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  sellerInfoDesc: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
});
