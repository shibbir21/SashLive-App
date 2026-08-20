// SashLive — Push Notification Service: call edge function to send real push to other users
import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';

const supabase = getSupabaseClient();

interface PushOptions {
  targetUserId?: string;
  targetUserIds?: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  channelId?: string;
}

async function sendServerPush(opts: PushOptions): Promise<{ sent: number; error: string | null }> {
  const { data, error } = await supabase.functions.invoke('send-push', {
    body: {
      target_user_id: opts.targetUserId,
      target_user_ids: opts.targetUserIds,
      title: opts.title,
      body: opts.body,
      data: opts.data,
      channel_id: opts.channelId,
    },
  });

  if (error) {
    let msg = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const text = await error.context?.text();
        msg = `[${error.context?.status ?? 500}] ${text || msg}`;
      } catch (_) {}
    }
    console.warn('send-push error:', msg);
    return { sent: 0, error: msg };
  }

  return { sent: data?.sent ?? 0, error: null };
}

// ── Gift received notification ──
export async function notifyGiftReceived(
  hostUserId: string,
  senderName: string,
  giftName: string,
  giftIcon: string,
  diamonds: number,
): Promise<void> {
  await sendServerPush({
    targetUserId: hostUserId,
    title: `${giftIcon} Gift Received! +${diamonds}💎`,
    body: `${senderName} sent you a ${giftName}`,
    data: { type: 'gift', screen: '/wallet' },
    channelId: 'sashlive-gifts',
  });
}

// ── New follower notification ──
export async function notifyNewFollower(
  targetUserId: string,
  followerName: string,
  followerId: string,
): Promise<void> {
  await sendServerPush({
    targetUserId,
    title: '👥 New Follower!',
    body: `${followerName} started following you`,
    data: { type: 'follow', screen: `/user/${followerId}` },
  });
}

// ── PK Battle challenge notification ──
export async function notifyPKChallenge(
  targetUserId: string,
  challengerName: string,
  roomId: string,
): Promise<void> {
  await sendServerPush({
    targetUserId,
    title: '⚔️ PK Battle Challenge!',
    body: `${challengerName} challenged you to a live PK battle!`,
    data: { type: 'pk', screen: `/live/${roomId}` },
    channelId: 'sashlive-pk',
  });
}

// ── New message notification ──
export async function notifyNewMessage(
  targetUserId: string,
  senderName: string,
  preview: string,
  conversationId: string,
): Promise<void> {
  await sendServerPush({
    targetUserId,
    title: `💬 ${senderName}`,
    body: preview,
    data: { type: 'message', screen: `/chat/${conversationId}` },
  });
}

// ── Host went live notification to followers ──
export async function notifyHostWentLive(
  followerIds: string[],
  hostName: string,
  roomId: string,
): Promise<void> {
  if (!followerIds.length) return;
  await sendServerPush({
    targetUserIds: followerIds,
    title: '🔴 Live Now!',
    body: `${hostName} just started a live stream`,
    data: { type: 'live', screen: `/live/${roomId}` },
  });
}
