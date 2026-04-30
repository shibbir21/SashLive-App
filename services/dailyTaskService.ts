// SashLive — Daily Tasks Service
import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

export interface DailyTask {
  key: string;
  title: string;
  description: string;
  points_reward: number;
  coins_reward: number;
  diamonds_reward: number;
  task_type: string;
  icon: string;
  completed?: boolean;
}

export async function fetchTasksWithCompletion(userId: string): Promise<{ data: DailyTask[]; error: string | null }> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [taskRes, compRes] = await Promise.all([
    supabase.from('daily_tasks').select('*').order('task_type'),
    supabase.from('user_task_completions')
      .select('task_key')
      .eq('user_id', userId)
      .gte('completed_at', todayStart.toISOString()),
  ]);

  if (taskRes.error) return { data: [], error: taskRes.error.message };

  const completedKeys = new Set((compRes.data || []).map((c: any) => c.task_key));
  const tasks = (taskRes.data || []).map((t: any) => ({ ...t, completed: completedKeys.has(t.key) }));
  return { data: tasks as DailyTask[], error: null };
}

export async function claimTaskReward(
  userId: string,
  taskKey: string
): Promise<{ points: number; coins: number; diamonds: number; error: string | null }> {
  // Check not already claimed today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { data: existing } = await supabase
    .from('user_task_completions')
    .select('id')
    .eq('user_id', userId)
    .eq('task_key', taskKey)
    .gte('completed_at', todayStart.toISOString())
    .single();

  if (existing) return { points: 0, coins: 0, diamonds: 0, error: 'Already claimed today' };

  const { data: task } = await supabase.from('daily_tasks').select('*').eq('key', taskKey).single();
  if (!task) return { points: 0, coins: 0, diamonds: 0, error: 'Task not found' };

  // Insert completion
  await supabase.from('user_task_completions').insert({ user_id: userId, task_key: taskKey });

  // Update user rewards
  const { data: profile } = await supabase.from('user_profiles').select('points, coins, diamonds').eq('id', userId).single();
  if (profile) {
    await supabase.from('user_profiles').update({
      points: (profile.points || 0) + (task.points_reward || 0),
      coins: (profile.coins || 0) + (task.coins_reward || 0),
      diamonds: (profile.diamonds || 0) + (task.diamonds_reward || 0),
    }).eq('id', userId);
  }

  return {
    points: task.points_reward || 0,
    coins: task.coins_reward || 0,
    diamonds: task.diamonds_reward || 0,
    error: null,
  };
}
