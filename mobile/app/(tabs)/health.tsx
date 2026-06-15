import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, LineChart } from 'react-native-gifted-charts';
import * as Haptics from 'expo-haptics';
import useHealth from '../../hooks/useHealth';

export default function HealthScreen() {
  const {
    logWater,
    logSleep,
    logSteps,
    logWeight,
    fetchWaterToday,
    fetchSleepStats,
    fetchStepsToday,
    fetchWeightHistory,
    fetchBMI,
    fetchHealthScore,
  } = useHealth();

  const [loading, setLoading] = useState(true);

  // States
  const [healthScore, setHealthScore] = useState(0);
  const [breakdown, setBreakdown] = useState<any>(null);
  const [waterToday, setWaterToday] = useState(0);
  const [sleepStats, setSleepStats] = useState<any>(null);
  const [stepsToday, setStepsToday] = useState(0);
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [bmiData, setBmiData] = useState<any>(null);

  // Modals
  const [sleepModal, setSleepModal] = useState(false);
  const [bedtime, setBedtime] = useState('');
  const [wakeTime, setWakeTime] = useState('');

  const [stepsModal, setStepsModal] = useState(false);
  const [stepInput, setStepInput] = useState('');

  const [weightModal, setWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');

  const loadHealthData = useCallback(async () => {
    setLoading(true);
    try {
      const scoreRes = await fetchHealthScore();
      setHealthScore(scoreRes.healthScore);
      setBreakdown(scoreRes.breakdown);

      const waterRes = await fetchWaterToday();
      setWaterToday(waterRes.total);

      const sleepRes = await fetchSleepStats();
      setSleepStats(sleepRes);

      const stepsRes = await fetchStepsToday();
      setStepsToday(stepsRes.steps);

      const weightRes = await fetchWeightHistory();
      setWeightHistory(weightRes);

      const bmiRes = await fetchBMI();
      setBmiData(bmiRes);
    } catch (e) {
      console.warn('Error loading health data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHealthData();
  }, [loadHealthData]);

  const handleAddWater = async (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await logWater(amount);
      loadHealthData();
    } catch (e) {
      Alert.alert('Error', 'Failed to log water');
    }
  };

  const handleLogSleep = async () => {
    if (!bedtime || !wakeTime) {
      Alert.alert('Error', 'Bedtime and Wake time are required');
      return;
    }

    try {
      // Create dates based on today/yesterday input
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const bed = `${yesterdayStr}T${bedtime}:00.000Z`;
      const wake = `${todayStr}T${wakeTime}:00.000Z`;

      await logSleep(bed, wake);
      setSleepModal(false);
      setBedtime('');
      setWakeTime('');
      loadHealthData();
      Alert.alert('Success', 'Sleep logged successfully!');
    } catch (e) {
      Alert.alert('Error', 'Invalid sleep times provided.');
    }
  };

  const handleLogSteps = async () => {
    if (!stepInput || isNaN(Number(stepInput))) {
      Alert.alert('Error', 'Please enter a valid step count');
      return;
    }

    try {
      await logSteps(parseInt(stepInput));
      setStepsModal(false);
      setStepInput('');
      loadHealthData();
    } catch (e) {
      Alert.alert('Error', 'Failed to log steps');
    }
  };

  const handleLogWeight = async () => {
    if (!weightInput || isNaN(Number(weightInput))) {
      Alert.alert('Error', 'Please enter a valid weight');
      return;
    }

    try {
      await logWeight(parseFloat(weightInput), 'kg');
      setWeightModal(false);
      setWeightInput('');
      loadHealthData();
    } catch (e) {
      Alert.alert('Error', 'Failed to log weight');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#0A0A0F] justify-center items-center">
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  // Gifted Chart Data
  const scoreData = [
    { value: healthScore, color: '#00D4AA' },
    { value: 100 - healthScore, color: 'rgba(255,255,255,0.05)' },
  ];

  const stepsGoal = breakdown?.steps?.goal || 8000;
  const stepsPct = Math.min(100, Math.round((stepsToday / stepsGoal) * 100));
  const stepsChartData = [
    { value: stepsPct, color: '#007FFF' },
    { value: 100 - stepsPct, color: 'rgba(255,255,255,0.05)' },
  ];

  // Weight line chart formatting
  const weightChartData = weightHistory.map((log: any) => ({
    value: log.value,
    label: new Date(log.loggedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
  }));

  return (
    <View className="flex-1 bg-[#0A0A0F] pt-12">
      {/* Header */}
      <View className="px-6 mb-6">
        <Text className="text-2xl text-white font-soraBold">Health Tracker</Text>
      </View>

      <ScrollView className="flex-1 px-6 pb-12">
        {/* Health Score Gauge */}
        <View className="bg-[#111118] border border-white/5 p-6 rounded-2xl mb-6 items-center">
          <PieChart
            data={scoreData}
            donut
            radius={50}
            innerRadius={40}
            centerLabelComponent={() => (
              <Text className="text-white font-soraBold text-2xl">{healthScore}</Text>
            )}
          />
          <Text className="text-[#8A8AA0] font-inter text-xs tracking-wider uppercase mt-4 mb-4">Composite Health Score</Text>
          <View className="flex-row justify-between w-full border-t border-white/5 pt-4 mt-2">
            <View className="items-center w-[30%]">
              <Text className="text-[#007FFF] font-soraBold text-sm">{breakdown?.water?.score || 0}%</Text>
              <Text className="text-[#8A8AA0] font-inter text-[9px] uppercase mt-1">Water</Text>
            </View>
            <View className="items-center w-[30%] border-x border-white/5">
              <Text className="text-[#6C63FF] font-soraBold text-sm">{breakdown?.sleep?.score || 0}%</Text>
              <Text className="text-[#8A8AA0] font-inter text-[9px] uppercase mt-1">Sleep</Text>
            </View>
            <View className="items-center w-[30%]">
              <Text className="text-[#00D4AA] font-soraBold text-sm">{breakdown?.steps?.score || 0}%</Text>
              <Text className="text-[#8A8AA0] font-inter text-[9px] uppercase mt-1">Steps</Text>
            </View>
          </View>
        </View>

        {/* Water Intake Section */}
        <View className="bg-[#111118] border border-white/5 p-6 rounded-2xl mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white font-sora text-base font-semibold">Water Intake</Text>
            <Text className="text-[#007FFF] font-soraBold text-sm">{waterToday} / {breakdown?.water?.goal || 2000} ml</Text>
          </View>

          {/* Simple Animated Fill Bottle Shape using styled View */}
          <View className="w-full h-8 bg-white/5 rounded-full mb-6 overflow-hidden flex-row">
            <View
              style={{ width: `${Math.min(100, (waterToday / (breakdown?.water?.goal || 2000)) * 100)}%` }}
              className="h-full bg-[#007FFF] rounded-full"
            />
          </View>

          {/* Quick-add buttons */}
          <View className="flex-row justify-between">
            <TouchableOpacity onPress={() => handleAddWater(250)} className="w-[30%] bg-[#007FFF]/20 py-3 rounded-xl items-center border border-[#007FFF]/20">
              <Text className="text-[#007FFF] font-soraBold">+250ml</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleAddWater(500)} className="w-[30%] bg-[#007FFF]/20 py-3 rounded-xl items-center border border-[#007FFF]/20">
              <Text className="text-[#007FFF] font-soraBold">+500ml</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleAddWater(1000)} className="w-[30%] bg-[#007FFF]/20 py-3 rounded-xl items-center border border-[#007FFF]/20">
              <Text className="text-[#007FFF] font-soraBold">+1L</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sleep stats & Logger */}
        <View className="bg-[#111118] border border-white/5 p-6 rounded-2xl mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-white font-sora text-base font-semibold">Sleep Last Night</Text>
              <Text className="text-[#8A8AA0] font-inter text-xs mt-0.5">Average: {sleepStats?.avgDuration || 0} hrs</Text>
            </View>
            <TouchableOpacity onPress={() => setSleepModal(true)} className="bg-[#6C63FF]/20 px-4 py-2 rounded-xl border border-[#6C63FF]/20">
              <Text className="text-[#6C63FF] font-soraBold text-xs">Log Sleep</Text>
            </TouchableOpacity>
          </View>
          {sleepStats?.bestNight ? (
            <View className="flex-row justify-between items-center pt-2 mt-2 border-t border-white/5">
              <View className="flex-1">
                <Text className="text-[#8A8AA0] font-inter text-[10px] uppercase">Best Night Quality</Text>
                <Text className="text-white font-soraBold text-sm mt-0.5">{sleepStats.bestNight.quality}% quality</Text>
              </View>
              <View className="flex-1 items-end">
                <Text className="text-[#8A8AA0] font-inter text-[10px] uppercase">Avg Quality</Text>
                <Text className="text-white font-soraBold text-sm mt-0.5">{sleepStats.avgQuality}%</Text>
              </View>
            </View>
          ) : (
            <Text className="text-[#8A8AA0] font-inter text-xs text-center py-4">No sleep logs yet.</Text>
          )}
        </View>

        {/* Steps Gauge */}
        <View className="bg-[#111118] border border-white/5 p-6 rounded-2xl mb-6 flex-row justify-between items-center">
          <View className="flex-1 mr-4">
            <Text className="text-white font-sora text-base font-semibold">Steps Today</Text>
            <Text className="text-[#007FFF] font-soraBold text-xl mt-2">{stepsToday} steps</Text>
            <Text className="text-[#8A8AA0] font-inter text-xs mt-1">Goal: {stepsGoal}</Text>
            <TouchableOpacity onPress={() => setStepsModal(true)} className="bg-white/5 py-2 px-4 rounded-xl items-center mt-3 border border-white/5 w-32">
              <Text className="text-[#8A8AA0] font-interMedium text-xs">Log Steps</Text>
            </TouchableOpacity>
          </View>
          <View className="justify-center items-center">
            <PieChart
              data={stepsChartData}
              donut
              radius={40}
              innerRadius={32}
              centerLabelComponent={() => (
                <Text className="text-white font-soraBold text-sm">{stepsPct}%</Text>
              )}
            />
          </View>
        </View>

        {/* Weight Tracker & BMI */}
        <View className="bg-[#111118] border border-white/5 p-6 rounded-2xl mb-12">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-white font-sora text-base font-semibold">Weight Tracker</Text>
              <Text className="text-[#8A8AA0] font-inter text-xs mt-0.5">BMI Category: {bmiData?.category || 'N/A'}</Text>
            </View>
            <TouchableOpacity onPress={() => setWeightModal(true)} className="bg-[#00D4AA]/20 px-4 py-2 rounded-xl border border-[#00D4AA]/20">
              <Text className="text-[#00D4AA] font-soraBold text-xs">Log Weight</Text>
            </TouchableOpacity>
          </View>

          {/* BMI Badge display */}
          {bmiData?.bmi && (
            <View className="bg-white/5 px-4 py-3 rounded-xl border border-white/5 mb-6 flex-row justify-between items-center">
              <View>
                <Text className="text-[#8A8AA0] font-inter text-[10px] uppercase">Current BMI</Text>
                <Text className="text-white font-soraBold text-lg mt-0.5">{bmiData.bmi}</Text>
              </View>
              <View className="bg-[#00D4AA]/10 px-3 py-1.5 rounded-lg border border-[#00D4AA]/20">
                <Text className="text-[#00D4AA] font-soraBold text-xs uppercase">{bmiData.category}</Text>
              </View>
            </View>
          )}

          {/* Weight Line Chart */}
          {weightChartData.length > 1 ? (
            <LineChart
              data={weightChartData}
              color="#00D4AA"
              thickness={3}
              noOfSections={3}
              yAxisThickness={0}
              xAxisThickness={0}
              yAxisTextStyle={{ color: '#8A8AA0', fontSize: 10 }}
              xAxisLabelTextStyle={{ color: '#8A8AA0', fontSize: 10 }}
              height={100}
            />
          ) : (
            <Text className="text-[#8A8AA0] font-inter text-xs text-center py-4">Add weight logs to display trend chart.</Text>
          )}
        </View>
      </ScrollView>

      {/* Log Sleep Modal */}
      <Modal animationType="slide" transparent visible={sleepModal}>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-[#111118] p-6 rounded-t-3xl border-t border-white/5">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white font-soraBold text-lg">Log Sleep</Text>
              <TouchableOpacity onPress={() => setSleepModal(false)} className="p-1">
                <Ionicons name="close" size={24} color="#8A8AA0" />
              </TouchableOpacity>
            </View>

            <Text className="text-[#8A8AA0] font-interMedium mb-2 text-xs">BEDTIME (HH:MM)</Text>
            <TextInput
              className="bg-[#0A0A0F] text-[#F0F0FF] font-inter border border-white/5 rounded-xl px-4 py-3 text-base mb-4"
              placeholder="e.g. 22:30"
              placeholderTextColor="#4A4A60"
              value={bedtime}
              onChangeText={setBedtime}
            />

            <Text className="text-[#8A8AA0] font-interMedium mb-2 text-xs">WAKE TIME (HH:MM)</Text>
            <TextInput
              className="bg-[#0A0A0F] text-[#F0F0FF] font-inter border border-white/5 rounded-xl px-4 py-3 text-base mb-8"
              placeholder="e.g. 06:45"
              placeholderTextColor="#4A4A60"
              value={wakeTime}
              onChangeText={setWakeTime}
            />

            <TouchableOpacity onPress={handleLogSleep} className="bg-[#6C63FF] py-4 rounded-xl items-center">
              <Text className="text-white font-soraBold">Log Sleep Session</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Log Steps Modal */}
      <Modal animationType="slide" transparent visible={stepsModal}>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-[#111118] p-6 rounded-t-3xl border-t border-white/5">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white font-soraBold text-lg">Log Daily Steps</Text>
              <TouchableOpacity onPress={() => setStepsModal(false)} className="p-1">
                <Ionicons name="close" size={24} color="#8A8AA0" />
              </TouchableOpacity>
            </View>

            <Text className="text-[#8A8AA0] font-interMedium mb-2 text-xs">STEP COUNT</Text>
            <TextInput
              className="bg-[#0A0A0F] text-[#F0F0FF] font-inter border border-white/5 rounded-xl px-4 py-3 text-base mb-8"
              placeholder="e.g. 10450"
              placeholderTextColor="#4A4A60"
              value={stepInput}
              onChangeText={setStepInput}
              keyboardType="numeric"
            />

            <TouchableOpacity onPress={handleLogSteps} className="bg-[#6C63FF] py-4 rounded-xl items-center">
              <Text className="text-white font-soraBold">Log Steps</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Log Weight Modal */}
      <Modal animationType="slide" transparent visible={weightModal}>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-[#111118] p-6 rounded-t-3xl border-t border-white/5">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white font-soraBold text-lg">Log Weight</Text>
              <TouchableOpacity onPress={() => setWeightModal(false)} className="p-1">
                <Ionicons name="close" size={24} color="#8A8AA0" />
              </TouchableOpacity>
            </View>

            <Text className="text-[#8A8AA0] font-interMedium mb-2 text-xs">WEIGHT (KG)</Text>
            <TextInput
              className="bg-[#0A0A0F] text-[#F0F0FF] font-inter border border-white/5 rounded-xl px-4 py-3 text-base mb-8"
              placeholder="e.g. 74.5"
              placeholderTextColor="#4A4A60"
              value={weightInput}
              onChangeText={setWeightInput}
              keyboardType="numeric"
            />

            <TouchableOpacity onPress={handleLogWeight} className="bg-[#6C63FF] py-4 rounded-xl items-center">
              <Text className="text-white font-soraBold">Log Weight</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
