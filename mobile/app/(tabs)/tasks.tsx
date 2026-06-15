import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import * as Haptics from 'expo-haptics';
import useTasks from '../../hooks/useTasks';

export default function TasksScreen() {
  const { tasks, loading, refetch, addTask, updateTask, deleteTask } = useTasks();
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  // Add Task Modal
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(4); // P1 to P4
  const [project, setProject] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleCreateTask = async () => {
    if (!title) {
      Alert.alert('Error', 'Task title is required');
      return;
    }

    try {
      await addTask({
        title,
        description: description || undefined,
        priority,
        project: project || undefined,
        dueDate: dueDate ? `${dueDate}T12:00:00.000Z` : null,
      });

      setTitle('');
      setDescription('');
      setAddSheetVisible(false);
      Alert.alert('Success', 'New task added!');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to create task');
    }
  };

  const handleToggleStatus = async (taskId: string, currentStatus: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const statusMap: any = {
      todo: 'in_progress',
      in_progress: 'done',
      done: 'todo',
    };
    try {
      await updateTask(taskId, { status: statusMap[currentStatus] });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSwipeComplete = async (taskId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await updateTask(taskId, { status: 'done' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSwipeDelete = async (taskId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    try {
      await deleteTask(taskId);
    } catch (e) {
      console.error(e);
    }
  };

  // Render Swipe Actions
  const renderRightActions = (taskId: string) => (
    <TouchableOpacity
      onPress={() => handleSwipeDelete(taskId)}
      className="bg-[#FF6B6B] justify-center items-center w-20 h-full rounded-r-xl"
    >
      <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
    </TouchableOpacity>
  );

  const renderLeftActions = (taskId: string) => (
    <TouchableOpacity
      onPress={() => handleSwipeComplete(taskId)}
      className="bg-[#00D4AA] justify-center items-center w-20 h-full rounded-l-xl"
    >
      <Ionicons name="checkmark-circle-outline" size={24} color="#FFFFFF" />
    </TouchableOpacity>
  );

  const getPriorityColor = (p: number) => {
    if (p === 1) return '#FF6B6B'; // P1
    if (p === 2) return '#FFD166'; // P2
    if (p === 3) return '#6C63FF'; // P3
    return '#4A4A60'; // P4
  };

  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const doneTasks = tasks.filter(t => t.status === 'done');

  return (
    <View className="flex-1 bg-[#0A0A0F] pt-12">
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 mb-4">
        <Text className="text-2xl text-white font-soraBold">Task Manager</Text>
        {/* Toggle Mode */}
        <View className="flex-row bg-[#111118] border border-white/5 p-1 rounded-xl">
          <TouchableOpacity
            onPress={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg ${viewMode === 'list' ? 'bg-[#6C63FF]' : ''}`}
          >
            <Text className="text-white font-sora text-xs">List</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode('kanban')}
            className={`px-3 py-1.5 rounded-lg ${viewMode === 'kanban' ? 'bg-[#6C63FF]' : ''}`}
          >
            <Text className="text-white font-sora text-xs">Kanban</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && tasks.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="small" color="#6C63FF" />
        </View>
      ) : (
        <View className="flex-1">
          {viewMode === 'list' ? (
            /* LIST VIEW GROUPED BY PRIORITY */
            <ScrollView className="px-6 pb-20">
              {['todo', 'in_progress', 'done'].map((status) => {
                const groupTasks = tasks.filter(t => t.status === status);
                if (groupTasks.length === 0) return null;

                return (
                  <View key={status} className="mb-6">
                    <Text className="text-[#8A8AA0] font-inter text-xs tracking-wider uppercase mb-3">
                      {status === 'todo' ? 'To Do' : status === 'in_progress' ? 'In Progress' : 'Completed'}
                    </Text>

                    {groupTasks.map((task) => (
                      <View key={task.id} className="mb-3">
                        <Swipeable
                          renderLeftActions={() => renderLeftActions(task.id)}
                          renderRightActions={() => renderRightActions(task.id)}
                        >
                          <View className="bg-[#111118] border border-white/5 p-4 rounded-xl flex-row items-center justify-between">
                            <View className="flex-row items-center flex-1 mr-4">
                              <View
                                style={{ backgroundColor: getPriorityColor(task.priority) }}
                                className="w-1.5 h-10 rounded-full mr-3"
                              />
                              <View className="flex-1">
                                <Text className={`text-white font-sora text-sm font-semibold ${task.status === 'done' ? 'line-through text-[#4A4A60]' : ''}`}>
                                  {task.title}
                                </Text>
                                {task.dueDate && (
                                  <Text className="text-[#8A8AA0] font-inter text-xs mt-1">
                                    Due: {task.dueDate.split('T')[0]}
                                  </Text>
                                )}
                              </View>
                            </View>
                            <TouchableOpacity onPress={() => handleToggleStatus(task.id, task.status)} className="p-1">
                              <Ionicons
                                name={
                                  task.status === 'done'
                                    ? 'checkmark-circle'
                                    : task.status === 'in_progress'
                                    ? 'play-circle-outline'
                                    : 'ellipse-outline'
                                }
                                size={24}
                                color={task.status === 'done' ? '#00D4AA' : '#6C63FF'}
                              />
                            </TouchableOpacity>
                          </View>
                        </Swipeable>
                      </View>
                    ))}
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            /* KANBAN BOARD VIEW */
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-6 flex-row">
              {/* Columns: To Do, In Progress, Done */}
              {[
                { title: 'To Do', items: todoTasks, key: 'todo' },
                { title: 'In Progress', items: inProgressTasks, key: 'in_progress' },
                { title: 'Done', items: doneTasks, key: 'done' },
              ].map((column) => (
                <View key={column.key} className="w-72 bg-[#111118] border border-white/5 p-4 rounded-2xl mr-4 h-[85%]">
                  <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-white font-soraBold text-sm">{column.title}</Text>
                    <View className="bg-white/5 px-2 py-0.5 rounded-full">
                      <Text className="text-[#8A8AA0] font-inter text-[10px]">{column.items.length}</Text>
                    </View>
                  </View>

                  <ScrollView className="space-y-3">
                    {column.items.map((task) => (
                      <TouchableOpacity
                        key={task.id}
                        onPress={() => handleToggleStatus(task.id, task.status)}
                        className="bg-[#0A0A0F] border border-white/5 p-4 rounded-xl mb-3"
                      >
                        <View className="flex-row items-center mb-2">
                          <View
                            style={{ backgroundColor: getPriorityColor(task.priority) }}
                            className="w-2 h-2 rounded-full mr-2"
                          />
                          <Text className="text-[#8A8AA0] font-inter text-[10px] uppercase">
                            P{task.priority}
                          </Text>
                        </View>
                        <Text className={`text-white font-sora text-sm font-semibold ${task.status === 'done' ? 'line-through text-[#4A4A60]' : ''}`}>
                          {task.title}
                        </Text>
                        {task.description && (
                          <Text className="text-[#8A8AA0] font-inter text-xs mt-1" numberOfLines={2}>
                            {task.description}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* FAB Add Button */}
      <TouchableOpacity
        onPress={() => setAddSheetVisible(true)}
        className="absolute bottom-6 right-6 w-14 h-14 bg-[#6C63FF] rounded-full items-center justify-center shadow-lg"
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Add Task Modal Bottom Sheet */}
      <Modal animationType="slide" transparent visible={addSheetVisible}>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-[#111118] p-6 rounded-t-3xl border-t border-white/5">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white font-soraBold text-lg">Add Task</Text>
              <TouchableOpacity onPress={() => setAddSheetVisible(false)} className="p-1">
                <Ionicons name="close" size={24} color="#8A8AA0" />
              </TouchableOpacity>
            </View>

            <ScrollView className="space-y-4 max-h-[400px] mb-6">
              <View>
                <Text className="text-[#8A8AA0] font-interMedium mb-1 text-xs">TASK TITLE</Text>
                <TextInput
                  className="bg-[#0A0A0F] text-[#F0F0FF] font-inter border border-white/5 rounded-xl px-4 py-2.5 text-base"
                  placeholder="Task title"
                  placeholderTextColor="#4A4A60"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View className="mt-4">
                <Text className="text-[#8A8AA0] font-interMedium mb-1 text-xs">DESCRIPTION</Text>
                <TextInput
                  className="bg-[#0A0A0F] text-[#F0F0FF] font-inter border border-white/5 rounded-xl px-4 py-2.5 text-base"
                  placeholder="Enter details"
                  placeholderTextColor="#4A4A60"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />
              </View>

              <View className="mt-4">
                <Text className="text-[#8A8AA0] font-interMedium mb-2 text-xs font-semibold">PRIORITY</Text>
                <View className="flex-row justify-between">
                  {[1, 2, 3, 4].map((p) => (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setPriority(p)}
                      style={{
                        borderColor: priority === p ? getPriorityColor(p) : 'rgba(255,255,255,0.08)',
                        backgroundColor: priority === p ? getPriorityColor(p) + '15' : 'transparent',
                      }}
                      className="px-5 py-2.5 border rounded-xl"
                    >
                      <Text style={{ color: priority === p ? getPriorityColor(p) : '#8A8AA0' }} className="font-soraBold">
                        P{p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View className="mt-4">
                <Text className="text-[#8A8AA0] font-interMedium mb-1 text-xs">PROJECT NAME</Text>
                <TextInput
                  className="bg-[#0A0A0F] text-[#F0F0FF] font-inter border border-white/5 rounded-xl px-4 py-2.5 text-base"
                  placeholder="e.g. Work, Gym"
                  placeholderTextColor="#4A4A60"
                  value={project}
                  onChangeText={setProject}
                />
              </View>

              <View className="mt-4">
                <Text className="text-[#8A8AA0] font-interMedium mb-1 text-xs">DUE DATE (YYYY-MM-DD)</Text>
                <TextInput
                  className="bg-[#0A0A0F] text-[#F0F0FF] font-inter border border-white/5 rounded-xl px-4 py-2.5 text-base"
                  placeholder="e.g. 2026-06-20"
                  placeholderTextColor="#4A4A60"
                  value={dueDate}
                  onChangeText={setDueDate}
                />
              </View>
            </ScrollView>

            <TouchableOpacity onPress={handleCreateTask} className="bg-[#6C63FF] py-4 rounded-xl items-center">
              <Text className="text-white font-soraBold">Create Task</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
