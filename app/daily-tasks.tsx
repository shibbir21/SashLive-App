// SashLive — Daily Tasks & Earn Screen
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Animated,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/template';
import { useAlert } from '@/template';
import { fetchTasksWithCompletion, claimTaskReward, type DailyTask } from '@/services/dailyTaskService';

const { width } = Dimensions.get('window');

const TASK_TYPE_CONFIG = {
  daily: { label: 'Daily', color: Colors.primary, icon: '📅' },
  weekly: { label: 'Weekly', color: Colors.secondary, icon: '📆' },
  achievement: { label: 'Achievement', color: Colors.gold, icon: '🏆' },
};

// Fallback mock tasks
const MOCK_TASKS: DailyTask[] = [
  { key: 'watch_live_30m', title: 'Watch Live 30 min', description: 'Watch any live stream for 30 minutes', points_reward: 500, coins_reward: 50, diamonds_reward: 0, task_type: 'daily', icon: '👁', completed: false },
  { key: 'send_gift', title: 'Send a Gift', description: 'Send any gift to a host', points_reward: 300, coins_reward: 30, diamonds_reward: 0, task_type: 'daily', icon: '🎁', completed: false },
  { key: 'go_live_60m', title: 'Go Live 60 min', description: 'Stream live for at least 60 minutes', points_reward: 2000, coins_reward: 100, diamonds_reward: 5, task_type: 'daily', icon: '🎤', completed: false },
  { key: 'get_10_viewers', title: 'Get 10 Viewers', description: 'Have 10+ concurrent viewers', points_reward: 1000, coins_reward: 50, diamonds_reward: 2, task_type: 'daily', icon: '👥', completed: false },
  { key: 'play_game', title: 'Play a Game', description: 'Complete one in-app game', points_reward: 200, coins_reward: 20, diamonds_reward: 0, task_type: 'daily', icon: '🎮', completed: true },
  { key: 'post_story', title: 'Post a Story', description: 'Share a story visible to others', points_reward: 300, coins_reward: 30, diamonds_reward: 0, task_type: 'daily', icon: '📸', completed: true },
  { key: 'post_reel', title: 'Post a Reel', description: 'Upload a short video reel', points_reward: 1000, coins_reward: 50, diamonds_reward: 2, task_type: 'daily', icon: '🎬', completed: false },
  { key: 'pk_battle_win', title: 'Win a PK Battle', description: 'Win a PK battle against another host', points_reward: 5000, coins_reward: 200, diamonds_reward: 10, task_type: 'daily', icon: '⚔', completed: false },
  { key: 'vip_gift', title: 'Send VIP Gift (500+)', description: 'Send a gift worth 500+ diamonds', points_reward: 3000, coins_reward: 100, diamonds_reward: 5, task_type: 'weekly', icon: '💎', completed: false },
  { key: 'win_5_games', title: 'Win 5 Games', description: 'Win any 5 in-app games this week', points_reward: 2000, coins_reward: 80, diamonds_reward: 3, task_type: 'weekly', icon: '🏆', completed: false },
  { key: '100_viewers', title: 'Attract 100 Viewers', description: 'Have 100+ concurrent viewers at once', points_reward: 10000, coins_reward: 500, diamonds_reward: 20, task_type: 'achievement', icon: '🌟', completed: false },
  { key: 'first_pk', title: 'First PK Battle', description: 'Complete your first PK battle', points_reward: 500, coins_reward: 50, diamonds_reward: 0, task_type: 'achievement', icon: '⚔', completed: true },
];

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: value / max, duration: 800, useNativeDriver: false }).start();
  }, [value, max]);
  return (
    <View style={{ height: 5, backgroundColor: Colors.cardBorder, borderRadius: 3, overflow: 'hidden' }}>
      <Animated.View style={{ height: '100%', backgroundColor: color, borderRadius: 3, width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

export default function DailyTasksScreen() {
  const router = useRouter();
  const { currentUser, updateDiamonds, updateCoins } = useApp();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [tasks, setTasks] = useState<DailyTask[]>(MOCK_TASKS);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'daily' | 'weekly' | 'achievement'>('all');
  const totalPoints = tasks.filter(t => t.completed).reduce((s, t) => s + t.points_reward, 0);
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    if (user?.id) loadTasks();
  }, [user?.id]);

  const loadTasks = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await fetchTasksWithCompletion(user.id);
    if (data.length > 0) setTasks(data);
    setLoading(false);
  };

  const handleClaim = async (task: DailyTask) => {
    if (task.completed) {
      showAlert('Already Claimed', 'You have already completed this task today!');
      return;
    }
    setClaiming(task.key);
    if (user?.id) {
      const { points, coins, diamonds, error } = await claimTaskReward(user.id, task.key);
      if (error === 'Already claimed today') {
        setTasks(prev => prev.map(t => t.key === task.key ? { ...t, completed: true } : t));
        showAlert('Already Claimed!', 'Task already completed today.');
        setClaiming(null);
        return;
      }
      if (!error) {
        if (diamonds > 0) updateDiamonds(diamonds);
        if (coins > 0) updateCoins(coins);
        setTasks(prev => prev.map(t => t.key === task.key ? { ...t, completed: true } : t));
        const rewards = [
          points > 0 ? `${points} Points` : '',
          coins > 0 ? `${coins} S-Coins` : '',
          diamonds > 0 ? `${diamonds}💎` : '',
        ].filter(Boolean).join(' + ');
        showAlert('🎉 Reward Claimed!', `+${rewards}`);
        setClaiming(null);
        return;
      }
    }
    // Mock claim (no auth)
    setTasks(prev => prev.map(t => t.key === task.key ? { ...t, completed: true } : t));
    if (task.diamonds_reward > 0) updateDiamonds(task.diamonds_reward);
    if (task.coins_reward > 0) updateCoins(task.coins_reward);
    const rewards = [
      task.points_reward > 0 ? `${task.points_reward} Points` : '',
      task.coins_reward > 0 ? `${task.coins_reward} S-Coins` : '',
      task.diamonds_reward > 0 ? `${task.diamonds_reward}💎` : '',
    ].filter(Boolean).join(' + ');
    showAlert('🎉 Reward Claimed!', `+${rewards}`);
    setClaiming(null);
  };

  const filteredTasks = activeFilter === 'all' ? tasks : tasks.filter(t => t.task_type === activeFilter);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>🎯 Daily Tasks</Text>
        <Pressable style={styles.walletChip} onPress={() => router.push('/wallet')}>
          <Text style={styles.walletPoints}>{totalPoints.toLocaleString()} pts</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Progress Overview */}
        <Animated.View style={[styles.overviewCard, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
          <View style={styles.overviewTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.overviewTitle}>Today's Progress</Text>
              <Text style={styles.overviewSub}>{completedTasks}/{totalTasks} tasks completed</Text>
            </View>
            <View style={styles.overviewCircle}>
              <Text style={styles.overviewPct}>{Math.round((completedTasks / totalTasks) * 100)}%</Text>
            </View>
          </View>
          <ProgressBar value={completedTasks} max={totalTasks} color={Colors.primary} />
          <View style={styles.overviewStats}>
            <View style={styles.overviewStat}>
              <Text style={[styles.overviewStatVal, { color: Colors.gold }]}>{totalPoints.toLocaleString()}</Text>
              <Text style={styles.overviewStatLabel}>Points Earned</Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewStat}>
              <Text style={[styles.overviewStatVal, { color: Colors.diamond }]}>{currentUser.diamonds}</Text>
              <Text style={styles.overviewStatLabel}>Diamonds</Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewStat}>
              <Text style={[styles.overviewStatVal, { color: Colors.success }]}>{currentUser.coins}</Text>
              <Text style={styles.overviewStatLabel}>S-Coins</Text>
            </View>
          </View>
        </Animated.View>

        {/* Earning guide */}
        <View style={styles.earningGuide}>
          <Text style={styles.guideTitle}>💡 How Earnings Work</Text>
          <View style={styles.guideGrid}>
            {[
              { icon: '🎯', title: 'Points', desc: '10,000 pts = $1 USD', color: Colors.gold },
              { icon: '🪙', title: 'S-Coins', desc: 'Play games & earn', color: Colors.success },
              { icon: '💎', title: 'Diamonds', desc: 'Send & receive gifts', color: Colors.diamond },
              { icon: '💵', title: 'Withdraw', desc: 'Min $10 (100K pts)', color: Colors.primary },
            ].map(g => (
              <View key={g.title} style={[styles.guideItem, { borderColor: g.color + '30' }]}>
                <Text style={{ fontSize: 24 }}>{g.icon}</Text>
                <Text style={[styles.guideItemTitle, { color: g.color }]}>{g.title}</Text>
                <Text style={styles.guideItemDesc}>{g.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Filter tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.xs }}>
          {(['all', 'daily', 'weekly', 'achievement'] as const).map(f => (
            <Pressable key={f} style={[styles.filterChip, activeFilter === f && styles.filterChipActive]} onPress={() => setActiveFilter(f)}>
              <Text style={[styles.filterChipText, activeFilter === f && styles.filterChipTextActive]}>
                {f === 'all' ? '🎯 All' : f === 'daily' ? '📅 Daily' : f === 'weekly' ? '📆 Weekly' : '🏆 Achievements'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {loading && (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
        )}

        {/* Task list */}
        <View style={styles.taskList}>
          {filteredTasks.map((task, index) => {
            const typeConf = TASK_TYPE_CONFIG[task.task_type as keyof typeof TASK_TYPE_CONFIG] || TASK_TYPE_CONFIG.daily;
            const isClaiming = claiming === task.key;
            return (
              <Animated.View key={task.key} style={[styles.taskCard, task.completed && styles.taskCardDone, {
                opacity: headerAnim,
                transform: [{ translateX: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [index % 2 === 0 ? -30 : 30, 0] }) }],
              }]}>
                <View style={[styles.taskIconWrap, { backgroundColor: typeConf.color + '20' }]}>
                  <Text style={{ fontSize: 28 }}>{task.icon}</Text>
                  {task.completed && (
                    <View style={styles.taskDoneOverlay}>
                      <MaterialIcons name="check-circle" size={22} color={Colors.success} />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={styles.taskTitleRow}>
                    <Text style={[styles.taskTitle, task.completed && { color: Colors.textMuted }]}>{task.title}</Text>
                    <View style={[styles.taskTypeBadge, { backgroundColor: typeConf.color + '20' }]}>
                      <Text style={[styles.taskTypeBadgeText, { color: typeConf.color }]}>{typeConf.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.taskDesc}>{task.description}</Text>
                  {/* Rewards row */}
                  <View style={styles.rewardsRow}>
                    {task.points_reward > 0 && (
                      <View style={styles.rewardChip}>
                        <Text style={[styles.rewardChipText, { color: Colors.gold }]}>+{task.points_reward}pts</Text>
                      </View>
                    )}
                    {task.coins_reward > 0 && (
                      <View style={styles.rewardChip}>
                        <Text style={[styles.rewardChipText, { color: Colors.success }]}>+{task.coins_reward}🪙</Text>
                      </View>
                    )}
                    {task.diamonds_reward > 0 && (
                      <View style={styles.rewardChip}>
                        <Text style={[styles.rewardChipText, { color: Colors.diamond }]}>+{task.diamonds_reward}💎</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Pressable
                  style={[styles.claimBtn, task.completed && styles.claimBtnDone, { borderColor: typeConf.color }, isClaiming && { opacity: 0.7 }]}
                  onPress={() => handleClaim(task)}
                  disabled={isClaiming}
                >
                  {isClaiming ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : task.completed ? (
                    <MaterialIcons name="check" size={20} color={Colors.success} />
                  ) : (
                    <Text style={[styles.claimBtnText, { color: typeConf.color }]}>Claim</Text>
                  )}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {/* Withdrawal banner */}
        <Pressable style={styles.withdrawBanner} onPress={() => router.push('/withdrawal')}>
          <View style={styles.withdrawIcon}><Text style={{ fontSize: 28 }}>💵</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.withdrawTitle}>Ready to Withdraw?</Text>
            <Text style={styles.withdrawSub}>Min $10 (100,000 pts) · EPay / Bank Transfer</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={Colors.primary} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  walletChip: { backgroundColor: Colors.gold + '20', borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 5, borderWidth: 1, borderColor: Colors.gold + '40' },
  walletPoints: { color: Colors.gold, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  // Overview Card
  overviewCard: { margin: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.cardBorder, gap: Spacing.sm, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5 },
  overviewTop: { flexDirection: 'row', alignItems: 'center' },
  overviewTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  overviewSub: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  overviewCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.primary },
  overviewPct: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.black },
  overviewStats: { flexDirection: 'row', marginTop: Spacing.xs },
  overviewStat: { flex: 1, alignItems: 'center' },
  overviewStatVal: { fontSize: FontSize.lg, fontWeight: FontWeight.black },
  overviewStatLabel: { color: Colors.textMuted, fontSize: 10 },
  overviewDivider: { width: 1, backgroundColor: Colors.cardBorder },
  // Earning guide
  earningGuide: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, gap: Spacing.sm },
  guideTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  guideGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  guideItem: { width: (width - Spacing.md * 2 - Spacing.sm) / 2, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, gap: 4 },
  guideItemTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  guideItemDesc: { color: Colors.textMuted, fontSize: FontSize.xs },
  // Filters
  filterScroll: { marginBottom: Spacing.sm, maxHeight: 44 },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  filterChipTextActive: { color: '#FFF', fontWeight: FontWeight.bold },
  // Task list
  taskList: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.md, borderWidth: 1, borderColor: Colors.cardBorder },
  taskCardDone: { opacity: 0.65 },
  taskIconWrap: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  taskDoneOverlay: { position: 'absolute', bottom: -2, right: -2, backgroundColor: Colors.bg, borderRadius: 11 },
  taskTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap' },
  taskTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold, flex: 1 },
  taskTypeBadge: { borderRadius: BorderRadius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  taskTypeBadgeText: { fontSize: 9, fontWeight: FontWeight.black },
  taskDesc: { color: Colors.textMuted, fontSize: FontSize.xs, lineHeight: 16 },
  rewardsRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  rewardChip: { backgroundColor: Colors.bgSecondary, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  rewardChipText: { fontSize: 10, fontWeight: FontWeight.bold },
  claimBtn: { width: 60, height: 38, borderRadius: BorderRadius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  claimBtnDone: { borderColor: Colors.success + '40', backgroundColor: Colors.success + '10' },
  claimBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  // Withdraw banner
  withdrawBanner: { flexDirection: 'row', alignItems: 'center', margin: Spacing.md, backgroundColor: Colors.primary + '15', borderRadius: BorderRadius.xl, padding: Spacing.md, gap: Spacing.md, borderWidth: 1, borderColor: Colors.primary + '30', marginTop: Spacing.lg },
  withdrawIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  withdrawTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  withdrawSub: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
});
