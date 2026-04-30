// SashLive — Complete Push Notifications System
import { useEffect, useRef, useCallback } from 'react';
import { Platform, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { getSupabaseClient } from '@/template';
import { fetchPendingPKInvites } from '@/services/pkService';

// ── Configure global notification handler ──
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Daily task reminder time (20:00 device local time) ──
const DAILY_REMINDER_HOUR = 20;
const PK_POLL_INTERVAL_MS = 12000; // Check PK invites every 12s

export function usePushNotifications(userId?: string) {
  const router = useRouter();
  const notifListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const pkPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPKIds = useRef<Set<string>>(new Set());
  const taskReminderScheduled = useRef(false);

  // ── Register token ──
  useEffect(() => {
    if (!userId) return;
    registerAndSaveToken(userId);
    scheduleTaskReminder();

    // Listen for foreground notifications
    notifListener.current = Notifications.addNotificationReceivedListener(n => {
      // Notifications display automatically; no action needed
    });

    // Handle notification tap → navigate
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as any;
      if (data?.screen) {
        try { router.push(data.screen as any); } catch (_) {}
      }
    });

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [userId]);

  // ── Poll for PK battle invites ──
  useEffect(() => {
    if (!userId) return;

    const checkPKInvites = async () => {
      const { data } = await fetchPendingPKInvites(userId);
      if (!data?.length) return;
      for (const invite of data) {
        if (!lastPKIds.current.has(invite.id)) {
          lastPKIds.current.add(invite.id);
          await sendPKChallengeNotification(invite.challenger_name || 'Someone');
        }
      }
    };

    pkPollRef.current = setInterval(checkPKInvites, PK_POLL_INTERVAL_MS);
    return () => { if (pkPollRef.current) clearInterval(pkPollRef.current); };
  }, [userId]);

  return {
    sendGiftNotification: useCallback((senderName: string, giftName: string, giftIcon: string, diamonds: number) =>
      sendGiftNotification(senderName, giftName, giftIcon, diamonds), []),
    sendFollowNotification: useCallback((followerName: string, uid: string) =>
      sendFollowNotification(followerName, uid), []),
    sendPKNotification: useCallback((challengerName: string) =>
      sendPKChallengeNotification(challengerName), []),
    sendLiveNotification: useCallback((hostName: string, hostId: string) =>
      sendLiveNotification(hostName, hostId), []),
    sendMessageNotification: useCallback((sender: string, preview: string, convId: string) =>
      sendMessageNotification(sender, preview, convId), []),
  };
}

// ── Register device for push notifications ──
async function registerAndSaveToken(userId: string): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('sashlive-default', {
      name: 'SashLive',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E91E8C',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('sashlive-gifts', {
      name: 'Gifts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 100, 100, 100],
      lightColor: '#FFD700',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('sashlive-pk', {
      name: 'PK Battles',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: '#7C3AED',
      sound: 'default',
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: 'sashlive' });
    const token = tokenData.data;

    // Persist token in DB
    const supabase = getSupabaseClient();
    await supabase
      .from('push_tokens')
      .upsert({ user_id: userId, token, platform: Platform.OS }, { onConflict: 'user_id,token' });

    return token;
  } catch (e) {
    return null;
  }
}

// ── Schedule daily task reminder at 20:00 local time ──
async function scheduleTaskReminder() {
  // Cancel existing reminders first
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const existing = scheduled.find(n => n.identifier?.startsWith('daily_task_reminder'));
  if (existing) return; // Already scheduled

  const now = new Date();
  const trigger = new Date();
  trigger.setHours(DAILY_REMINDER_HOUR, 0, 0, 0);
  if (trigger <= now) trigger.setDate(trigger.getDate() + 1); // Next day if already past

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: `daily_task_reminder_${Date.now()}`,
      content: {
        title: '🎯 Daily Tasks Reminder!',
        body: 'You have unclaimed task rewards. Claim before midnight!',
        data: { type: 'daily_tasks', screen: '/daily-tasks' },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: DAILY_REMINDER_HOUR,
        minute: 0,
      },
    });
  } catch (e) {
    // Triggers not supported in Expo Go; silently skip
  }
}

// ── Local notification helpers (exported for use throughout app) ──

export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  channelId?: string,
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
        ...(Platform.OS === 'android' && channelId ? { channelId } : {}),
      },
      trigger: null,
    });
  } catch (e) {
    // Silently ignore if permissions not granted
  }
}

export async function sendGiftNotification(
  senderName: string,
  giftName: string,
  giftIcon: string,
  diamonds: number,
): Promise<void> {
  await sendLocalNotification(
    `${giftIcon} Gift Received! +${diamonds}💎`,
    `${senderName} sent you a ${giftName}`,
    { type: 'gift', screen: '/wallet' },
    'sashlive-gifts',
  );
}

export async function sendFollowNotification(followerName: string, userId: string): Promise<void> {
  await sendLocalNotification(
    '👥 New Follower!',
    `${followerName} started following you`,
    { type: 'follow', screen: `/user/${userId}` },
  );
}

export async function sendPKChallengeNotification(challengerName: string): Promise<void> {
  await sendLocalNotification(
    '⚔️ PK Battle Challenge!',
    `${challengerName} challenged you to a live PK battle!`,
    { type: 'pk', screen: '/live/room002' },
    'sashlive-pk',
  );
}

export async function sendLiveNotification(hostName: string, hostId: string): Promise<void> {
  await sendLocalNotification(
    '🔴 Live Now!',
    `${hostName} just started a live stream`,
    { type: 'live', screen: `/live/${hostId}` },
  );
}

export async function sendMessageNotification(
  senderName: string,
  messagePreview: string,
  convId: string,
): Promise<void> {
  await sendLocalNotification(
    `💬 ${senderName}`,
    messagePreview,
    { type: 'message', screen: `/chat/${convId}` },
  );
}

export async function sendTaskReminderNotification(): Promise<void> {
  await sendLocalNotification(
    '🎯 Daily Tasks Reminder!',
    'Complete tasks before midnight to claim your rewards!',
    { type: 'daily_tasks', screen: '/daily-tasks' },
  );
}

export async function sendTreasureBoxNotification(): Promise<void> {
  await sendLocalNotification(
    '📦 Treasure Box Ready!',
    'A treasure box is waiting! Open it to earn free S-Coins.',
    { type: 'treasure', screen: '/(tabs)' },
  );
}
