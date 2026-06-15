import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import api from '../lib/api';

export default function SettingsScreen() {
  const { user, updateUser, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const router = useRouter();

  const [name, setName] = useState(user?.name || '');
  const [height, setHeight] = useState(user?.height?.toString() || '');
  const [waterGoal, setWaterGoal] = useState(user?.waterGoal?.toString() || '2000');
  const [sleepGoal, setSleepGoal] = useState(user?.sleepGoal?.toString() || '8');
  const [stepGoal, setStepGoal] = useState(user?.stepGoal?.toString() || '8000');
  const [focusGoal, setFocusGoal] = useState(user?.focusGoal?.toString() || '60');

  // Notification toggles (saved locally for simplicity)
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [habitsEnabled, setHabitsEnabled] = useState(true);
  const [waterEnabled, setWaterEnabled] = useState(true);

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        height: height ? parseFloat(height) : null,
        waterGoal: parseFloat(waterGoal) || 2000,
        sleepGoal: parseFloat(sleepGoal) || 8,
        stepGoal: parseInt(stepGoal) || 8000,
        focusGoal: parseInt(focusGoal) || 60,
      };

      const { data } = await api.patch('/user/profile', payload);
      updateUser(data);
      Alert.alert('Success', 'Profile settings updated successfully!');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'WARNING: Irreversibly delete your account? All habits, tasks, logs, and calendar data will be permanently erased.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'DELETE',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/user/account');
              await logout();
              router.replace('/(auth)/login');
              Alert.alert('Account Deleted', 'Your account has been deleted.');
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'Failed to delete account.');
            }
          },
        },
      ]
    );
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const isDark = theme === 'dark';

  return (
    <View className="flex-1 bg-[#0A0A0F] pt-12">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 mb-6">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="p-2 mr-4">
            <Ionicons name="arrow-back" size={24} color="#F0F0FF" />
          </TouchableOpacity>
          <Text className="text-xl text-white font-soraBold">Settings</Text>
        </View>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className="bg-[#6C63FF] px-4 py-2 rounded-xl"
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-white font-soraBold text-sm">Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6 pb-12">
        {/* Profile Card */}
        <Text className="text-[#8A8AA0] font-inter text-xs tracking-wider uppercase mb-3">PROFILE Settings</Text>
        <View className="bg-[#111118] border border-white/5 p-4 rounded-2xl mb-6 space-y-4">
          <View>
            <Text className="text-[#8A8AA0] font-inter text-xs mb-1">DISPLAY NAME</Text>
            <TextInput
              className="bg-[#0A0A0F] text-[#F0F0FF] font-inter border border-white/5 rounded-xl px-4 py-2.5 text-base"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View className="mt-4">
            <Text className="text-[#8A8AA0] font-inter text-xs mb-1">HEIGHT (CM)</Text>
            <TextInput
              className="bg-[#0A0A0F] text-[#F0F0FF] font-inter border border-white/5 rounded-xl px-4 py-2.5 text-base"
              value={height}
              onChangeText={setHeight}
              keyboardType="numeric"
              placeholder="e.g. 175"
              placeholderTextColor="#4A4A60"
            />
          </View>
        </View>

        {/* Daily Goals */}
        <Text className="text-[#8A8AA0] font-inter text-xs tracking-wider uppercase mb-3">Orchestration Targets</Text>
        <View className="bg-[#111118] border border-white/5 p-4 rounded-2xl mb-6 space-y-4">
          <View>
            <Text className="text-[#8A8AA0] font-inter text-xs mb-1">WATER GOAL (ML)</Text>
            <TextInput
              className="bg-[#0A0A0F] text-[#F0F0FF] font-inter border border-white/5 rounded-xl px-4 py-2.5 text-base"
              value={waterGoal}
              onChangeText={setWaterGoal}
              keyboardType="numeric"
            />
          </View>

          <View className="mt-4">
            <Text className="text-[#8A8AA0] font-inter text-xs mb-1">SLEEP TARGET (HOURS)</Text>
            <TextInput
              className="bg-[#0A0A0F] text-[#F0F0FF] font-inter border border-white/5 rounded-xl px-4 py-2.5 text-base"
              value={sleepGoal}
              onChangeText={setSleepGoal}
              keyboardType="numeric"
            />
          </View>

          <View className="mt-4">
            <Text className="text-[#8A8AA0] font-inter text-xs mb-1">STEP GOAL</Text>
            <TextInput
              className="bg-[#0A0A0F] text-[#F0F0FF] font-inter border border-white/5 rounded-xl px-4 py-2.5 text-base"
              value={stepGoal}
              onChangeText={setStepGoal}
              keyboardType="numeric"
            />
          </View>

          <View className="mt-4">
            <Text className="text-[#8A8AA0] font-inter text-xs mb-1">DAILY FOCUS GOAL (MINUTES)</Text>
            <TextInput
              className="bg-[#0A0A0F] text-[#F0F0FF] font-inter border border-white/5 rounded-xl px-4 py-2.5 text-base"
              value={focusGoal}
              onChangeText={setFocusGoal}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Preferences / Toggles */}
        <Text className="text-[#8A8AA0] font-inter text-xs tracking-wider uppercase mb-3">Preferences</Text>
        <View className="bg-[#111118] border border-white/5 p-4 rounded-2xl mb-6">
          {/* Theme */}
          <View className="flex-row justify-between items-center py-2 border-b border-white/5">
            <View className="flex-row items-center">
              <Ionicons name={isDark ? "moon-outline" : "sunny-outline"} size={20} color={isDark ? "#6C63FF" : "#FFD166"} />
              <Text className="text-[#F0F0FF] font-inter text-sm ml-3">Dark Mode</Text>
            </View>
            <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ true: '#6C63FF' }} />
          </View>

          {/* Daily Digest */}
          <View className="flex-row justify-between items-center py-2 border-b border-white/5 mt-2">
            <View className="flex-row items-center">
              <Ionicons name="notifications-outline" size={20} color="#00D4AA" />
              <Text className="text-[#F0F0FF] font-inter text-sm ml-3">Daily Digest Alerts</Text>
            </View>
            <Switch value={digestEnabled} onValueChange={setDigestEnabled} trackColor={{ true: '#6C63FF' }} />
          </View>

          {/* Habit reminder */}
          <View className="flex-row justify-between items-center py-2 border-b border-white/5 mt-2">
            <View className="flex-row items-center">
              <Ionicons name="time-outline" size={20} color="#FF6B6B" />
              <Text className="text-[#F0F0FF] font-inter text-sm ml-3">Habit Reminders</Text>
            </View>
            <Switch value={habitsEnabled} onValueChange={setHabitsEnabled} trackColor={{ true: '#6C63FF' }} />
          </View>

          {/* Water reminder */}
          <View className="flex-row justify-between items-center py-2 mt-2">
            <View className="flex-row items-center">
              <Ionicons name="water-outline" size={20} color="#007FFF" />
              <Text className="text-[#F0F0FF] font-inter text-sm ml-3">Hydration Alerts</Text>
            </View>
            <Switch value={waterEnabled} onValueChange={setWaterEnabled} trackColor={{ true: '#6C63FF' }} />
          </View>
        </View>

        {/* Account Actions */}
        <Text className="text-[#8A8AA0] font-inter text-xs tracking-wider uppercase mb-3">Account</Text>
        <View className="bg-[#111118] border border-white/5 p-4 rounded-2xl mb-12">
          <TouchableOpacity onPress={handleSignOut} className="flex-row items-center py-3 border-b border-white/5">
            <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
            <Text className="text-[#FF6B6B] font-sora text-sm ml-3 font-semibold">Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDeleteAccount} className="flex-row items-center py-3 mt-1">
            <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
            <Text className="text-[#FF6B6B] font-sora text-sm ml-3 font-semibold">Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
