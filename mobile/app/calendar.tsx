import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../lib/api';

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [events, setEvents] = useState<any[]>([]);
  const [markedDays, setMarkedDays] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState<any[]>([]);
  const router = useRouter();

  // Mark Day Modal
  const [markModalVisible, setMarkModalVisible] = useState(false);
  const [markLabel, setMarkLabel] = useState('');
  const [markColor, setMarkColor] = useState('#6C63FF');

  // Add Event Modal
  const [addEventModal, setAddEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventColor, setEventColor] = useState('#6C63FF');

  const fetchCalendarData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch combined items: custom events, habits, tasks
      const start = '2026-01-01';
      const end = '2026-12-31';
      const { data } = await api.get(`/events?start=${start}&end=${end}`);
      setEvents(data);
      
      // Build marked dates indicators
      const markers: any = {};
      data.forEach((item: any) => {
        // item date is either startTime or dueDate
        const rawDate = item.startTime || item.dueDate || item.date;
        if (!rawDate) return;
        const dateStr = rawDate.split('T')[0];

        if (!markers[dateStr]) {
          markers[dateStr] = { dots: [] };
        }

        // Add dot color based on event type
        let color = '#6C63FF'; // purple (habit / default)
        if (item.type === 'task') color = '#007FFF'; // blue
        else if (item.type === 'health') color = '#00D4AA'; // green
        else if (item.type === 'focus') color = '#FF6B6B'; // coral

        // Avoid adding duplicate dots for the same category on a single day
        const hasDotColor = markers[dateStr].dots.some((d: any) => d.color === color);
        if (!hasDotColor && markers[dateStr].dots.length < 4) {
          markers[dateStr].dots.push({ key: item.id, color });
        }

        // If it's a custom marked day (from database)
        if (item.isMarked) {
          markers[dateStr].marked = true;
          markers[dateStr].selected = true;
          markers[dateStr].selectedColor = item.color || '#6C63FF';
          markers[dateStr].customLabel = item.markerLabel;
        }
      });

      // Highlight selected date
      if (!markers[selectedDate]) {
        markers[selectedDate] = { selected: true, selectedColor: 'rgba(108, 99, 255, 0.2)' };
      } else {
        markers[selectedDate] = {
          ...markers[selectedDate],
          selected: true,
          selectedColor: markers[selectedDate].selectedColor || '#6C63FF',
        };
      }

      setMarkedDays(markers);
    } catch (e) {
      console.error('Error fetching calendar data:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  // Filter events for selected date
  useEffect(() => {
    const dayEvents = events.filter((item: any) => {
      const rawDate = item.startTime || item.dueDate || item.date;
      return rawDate && rawDate.split('T')[0] === selectedDate;
    });
    setSelectedDayEvents(dayEvents);
  }, [selectedDate, events]);

  const handleMarkDay = async () => {
    if (!markLabel) {
      Alert.alert('Error', 'Please enter a marker label');
      return;
    }

    try {
      await api.post('/events/mark', {
        date: selectedDate,
        label: markLabel,
        color: markColor,
      });
      setMarkLabel('');
      setMarkModalVisible(false);
      fetchCalendarData();
      Alert.alert('Success', 'Day marked successfully!');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed marking day');
    }
  };

  const handleAddEvent = async () => {
    if (!eventTitle) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    try {
      await api.post('/events', {
        title: eventTitle,
        description: eventDesc,
        startTime: `${selectedDate}T09:00:00.000Z`,
        endTime: `${selectedDate}T10:00:00.000Z`,
        color: eventColor,
      });
      setEventTitle('');
      setEventDesc('');
      setAddEventModal(false);
      fetchCalendarData();
      Alert.alert('Success', 'Event added successfully!');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed adding event');
    }
  };

  return (
    <View className="flex-1 bg-[#0A0A0F] pt-12">
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 mb-4">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#F0F0FF" />
        </TouchableOpacity>
        <Text className="text-xl text-white font-soraBold">Marked Calendar</Text>
        <TouchableOpacity onPress={() => setAddEventModal(true)} className="p-2 bg-[#6C63FF]/20 rounded-lg">
          <Ionicons name="add" size={20} color="#6C63FF" />
        </TouchableOpacity>
      </View>

      {loading && (
        <View className="absolute top-20 right-6 z-10">
          <ActivityIndicator color="#6C63FF" size="small" />
        </View>
      )}

      {/* Calendar Component */}
      <View className="mx-4 bg-[#111118] rounded-2xl border border-white/5 overflow-hidden p-2">
        <Calendar
          theme={{
            calendarBackground: '#111118',
            textSectionTitleColor: '#8A8AA0',
            selectedDayBackgroundColor: '#6C63FF',
            selectedDayTextColor: '#ffffff',
            todayTextColor: '#00D4AA',
            dayTextColor: '#F0F0FF',
            textDisabledColor: '#4A4A60',
            dotColor: '#6C63FF',
            selectedDotColor: '#ffffff',
            arrowColor: '#6C63FF',
            monthTextColor: '#F0F0FF',
            textDayFontFamily: 'Inter-Regular',
            textMonthFontFamily: 'Sora-SemiBold',
            textDayHeaderFontFamily: 'Inter-Medium',
          }}
          markingType={'multi-dot'}
          markedDates={markedDays}
          onDayPress={(day) => setSelectedDate(day.dateString)}
          onDayLongPress={(day) => {
            setSelectedDate(day.dateString);
            setMarkModalVisible(true);
          }}
        />
      </View>

      {/* Selected Day Agenda Bottom Sheet */}
      <View className="flex-1 bg-[#111118] border-t border-white/5 mt-6 px-6 pt-4 rounded-t-3xl">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-white font-sora text-lg">Agenda for {selectedDate}</Text>
          {markedDays[selectedDate]?.customLabel && (
            <View
              style={{ backgroundColor: markedDays[selectedDate]?.selectedColor }}
              className="px-3 py-1 rounded-full"
            >
              <Text className="text-white font-inter text-xs font-semibold">
                {markedDays[selectedDate]?.customLabel}
              </Text>
            </View>
          )}
        </View>

        <ScrollView className="flex-1">
          {selectedDayEvents.length === 0 ? (
            <View className="py-12 items-center">
              <Text className="text-[#8A8AA0] font-inter">No scheduled habits, tasks, or events.</Text>
            </View>
          ) : (
            selectedDayEvents.map((item: any, idx) => {
              let categoryColor = '#6C63FF';
              let icon = 'ellipse';

              if (item.type === 'task') {
                categoryColor = '#007FFF';
                icon = 'checkmark-circle-outline';
              } else if (item.type === 'health') {
                categoryColor = '#00D4AA';
                icon = 'heart';
              } else if (item.type === 'focus') {
                categoryColor = '#FF6B6B';
                icon = 'timer-outline';
              }

              return (
                <View
                  key={idx}
                  className="flex-row items-center bg-[#0A0A0F]/50 p-4 rounded-xl border border-white/5 mb-3"
                >
                  <View style={{ backgroundColor: categoryColor + '20' }} className="p-2.5 rounded-lg mr-4">
                    <Ionicons name={icon as any} size={20} color={categoryColor} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[#F0F0FF] font-sora text-sm font-semibold">{item.title}</Text>
                    {item.description && (
                      <Text className="text-[#8A8AA0] font-inter text-xs mt-1">{item.description}</Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* Long Press Marker Modal */}
      <Modal animationType="slide" transparent visible={markModalVisible}>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-[#111118] p-6 rounded-t-3xl border-t border-white/5">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white font-soraBold text-lg">Mark this day: {selectedDate}</Text>
              <TouchableOpacity onPress={() => setMarkModalVisible(false)} className="p-1">
                <Ionicons name="close" size={24} color="#8A8AA0" />
              </TouchableOpacity>
            </View>

            <Text className="text-[#8A8AA0] font-interMedium mb-2 text-xs">MARKER LABEL</Text>
            <TextInput
              className="bg-[#0A0A0F] text-[#F0F0FF] font-inter border border-white/5 rounded-xl px-4 py-3 text-base mb-6"
              placeholder="e.g. Travel, Sick, Focus Day"
              placeholderTextColor="#4A4A60"
              value={markLabel}
              onChangeText={setMarkLabel}
            />

            <Text className="text-[#8A8AA0] font-interMedium mb-2 text-xs">COLOR</Text>
            <View className="flex-row justify-between mb-8">
              {['#6C63FF', '#00D4AA', '#FF6B6B', '#FFD166', '#007FFF'].map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() => setMarkColor(color)}
                  style={{ backgroundColor: color }}
                  className={`w-10 h-10 rounded-full border-2 ${markColor === color ? 'border-white' : 'border-transparent'}`}
                />
              ))}
            </View>

            <TouchableOpacity onPress={handleMarkDay} className="bg-[#6C63FF] py-4 rounded-xl items-center">
              <Text className="text-white font-soraBold">Apply Marker</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Custom Event Modal */}
      <Modal animationType="slide" transparent visible={addEventModal}>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-[#111118] p-6 rounded-t-3xl border-t border-white/5">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white font-soraBold text-lg">Add Custom Event</Text>
              <TouchableOpacity onPress={() => setAddEventModal(false)} className="p-1">
                <Ionicons name="close" size={24} color="#8A8AA0" />
              </TouchableOpacity>
            </View>

            <Text className="text-[#8A8AA0] font-interMedium mb-2 text-xs">TITLE</Text>
            <TextInput
              className="bg-[#0A0A0F] text-[#F0F0FF] font-inter border border-white/5 rounded-xl px-4 py-3 text-base mb-4"
              placeholder="Event Title"
              placeholderTextColor="#4A4A60"
              value={eventTitle}
              onChangeText={setEventTitle}
            />

            <Text className="text-[#8A8AA0] font-interMedium mb-2 text-xs">DESCRIPTION</Text>
            <TextInput
              className="bg-[#0A0A0F] text-[#F0F0FF] font-inter border border-white/5 rounded-xl px-4 py-3 text-base mb-4"
              placeholder="Details (Optional)"
              placeholderTextColor="#4A4A60"
              value={eventDesc}
              onChangeText={setEventDesc}
              multiline
            />

            <Text className="text-[#8A8AA0] font-interMedium mb-2 text-xs">HIGHLIGHT COLOR</Text>
            <View className="flex-row justify-between mb-8">
              {['#6C63FF', '#00D4AA', '#FF6B6B', '#FFD166', '#007FFF'].map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() => setEventColor(color)}
                  style={{ backgroundColor: color }}
                  className={`w-10 h-10 rounded-full border-2 ${eventColor === color ? 'border-white' : 'border-transparent'}`}
                />
              ))}
            </View>

            <TouchableOpacity onPress={handleAddEvent} className="bg-[#6C63FF] py-4 rounded-xl items-center">
              <Text className="text-white font-soraBold">Create Event</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
