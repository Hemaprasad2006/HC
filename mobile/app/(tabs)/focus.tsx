import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import ConfettiCannon from 'react-native-confetti-cannon';
import * as Haptics from 'expo-haptics';
import { useFocusStore } from '../../store/focusStore';
import { useAuthStore } from '../../store/authStore';
import useTasks from '../../hooks/useTasks';
import { colors } from '../../constants/colors';

const RADIUS = 110;
const STROKE_WIDTH = 12;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function FocusScreen() {
  const { user } = useAuthStore();
  const userId = user?.id || '';
  
  const {
    taskTitle,
    mode,
    durationMinutes,
    remainingSeconds,
    status,
    currentRound,
    totalRounds,
    ambientSound,
    startFocus,
    pauseFocus,
    resumeFocus,
    tickFocus,
    endFocus,
    setAmbientSound,
    resetTimer,
  } = useFocusStore();

  const { tasks } = useTasks();
  const activeTasks = tasks.filter(t => t.status !== 'done');

  // Local state for setup
  const [setupMode, setSetupMode] = useState<'pomodoro' | 'custom' | 'stopwatch'>('pomodoro');
  const [setupDuration, setSetupDuration] = useState('25');
  const [setupRounds, setSetupRounds] = useState('4');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [customTaskTitle, setCustomTaskTitle] = useState('');
  const [showTaskDropdown, setShowTaskDropdown] = useState(false);

  // Local state for Pomodoro breaks
  const [isBreak, setIsBreak] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Keep track of internal ticking
  const tickRef = useRef<any>(null);

  // Handle countdown interval
  useEffect(() => {
    if (status === 'running') {
      tickRef.current = setInterval(() => {
        if (mode === 'stopwatch') {
          // stopwatch counts UP
          tickFocus(userId, remainingSeconds + 1);
        } else {
          // count DOWN
          if (remainingSeconds > 1) {
            tickFocus(userId, remainingSeconds - 1);
          } else {
            // Reached zero!
            clearInterval(tickRef.current);
            handleCycleCompletion();
          }
        }
      }, 1000);
    } else {
      if (tickRef.current) {
        clearInterval(tickRef.current);
      }
    }

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
      }
    };
  }, [status, remainingSeconds, mode, userId]);

  const handleCycleCompletion = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    if (mode === 'pomodoro') {
      if (!isBreak) {
        // Work round ended. Is it the final round?
        if (currentRound >= totalRounds) {
          // Finished all rounds!
          setShowConfetti(true);
          endFocus(userId, durationMinutes * totalRounds);
        } else {
          // Take a break
          Alert.alert('Break Time!', 'Time to rest for 5 minutes ☕');
          setIsBreak(true);
          // Set to 5 minute break (300 seconds)
          tickFocus(userId, 5 * 60);
          resumeFocus(userId); // ensure running
        }
      } else {
        // Break ended. Return to work.
        Alert.alert('Back to Work!', 'Break is over, focus on your task 🎯');
        setIsBreak(false);
        // Increment round
        useFocusStore.setState({ currentRound: currentRound + 1 });
        tickFocus(userId, durationMinutes * 60);
        resumeFocus(userId); // resume next round
      }
    } else {
      // Custom timer ended
      setShowConfetti(true);
      endFocus(userId, durationMinutes);
    }
  };

  const handleStart = () => {
    if (!userId) {
      Alert.alert('Error', 'User is not logged in');
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const finalTitle = selectedTask ? selectedTask.title : (customTaskTitle || 'General Focus');
    const finalDuration = setupMode === 'stopwatch' ? 0 : parseInt(setupDuration) || 25;
    const finalRounds = setupMode === 'pomodoro' ? parseInt(setupRounds) || 4 : 1;

    setIsBreak(false);
    setShowConfetti(false);
    
    startFocus(userId, finalTitle, setupMode, finalDuration, finalRounds);
  };

  const handlePause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    pauseFocus(userId);
  };

  const handleResume = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resumeFocus(userId);
  };

  const handleCompleteEarly = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    let actualMinutes = 0;
    if (mode === 'stopwatch') {
      actualMinutes = Math.max(1, Math.round(remainingSeconds / 60));
    } else {
      const elapsedSeconds = (durationMinutes * 60) - remainingSeconds;
      actualMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    }

    setShowConfetti(true);
    endFocus(userId, actualMinutes);
  };

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    resetTimer();
    setIsBreak(false);
    setShowConfetti(false);
  };

  // Format seconds to HH:MM:SS or MM:SS
  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(s)}`;
    }
    return `${pad(mins)}:${pad(s)}`;
  };

  // SVGs Progress Ring calculations
  const totalSeconds = mode === 'stopwatch' ? 3600 : (isBreak ? 5 * 60 : durationMinutes * 60);
  const progress = mode === 'stopwatch' 
    ? (remainingSeconds % 60) / 60 
    : Math.max(0, Math.min(1, (totalSeconds - remainingSeconds) / totalSeconds));
  const strokeDashoffset = CIRCUMFERENCE - progress * CIRCUMFERENCE;

  // Render timer view (active/paused)
  if (status === 'running' || status === 'paused') {
    return (
      <View className="flex-1 bg-[#0A0A0F] pt-12 items-center justify-between px-6 pb-12">
        {/* Confetti element */}
        {showConfetti && (
          <ConfettiCannon count={100} origin={{ x: -10, y: 0 }} fadeOut={true} fallSpeed={2500} />
        )}

        {/* Header indicator */}
        <View className="items-center mt-6">
          <Text className="text-[#8A8AA0] font-inter text-xs tracking-widest uppercase mb-1">
            {isBreak ? '☕ Rest Break' : `🎯 Focusing`}
          </Text>
          <Text className="text-white font-soraBold text-lg text-center px-4" numberOfLines={2}>
            {taskTitle}
          </Text>
        </View>

        {/* Circular SVG Timer */}
        <View className="items-center justify-center relative my-8">
          <Svg width={RADIUS * 2 + STROKE_WIDTH * 2} height={RADIUS * 2 + STROKE_WIDTH * 2} className="rotate-[-90deg]">
            <Circle
              cx={RADIUS + STROKE_WIDTH}
              cy={RADIUS + STROKE_WIDTH}
              r={RADIUS}
              stroke="rgba(255, 255, 255, 0.03)"
              strokeWidth={STROKE_WIDTH}
              fill="transparent"
            />
            <Circle
              cx={RADIUS + STROKE_WIDTH}
              cy={RADIUS + STROKE_WIDTH}
              r={RADIUS}
              stroke={isBreak ? '#00D4AA' : '#FF6B6B'}
              strokeWidth={STROKE_WIDTH}
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </Svg>

          {/* Core time overlay inside circle */}
          <View className="absolute items-center justify-center">
            <Text className="text-white font-soraBold text-4xl tracking-tighter">
              {formatTime(remainingSeconds)}
            </Text>
            {mode === 'pomodoro' && (
              <Text className="text-[#8A8AA0] font-inter text-xs mt-2">
                Round {currentRound} / {totalRounds}
              </Text>
            )}
          </View>
        </View>

        {/* Soundscape Synthesizer Mixer */}
        <View className="w-full bg-[#111118] border border-white/5 p-4 rounded-2xl mb-8">
          <Text className="text-[#8A8AA0] font-inter text-[10px] tracking-wide uppercase mb-2">Soundscape Mixer</Text>
          <View className="flex-row justify-between">
            {([
              { key: 'none', icon: 'volume-mute-outline', label: 'Silence' },
              { key: 'rain', icon: 'rainy-outline', label: 'Rain' },
              { key: 'lofi', icon: 'musical-notes-outline', label: 'Lofi' },
              { key: 'forest', icon: 'leaf-outline', label: 'Forest' },
              { key: 'cafe', icon: 'cafe-outline', label: 'Cafe' }
            ] as const).map((s) => (
              <TouchableOpacity
                key={s.key}
                onPress={() => setAmbientSound(s.key)}
                className={`items-center justify-center p-2 rounded-xl w-[18%] ${
                  ambientSound === s.key ? 'bg-[#FF6B6B]/20 border border-[#FF6B6B]' : 'bg-[#0A0A0F]/50 border border-transparent'
                }`}
              >
                <Ionicons name={s.icon} size={18} color={ambientSound === s.key ? '#FF6B6B' : '#8A8AA0'} />
                <Text className={`font-inter text-[8px] mt-1 ${ambientSound === s.key ? 'text-[#FF6B6B]' : 'text-[#8A8AA0]'}`}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Control Buttons */}
        <View className="flex-row justify-center items-center space-x-6 w-full px-4">
          <TouchableOpacity
            onPress={status === 'paused' ? handleResume : handlePause}
            className="flex-1 bg-[#111118] border border-white/5 py-4 rounded-2xl flex-row justify-center items-center"
          >
            <Ionicons name={status === 'paused' ? 'play' : 'pause'} size={18} color="#F0F0FF" />
            <Text className="text-white font-soraBold text-sm ml-2">
              {status === 'paused' ? 'Resume' : 'Pause'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCompleteEarly}
            className="flex-1 bg-[#FF6B6B] py-4 rounded-2xl flex-row justify-center items-center"
          >
            <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
            <Text className="text-white font-soraBold text-sm ml-2">Complete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Render completed summary state
  if (status === 'ended') {
    return (
      <View className="flex-1 bg-[#0A0A0F] pt-12 items-center justify-center px-6">
        <ConfettiCannon count={150} origin={{ x: -10, y: 0 }} fadeOut={true} fallSpeed={2000} />
        
        <View className="bg-[#111118] border border-white/5 p-8 rounded-3xl items-center w-full max-w-sm">
          <View className="w-16 h-16 bg-[#00D4AA]/20 rounded-full items-center justify-center mb-6">
            <Ionicons name="sparkles" size={32} color="#00D4AA" />
          </View>
          
          <Text className="text-white font-soraBold text-2xl text-center mb-2">Focus Complete!</Text>
          <Text className="text-[#8A8AA0] font-inter text-sm text-center mb-6">
            Congratulations! You've logged your focus time in the Chamber.
          </Text>

          <View className="w-full bg-[#0A0A0F] p-4 rounded-xl mb-6 flex-row justify-around">
            <View className="items-center">
              <Text className="text-[#8A8AA0] font-inter text-[10px] uppercase">Session mode</Text>
              <Text className="text-white font-soraBold text-sm mt-1 uppercase">{mode}</Text>
            </View>
            <View className="items-center">
              <Text className="text-[#8A8AA0] font-inter text-[10px] uppercase">Target task</Text>
              <Text className="text-white font-soraBold text-sm mt-1" numberOfLines={1}>
                {taskTitle}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleReset}
            className="bg-[#6C63FF] py-3.5 rounded-xl w-full items-center"
          >
            <Text className="text-white font-soraBold">Enter Chamber Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Render setup/idle view
  return (
    <ScrollView className="flex-1 bg-[#0A0A0F] pt-12 px-6" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Title */}
      <View className="mb-6">
        <Text className="text-2xl text-white font-soraBold">Focus Chamber</Text>
        <Text className="text-[#8A8AA0] font-inter text-xs mt-1">
          Lock in your tasks, activate ambient sounds, and enter deep flow.
        </Text>
      </View>

      {/* Select Focus Mode */}
      <View className="mb-6">
        <Text className="text-[#8A8AA0] font-inter text-xs tracking-wider uppercase mb-3">Session Mode</Text>
        <View className="flex-row bg-[#111118] border border-white/5 p-1 rounded-xl">
          {([
            { key: 'pomodoro', label: 'Pomodoro' },
            { key: 'custom', label: 'Custom' },
            { key: 'stopwatch', label: 'Stopwatch' }
          ] as const).map((m) => (
            <TouchableOpacity
              key={m.key}
              onPress={() => {
                setSetupMode(m.key);
                if (m.key === 'pomodoro') setSetupDuration('25');
              }}
              className={`flex-1 py-2.5 rounded-lg items-center ${setupMode === m.key ? 'bg-[#FF6B6B]' : ''}`}
            >
              <Text className="text-white font-soraBold text-xs">{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Select Task Link */}
      <View className="mb-6 relative">
        <Text className="text-[#8A8AA0] font-inter text-xs tracking-wider uppercase mb-3">Focus Task Link</Text>
        <TouchableOpacity
          onPress={() => setShowTaskDropdown(!showTaskDropdown)}
          className="bg-[#111118] border border-white/5 p-4 rounded-xl flex-row justify-between items-center"
        >
          <Text className="text-white font-inter text-sm">
            {selectedTask ? `📋 ${selectedTask.title}` : customTaskTitle ? `✏️ Custom: ${customTaskTitle}` : 'General focus session'}
          </Text>
          <Ionicons name={showTaskDropdown ? "chevron-up" : "chevron-down"} size={16} color="#8A8AA0" />
        </TouchableOpacity>

        {showTaskDropdown && (
          <View className="bg-[#111118] border border-white/5 rounded-xl mt-2 overflow-hidden max-h-48 z-10">
            <ScrollView nestedScrollEnabled>
              <TouchableOpacity
                onPress={() => {
                  setSelectedTask(null);
                  setCustomTaskTitle('');
                  setShowTaskDropdown(false);
                }}
                className="p-3 border-b border-white/5 hover:bg-white/5"
              >
                <Text className="text-[#8A8AA0] font-inter text-xs">General focus flow (no linked task)</Text>
              </TouchableOpacity>
              
              {activeTasks.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => {
                    setSelectedTask(t);
                    setCustomTaskTitle('');
                    setShowTaskDropdown(false);
                  }}
                  className="p-3 border-b border-white/5 hover:bg-white/5"
                >
                  <Text className="text-white font-inter text-sm" numberOfLines={1}>
                    📋 {t.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {!selectedTask && (
          <TextInput
            className="bg-[#111118] text-[#F0F0FF] font-inter border border-white/5 rounded-xl px-4 py-3 text-sm mt-3"
            placeholder="Or type a custom focus target..."
            placeholderTextColor="#4A4A60"
            value={customTaskTitle}
            onChangeText={setCustomTaskTitle}
          />
        )}
      </View>

      {/* Dynamic Duration / Rounds Setup inputs */}
      {setupMode !== 'stopwatch' && (
        <View className="flex-row justify-between mb-6">
          <View className="w-[48%]">
            <Text className="text-[#8A8AA0] font-inter text-xs tracking-wider uppercase mb-3">Duration (mins)</Text>
            <TextInput
              keyboardType="number-pad"
              className="bg-[#111118] text-[#F0F0FF] font-soraBold border border-white/5 rounded-xl px-4 py-3 text-base"
              value={setupDuration}
              onChangeText={setSetupDuration}
            />
          </View>

          {setupMode === 'pomodoro' && (
            <View className="w-[48%]">
              <Text className="text-[#8A8AA0] font-inter text-xs tracking-wider uppercase mb-3">Rounds</Text>
              <TextInput
                keyboardType="number-pad"
                className="bg-[#111118] text-[#F0F0FF] font-soraBold border border-white/5 rounded-xl px-4 py-3 text-base"
                value={setupRounds}
                onChangeText={setSetupRounds}
              />
            </View>
          )}
        </View>
      )}

      {/* Ambient Soundscape Selection */}
      <View className="mb-8">
        <Text className="text-[#8A8AA0] font-inter text-xs tracking-wider uppercase mb-3">Ambient Soundscape</Text>
        <View className="flex-row justify-between flex-wrap">
          {([
            { key: 'none', icon: 'volume-mute-outline', label: 'Silence' },
            { key: 'rain', icon: 'rainy-outline', label: 'Rain' },
            { key: 'lofi', icon: 'musical-notes-outline', label: 'Lofi' },
            { key: 'forest', icon: 'leaf-outline', label: 'Forest' },
            { key: 'cafe', icon: 'cafe-outline', label: 'Cafe' }
          ] as const).map((s) => (
            <TouchableOpacity
              key={s.key}
              onPress={() => setAmbientSound(s.key)}
              className={`items-center justify-center p-3 rounded-xl w-[18%] ${
                ambientSound === s.key ? 'bg-[#FF6B6B]/20 border border-[#FF6B6B]' : 'bg-[#111118] border border-white/5'
              }`}
            >
              <Ionicons name={s.icon} size={20} color={ambientSound === s.key ? '#FF6B6B' : '#8A8AA0'} />
              <Text className={`font-inter text-[8px] mt-1 ${ambientSound === s.key ? 'text-[#FF6B6B]' : 'text-[#8A8AA0]'}`}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Enter Chamber Trigger Button */}
      <TouchableOpacity
        onPress={handleStart}
        className="bg-[#FF6B6B] py-4 rounded-2xl items-center shadow-lg"
      >
        <Text className="text-white font-soraBold text-base">🚀 Enter Focus Chamber</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
