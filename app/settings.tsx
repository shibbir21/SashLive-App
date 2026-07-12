// SashLive — Settings Screen (Light Theme)
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { useAlert } from '@/template';
import { useAuth } from '@/template';

export default function SettingsScreen() {
  const router = useRouter();
  const { currentUser } = useApp();
  const { showAlert } = useAlert();
  const { logout } = useAuth();

  const [notifLive, setNotifLive] = useState(currentUser.notif_live ?? true);
  const [notifGifts, setNotifGifts] = useState(currentUser.notif_gifts ?? true);
  const [notifFollows, setNotifFollows] = useState(currentUser.notif_follows ?? true);
  const [notifMessages, setNotifMessages] = useState(currentUser.notif_messages ?? true);
  const [showOnline, setShowOnline] = useState(currentUser.show_online ?? true);
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = () => {
    showAlert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const sections = [
    {
      title: 'Account',
      items: [
        { icon: '✏️', label: 'Edit Profile', onPress: () => router.push('/edit-profile' as any), color: Colors.primary },
        { icon: '🔒', label: 'Change Password', onPress: () => showAlert('Change Password', 'A reset link will be sent to your email.'), color: Colors.secondary },
        { icon: '📱', label: 'Linked Accounts', onPress: () => showAlert('Linked Accounts', 'Google sign-in is linked to your account.'), color: '#4285F4' },
        { icon: '🛡️', label: 'Privacy & Safety', onPress: () => showAlert('Privacy', 'Your data is protected and never sold.'), color: Colors.success },
      ],
    },
    {
      title: 'Notifications',
      items: [
        { icon: '🔴', label: 'Live Streams', toggle: true, value: notifLive, onToggle: setNotifLive, color: Colors.live },
        { icon: '🎁', label: 'Gift Alerts', toggle: true, value: notifGifts, onToggle: setNotifGifts, color: Colors.primary },
        { icon: '👥', label: 'New Followers', toggle: true, value: notifFollows, onToggle: setNotifFollows, color: Colors.secondary },
        { icon: '💬', label: 'Messages', toggle: true, value: notifMessages, onToggle: setNotifMessages, color: '#0EA5E9' },
      ],
    },
    {
      title: 'Privacy',
      items: [
        { icon: '👁', label: 'Show Online Status', toggle: true, value: showOnline, onToggle: setShowOnline, color: Colors.success },
        { icon: '🚫', label: 'Blocked Users', onPress: () => showAlert('Blocked Users', 'You have not blocked anyone yet.'), color: Colors.error },
      ],
    },
    {
      title: 'App',
      items: [
        { icon: '🌐', label: 'Language', sub: 'English', onPress: () => showAlert('Language', 'More languages coming soon!'), color: '#6366F1' },
        { icon: '🔔', label: 'Notification Sound', onPress: () => showAlert('Sound', 'System sound settings.'), color: Colors.gold },
        { icon: '📊', label: 'Data Usage', onPress: () => showAlert('Data Usage', 'Video quality and bandwidth settings.'), color: Colors.secondary },
        { icon: 'ℹ️', label: 'App Version', sub: '1.0.0 (Build 100)', onPress: () => {}, color: Colors.textMuted },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: '❓', label: 'Help & FAQ', onPress: () => showAlert('Help', 'Visit our help center for support.'), color: '#0EA5E9' },
        { icon: '📧', label: 'Contact Support', onPress: () => showAlert('Contact', 'Email: support@sashlive.com'), color: Colors.primary },
        { icon: '📋', label: 'Terms of Service', onPress: () => showAlert('Terms', 'View our full terms at sashlive.com/terms'), color: Colors.textMuted },
        { icon: '🔏', label: 'Privacy Policy', onPress: () => showAlert('Privacy Policy', 'View our policy at sashlive.com/privacy'), color: Colors.textMuted },
      ],
    },
    {
      title: 'Danger Zone',
      items: [
        { icon: '🚪', label: 'Sign Out', onPress: handleLogout, color: Colors.error, danger: true },
        { icon: '❌', label: 'Delete Account', onPress: () => showAlert('Delete Account', 'This action is irreversible. Contact support to proceed.', [{ text: 'Contact Support', onPress: () => {} }, { text: 'Cancel', style: 'cancel' }]), color: Colors.error, danger: true },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        {sections.map((section, si) => (
          <View key={si} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item: any, ii) => (
                <Pressable
                  key={ii}
                  style={[
                    styles.item,
                    ii < section.items.length - 1 && styles.itemBorder,
                    item.danger && styles.itemDanger,
                  ]}
                  onPress={item.onPress}
                  disabled={item.toggle}
                >
                  <View style={[styles.itemIcon, { backgroundColor: (item.color || Colors.primary) + '15' }]}>
                    <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemLabel, item.danger && { color: Colors.error }]}>{item.label}</Text>
                    {item.sub ? <Text style={styles.itemSub}>{item.sub}</Text> : null}
                  </View>
                  {item.toggle ? (
                    <Switch
                      value={item.value}
                      onValueChange={item.onToggle}
                      trackColor={{ false: Colors.cardBorder, true: item.color + '60' }}
                      thumbColor={item.value ? item.color : '#FFF'}
                      ios_backgroundColor={Colors.cardBorder}
                    />
                  ) : (
                    <MaterialIcons name="chevron-right" size={18} color={item.danger ? Colors.error : Colors.textMuted} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold, textAlign: 'center' },
  section: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  sectionTitle: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.semibold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.xs },
  sectionCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.cardBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 13, gap: Spacing.sm },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  itemDanger: { backgroundColor: Colors.error + '05' },
  itemIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  itemLabel: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  itemSub: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 1 },
});
