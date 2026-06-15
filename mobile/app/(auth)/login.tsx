import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      await login(data.user, data.accessToken, data.refreshToken);
      router.replace('/(tabs)');
    } catch (e: any) {
      console.error(e);
      Alert.alert('Authentication Failed', e.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#0A0A0F] px-6 justify-center">
      <View className="mb-8 items-center">
        <Text className="text-4xl text-[#6C63FF] font-soraBold mb-2">🧭 LIFE DIRECTOR</Text>
        <Text className="text-[#8A8AA0] font-inter text-base">Your life, orchestrated.</Text>
      </View>

      <View className="space-y-4 mb-6">
        <View>
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
            placeholder="••••••••"
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
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-white font-sora text-lg">Sign In</Text>
        )}
      </TouchableOpacity>

      <View className="flex-row justify-center mt-6">
        <Text className="text-[#8A8AA0] font-inter">Don't have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
          <Text className="text-[#6C63FF] font-interMedium">Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
