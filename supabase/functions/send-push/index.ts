// SashLive — Edge Function: Send real Expo push notifications to users
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushPayload {
  target_user_id?: string;          // send to one user
  target_user_ids?: string[];        // send to many users
  title: string;
  body: string;
  data?: Record<string, any>;
  channel_id?: string;               // Android channel
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const payload: PushPayload = await req.json();
    const { target_user_id, target_user_ids, title, body, data, channel_id } = payload;

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'title and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Collect target user IDs
    const userIds: string[] = [];
    if (target_user_id) userIds.push(target_user_id);
    if (target_user_ids?.length) userIds.push(...target_user_ids);

    if (!userIds.length) {
      return new Response(
        JSON.stringify({ error: 'target_user_id or target_user_ids required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fetch push tokens for the target users
    const { data: tokens, error: tokenError } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .in('user_id', userIds);

    if (tokenError) {
      console.error('Token fetch error:', tokenError.message);
      return new Response(
        JSON.stringify({ error: tokenError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No registered tokens for these users' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Build Expo push messages
    const messages = tokens.map((t: any) => ({
      to: t.token,
      title,
      body,
      data: data || {},
      sound: 'default',
      priority: 'high',
      ...(t.platform === 'android' && channel_id ? { channelId: channel_id } : {}),
    }));

    // Send to Expo Push API
    const expoRes = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    });

    const expoJson = await expoRes.json();

    // Count successful sends
    const sentCount = (expoJson.data || []).filter(
      (r: any) => r.status === 'ok'
    ).length;

    console.log(`Push sent: ${sentCount}/${messages.length} to ${userIds.join(', ')}`);

    return new Response(
      JSON.stringify({ sent: sentCount, total: messages.length, results: expoJson.data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('send-push error:', err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
