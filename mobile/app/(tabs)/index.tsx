import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { PieChart } from 'react-native-gifted-charts';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export default function DashboardScreen() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { user } = useAuthStore();

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/summary');
      setData(res.data);
    } catch (e) {
      console.error('Error fetching dashboard summary:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const handleHabitCheckIn = async (habitId: string, isCompleted: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const dateStr = new Date().toISOString().split('T')[0];
    try {
      // Habit checkIn route toggles on/off. If checkedIn: false, it deletes checkin. If true, it creates it.
      await api.post(`/habits/${habitId}/check-in`, { date: dateStr });
      fetchDashboard();
    } catch (e) {
      console.error('Habit check-in error:', e);
      Alert.alert('Error', 'Failed check-in update.');
    }
  };

  const handleTaskComplete = async (taskId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await api.patch(`/tasks/${taskId}`, { status: 'done' });
      fetchDashboard();
    } catch (e) {
      console.error('Task update error:', e);
    }
  };

  const handleWaterQuickLog = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await api.post('/health/water', { amount: 250 });
      fetchDashboard();
    } catch (e) {
      console.error('Water log error:', e);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#0A0A0F] justify-center items-center">
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  const summary = data || {
    lifeScore: 0,
    lifeScoreBreakdown: { habits: 0, tasks: 0, health: 0, focus: 0 },
    greeting: 'Hello',
    todayHabits: [],
    todayTasks: [],
    upcomingEvents: [],
    waterToday: 0,
    sleepLast: { duration: 0, quality: 0 },
    currentStreak: 0,
    weather: { temp: 22, condition: 'Clear', icon: '☀️' },
  };

  // Water calculations: 8 glasses = 2000ml (250ml per glass)
  const waterGlasses = Math.min(8, Math.floor(summary.waterToday / 250));

  // Pie chart data for Life Score gauge
  const scoreData = [
    { value: summary.lifeScore, color: '#6C63FF' },
    { value: 100 - summary.lifeScore, color: 'rgba(255,255,255,0.05)' },
  ];

  return (
    <ScrollView
      className="flex-1 bg-[#0A0A0F] pt-12 px-6"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header Greeting */}
      <View className="flex-row justify-between items-center mb-6">
        <View>
          <Text className="text-xl text-white font-soraBold">
            {summary.greeting}, {user?.name || 'Director'} 🌅
          </Text>
          <Text className="text-[#8A8AA0] font-inter text-xs mt-1">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/settings')} className="p-2 bg-[#111118] border border-white/5 rounded-xl">
          <Ionicons name="settings-outline" size={20} color="#F0F0FF" />
        </TouchableOpacity>
      </View>

      {/* Row: Life Score Gauge & Weather Widget */}
      <View className="flex-row justify-between mb-6">
        {/* Life Score Gauge Card */}
        <TouchableOpacity
          onPress={() => router.push('/weekly-review')}
          className="w-[58%] bg-[#111118] border border-white/5 p-4 rounded-2xl flex-row items-center justify-between"
        >
          <View className="justify-center items-center">
            <PieChart
              data={scoreData}
              donut
              radius={40}
              innerRadius={32}
              centerLabelComponent={() => (
                <Text className="text-white font-soraBold text-lg">{summary.lifeScore}</Text>
              )}
            />
          </View>
          <View className="flex-1 ml-3">
            <Text className="text-[#8A8AA0] font-inter text-[10px] tracking-wider uppercase">Life Score</Text>
            <Text className="text-white font-sora text-sm mt-1">View Report</Text>
            <Ionicons name="arrow-forward-outline" size={14} color="#8A8AA0" className="mt-1" />
          </View>
        </TouchableOpacity>

        {/* Weather Card */}
        <View className="w-[38%] bg-[#111118] border border-white/5 p-4 rounded-2xl justify-center items-center">
          <Text className="text-3xl mb-1">{summary.weather?.icon || '☀️'}</Text>
          <Text className="text-white font-soraBold text-lg">{summary.weather?.temp || '22'}°C</Text>
          <Text className="text-[#8A8AA0] font-inter text-[10px] text-center truncate">{summary.weather?.condition || 'Clear'}</Text>
        </View>
      </View>

      {/* Today's Habits: Horizontal Scroll list */}
      <View className="mb-6">
        <Text className="text-[#8A8AA0] font-inter text-xs tracking-wider uppercase mb-3">Today's Habits</Text>
        {summary.todayHabits.length === 0 ? (
          <View className="bg-[#111118] border border-white/5 p-4 rounded-2xl items-center">
            <Text className="text-[#8A8AA0] font-inter text-xs">No habits scheduled for today.</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {summary.todayHabits.map((habit: any) => (
              <TouchableOpacity
                key={habit.id}
                onPress={() => handleHabitCheckIn(habit.id, habit.isCompleted)}
                style={{ borderColor: habit.isCompleted ? habit.color : 'rgba(255,255,255,0.08)' }}
                className={`flex-row items-center bg-[#111118] border p-3 rounded-xl mr-3 ${
                  habit.isCompleted ? 'bg-[#6C63FF]/10' : ''
                }`}
              >
                <Text className="text-lg mr-2">{habit.emoji}</Text>
                <Text className={`font-inter text-sm ${habit.isCompleted ? 'text-white font-semibold' : 'text-[#8A8AA0]'}`}>
                  {habit.name}
                </Text>
                <Ionicons
                  name={habit.isCompleted ? "checkmark-circle" : "ellipse-outline"}
                  size={16}
                  color={habit.isCompleted ? habit.color : '#4A4A60'}
                  className="ml-3"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Top 3 Tasks */}
      <View className="mb-6">
        <Text className="text-[#8A8AA0] font-inter text-xs tracking-wider uppercase mb-3">Top Tasks</Text>
        {summary.todayTasks.length === 0 ? (
          <View className="bg-[#111118] border border-white/5 p-4 rounded-2xl items-center">
            <Text className="text-[#8A8AA0] font-inter text-xs">All clear! No pending priority tasks.</Text>
          </View>
        ) : (
          <View className="space-y-3">
            {summary.todayTasks.map((task: any) => (
              <View
                key={task.id}
                className="bg-[#111118] border border-white/5 p-4 rounded-xl flex-row items-center justify-between mb-3"
              >
                <View className="flex-row items-center flex-1 mr-4">
                  {/* Priority indicator color bar */}
                  <View
                    style={{
                      backgroundColor:
                        task.priority === 1 ? '#FF6B6B' : task.priority === 2 ? '#FFD166' : '#6C63FF',
                    }}
                    className="w-1.5 h-10 rounded-full mr-3"
                  />
                  <View className="flex-1">
                    <Text className="text-white font-sora text-sm font-semibold" numberOfLines={1}>
                      {task.title}
                    </Text>
                    {task.subtasksCount > 0 && (
                      <Text className="text-[#8A8AA0] font-inter text-xs mt-1">
                        Subtasks: {task.completedSubtasksCount}/{task.subtasksCount}
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleTaskComplete(task.id)} className="p-1">
                  <Ionicons name="ellipse-outline" size={24} color="#6C63FF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Water Quick Log & Focus Today in Row */}
      <View className="flex-row justify-between mb-6">
        {/* Water Log */}
        <View className="w-[48%] bg-[#111118] border border-white/5 p-4 rounded-2xl justify-between">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[#8A8AA0] font-inter text-[10px] tracking-wide uppercase">Water Quick Log</Text>
            <TouchableOpacity onPress={handleWaterQuickLog} className="p-1 bg-[#6C63FF]/20 rounded-full">
              <Ionicons name="add" size={14} color="#6C63FF" />
            </TouchableOpacity>
          </View>
          <View className="flex-row flex-wrap justify-between items-center mb-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <View key={i} className="w-[22%] items-center mb-2">
                <Ionicons
                  name={i < waterGlasses ? "water" : "water-outline"}
                  size={20}
                  color={i < waterGlasses ? "#007FFF" : "#4A4A60"}
                />
              </View>
            ))}
          </View>
          <Text className="text-white font-soraBold text-sm text-center">
            {summary.waterToday} ml logged
          </Text>
        </View>

        {/* Focus Mode Summary */}
        <View className="w-[48%] bg-[#111118] border border-white/5 p-4 rounded-2xl justify-between">
          <Text className="text-[#8A8AA0] font-inter text-[10px] tracking-wide uppercase mb-2">Focus Today</Text>
          <View className="items-center justify-center py-2">
            <Ionicons name="timer-outline" size={32} color="#FF6B6B" />
            <Text className="text-white font-soraBold text-xl mt-2">
              {summary.lifeScoreBreakdown?.focus || 0}%
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/focus')}
            className="bg-[#FF6B6B] py-2 rounded-xl items-center mt-2"
          >
            <Text className="text-white font-soraBold text-xs">Start Focus</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Upcoming Events (next 3) */}
      <View className="mb-12">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-[#8A8AA0] font-inter text-xs tracking-wider uppercase">Upcoming Events</Text>
          <TouchableOpacity onPress={() => router.push('/calendar')} className="p-1">
            <Text className="text-[#6C63FF] font-inter text-xs">Full Calendar</Text>
          </TouchableOpacity>
        </View>

        {summary.upcomingEvents.length === 0 ? (
          <View className="bg-[#111118] border border-white/5 p-4 rounded-2xl items-center">
            <Text className="text-[#8A8AA0] font-inter text-xs">No upcoming calendar events.</Text>
          </View>
        ) : (
          <View className="space-y-3">
            {summary.upcomingEvents.map((event: any) => (
              <View
                key={event.id}
                className="bg-[#111118] border border-white/5 p-4 rounded-xl flex-row items-center justify-between mb-2"
              >
                <View className="flex-row items-center flex-1 mr-4">
                  <View style={{ backgroundColor: event.color }} className="w-1.5 h-10 rounded-full mr-3" />
                  <View className="flex-1">
                    <Text className="text-white font-sora text-sm font-semibold" numberOfLines={1}>
                      {event.title}
                    </Text>
                    <Text className="text-[#8A8AA0] font-inter text-xs mt-1">
                      {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
