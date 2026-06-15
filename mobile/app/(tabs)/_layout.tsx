import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useFocusStore } from '../../store/focusStore';
import { colors } from '../../constants/colors';

export default function TabsLayout() {
  const { theme } = useThemeStore();
  const { status: focusStatus } = useFocusStore();
  const isDark = theme === 'dark';
  const c = isDark ? colors.dark : colors.light;

  const isFocusedActive = focusStatus === 'running' || focusStatus === 'paused';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: isDark ? '#8A8AA0' : '#8A8AA0',
        tabBarShowLabel: false,
        tabBarStyle: {
          display: isFocusedActive ? 'none' : 'flex',
          backgroundColor: isDark ? '#111118' : '#FFFFFF',
          borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          height: 60,
          paddingBottom: 5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "checkbox" : "checkbox-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "list" : "list-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "heart" : "heart-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="focus"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "timer" : "timer-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
