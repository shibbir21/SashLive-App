// SashLive — Poppo Live-Style Login & Signup Screen
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, Animated,
  Dimensions, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth, useAlert } from '@/template';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';

const { width, height } = Dimensions.get('window');
type Mode = 'landing' | 'login' | 'register' | 'otp' | 'forgot';

const FEATURE_SLIDES = [
  { icon: '🔴', title: 'Go Live Instantly', sub: 'Stream to millions. Earn diamonds every second.', color: Colors.live },
  { icon: '💎', title: 'Send & Earn Gifts', sub: 'Virtual gifts that convert to real money.', color: Colors.diamond },
  { icon: '⚔️', title: 'Epic PK Battles', sub: 'Challenge other hosts. Winner takes all.', color: Colors.primary },
  { icon: '👑', title: 'Become VIP', sub: 'Exclusive badges, perks, and privileges.', color: Colors.gold },
];

function FeatureSlide({ item, visible }: { item: typeof FEATURE_SLIDES[0]; visible: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: visible ? 1 : 0, duration: 400, useNativeDriver: true }).start();
  }, [visible]);
  return (
    <Animated.View style={[S.slideItem, { opacity: anim }]}>
      <View style={[S.slideIconWrap, { backgroundColor: item.color + '25', borderColor: item.color + '50' }]}>
        <Text style={{ fontSize: 36 }}>{item.icon}</Text>
      </View>
      <Text style={S.slideTitle}>{item.title}</Text>
      <Text style={S.slideSub}>{item.sub}</Text>
    </Animated.View>
  );
}

export default function LoginScreen() {
  const { sendOTP, verifyOTPAndLogin, signInWithPassword, signInWithGoogle, operationLoading } = useAuth();
  const { showAlert } = useAlert();

  const [mode, setMode] = useState<Mode>('landing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);
  const [agreed, setAgreed] = useState(false);

  const otpRefs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(60)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
    Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: -16, duration: 2400, useNativeDriver: true }),
      Animated.timing(floatAnim, { toValue: 0, duration: 2400, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
    ])).start();
    intervalRef.current = setInterval(() => setSlideIdx(i => (i + 1) % FEATURE_SLIDES.length), 3200);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const animateCard = () => {
    cardSlide.setValue(60); cardFade.setValue(0);
    Animated.parallel([
      Animated.spring(cardSlide, { toValue: 0, useNativeDriver: true, tension: 70, friction: 12 }),
      Animated.timing(cardFade, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  };

  const switchMode = (m: Mode) => { setMode(m); animateCard(); };

  // ── Login ──
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { showAlert('Missing Info', 'Please enter your email and password.'); return; }
    const { error } = await signInWithPassword(email.trim(), password);
    if (error) showAlert('Login Failed', error);
  };

  // ── Register: send OTP ──
  const handleSendOTP = async () => {
    if (!email.trim()) { showAlert('Missing Email', 'Enter your email first.'); return; }
    if (password.length < 6) { showAlert('Weak Password', 'Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { showAlert('Mismatch', 'Passwords do not match.'); return; }
    if (!agreed) { showAlert('Agreement Required', 'Please agree to the Terms of Service.'); return; }
    const { error } = await sendOTP(email.trim());
    if (error) { showAlert('Error', error); return; }
    setOtp(['', '', '', '']);
    switchMode('otp');
  };

  // ── Verify OTP ──
  const handleVerifyOTP = async () => {
    const code = otp.join('');
    if (code.length < 4) { showAlert('Invalid Code', 'Enter the 4-digit verification code.'); return; }
    const { error } = await verifyOTPAndLogin(email.trim(), code, { password });
    if (error) showAlert('Verification Failed', error);
  };

  const handleOTPInput = (val: string, idx: number) => {
    const newOtp = [...otp];
    newOtp[idx] = val.replace(/[^0-9]/g, '').slice(-1);
    setOtp(newOtp);
    if (val && idx < 3) otpRefs[idx + 1].current?.focus();
    if (!val && idx > 0) otpRefs[idx - 1].current?.focus();
  };

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] });

  // ── LANDING ──
  if (mode === 'landing') {
    return (
      <View style={S.root}>
        <StatusBar barStyle="light-content" />
        <Image source={require('@/assets/images/hero-live.png')} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        <LinearGradient
          colors={['rgba(5,0,14,0.35)', 'rgba(5,0,14,0.6)', 'rgba(5,0,14,0.97)']}
          locations={[0, 0.35, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Floating decorations */}
        {[
          { emoji: '💎', top: height * 0.08, left: 22, size: 28 },
          { emoji: '👑', top: height * 0.15, right: 28, size: 24 },
          { emoji: '🌟', top: height * 0.04, left: width * 0.45, size: 20 },
          { emoji: '🎁', top: height * 0.22, left: 50, size: 18 },
          { emoji: '🔴', top: height * 0.11, right: 70, size: 16 },
        ].map((d, i) => (
          <Animated.Text key={i} style={[S.floatDeco, { top: d.top, left: d.left, right: d.right as any, fontSize: d.size,
            transform: [{ translateY: floatAnim }], opacity: fadeAnim }]}>{d.emoji}</Animated.Text>
        ))}

        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={S.landingScroll} showsVerticalScrollIndicator={false}>
            {/* Logo */}
            <Animated.View style={[S.logoWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <Animated.View style={[S.logoBg, { opacity: glowOpacity, shadowOpacity: glowAnim }]}>
                <Text style={{ fontSize: 44 }}>🎬</Text>
              </Animated.View>
              <Text style={S.appName}>Sash<Text style={{ color: Colors.primary }}>Live</Text></Text>
              <Text style={S.appSlogan}>Live. Connect. Earn.</Text>
            </Animated.View>

            {/* Feature slide */}
            <Animated.View style={[S.featureCard, { opacity: fadeAnim }]}>
              {FEATURE_SLIDES.map((slide, i) => (
                <FeatureSlide key={i} item={slide} visible={i === slideIdx} />
              ))}
              <View style={S.slideDots}>
                {FEATURE_SLIDES.map((_, i) => (
                  <View key={i} style={[S.dot, i === slideIdx && S.dotActive]} />
                ))}
              </View>
            </Animated.View>

            {/* Stat row */}
            <Animated.View style={[S.statsRow, { opacity: fadeAnim }]}>
              {[{ val: '10M+', label: 'Users' }, { val: '50K+', label: 'Live Now' }, { val: '💵$1M+', label: 'Paid Out' }].map((s, i) => (
                <View key={i} style={S.statItem}>
                  <Text style={S.statVal}>{s.val}</Text>
                  <Text style={S.statLabel}>{s.label}</Text>
                </View>
              ))}
            </Animated.View>

            {/* CTA buttons */}
            <Animated.View style={[S.ctaBtns, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <Pressable style={S.ctaPrimary} onPress={() => switchMode('register')}>
                <LinearGradient colors={[Colors.primary, Colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.ctaGrad}>
                  <Text style={{ fontSize: 20 }}>🚀</Text>
                  <Text style={S.ctaPrimaryText}>Get Started Free</Text>
                </LinearGradient>
              </Pressable>
              <Pressable style={S.ctaSecondary} onPress={() => switchMode('login')}>
                <MaterialIcons name="login" size={18} color={Colors.textSecondary} />
                <Text style={S.ctaSecondaryText}>Sign In</Text>
              </Pressable>
            </Animated.View>

            {/* Social proof */}
            <Animated.View style={[S.socialProof, { opacity: fadeAnim }]}>
              <View style={S.avatarStack}>
                {['https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=60', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=60', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60'].map((uri, i) => (
                  <Image key={i} source={{ uri }} style={[S.proofAv, { marginLeft: i > 0 ? -10 : 0 }]} contentFit="cover" />
                ))}
              </View>
              <Text style={S.proofText}>Join 10M+ streamers worldwide</Text>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── AUTH SCREENS (login / register / otp / forgot) ──
  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" />
      <Image source={require('@/assets/images/hero-live.png')} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      <LinearGradient
        colors={['rgba(5,0,14,0.55)', 'rgba(5,0,14,0.92)', '#05000e']}
        locations={[0, 0.3, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={S.authScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Back button */}
            <Pressable style={S.backBtn} onPress={() => switchMode(mode === 'otp' ? 'register' : 'landing')}>
              <View style={S.backBtnInner}>
                <MaterialIcons name="arrow-back" size={20} color={Colors.textPrimary} />
              </View>
            </Pressable>

            {/* Logo mini */}
            <Animated.View style={[S.miniLogo, { opacity: fadeAnim }]}>
              <View style={S.miniLogoBg}><Text style={{ fontSize: 24 }}>🎬</Text></View>
              <Text style={S.miniAppName}>Sash<Text style={{ color: Colors.primary }}>Live</Text></Text>
            </Animated.View>

            {/* ── OTP Screen ── */}
            {mode === 'otp' && (
              <Animated.View style={[S.card, { opacity: cardFade, transform: [{ translateY: cardSlide }] }]}>
                <View style={S.otpTop}>
                  <View style={S.otpIconWrap}><Text style={{ fontSize: 44 }}>📧</Text></View>
                  <Text style={S.cardTitle}>Verify Your Email</Text>
                  <Text style={S.cardSub}>
                    We sent a 4-digit code to{'\n'}
                    <Text style={{ color: Colors.primary, fontWeight: FontWeight.bold }}>{email}</Text>
                  </Text>
                </View>

                {/* OTP boxes */}
                <View style={S.otpBoxes}>
                  {otp.map((digit, i) => (
                    <TextInput
                      key={i}
                      ref={otpRefs[i]}
                      style={[S.otpBox, digit && S.otpBoxFilled]}
                      value={digit}
                      onChangeText={v => handleOTPInput(v, i)}
                      keyboardType="number-pad"
                      maxLength={1}
                      textAlign="center"
                      selectionColor={Colors.primary}
                      autoFocus={i === 0}
                    />
                  ))}
                </View>

                <Pressable
                  style={[S.primaryBtn, (operationLoading || otp.join('').length < 4) && { opacity: 0.5 }]}
                  onPress={handleVerifyOTP}
                  disabled={operationLoading || otp.join('').length < 4}
                >
                  <LinearGradient colors={[Colors.primary, Colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.btnGrad}>
                    {operationLoading ? <Text style={S.primaryBtnText}>Verifying...</Text> : (
                      <><MaterialIcons name="check-circle" size={18} color="#FFF" /><Text style={S.primaryBtnText}>Verify & Create Account</Text></>
                    )}
                  </LinearGradient>
                </Pressable>

                <Pressable onPress={() => { setOtp(['', '', '', '']); handleSendOTP(); }}>
                  <Text style={S.resendText}>Didn't get the code? <Text style={{ color: Colors.primary }}>Resend</Text></Text>
                </Pressable>

                <View style={S.countdownRow}>
                  <MaterialIcons name="timer" size={13} color={Colors.textMuted} />
                  <Text style={S.countdownText}>Code expires in 60 min</Text>
                </View>
              </Animated.View>
            )}

            {/* ── LOGIN Screen ── */}
            {mode === 'login' && (
              <Animated.View style={[S.card, { opacity: cardFade, transform: [{ translateY: cardSlide }] }]}>
                <View style={S.cardHeader}>
                  <Text style={S.cardTitle}>Welcome Back 👋</Text>
                  <Text style={S.cardSub}>Sign in to continue your streaming journey</Text>
                </View>

                <View style={S.inputGroup}>
                  <Text style={S.inputLabel}>Email Address</Text>
                  <View style={S.inputWrap}>
                    <MaterialIcons name="email" size={18} color={Colors.primary} />
                    <TextInput style={S.input} placeholder="your@email.com" placeholderTextColor={Colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
                  </View>
                </View>

                <View style={S.inputGroup}>
                  <Text style={S.inputLabel}>Password</Text>
                  <View style={S.inputWrap}>
                    <MaterialIcons name="lock" size={18} color={Colors.primary} />
                    <TextInput style={S.input} placeholder="Enter your password" placeholderTextColor={Colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry={!showPass} autoCapitalize="none" />
                    <Pressable onPress={() => setShowPass(!showPass)} hitSlop={8}>
                      <MaterialIcons name={showPass ? 'visibility-off' : 'visibility'} size={18} color={Colors.textMuted} />
                    </Pressable>
                  </View>
                </View>

                <Pressable style={S.forgotRow} onPress={() => switchMode('forgot')}>
                  <Text style={S.forgotText}>Forgot Password?</Text>
                </Pressable>

                <Pressable style={[S.primaryBtn, operationLoading && { opacity: 0.5 }]} onPress={handleLogin} disabled={operationLoading}>
                  <LinearGradient colors={[Colors.primary, Colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.btnGrad}>
                    {operationLoading ? <Text style={S.primaryBtnText}>Signing in...</Text> : (
                      <><Text style={{ fontSize: 18 }}>🚀</Text><Text style={S.primaryBtnText}>Sign In</Text></>
                    )}
                  </LinearGradient>
                </Pressable>

                <View style={S.dividerRow}>
                  <View style={S.dividerLine} /><Text style={S.dividerText}>or</Text><View style={S.dividerLine} />
                </View>

                {/* Social login buttons */}
                <View style={S.socialBtns}>
                  <Pressable style={S.socialBtn} onPress={async () => {
                    const { error } = await signInWithGoogle();
                    if (error) showAlert('Google Sign-In Failed', error);
                  }} disabled={operationLoading}>
                    <Text style={{ fontSize: 20 }}>🔵</Text>
                    <Text style={S.socialBtnText}>Continue with Google</Text>
                  </Pressable>
                  <Pressable style={S.socialBtn} onPress={() => showAlert('Phone Login', 'Phone-based authentication coming soon! Use Email + Password for now.')}>
                    <MaterialIcons name="phone" size={20} color={Colors.success} />
                    <Text style={S.socialBtnText}>Continue with Phone</Text>
                  </Pressable>
                </View>

                <Pressable style={S.switchRow} onPress={() => switchMode('register')}>
                  <Text style={S.switchText}>Don't have an account? </Text>
                  <Text style={[S.switchText, { color: Colors.primary, fontWeight: FontWeight.bold }]}>Sign Up</Text>
                </Pressable>
              </Animated.View>
            )}

            {/* ── REGISTER Screen ── */}
            {mode === 'register' && (
              <Animated.View style={[S.card, { opacity: cardFade, transform: [{ translateY: cardSlide }] }]}>
                <View style={S.cardHeader}>
                  <Text style={S.cardTitle}>Join SashLive 🎬</Text>
                  <Text style={S.cardSub}>Create your account and start earning diamonds</Text>
                </View>

                {/* Email */}
                <View style={S.inputGroup}>
                  <Text style={S.inputLabel}>Email Address</Text>
                  <View style={S.inputWrap}>
                    <MaterialIcons name="email" size={18} color={Colors.primary} />
                    <TextInput style={S.input} placeholder="your@email.com" placeholderTextColor={Colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
                    {email.includes('@') && <MaterialIcons name="check-circle" size={16} color={Colors.success} />}
                  </View>
                </View>

                {/* Password */}
                <View style={S.inputGroup}>
                  <View style={S.inputLabelRow}>
                    <Text style={S.inputLabel}>Password</Text>
                    {password.length > 0 && (
                      <Text style={[S.passStrength, { color: password.length >= 10 ? Colors.success : password.length >= 6 ? Colors.gold : Colors.error }]}>
                        {password.length >= 10 ? '💪 Strong' : password.length >= 6 ? '👍 Good' : '⚠ Weak'}
                      </Text>
                    )}
                  </View>
                  <View style={S.inputWrap}>
                    <MaterialIcons name="lock" size={18} color={Colors.primary} />
                    <TextInput style={S.input} placeholder="Min 6 characters" placeholderTextColor={Colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry={!showPass} autoCapitalize="none" />
                    <Pressable onPress={() => setShowPass(!showPass)} hitSlop={8}>
                      <MaterialIcons name={showPass ? 'visibility-off' : 'visibility'} size={18} color={Colors.textMuted} />
                    </Pressable>
                  </View>
                </View>

                {/* Confirm Password */}
                <View style={S.inputGroup}>
                  <Text style={S.inputLabel}>Confirm Password</Text>
                  <View style={[S.inputWrap, confirmPassword.length > 0 && confirmPassword !== password && { borderColor: Colors.error + '60' }]}>
                    <MaterialIcons name="lock-outline" size={18} color={Colors.primary} />
                    <TextInput style={S.input} placeholder="Repeat your password" placeholderTextColor={Colors.textMuted} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirmPass} autoCapitalize="none" />
                    <Pressable onPress={() => setShowConfirmPass(!showConfirmPass)} hitSlop={8}>
                      <MaterialIcons name={showConfirmPass ? 'visibility-off' : 'visibility'} size={18} color={Colors.textMuted} />
                    </Pressable>
                  </View>
                  {confirmPassword.length > 0 && confirmPassword !== password && (
                    <Text style={S.errorMsg}>Passwords do not match</Text>
                  )}
                </View>

                {/* Terms agreement */}
                <Pressable style={S.agreeRow} onPress={() => setAgreed(!agreed)}>
                  <View style={[S.checkbox, agreed && S.checkboxChecked]}>
                    {agreed && <MaterialIcons name="check" size={13} color="#FFF" />}
                  </View>
                  <Text style={S.agreeText}>
                    I agree to the{' '}
                    <Text style={{ color: Colors.primary }}>Terms of Service</Text>
                    {' '}and{' '}
                    <Text style={{ color: Colors.primary }}>Privacy Policy</Text>
                  </Text>
                </Pressable>

                <Pressable
                  style={[S.primaryBtn, (operationLoading || !agreed || password !== confirmPassword) && { opacity: 0.5 }]}
                  onPress={handleSendOTP}
                  disabled={operationLoading || !agreed || password !== confirmPassword}
                >
                  <LinearGradient colors={[Colors.primary, Colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.btnGrad}>
                    {operationLoading ? <Text style={S.primaryBtnText}>Sending code...</Text> : (
                      <><Text style={{ fontSize: 18 }}>📧</Text><Text style={S.primaryBtnText}>Send Verification Code</Text></>
                    )}
                  </LinearGradient>
                </Pressable>

                {/* Perks row */}
                <View style={S.perksRow}>
                  {['🎁 Free gifts', '💎 Earn diamonds', '🔴 Go live now', '👑 VIP perks'].map((p, i) => (
                    <View key={i} style={S.perkChip}>
                      <Text style={S.perkText}>{p}</Text>
                    </View>
                  ))}
                </View>

                <Pressable style={S.switchRow} onPress={() => switchMode('login')}>
                  <Text style={S.switchText}>Already have an account? </Text>
                  <Text style={[S.switchText, { color: Colors.primary, fontWeight: FontWeight.bold }]}>Sign In</Text>
                </Pressable>
              </Animated.View>
            )}

            {/* ── FORGOT PASSWORD ── */}
            {mode === 'forgot' && (
              <Animated.View style={[S.card, { opacity: cardFade, transform: [{ translateY: cardSlide }] }]}>
                <View style={S.otpTop}>
                  <View style={[S.otpIconWrap, { backgroundColor: Colors.gold + '25' }]}><Text style={{ fontSize: 40 }}>🔑</Text></View>
                  <Text style={S.cardTitle}>Reset Password</Text>
                  <Text style={S.cardSub}>Enter your email and we will send you a reset code</Text>
                </View>
                <View style={S.inputGroup}>
                  <Text style={S.inputLabel}>Email Address</Text>
                  <View style={S.inputWrap}>
                    <MaterialIcons name="email" size={18} color={Colors.primary} />
                    <TextInput style={S.input} placeholder="your@email.com" placeholderTextColor={Colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                  </View>
                </View>
                <Pressable
                  style={[S.primaryBtn, !email.includes('@') && { opacity: 0.5 }]}
                  onPress={async () => {
                    if (!email.includes('@')) return;
                    const { error } = await sendOTP(email.trim());
                    if (error) { showAlert('Error', error); return; }
                    showAlert('Code Sent', `A reset code has been sent to ${email}`);
                    setOtp(['', '', '', '']);
                    switchMode('otp');
                  }}
                  disabled={!email.includes('@') || operationLoading}
                >
                  <LinearGradient colors={[Colors.gold, Colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.btnGrad}>
                    <Text style={S.primaryBtnText}>{operationLoading ? 'Sending...' : '📧 Send Reset Code'}</Text>
                  </LinearGradient>
                </Pressable>
                <Pressable style={S.switchRow} onPress={() => switchMode('login')}>
                  <Text style={[S.switchText, { color: Colors.primary }]}>← Back to Sign In</Text>
                </Pressable>
              </Animated.View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#05000e' },
  // Landing
  landingScroll: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.md },
  floatDeco: { position: 'absolute', zIndex: 10 },
  logoWrap: { alignItems: 'center', marginTop: Spacing.xxl, marginBottom: Spacing.xl, gap: Spacing.sm },
  logoBg: { width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.primary + '28', alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: Colors.primary + '60', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowRadius: 22, elevation: 14 },
  appName: { fontSize: 42, fontWeight: FontWeight.black, color: '#FFF', letterSpacing: -1.5 },
  appSlogan: { color: 'rgba(255,255,255,0.45)', fontSize: FontSize.md, letterSpacing: 2, textTransform: 'uppercase' },
  featureCard: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: Spacing.xl, marginBottom: Spacing.lg, minHeight: 160, alignItems: 'center', justifyContent: 'center' },
  slideItem: { alignItems: 'center', gap: Spacing.sm, position: 'absolute', width: '100%' },
  slideIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  slideTitle: { color: '#FFF', fontSize: FontSize.xl, fontWeight: FontWeight.bold, textAlign: 'center' },
  slideSub: { color: 'rgba(255,255,255,0.55)', fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  slideDots: { flexDirection: 'row', gap: 6, marginTop: 100 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { backgroundColor: Colors.primary, width: 18 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  statItem: { alignItems: 'center', gap: 3 },
  statVal: { color: '#FFF', fontSize: FontSize.xl, fontWeight: FontWeight.black },
  statLabel: { color: 'rgba(255,255,255,0.45)', fontSize: FontSize.xs },
  ctaBtns: { gap: Spacing.md, marginBottom: Spacing.lg },
  ctaPrimary: { borderRadius: BorderRadius.pill, overflow: 'hidden', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.55, shadowRadius: 18, elevation: 14 },
  ctaGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: Spacing.sm, borderRadius: BorderRadius.pill },
  ctaPrimaryText: { color: '#FFF', fontSize: FontSize.lg, fontWeight: FontWeight.black },
  ctaSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 14, borderRadius: BorderRadius.pill, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)' },
  ctaSecondaryText: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  socialProof: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.md },
  avatarStack: { flexDirection: 'row' },
  proofAv: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#05000e' },
  proofText: { color: 'rgba(255,255,255,0.45)', fontSize: FontSize.xs },
  // Auth screens
  authScroll: { flexGrow: 1, paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
  backBtn: { marginTop: Spacing.sm, marginBottom: Spacing.xs },
  backBtnInner: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  miniLogo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, justifyContent: 'center', marginBottom: Spacing.lg },
  miniLogoBg: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary + '28', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.primary + '50' },
  miniAppName: { fontSize: 24, fontWeight: FontWeight.black, color: '#FFF' },
  card: { backgroundColor: 'rgba(15,0,26,0.93)', borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)', padding: Spacing.lg, gap: Spacing.md, marginBottom: Spacing.md },
  cardHeader: { gap: 5 },
  cardTitle: { color: '#FFF', fontSize: FontSize.xxl, fontWeight: FontWeight.black },
  cardSub: { color: 'rgba(255,255,255,0.5)', fontSize: FontSize.sm, lineHeight: 20 },
  inputGroup: { gap: 6 },
  inputLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inputLabel: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.xs, fontWeight: FontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.8 },
  passStrength: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, borderWidth: 1, borderColor: 'rgba(124,58,237,0.4)' },
  input: { flex: 1, color: '#FFF', fontSize: FontSize.md, paddingVertical: 4 },
  forgotRow: { alignItems: 'flex-end', marginTop: -6 },
  forgotText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  primaryBtn: { borderRadius: BorderRadius.pill, overflow: 'hidden', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 14, elevation: 10 },
  btnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8, borderRadius: BorderRadius.pill },
  primaryBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.black },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  dividerText: { color: 'rgba(255,255,255,0.35)', fontSize: FontSize.xs },
  socialBtns: { gap: Spacing.sm },
  socialBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 13, borderRadius: BorderRadius.pill, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  socialBtnText: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xs },
  switchText: { color: 'rgba(255,255,255,0.5)', fontSize: FontSize.sm },
  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  agreeText: { flex: 1, color: 'rgba(255,255,255,0.55)', fontSize: FontSize.xs, lineHeight: 18 },
  errorMsg: { color: Colors.error, fontSize: FontSize.xs, marginTop: 2 },
  perksRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  perkChip: { backgroundColor: 'rgba(124,58,237,0.2)', borderRadius: BorderRadius.pill, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(124,58,237,0.4)' },
  perkText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: FontWeight.semibold },
  // OTP
  otpTop: { alignItems: 'center', gap: Spacing.sm },
  otpIconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.primary + '25', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.primary + '50' },
  otpBoxes: { flexDirection: 'row', gap: Spacing.md, justifyContent: 'center' },
  otpBox: { width: 60, height: 70, borderRadius: BorderRadius.lg, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 2, borderColor: 'rgba(124,58,237,0.4)', color: '#FFF', fontSize: 28, fontWeight: FontWeight.black, textAlign: 'center' },
  otpBoxFilled: { borderColor: Colors.primary, backgroundColor: Colors.primary + '18' },
  resendText: { color: 'rgba(255,255,255,0.5)', fontSize: FontSize.sm, textAlign: 'center' },
  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 5, justifyContent: 'center' },
  countdownText: { color: 'rgba(255,255,255,0.35)', fontSize: FontSize.xs },
});
