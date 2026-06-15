import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { registerForPushNotifications } from '../../lib/notifications';
import api from '../../lib/api';

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [habitName, setHabitName] = useState('');
  const [habitEmoji, setHabitEmoji] = useState('🧘');
  const [habitColor, setHabitColor] = useState('#6C63FF');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const toggleCategory = (cat: string) => {
    if (categories.includes(cat)) {
      setCategories(categories.filter((c) => c !== cat));
    } else {
      setCategories([...categories, cat]);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (categories.length === 0) {
        Alert.alert('Selection Required', 'Please choose at least one category of interest.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!habitName) {
        Alert.alert('Detail Required', 'Please enter a name for your first habit.');
        return;
      }
      setStep(3);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      // 1. Create Onboarding Habit on server
      await api.post('/habits', {
        name: habitName,
        emoji: habitEmoji,
        color: habitColor,
        category: categories[0] || 'Mindfulness',
        frequency: 'daily',
        customDays: '[]',
      });

      // 2. Request Push Notifications permission via expo-notifications
      await registerForPushNotifications();

      // 3. Mark Onboarding as done, redirect to Dashboard
      router.replace('/(tabs)');
    } catch (e: any) {
      console.error(e);
      Alert.alert('Onboarding Error', e.response?.data?.error || 'Failed saving onboarding setup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-[#0A0A0F] px-6 py-12 justify-between">
      {/* Header Progress indicator */}
      <View className="items-center mb-6">
        <Text className="text-[#8A8AA0] font-inter text-xs tracking-wider uppercase">Step {step} of 3</Text>
        <View className="flex-row mt-2 space-x-2">
          <View className={`h-1 w-12 rounded ${step >= 1 ? 'bg-[#6C63FF]' : 'bg-[#4A4A60]'}`} />
          <View className={`h-1 w-12 rounded ${step >= 2 ? 'bg-[#6C63FF]' : 'bg-[#4A4A60]'}`} />
          <View className={`h-1 w-12 rounded ${step >= 3 ? 'bg-[#6C63FF]' : 'bg-[#4A4A60]'}`} />
        </View>
      </View>

      {/* Step Contents */}
      {step === 1 && (
        <View className="flex-1 justify-center">
          <Text className="text-3xl text-white font-soraBold mb-4 text-center">What are your main focus areas?</Text>
          <Text className="text-[#8A8AA0] font-inter text-center mb-8">Select categories you want to optimize in your daily routine.</Text>
          
          <View className="flex-row flex-wrap justify-between">
            {['Productivity', 'Mindfulness', 'Health', 'Fitness', 'Sleep', 'Learning'].map((cat) => {
              const selected = categories.includes(cat);
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => toggleCategory(cat)}
                  className={`w-[47%] p-4 rounded-xl border mb-4 items-center justify-center ${
                    selected ? 'bg-[#6C63FF] border-[#6C63FF]' : 'bg-[#111118] border-white/5'
                  }`}
                >
                  <Text className={`font-sora text-base ${selected ? 'text-white' : 'text-[#8A8AA0]'}`}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {step === 2 && (
        <View className="flex-1 justify-center">
          <Text className="text-3xl text-white font-soraBold mb-4 text-center">Set up your first habit</Text>
          <Text className="text-[#8A8AA0] font-inter text-center mb-8">What is one positive action you want to perform daily?</Text>

          <View className="space-y-4">
            <TextInput
              className="bg-[#111118] text-[#F0F0FF] font-inter border border-white/5 rounded-xl px-4 py-3 text-base mb-4"
              placeholder="e.g. Read for 15 minutes"
              placeholderTextColor="#4A4A60"
              value={habitName}
              onChangeText={setHabitName}
            />

            <Text className="text-[#8A8AA0] font-interMedium mb-2">PICK AN EMOJI</Text>
            <View className="flex-row justify-between mb-6">
              {['🧘', '📖', '💧', '🏃', '🥦', '💤'].map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => setHabitEmoji(emoji)}
                  className={`p-3 rounded-xl ${habitEmoji === emoji ? 'bg-[#6C63FF]' : 'bg-[#111118]'}`}
                >
                  <Text className="text-xl">{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-[#8A8AA0] font-interMedium mb-2">PICK A HIGHLIGHT COLOR</Text>
            <View className="flex-row justify-between">
              {['#6C63FF', '#00D4AA', '#FF6B6B', '#FFD166', '#007FFF'].map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() => setHabitColor(color)}
                  style={{ backgroundColor: color }}
                  className={`w-10 h-10 rounded-full border-2 ${habitColor === color ? 'border-white' : 'border-transparent'}`}
                />
              ))}
            </View>
          </View>
        </View>
      )}

      {step === 3 && (
        <View className="flex-1 justify-center items-center">
          <Text className="text-6xl mb-6">🔔</Text>
          <Text className="text-3xl text-white font-soraBold mb-4 text-center">Stay Orchestrated</Text>
          <Text className="text-[#8A8AA0] font-inter text-center mb-8 px-4">
            Enable push notifications to receive morning digests, habit reminders, hydration logs, and streak alerts.
          </Text>
        </View>
      )}

      {/* Navigation Footer */}
      <View className="flex-row justify-between items-center mt-8">
        {step > 1 ? (
          <TouchableOpacity onPress={() => setStep(step - 1)} className="py-3 px-6">
            <Text className="text-[#8A8AA0] font-interMedium">Back</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}

        <TouchableOpacity
          onPress={step === 3 ? handleFinish : handleNext}
          disabled={loading}
          className="bg-[#6C63FF] py-3.5 px-8 rounded-xl"
        >
          <Text className="text-white font-soraBold">
            {step === 3 ? (loading ? 'Loading...' : 'Enable & Finish') : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
