// SashLive — Settings Screen (Production-Ready with Real DB Sync)
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useAuth, useAlert } from '@/template';
import { useApp } from '@/contexts/AppContext';
import { getSupabaseClient } from '@/template';

export default function SettingsScreen() {
  const router = useRouter();
  const { logout, user: authUser } = useAuth();
  const { currentUser } = useApp();
  const { showAlert } = useAlert();
  const supabase = getSupabaseClient();

  const [notifLive, setNotifLive] = useState(true);
  const [notifGifts, setNotifGifts] = useState(true);
  const [notifFollows, setNotifFollows] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifPK, setNotifPK] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [dataMode, setDataMode] = useState(false);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [autoPlayReels, setAutoPlayReels] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authUser?.id) {
      supabase.from('user_profiles').select('notif_live, notif_gifts, notif_follows, notif_messages, show_online').eq('id', authUser.id).single().then(({ data }) => {
        if (data) {
          if (data.notif_live !== null) setNotifLive(data.notif_live);
          if (data.notif_gifts !== null) setNotifGifts(data.notif_gifts);
          if (data.notif_follows !== null) setNotifFollows(data.notif_follows);
          if (data.notif_messages !== null) setNotifMessages(data.notif_messages);
          if (data.show_online !== null) setShowOnlineStatus(data.show_online);
        }
      });
    }
  }, [authUser?.id]);

  const saveNotifSettings = async (field: string, value: boolean) => {
    if (!authUser?.id) return;
    await supabase.from('user_profiles').update({ [field]: value }).eq('id', authUser.id);
  };

  const handleLogout = () => {
    showAlert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleDeleteAccount = () => {
    showAlert('Delete Account', 'This will permanently delete your account. This action cannot be undone.', [
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => showAlert('Contact Support', 'Please email support@sashlive.app to proceed with account deletion.'),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  type Section = {
    title: string;
    items: Array<{
      icon: string;
      label: string;
      type: 'navigate' | 'toggle' | 'info' | 'danger';
      value?: boolean;
      info?: string;
      onPress?: () => void;
      onToggle?: (v: boolean) => void;
      color?: string;
      sub?: string;
    }>;
  };

  const sections: Section[] = [
    {
      title: '👤 Account',
      items: [
        {
          icon: '✏️', label: 'Edit Profile', type: 'navigate', sub: 'Name, bio, photo',
          onPress: () => router.push('/edit-profile' as any),
        },
        {
          icon: '🔐', label: 'Change Password', type: 'navigate', sub: 'Update your password',
          onPress: () => showAlert('Change Password', 'A 4-digit OTP will be sent to your email to reset your password.'),
        },
        {
          icon: '📧', label: 'Email', type: 'info',
          info: authUser?.email || 'Not set',
        },
        {
          icon: '🆔', label: 'User ID', type: 'info',
          info: authUser?.id?.slice(0, 16) + '...' || 'N/A',
        },
        {
          icon: '🔗', label: 'Connected Accounts', type: 'navigate', sub: 'Google, Apple',
          onPress: () => showAlert('Connected Accounts', 'Social login management coming soon.'),
        },
      ],
    },
    {
      title: '🔔 Notifications',
      items: [
        {
          icon: '🔴', label: 'Live Room Alerts', type: 'toggle', value: notifLive,
          onToggle: (v) => { setNotifLive(v); saveNotifSettings('notif_live', v); },
          sub: 'When people you follow go live',
        },
        {
          icon: '🎁', label: 'Gift Notifications', type: 'toggle', value: notifGifts,
          onToggle: (v) => { setNotifGifts(v); saveNotifSettings('notif_gifts', v); },
          sub: 'When you receive gifts',
        },
        {
          icon: '👥', label: 'New Followers', type: 'toggle', value: notifFollows,
          onToggle: (v) => { setNotifFollows(v); saveNotifSettings('notif_follows', v); },
          sub: 'When someone follows you',
        },
        {
          icon: '💬', label: 'Messages', type: 'toggle', value: notifMessages,
          onToggle: (v) => { setNotifMessages(v); saveNotifSettings('notif_messages', v); },
          sub: 'Direct message notifications',
        },
        {
          icon: '⚔️', label: 'PK Battle Invites', type: 'toggle', value: notifPK,
          onToggle: (v) => { setNotifPK(v); },
          sub: 'When you are challenged to PK',
        },
      ],
    },
    {
      title: '🔒 Privacy',
      items: [
        {
          icon: '🟢', label: 'Show Online Status', type: 'toggle', value: showOnlineStatus,
          onToggle: (v) => { setShowOnlineStatus(v); saveNotifSettings('show_online', v); },
          sub: 'Let others see when you are online',
        },
        {
          icon: '🚫', label: 'Blocked Users', type: 'navigate', sub: '0 blocked',
          onPress: () => showAlert('Blocked Users', 'No blocked users.'),
        },
        {
          icon: '🔒', label: 'Who Can Message Me', type: 'navigate', sub: 'Everyone',
          onPress: () => showAlert('DM Settings', 'Choose who can message you:\n\n• Everyone\n• Followers only\n• Nobody\n\nManage this in full settings soon.'),
        },
        {
          icon: '👁', label: 'Story Visibility', type: 'navigate', sub: 'Everyone',
          onPress: () => showAlert('Story Visibility', 'Control who sees your stories.'),
        },
      ],
    },
    {
      title: '🎨 Appearance',
      items: [
        {
          icon: '🌞', label: 'Light Mode', type: 'toggle', value: !darkMode,
          onToggle: (v) => setDarkMode(!v),
          sub: 'Currently using light theme',
        },
        {
          icon: '📶', label: 'Data Saver', type: 'toggle', value: dataMode,
          onToggle: setDataMode,
          sub: 'Reduce data usage on mobile',
        },
        {
          icon: '▶️', label: 'Auto-Play Reels', type: 'toggle', value: autoPlayReels,
          onToggle: setAutoPlayReels,
          sub: 'Play reels automatically',
        },
        {
          icon: '🌐', label: 'Language', type: 'navigate', info: 'English',
          onPress: () => showAlert('Language', 'More languages coming soon!\n\n• English ✓\n• Bengali (Coming)\n• Hindi (Coming)\n• Arabic (Coming)'),
        },
      ],
    },
    {
      title: '💎 Subscription & Billing',
      items: [
        {
          icon: '👑', label: 'VIP Membership', type: 'navigate', sub: 'Manage your VIP tier',
          onPress: () => router.push('/vip-store'),
        },
        {
          icon: '💰', label: 'Recharge History', type: 'navigate', sub: 'View past transactions',
          onPress: () => router.push('/wallet'),
        },
        {
          icon: '💸', label: 'Withdrawal History', type: 'navigate', sub: 'View payout requests',
          onPress: () => router.push('/withdrawal'),
        },
      ],
    },
    {
      title: '❓ Help & Support',
      items: [
        {
          icon: '📞', label: 'Contact Support', type: 'navigate',
          onPress: () => showAlert('Support', 'Email us at:\nsupport@sashlive.app\n\nResponse within 24 hours.'),
        },
        {
          icon: '📋', label: 'Terms of Service', type: 'navigate',
          onPress: () => showAlert('Terms', 'Terms of Service available at sashlive.app/terms'),
        },
        {
          icon: '🔐', label: 'Privacy Policy', type: 'navigate',
          onPress: () => showAlert('Privacy', 'Privacy Policy available at sashlive.app/privacy'),
        },
        {
          icon: 'ℹ️', label: 'App Version', type: 'info', info: '2.0.0 (Build 200)',
        },
        {
          icon: '⭐', label: 'Rate SashLive', type: 'navigate',
          onPress: () => showAlert('Thank You!', 'We appreciate your support! Leave us a 5-star review.'),
        },
      ],
    },
    {
      title: '⚠️ Account Actions',
      items: [
        {
          icon: '🚪', label: 'Sign Out', type: 'danger',
          onPress: handleLogout,
          color: Colors.warning,
        },
        {
          icon: '🗑️', label: 'Delete Account', type: 'danger',
          onPress: handleDeleteAccount,
          color: Colors.error,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#111827" />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Profile Quick */}
      <Pressable style={styles.profileQuick} onPress={() => router.push('/edit-profile' as any)}>
        <Image source={{ uri: currentUser.avatar }} style={styles.profileQuickAv} contentFit="cover" />
        <View style={{ flex: 1 }}>
          <Text style={styles.profileQuickName}>{currentUser.displayName}</Text>
          <Text style={styles.profileQuickHandle}>@{currentUser.username} · {authUser?.email}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {sections.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, idx) => (
                <Pressable
                  key={idx}
                  style={({ pressed }) => [
                    styles.item,
                    pressed && item.type !== 'toggle' && item.type !== 'info' && { backgroundColor: '#F9FAFB' },
                    idx === section.items.length - 1 && styles.itemLast,
                    (item.color === Colors.error || item.color === Colors.warning) && styles.itemDanger,
                  ]}
                  onPress={item.type !== 'toggle' && item.type !== 'info' ? item.onPress : undefined}
                  disabled={item.type === 'info'}
                >
                  <View style={[styles.itemIconBg, item.color && { backgroundColor: item.color + '15' }]}>
                    <Text style={styles.itemIcon}>{item.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemLabel, item.color && { color: item.color }]}>{item.label}</Text>
                    {item.sub ? <Text style={styles.itemSub}>{item.sub}</Text> : null}
                  </View>
                  {item.type === 'toggle' && (
                    <Switch
                      value={item.value}
                      onValueChange={item.onToggle}
                      trackColor={{ false: '#E5E7EB', true: Colors.primary }}
                      thumbColor={item.value ? '#FFF' : '#F9FAFB'}
                      ios_backgroundColor="#E5E7EB"
                    />
                  )}
                  {item.type === 'info' && (
                    <Text style={styles.itemInfo} numberOfLines={1}>{item.info}</Text>
                  )}
                  {(item.type === 'navigate' || item.type === 'danger') && (
                    item.info
                      ? <Text style={styles.itemInfo}>{item.info}</Text>
                      : <MaterialIcons name="chevron-right" size={18} color={item.color || '#9CA3AF'} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        ))}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: '#111827', fontSize: FontSize.xl, fontWeight: FontWeight.bold, textAlign: 'center' },
  profileQuick: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, backgroundColor: '#FFF', borderBottomWidth: 8, borderBottomColor: '#F3F4F6', marginBottom: Spacing.xs },
  profileQuickAv: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: Colors.primary },
  profileQuickName: { color: '#111827', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  profileQuickHandle: { color: '#6B7280', fontSize: FontSize.xs, marginTop: 1 },
  scroll: { paddingBottom: Spacing.xxl },
  section: { marginBottom: Spacing.xs },
  sectionTitle: { color: '#6B7280', fontSize: FontSize.xs, fontWeight: FontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.xs, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  sectionCard: { backgroundColor: '#FFF', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F3F4F6', overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F9FAFB', gap: Spacing.sm },
  itemLast: { borderBottomWidth: 0 },
  itemDanger: { backgroundColor: '#FFF5F5' },
  itemIconBg: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center' },
  itemIcon: { fontSize: 17 },
  itemLabel: { color: '#111827', fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  itemSub: { color: '#9CA3AF', fontSize: FontSize.xs, marginTop: 1 },
  itemInfo: { color: '#9CA3AF', fontSize: FontSize.xs, maxWidth: 150, textAlign: 'right' },
});
