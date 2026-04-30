// SashLive — Settings Screen
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useAuth, useAlert } from '@/template';
import { useApp } from '@/contexts/AppContext';

type SettingsSection = {
  title: string;
  items: SettingsItem[];
};
type SettingsItem = {
  icon: string;
  label: string;
  type: 'navigate' | 'toggle' | 'info' | 'danger';
  value?: boolean;
  info?: string;
  onPress?: () => void;
  onToggle?: (v: boolean) => void;
  color?: string;
};

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const { currentUser } = useApp();
  const { showAlert } = useAlert();

  const [notifLive, setNotifLive] = useState(true);
  const [notifGifts, setNotifGifts] = useState(true);
  const [notifFollows, setNotifFollows] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [dataMode, setDataMode] = useState(false);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);

  const handleLogout = () => {
    showAlert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleDeleteAccount = () => {
    showAlert('Delete Account', 'This will permanently delete your account and all data. This action cannot be undone.', [
      { text: 'Delete', style: 'destructive', onPress: () => showAlert('Contact Support', 'Please email support@sashlive.app to delete your account.') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const sections: SettingsSection[] = [
    {
      title: 'Account',
      items: [
        { icon: '👤', label: 'Edit Profile',          type: 'navigate', onPress: () => showAlert('Edit Profile', 'Coming soon!') },
        { icon: '🔐', label: 'Change Password',       type: 'navigate', onPress: () => showAlert('Password', 'A reset link will be sent to your email.') },
        { icon: '📧', label: 'Email',                 type: 'info',     info: currentUser.id, color: Colors.textMuted },
        { icon: '🆔', label: 'User ID',               type: 'info',     info: currentUser.id, color: Colors.textMuted },
        { icon: '🔗', label: 'Connect Google',        type: 'navigate', onPress: () => showAlert('Google', 'Google account linking coming soon!') },
      ],
    },
    {
      title: 'Notifications',
      items: [
        { icon: '🔴', label: 'Live Room Alerts',    type: 'toggle', value: notifLive,     onToggle: setNotifLive },
        { icon: '🎁', label: 'Gift Notifications',  type: 'toggle', value: notifGifts,    onToggle: setNotifGifts },
        { icon: '👥', label: 'New Followers',       type: 'toggle', value: notifFollows,  onToggle: setNotifFollows },
        { icon: '💬', label: 'Messages',            type: 'toggle', value: notifMessages, onToggle: setNotifMessages },
      ],
    },
    {
      title: 'Privacy',
      items: [
        { icon: '🟢', label: 'Show Online Status',  type: 'toggle', value: showOnlineStatus, onToggle: setShowOnlineStatus },
        { icon: '🚫', label: 'Blocked Users',       type: 'navigate', onPress: () => showAlert('Blocked Users', `${currentUser.blockedCount} blocked users`) },
        { icon: '🔒', label: 'Who Can DM Me',       type: 'navigate', onPress: () => showAlert('DM Settings', 'Choose who can message you.') },
        { icon: '📍', label: 'Location Services',   type: 'navigate', onPress: () => showAlert('Location', 'Manage location permissions in device settings.') },
      ],
    },
    {
      title: 'Appearance & Data',
      items: [
        { icon: '🌙', label: 'Dark Mode',          type: 'toggle',   value: darkMode,  onToggle: setDarkMode },
        { icon: '📶', label: 'Data Saver Mode',    type: 'toggle',   value: dataMode,  onToggle: setDataMode },
        { icon: '🌐', label: 'Language',           type: 'navigate', onPress: () => showAlert('Language', 'More languages coming soon!'), info: 'English' },
        { icon: '🔔', label: 'Sound Effects',      type: 'navigate', onPress: () => {} },
      ],
    },
    {
      title: 'Support & Legal',
      items: [
        { icon: '📞', label: 'Contact Support',     type: 'navigate', onPress: () => showAlert('Support', 'Email: support@sashlive.app') },
        { icon: '📋', label: 'Terms of Service',    type: 'navigate', onPress: () => showAlert('Terms', 'Terms of Service available at sashlive.app/terms') },
        { icon: '🔐', label: 'Privacy Policy',      type: 'navigate', onPress: () => showAlert('Privacy', 'Privacy Policy available at sashlive.app/privacy') },
        { icon: 'ℹ️', label: 'App Version',         type: 'info',     info: '1.0.0 (Build 100)' },
      ],
    },
    {
      title: 'Danger Zone',
      items: [
        { icon: '🚪', label: 'Sign Out',       type: 'danger', onPress: handleLogout,       color: Colors.warning },
        { icon: '🗑️', label: 'Delete Account', type: 'danger', onPress: handleDeleteAccount, color: Colors.error },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {sections.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, idx) => (
                <Pressable
                  key={idx}
                  style={({ pressed }) => [styles.item, pressed && item.type !== 'toggle' && { opacity: 0.7 }, idx === section.items.length - 1 && styles.itemLast]}
                  onPress={item.type !== 'toggle' ? item.onPress : undefined}
                  disabled={item.type === 'info'}
                >
                  <Text style={styles.itemIcon}>{item.icon}</Text>
                  <Text style={[styles.itemLabel, item.color && { color: item.color }]}>{item.label}</Text>
                  {item.type === 'toggle' && (
                    <Switch
                      value={item.value}
                      onValueChange={item.onToggle}
                      trackColor={{ false: Colors.cardBorder, true: Colors.primary }}
                      thumbColor={item.value ? '#FFF' : Colors.textMuted}
                      ios_backgroundColor={Colors.cardBorder}
                    />
                  )}
                  {item.type === 'info' && <Text style={styles.itemInfo}>{item.info}</Text>}
                  {(item.type === 'navigate' || item.type === 'danger') && (
                    item.info
                      ? <Text style={styles.itemInfo}>{item.info}</Text>
                      : <MaterialIcons name="chevron-right" size={18} color={item.color || Colors.textMuted} />
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
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  title: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  scroll: { padding: Spacing.md },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.semibold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.xs, marginLeft: 4 },
  sectionCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.cardBorder, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder, gap: Spacing.sm },
  itemLast: { borderBottomWidth: 0 },
  itemIcon: { fontSize: 18, width: 28 },
  itemLabel: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.sm },
  itemInfo: { color: Colors.textMuted, fontSize: FontSize.xs, maxWidth: 140, textAlign: 'right' },
});
