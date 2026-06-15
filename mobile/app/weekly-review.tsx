import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BarChart } from 'react-native-gifted-charts';
import api from '../lib/api';

export default function WeeklyReviewScreen() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchReview = async () => {
      try {
        const res = await api.get('/reports/weekly-review');
        setData(res.data);
      } catch (e) {
        console.error('Error fetching weekly review:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchReview();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 bg-[#0A0A0F] justify-center items-center">
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  if (!data) {
    return (
      <View className="flex-1 bg-[#0A0A0F] justify-center items-center px-6">
        <Text className="text-white font-sora text-lg text-center mb-4">Failed to load weekly review.</Text>
        <TouchableOpacity onPress={() => router.back()} className="bg-[#6C63FF] py-3 px-6 rounded-xl">
          <Text className="text-white font-soraBold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Calculate approximate Weekly Life Score for motivation message
  const completionRate = data.totalHabits > 0 ? (data.habitsCompleted / (data.totalHabits * 7)) * 100 : 80;
  const healthAvgScore = Math.min(100, ((data.healthAverages.water / 2000) * 35) + ((data.healthAverages.sleep / 8) * 40) + ((data.healthAverages.steps / 8000) * 25));
  const weekLifeScore = Math.round((completionRate * 0.3) + (healthAvgScore * 0.3) + 40); // estimate

  // Motivational message bands
  let motivationalMessage = 'An orchestrator starts with small steps. Take one action today to build momentum.';
  let messageBand = '0–40';
  let bandColor = '#FF6B6B';

  if (weekLifeScore > 40 && weekLifeScore <= 70) {
    motivationalMessage = 'Steady progress! You are organizing your routine successfully. Keep pushing.';
    messageBand = '41–70';
    bandColor = '#FFD166';
  } else if (weekLifeScore > 70) {
    motivationalMessage = 'Phenomenal! Your life is in sync. Keep running the director playbook.';
    messageBand = '71–100';
    bandColor = '#00D4AA';
  }

  // Format focus minutes by day for react-native-gifted-charts
  const barData = (data.focusMinutesByDay || []).map((day: any) => ({
    value: day.minutes,
    label: day.label,
    frontColor: '#6C63FF',
  }));

  return (
    <View className="flex-1 bg-[#0A0A0F] pt-12">
      {/* Header */}
      <View className="flex-row items-center px-6 mb-6">
        <TouchableOpacity onPress={() => router.back()} className="p-2 mr-4">
          <Ionicons name="arrow-back" size={24} color="#F0F0FF" />
        </TouchableOpacity>
        <View>
          <Text className="text-xl text-white font-soraBold">Weekly Review</Text>
          <Text className="text-[#8A8AA0] font-inter text-xs">
            Week of {data.weekStart} – {data.weekEnd}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pb-8">
        {/* Composite Score Circle Banner */}
        <View className="bg-[#111118] border border-white/5 p-6 rounded-2xl mb-6 items-center">
          <View style={{ borderColor: bandColor }} className="w-24 h-24 rounded-full border-4 justify-center items-center mb-4">
            <Text className="text-white font-soraBold text-3xl">{weekLifeScore}</Text>
          </View>
          <Text className="text-[#8A8AA0] font-inter text-xs tracking-widest uppercase mb-2">Weekly Average Score</Text>
          
          <View style={{ backgroundColor: bandColor + '15' }} className="px-4 py-3 rounded-xl border border-white/5 mt-2">
            <Text style={{ color: bandColor }} className="text-center font-soraBold text-xs uppercase mb-1">
              Band: {messageBand}
            </Text>
            <Text className="text-[#F0F0FF] font-inter text-sm text-center italic">
              "{motivationalMessage}"
            </Text>
          </View>
        </View>

        {/* Focus Chart Summary */}
        <View className="bg-[#111118] border border-white/5 p-6 rounded-2xl mb-6">
          <Text className="text-white font-sora text-base font-semibold mb-4">Focused Minutes By Day</Text>
          {barData.length > 0 ? (
            <BarChart
              data={barData}
              barWidth={18}
              noOfSections={3}
              barBorderRadius={4}
              frontColor="#6C63FF"
              yAxisThickness={0}
              xAxisThickness={0}
              yAxisTextStyle={{ color: '#8A8AA0', fontSize: 10 }}
              xAxisLabelTextStyle={{ color: '#8A8AA0', fontSize: 10 }}
              height={120}
            />
          ) : (
            <View className="py-6 items-center">
              <Text className="text-[#8A8AA0] font-inter">No focus minutes logged this week.</Text>
            </View>
          )}
          <View className="flex-row justify-between items-center mt-6 pt-4 border-t border-white/5">
            <View>
              <Text className="text-[#8A8AA0] font-inter text-xs">TOTAL FOCUS TIME</Text>
              <Text className="text-white font-soraBold text-lg mt-1">{data.focusMinutes} min</Text>
            </View>
            <View className="items-end">
              <Text className="text-[#8A8AA0] font-inter text-xs">SESSIONS COMPLETED</Text>
              <Text className="text-white font-soraBold text-lg mt-1">{data.focusSessionsCount}</Text>
            </View>
          </View>
        </View>

        {/* Habits summary card */}
        <View className="bg-[#111118] border border-white/5 p-6 rounded-2xl mb-6 flex-row justify-between items-center">
          <View className="flex-1">
            <Text className="text-[#8A8AA0] font-inter text-xs uppercase tracking-wide">Habits Completed</Text>
            <Text className="text-white font-soraBold text-2xl mt-1">{data.habitsCompleted} logs</Text>
            <Text className="text-[#8A8AA0] font-inter text-xs mt-2">
              Across {data.totalHabits} configured habits.
            </Text>
          </View>
          <View className="bg-[#6C63FF]/20 p-4 rounded-full">
            <Ionicons name="flame" size={32} color="#FF6B6B" />
            <Text className="text-white font-soraBold text-center text-xs mt-1">🔥 {data.bestStreak}</Text>
          </View>
        </View>

        {/* Health averages cards */}
        <View className="bg-[#111118] border border-white/5 p-6 rounded-2xl mb-8">
          <Text className="text-white font-sora text-base font-semibold mb-4">Health Averages</Text>
          
          <View className="space-y-4">
            {/* Water */}
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center">
                <Ionicons name="water-outline" size={20} color="#007FFF" />
                <Text className="text-[#F0F0FF] font-inter text-sm ml-3">Daily Water Intake</Text>
              </View>
              <Text className="text-white font-soraBold">{data.healthAverages.water} ml</Text>
            </View>

            {/* Sleep */}
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center">
                <Ionicons name="bed-outline" size={20} color="#6C63FF" />
                <Text className="text-[#F0F0FF] font-inter text-sm ml-3">Daily Sleep Duration</Text>
              </View>
              <Text className="text-white font-soraBold">{data.healthAverages.sleep} hrs</Text>
            </View>

            {/* Steps */}
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center">
                <Ionicons name="walk-outline" size={20} color="#00D4AA" />
                <Text className="text-[#F0F0FF] font-inter text-sm ml-3">Daily Step Count</Text>
              </View>
              <Text className="text-white font-soraBold">{data.healthAverages.steps} steps</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
