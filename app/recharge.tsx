// Powered by OnSpace.AI
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  Animated, Dimensions, Modal, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { RECHARGE_PLANS } from '@/constants/config';
import { useApp } from '@/contexts/AppContext';
import { useAlert } from '@/template';

const { width } = Dimensions.get('window');

type PaymentMethod = 'bkash' | 'nagad' | 'paypal' | 'crypto' | 'bank' | 'visa';

interface PaymentOption {
  id: PaymentMethod;
  name: string;
  icon: string;
  color: string;
  type: 'manual' | 'gateway';
  description: string;
  details: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: 'bkash', name: 'bKash', icon: '📱', color: '#E2136E',
    type: 'manual', description: 'Bangladesh Mobile Banking',
    details: 'Send to: 01700-000000 (Personal)\nRef: Your User ID'
  },
  {
    id: 'nagad', name: 'Nagad', icon: '💰', color: '#F7941D',
    type: 'manual', description: 'Bangladesh Digital Wallet',
    details: 'Send to: 01600-000000 (Personal)\nRef: Your User ID'
  },
  {
    id: 'paypal', name: 'PayPal', icon: '🅿️', color: '#003087',
    type: 'manual', description: 'International Payment',
    details: 'PayPal Email: payments@streamvibe.app\nNote: Your User ID + Plan'
  },
  {
    id: 'crypto', name: 'Crypto', icon: '₿', color: '#F7931A',
    type: 'manual', description: 'Bitcoin / USDT / ETH',
    details: 'BTC: bc1qxxx...streamvibe\nUSDT (TRC20): TXxxx...vibe\nETH: 0x...streamvibe'
  },
  {
    id: 'bank', name: 'Bank Transfer', icon: '🏦', color: '#1565C0',
    type: 'manual', description: 'Local / International Wire',
    details: 'Bank: StreamVibe Ltd\nAcc: 1234-5678-9012\nRouting: 021000021\nSwift: SVBKUS33'
  },
  {
    id: 'visa', name: 'Visa / Card', icon: '💳', color: '#1A1F71',
    type: 'gateway', description: 'Credit / Debit Card',
    details: 'Secure card processing\nVisa, Mastercard, Amex accepted'
  },
];

const PLAN_PRICES_LOCAL: { [key: string]: { bdt: number; usd: number } } = {
  r1: { bdt: 110, usd: 0.99 },
  r2: { bdt: 549, usd: 4.99 },
  r3: { bdt: 1099, usd: 9.99 },
  r4: { bdt: 2199, usd: 19.99 },
  r5: { bdt: 5499, usd: 49.99 },
  r6: { bdt: 10999, usd: 99.99 },
};

export default function RechargeScreen() {
  const router = useRouter();
  const { currentUser, updateDiamonds } = useApp();
  const { showAlert } = useAlert();

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [step, setStep] = useState<'plan' | 'method' | 'details' | 'proof'>('plan');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, { toValue: 1, duration: 1800, useNativeDriver: true })
    ).start();
  }, []);

  const plan = RECHARGE_PLANS.find(p => p.id === selectedPlan);
  const method = PAYMENT_OPTIONS.find(m => m.id === selectedMethod);
  const planPrice = selectedPlan ? PLAN_PRICES_LOCAL[selectedPlan] : null;

  const handleSubmitProof = async () => {
    if (!transactionRef.trim()) {
      showAlert('Missing Info', 'Please enter the transaction reference/ID.');
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setShowSuccess(true);
    }, 1500);
  };

  const handleConfirmCard = () => {
    if (!plan) return;
    const total = plan.diamonds + plan.bonus;
    showAlert(
      `Pay $${planPrice?.usd} via Card?`,
      `You will receive ${total} 💎 diamonds after payment is verified.`,
      [
        {
          text: 'Pay Now',
          onPress: () => {
            updateDiamonds(total);
            showAlert('Payment Successful!', `${total} 💎 added to your wallet!`);
            router.back();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const renderPlanStep = () => (
    <>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <View style={styles.balanceRow}>
          <Text style={{ fontSize: 32 }}>💎</Text>
          <Text style={styles.balanceAmount}>{currentUser.diamonds.toLocaleString()}</Text>
        </View>
      </View>

      <Text style={styles.stepTitle}>1. Choose a Plan</Text>
      <View style={styles.plansGrid}>
        {RECHARGE_PLANS.map(p => {
          const total = p.diamonds + p.bonus;
          const isSelected = selectedPlan === p.id;
          const prices = PLAN_PRICES_LOCAL[p.id];
          return (
            <Pressable
              key={p.id}
              style={[styles.planCard, isSelected && styles.planCardSelected, p.popular && styles.planCardPopular]}
              onPress={() => setSelectedPlan(isSelected ? null : p.id)}
            >
              {p.popular && <View style={styles.popularBadge}><Text style={styles.popularBadgeText}>🔥 HOT</Text></View>}
              {p.bonus > 0 && <View style={styles.bonusBadge}><Text style={styles.bonusBadgeText}>+{p.bonus}</Text></View>}
              <Text style={{ fontSize: 32 }}>💎</Text>
              <Text style={styles.planDiamonds}>{p.diamonds.toLocaleString()}</Text>
              {p.bonus > 0 && <Text style={styles.planTotal}>= {total.toLocaleString()}</Text>}
              <Text style={styles.planLabel}>{p.label}</Text>
              <View style={[styles.planPriceWrap, isSelected && { backgroundColor: Colors.primary }]}>
                <Text style={[styles.planUSD, isSelected && { color: '#FFF' }]}>${prices.usd}</Text>
                <Text style={[styles.planBDT, isSelected && { color: 'rgba(255,255,255,0.7)' }]}>৳{prices.bdt}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {selectedPlan && (
        <Pressable style={styles.nextBtn} onPress={() => setStep('method')}>
          <Text style={styles.nextBtnText}>Continue to Payment →</Text>
        </Pressable>
      )}
    </>
  );

  const renderMethodStep = () => (
    <>
      <View style={styles.selectedPlanBanner}>
        <Text style={{ fontSize: 24 }}>💎</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.selectedPlanTitle}>{plan?.label} — {plan?.diamonds.toLocaleString()} Diamonds</Text>
          <Text style={styles.selectedPlanSub}>${planPrice?.usd} · ৳{planPrice?.bdt}</Text>
        </View>
        <Pressable onPress={() => setStep('plan')}>
          <Text style={styles.changeLink}>Change</Text>
        </Pressable>
      </View>

      <Text style={styles.stepTitle}>2. Choose Payment Method</Text>
      <View style={styles.methodGrid}>
        {PAYMENT_OPTIONS.map(opt => {
          const isSelected = selectedMethod === opt.id;
          return (
            <Pressable
              key={opt.id}
              style={[styles.methodCard, isSelected && { borderColor: opt.color, borderWidth: 2.5 }]}
              onPress={() => setSelectedMethod(opt.id)}
            >
              <View style={[styles.methodIconBg, { backgroundColor: opt.color + '25' }]}>
                <Text style={styles.methodIcon}>{opt.icon}</Text>
              </View>
              <Text style={styles.methodName}>{opt.name}</Text>
              <Text style={styles.methodDesc}>{opt.description}</Text>
              {isSelected && (
                <View style={[styles.methodCheck, { backgroundColor: opt.color }]}>
                  <MaterialIcons name="check" size={10} color="#FFF" />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {selectedMethod && (
        <Pressable style={styles.nextBtn} onPress={() => setStep('details')}>
          <Text style={styles.nextBtnText}>View Payment Details →</Text>
        </Pressable>
      )}
    </>
  );

  const renderDetailsStep = () => {
    if (!method || !plan || !planPrice) return null;
    const total = plan.diamonds + plan.bonus;
    const isCard = method.type === 'gateway';

    return (
      <>
        <View style={[styles.methodDetailCard, { borderColor: method.color + '60' }]}>
          <View style={styles.methodDetailHeader}>
            <View style={[styles.methodDetailIconBg, { backgroundColor: method.color + '25' }]}>
              <Text style={{ fontSize: 28 }}>{method.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.methodDetailName, { color: method.color }]}>{method.name}</Text>
              <Text style={styles.methodDetailType}>{method.description}</Text>
            </View>
          </View>

          {isCard ? (
            <View style={styles.cardPayInfo}>
              <Text style={styles.cardPayText}>Secure payment via Visa / Mastercard / Amex</Text>
              <View style={styles.cardIcons}>
                {['💳', '🔒', '✓'].map((c, i) => (
                  <Text key={i} style={{ fontSize: 20 }}>{c}</Text>
                ))}
              </View>
              <View style={styles.orderSummary}>
                <Text style={styles.orderRow}>Plan: <Text style={{ color: Colors.textPrimary }}>{plan.label}</Text></Text>
                <Text style={styles.orderRow}>Diamonds: <Text style={{ color: Colors.diamond }}>💎 {total.toLocaleString()}</Text></Text>
                <Text style={styles.orderRow}>Amount: <Text style={{ color: Colors.success }}>${planPrice.usd}</Text></Text>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.payInfoBox}>
                <Text style={styles.payInfoTitle}>📋 Payment Details</Text>
                {method.details.split('\n').map((line, i) => (
                  <Text key={i} style={styles.payInfoLine}>{line}</Text>
                ))}
              </View>
              <View style={styles.amountBox}>
                <Text style={styles.amountLabel}>Amount to Send</Text>
                <View style={styles.amountRow}>
                  <View style={styles.amountItem}>
                    <Text style={styles.amountValue}>${planPrice.usd}</Text>
                    <Text style={styles.amountCurrency}>USD</Text>
                  </View>
                  {(method.id === 'bkash' || method.id === 'nagad' || method.id === 'bank') && (
                    <>
                      <Text style={styles.amountOr}>or</Text>
                      <View style={styles.amountItem}>
                        <Text style={[styles.amountValue, { color: method.color }]}>৳{planPrice.bdt}</Text>
                        <Text style={styles.amountCurrency}>BDT</Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
              <View style={styles.importantBox}>
                <MaterialIcons name="info-outline" size={16} color={Colors.warning} />
                <Text style={styles.importantText}>
                  Include your User ID ({currentUser.id}) in the payment note/reference.
                  Diamonds will be added within 1-24 hours after verification.
                </Text>
              </View>
            </>
          )}
        </View>

        {isCard ? (
          <Pressable style={[styles.nextBtn, { backgroundColor: method.color }]} onPress={handleConfirmCard}>
            <Text style={styles.nextBtnText}>💳 Pay ${planPrice.usd} Now</Text>
          </Pressable>
        ) : (
          <Pressable style={[styles.nextBtn, { backgroundColor: method.color }]} onPress={() => setStep('proof')}>
            <Text style={styles.nextBtnText}>I Have Made Payment →</Text>
          </Pressable>
        )}

        <Pressable style={styles.backLink} onPress={() => setStep('method')}>
          <MaterialIcons name="arrow-back" size={16} color={Colors.textMuted} />
          <Text style={styles.backLinkText}>Back to methods</Text>
        </Pressable>
      </>
    );
  };

  const renderProofStep = () => {
    if (!method || !plan) return null;
    const total = plan.diamonds + plan.bonus;
    return (
      <>
        <View style={styles.proofCard}>
          <Text style={styles.proofTitle}>📤 Submit Payment Proof</Text>
          <Text style={styles.proofSubtitle}>
            Enter your transaction details below. Our team will verify and add {total.toLocaleString()} 💎 to your account within 1-24 hours.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Transaction ID / Reference *</Text>
            <TextInput
              style={styles.proofInput}
              placeholder="e.g. TXN123456789"
              placeholderTextColor={Colors.textMuted}
              value={transactionRef}
              onChangeText={setTransactionRef}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Additional Notes (Optional)</Text>
            <TextInput
              style={[styles.proofInput, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Screenshot info, sender name, etc."
              placeholderTextColor={Colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>

          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Method</Text>
              <Text style={styles.summaryVal}>{method.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Plan</Text>
              <Text style={styles.summaryVal}>{plan.label} — {total.toLocaleString()} 💎</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>User ID</Text>
              <Text style={styles.summaryVal}>{currentUser.id}</Text>
            </View>
          </View>

          <Pressable
            style={[styles.nextBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmitProof}
            disabled={submitting}
          >
            <Text style={styles.nextBtnText}>{submitting ? 'Submitting...' : '✓ Submit Payment Request'}</Text>
          </Pressable>

          <Pressable style={styles.backLink} onPress={() => setStep('details')}>
            <MaterialIcons name="arrow-back" size={16} color={Colors.textMuted} />
            <Text style={styles.backLinkText}>Back</Text>
          </Pressable>
        </View>
      </>
    );
  };

  const stepTitles: Record<string, string> = {
    plan: 'Recharge Diamonds',
    method: 'Payment Method',
    details: 'Payment Details',
    proof: 'Submit Proof',
  };

  const stepNumbers = ['plan', 'method', 'details', 'proof'];
  const stepIdx = stepNumbers.indexOf(step);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => step === 'plan' ? router.back() : setStep(stepNumbers[stepIdx - 1] as any)}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{stepTitles[step]}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Step indicators */}
      <View style={styles.stepIndicators}>
        {['Plan', 'Method', 'Details', 'Proof'].map((s, i) => (
          <View key={s} style={styles.stepIndicatorItem}>
            <View style={[styles.stepDot, i <= stepIdx && { backgroundColor: Colors.primary }]}>
              <Text style={styles.stepDotText}>{i < stepIdx ? '✓' : i + 1}</Text>
            </View>
            <Text style={[styles.stepDotLabel, i === stepIdx && { color: Colors.primary }]}>{s}</Text>
          </View>
        ))}
        {/* Connector lines */}
        {[0, 1, 2].map(i => (
          <View key={`line_${i}`} style={[styles.stepLine, i < stepIdx && { backgroundColor: Colors.primary }]} />
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {step === 'plan' && renderPlanStep()}
        {step === 'method' && renderMethodStep()}
        {step === 'details' && renderDetailsStep()}
        {step === 'proof' && renderProofStep()}
        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <Text style={{ fontSize: 60 }}>🎉</Text>
            <Text style={styles.successTitle}>Request Submitted!</Text>
            <Text style={styles.successDesc}>
              Your payment request for{' '}
              <Text style={{ color: Colors.diamond, fontWeight: FontWeight.bold }}>
                {plan ? (plan.diamonds + plan.bonus).toLocaleString() : 0} 💎
              </Text>
              {' '}has been submitted successfully.{'\n\n'}
              Our team will verify and add diamonds within{' '}
              <Text style={{ color: Colors.gold }}>1-24 hours</Text>.
            </Text>
            <View style={styles.successRef}>
              <Text style={styles.successRefLabel}>Reference ID</Text>
              <Text style={styles.successRefValue}>REQ-{Date.now().toString().slice(-8)}</Text>
            </View>
            <Pressable style={styles.successBtn} onPress={() => { setShowSuccess(false); router.back(); }}>
              <Text style={styles.successBtnText}>Back to Home</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  title: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  stepIndicators: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, marginBottom: Spacing.md, position: 'relative' },
  stepIndicatorItem: { alignItems: 'center', gap: 4, flex: 1, zIndex: 1 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.cardBorder },
  stepDotText: { color: '#FFF', fontSize: 11, fontWeight: FontWeight.bold },
  stepDotLabel: { color: Colors.textMuted, fontSize: 9, fontWeight: FontWeight.medium },
  stepLine: { position: 'absolute', height: 2, backgroundColor: Colors.cardBorder, top: 14, left: '12.5%', right: '12.5%' },
  scroll: { paddingHorizontal: Spacing.md },
  balanceCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.diamond + '30' },
  balanceLabel: { color: Colors.textMuted, fontSize: FontSize.sm, marginBottom: 4 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  balanceAmount: { color: Colors.diamond, fontSize: 48, fontWeight: FontWeight.black },
  stepTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
  plansGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  planCard: { width: (width - Spacing.md * 2 - Spacing.sm) / 2, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: Colors.cardBorder, position: 'relative', overflow: 'visible' },
  planCardSelected: { borderColor: Colors.primary },
  planCardPopular: { borderColor: Colors.gold + '80' },
  popularBadge: { position: 'absolute', top: -10, left: '50%', transform: [{ translateX: -28 }], backgroundColor: Colors.live, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  popularBadgeText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.bold },
  bonusBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: Colors.success + '30', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  bonusBadgeText: { color: Colors.success, fontSize: 9, fontWeight: FontWeight.bold },
  planDiamonds: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.black },
  planTotal: { color: Colors.diamond, fontSize: FontSize.xs },
  planLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  planPriceWrap: { paddingHorizontal: Spacing.md, paddingVertical: 5, borderRadius: BorderRadius.pill, backgroundColor: Colors.surfaceElevated, alignItems: 'center' },
  planUSD: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  planBDT: { color: Colors.textMuted, fontSize: 10 },
  nextBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingVertical: Spacing.md, alignItems: 'center', marginBottom: Spacing.md, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  nextBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  selectedPlanBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.primary + '40' },
  selectedPlanTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  selectedPlanSub: { color: Colors.textMuted, fontSize: FontSize.xs },
  changeLink: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  methodCard: { width: (width - Spacing.md * 2 - Spacing.sm * 2) / 3, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.sm, alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: Colors.cardBorder, position: 'relative' },
  methodIconBg: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  methodIcon: { fontSize: 22 },
  methodName: { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: FontWeight.bold, textAlign: 'center' },
  methodDesc: { color: Colors.textMuted, fontSize: 9, textAlign: 'center', lineHeight: 12 },
  methodCheck: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  methodDetailCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1.5, gap: Spacing.md },
  methodDetailHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  methodDetailIconBg: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  methodDetailName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  methodDetailType: { color: Colors.textMuted, fontSize: FontSize.xs },
  payInfoBox: { backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, padding: Spacing.md, gap: 6 },
  payInfoTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold, marginBottom: 4 },
  payInfoLine: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 22, fontFamily: Platform_fontFamily() },
  amountBox: { gap: 8 },
  amountLabel: { color: Colors.textMuted, fontSize: FontSize.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  amountItem: { alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, padding: Spacing.sm, flex: 1 },
  amountValue: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.black },
  amountCurrency: { color: Colors.textMuted, fontSize: FontSize.xs },
  amountOr: { color: Colors.textMuted, fontSize: FontSize.sm },
  importantBox: { flexDirection: 'row', gap: 8, backgroundColor: Colors.warning + '15', borderRadius: BorderRadius.md, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.warning + '30' },
  importantText: { flex: 1, color: Colors.warning, fontSize: FontSize.xs, lineHeight: 18 },
  cardPayInfo: { gap: Spacing.sm, alignItems: 'center' },
  cardPayText: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center' },
  cardIcons: { flexDirection: 'row', gap: Spacing.md },
  orderSummary: { width: '100%', backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, padding: Spacing.md, gap: 6 },
  orderRow: { color: Colors.textSecondary, fontSize: FontSize.sm },
  proofCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.cardBorder, gap: Spacing.md },
  proofTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  proofSubtitle: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
  inputGroup: { gap: 6 },
  inputLabel: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  proofInput: { backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, color: Colors.textPrimary, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.cardBorder },
  summaryBox: { backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, padding: Spacing.md, gap: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryKey: { color: Colors.textMuted, fontSize: FontSize.sm },
  summaryVal: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center', marginTop: 4 },
  backLinkText: { color: Colors.textMuted, fontSize: FontSize.sm },
  successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
  successCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', gap: Spacing.md, width: '85%', borderWidth: 1, borderColor: Colors.primary + '40' },
  successTitle: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  successDesc: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 22 },
  successRef: { backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', width: '100%', gap: 4 },
  successRefLabel: { color: Colors.textMuted, fontSize: FontSize.xs, textTransform: 'uppercase', letterSpacing: 1 },
  successRefValue: { color: Colors.primary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  successBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, width: '100%', alignItems: 'center' },
  successBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
});

// Helper to avoid platform-specific font issues
function Platform_fontFamily() {
  return undefined;
}
