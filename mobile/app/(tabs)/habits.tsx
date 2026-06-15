import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import useHabits from '../../hooks/useHabits';
import { useAuthStore } from '../../store/authStore';

export default function HabitsScreen() {
  const { habits, loading, refetch, checkIn, addHabit, freezeStreak } = useHabits();
  const { user } = useAuthStore();
  const [filter, setFilter] = useState('all'); // all, daily, weekly, custom

  // Confetti State
  const [confettiActive, setConfettiActive] = useState(false);
  const [milestone, setMilestone] = useState<number | null>(null);

  // Add Habit Sheet
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Mindfulness');
  const [emoji, setEmoji] = useState('🧘');
  const [color, setColor] = useState('#6C63FF');
  const [frequency, setFrequency] = useState('daily');
  const [reminderTime, setReminderTime] = useState('');

  // Check check-in status for today
  const isCheckedInToday = (habit: any) => {
    const todayStr = new Date().toISOString().split('T')[0];
    return (habit.checkIns || []).some(
      (c: any) => c.date.split('T')[0] === todayStr
    );
  };

  // Check if frozen today
  const isFrozenToday = (habit: any) => {
    const todayStr = new Date().toISOString().split('T')[0];
    // check if there's a freeze log on user matching habitId for today
    // Let's check checkIns since freeze log is stored on user streakFreezeLogs in DB
    return false; // stub or fetched from user
  };

  const handleCheckIn = async (habitId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const todayStr = new Date().toISOString().split('T')[0];
    try {
      const res = await checkIn(habitId, todayStr);
      
      // If server returns milestoneAchieved, fire confetti!
      if (res && res.milestoneAchieved) {
        setMilestone(res.milestoneAchieved);
        setConfettiActive(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => setConfettiActive(false), 5000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFreeze = async (habitId: string) => {
    if ((user?.remainingFreezes || 0) <= 0) {
      Alert.alert('No Freezes Remaining', 'Streak freezes replenish 1 every 7 days.');
      return;
    }

    Alert.alert('Freeze Streak', 'Use 1 streak freeze to preserve your streak for today?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Freeze',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          const todayStr = new Date().toISOString().split('T')[0];
          try {
            await freezeStreak(habitId, todayStr);
            refetch();
          } catch (e) {
            console.error(e);
          }
        },
      },
    ]);
  };

  const handleCreateHabit = async () => {
    if (!name) {
      Alert.alert('Error', 'Habit name is required');
      return;
    }

    try {
      await addHabit({
        name,
        emoji,
        color,
        category,
        frequency,
        reminderTime: reminderTime || undefined,
      });

      // Reset fields
      setName('');
      setAddSheetVisible(false);
      Alert.alert('Success', 'New habit created!');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed creating habit.');
    }
  };

  // Filter logic
  const filteredHabits = habits.filter((h) => {
    if (filter === 'all') return true;
    return h.frequency === filter;
  });

  return (
    <View className="flex-1 bg-[#0A0A0F] pt-12">
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 mb-4">
        <Text className="text-2xl text-white font-soraBold">My Habits</Text>
        <View className="flex-row items-center">
          <Ionicons name="snow" size={16} color="#00D4AA" />
          <Text className="text-[#00D4AA] font-soraBold text-sm ml-1">
            {user?.remainingFreezes || 0} Freezes
          </Text>
        </View>
      </View>

      {/* Filter pills */}
      <View className="mb-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-6 flex-row">
          {['all', 'daily', 'weekly'].map((f) => {
            const active = filter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                className={`px-5 py-2.5 rounded-full mr-3 border ${
                  active ? 'bg-[#6C63FF] border-[#6C63FF]' : 'bg-[#111118] border-white/5'
                }`}
              >
                <Text className={`font-inter text-xs capitalize ${active ? 'text-white font-semibold' : 'text-[#8A8AA0]'}`}>
                  {f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading && habits.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="small" color="#6C63FF" />
        </View>
      ) : (
        <ScrollView className="flex-grow px-6 pb-20">
          {filteredHabits.length === 0 ? (
            <View className="py-20 items-center">
              <Text className="text-[#8A8AA0] font-inter text-sm">No active habits scheduled.</Text>
            </View>
          ) : (
            filteredHabits.map((habit) => {
              const completed = isCheckedInToday(habit);
              return (
                <View
                  key={habit.id}
                  className="bg-[#111118] border border-white/5 p-4 rounded-2xl flex-row items-center justify-between mb-4"
                >
                  {/* Left: Emoji circle */}
                  <View className="flex-row items-center flex-1 mr-4">
                    <View style={{ backgroundColor: habit.color + '20' }} className="p-3 rounded-full mr-4">
                      <Text className="text-xl">{habit.emoji}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-sora text-sm font-semibold">{habit.name}</Text>
                      <View className="flex-row items-center mt-1">
                        <Ionicons name="flame" size={14} color="#FF6B6B" />
                        <Text className="text-[#8A8AA0] font-inter text-xs ml-1">
                          {habit.streak} day streak
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Right: Actions */}
                  <View className="flex-row items-center space-x-3">
                    {/* Streak Freeze */}
                    <TouchableOpacity onPress={() => handleFreeze(habit.id)} className="p-2 bg-white/5 rounded-xl">
                      <Text className="text-sm">❄️</Text>
                    </TouchableOpacity>

                    {/* Checkmark Circle */}
                    <TouchableOpacity onPress={() => handleCheckIn(habit.id)}>
                      <Ionicons
                        name={completed ? "checkmark-circle" : "ellipse-outline"}
                        size={28}
                        color={completed ? habit.color : '#4A4A60'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Confetti overlay */}
      {confettiActive && (
        <ConfettiCannon count={150} origin={{ x: -10, y: 0 }} fallSpeed={3000} />
      )}

      {/* Milestone Modal */}
      {milestone && (
        <Modal transparent animationType="fade" visible={!!milestone}>
          <View className="flex-1 bg-black/80 justify-center items-center px-6">
            <Text className="text-6xl mb-6">🎉🔥🏆</Text>
            <Text className="text-3xl text-white font-soraBold text-center mb-2">Milestone Reached!</Text>
            <Text className="text-[#00D4AA] font-soraBold text-xl text-center mb-4">{milestone} DAY STREAK</Text>
            <Text className="text-[#8A8AA0] font-inter text-center mb-8">
              Outstanding consistency! Keep running the director schedule.
            </Text>
            <TouchableOpacity onPress={() => setMilestone(null)} className="bg-[#6C63FF] py-3.5 px-10 rounded-xl">
              <Text className="text-white font-soraBold">Awesome!</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}

      {/* FAB Add Button */}
      <TouchableOpacity
        onPress={() => setAddSheetVisible(true)}
        className="absolute bottom-6 right-6 w-14 h-14 bg-[#6C63FF] rounded-full items-center justify-center shadow-lg"
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Add Habit Bottom Sheet Modal */}
      <Modal animationType="slide" transparent visible={addSheetVisible}>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-[#111118] p-6 rounded-t-3xl border-t border-white/5">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white font-soraBold text-lg">Add Custom Habit</Text>
              <TouchableOpacity onPress={() => setAddSheetVisible(false)} className="p-1">
                <Ionicons name="close" size={24} color="#8A8AA0" />
              </TouchableOpacity>
            </View>

            <ScrollView className="space-y-4 max-h-[400px] mb-6">
              <View>
                <Text className="text-[#8A8AA0] font-interMedium mb-1 text-xs">HABIT NAME</Text>
                <TextInput
                  className="bg-[#0A0A0F] text-[#F0F0FF] font-inter border border-white/5 rounded-xl px-4 py-2.5 text-base"
                  placeholder="e.g. Meditate for 10 min"
                  placeholderTextColor="#4A4A60"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View className="mt-4">
                <Text className="text-[#8A8AA0] font-interMedium mb-1 text-xs font-semibold">CATEGORY</Text>
                <TextInput
                  className="bg-[#0A0A0F] text-[#F0F0FF] font-inter border border-white/5 rounded-xl px-4 py-2.5 text-base"
                  placeholder="e.g. Mindfulness"
                  placeholderTextColor="#4A4A60"
                  value={category}
                  onChangeText={setCategory}
                />
              </View>

              <View className="mt-4">
                <Text className="text-[#8A8AA0] font-interMedium mb-2 text-xs">EMOJI</Text>
                <View className="flex-row justify-between">
                  {['🧘', '📖', '💧', '🏃', '🥦', '💤'].map((em) => (
                    <TouchableOpacity
                      key={em}
                      onPress={() => setEmoji(em)}
                      className={`p-2 rounded-lg ${emoji === em ? 'bg-[#6C63FF]' : 'bg-[#0A0A0F]'}`}
                    >
                      <Text className="text-lg">{em}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View className="mt-4">
                <Text className="text-[#8A8AA0] font-interMedium mb-2 text-xs">COLOR</Text>
                <View className="flex-row justify-between">
                  {['#6C63FF', '#00D4AA', '#FF6B6B', '#FFD166', '#007FFF'].map((col) => (
                    <TouchableOpacity
                      key={col}
                      onPress={() => setColor(col)}
                      style={{ backgroundColor: col }}
                      className={`w-8 h-8 rounded-full border-2 ${color === col ? 'border-white' : 'border-transparent'}`}
                    />
                  ))}
                </View>
              </View>

              <View className="mt-4">
                <Text className="text-[#8A8AA0] font-interMedium mb-2 text-xs">FREQUENCY</Text>
                <View className="flex-row">
                  {['daily', 'weekly'].map((freq) => (
                    <TouchableOpacity
                      key={freq}
                      onPress={() => setFrequency(freq)}
                      className={`px-4 py-2 rounded-xl mr-3 border capitalize ${
                        frequency === freq ? 'bg-[#6C63FF] border-[#6C63FF]' : 'bg-[#0A0A0F] border-white/5'
                      }`}
                    >
                      <Text className="text-white font-inter text-xs">{freq}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View className="mt-4">
                <Text className="text-[#8A8AA0] font-interMedium mb-1 text-xs">REMINDER TIME (Optional)</Text>
                <TextInput
                  className="bg-[#0A0A0F] text-[#F0F0FF] font-inter border border-white/5 rounded-xl px-4 py-2.5 text-base"
                  placeholder="e.g. 08:30"
                  placeholderTextColor="#4A4A60"
                  value={reminderTime}
                  onChangeText={setReminderTime}
                />
              </View>
            </ScrollView>

            <TouchableOpacity onPress={handleCreateHabit} className="bg-[#6C63FF] py-4 rounded-xl items-center">
              <Text className="text-white font-soraBold">Create Habit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
