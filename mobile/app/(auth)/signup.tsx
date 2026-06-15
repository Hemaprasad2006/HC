import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuthStore();

  const handleSignup = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/signup', { name, email, password });
      await login(data.user, data.accessToken, data.refreshToken);
      
      // Navigate to onboarding flow for new users
      router.replace('/onboarding');
    } catch (e: any) {
      console.error(e);
      Alert.alert('Registration Failed', e.response?.data?.error || 'Registration error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#0A0A0F] px-6 justify-center">
      <View className="mb-8 items-center">
        <Text className="text-4xl text-[#6C63FF] font-soraBold mb-2">🧭 LIFE DIRECTOR</Text>
        <Text className="text-[#8A8AA0] font-inter text-base">Create your account to start</Text>
      </View>

      <View className="space-y-4 mb-6">
        <View>
          <Text className="text-[#8A8AA0] font-interMedium mb-1 text-sm">FULL NAME</Text>
          <TextInput
            className="bg-[#111118] text-[#F0F0FF] font-inter border border-white/5 rounded-xl px-4 py-3 text-base"
            placeholder="John Doe"
            placeholderTextColor="#4A4A60"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View className="mt-4">
          <Text className="text-[#8A8AA0] font-interMedium mb-1 text-sm">EMAIL</Text>
          <TextInput
            className="bg-[#111118] text-[#F0F0FF] font-inter border border-white/5 rounded-xl px-4 py-3 text-base"
            placeholder="you@domain.com"
            placeholderTextColor="#4A4A60"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View className="mt-4">
          <Text className="text-[#8A8AA0] font-interMedium mb-1 text-sm">PASSWORD</Text>
          <TextInput
            className="bg-[#111118] text-[#F0F0FF] font-inter border border-white/5 rounded-xl px-4 py-3 text-base"
            placeholder="Min 6 characters"
            placeholderTextColor="#4A4A60"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>
      </View>

      <TouchableOpacity
        className="bg-[#6C63FF] py-4 rounded-xl items-center justify-center mt-6"
        onPress={handleSignup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-white font-sora text-lg">Sign Up</Text>
        )}
      </TouchableOpacity>

      <View className="flex-row justify-center mt-6">
        <Text className="text-[#8A8AA0] font-inter">Already have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text className="text-[#6C63FF] font-interMedium">Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
