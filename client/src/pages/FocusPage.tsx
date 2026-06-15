import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dropdown } from '../components/ui/Dropdown';
import { Progress } from '../components/ui/Progress';
import { Input } from '../components/ui/Input';
import { useFocusStore } from '../store/focusStore';
import { request } from '../lib/api';
import {
  Compass,
  Play,
  Pause,
  Square,
  Volume2,
  Maximize2,
  Minimize2,
  Sparkles,
  Music,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

export const FocusPage: React.FC = () => {
  const {
    isActive,
    isPaused,
    mode,
    timeRemaining,
    duration,
    taskTitle,
    taskId,
    ambientSound,
    volume,
    roundsCount,
    completedRounds,
    isBreak,
    isFullscreenLock,
    startSession,
    pauseSession,
    resumeSession,
    tick,
    endSession,
    setAmbientSound,
    setVolume,
    setFullscreenLock,
  } = useFocusStore();

  const [setupMode, setSetupMode] = useState<'pomodoro' | 'custom' | 'stopwatch'>('pomodoro');
  const [setupDuration, setSetupDuration] = useState('25');
  const [setupTask, setSetupTask] = useState('');
  const [setupRounds, setSetupRounds] = useState('4');

  const [pendingTasks, setPendingTasks] = useState<any[]>([]);

  useEffect(() => {
    // Load active tasks for dropdown select
    const loadTasks = async () => {
      try {
        const tasks = await request('/tasks');
        setPendingTasks(tasks.filter((t: any) => t.status !== 'done'));
      } catch (e) {}
    };
    loadTasks();
  }, []);

  // Timer Tick Hook
  useEffect(() => {
    let interval: any = null;
    if (isActive && !isPaused) {
      interval = setInterval(() => {
        tick();
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isPaused, tick]);

  // Handle session finished celebration and logging
  useEffect(() => {
    if (isActive && timeRemaining <= 0 && mode !== 'stopwatch') {
      // completed session
      handleCompleteSession();
    }
  }, [timeRemaining, isActive]);

  const handleCompleteSession = async () => {
    try {
      const minutesFinished = mode === 'stopwatch'
        ? Math.round(timeRemaining / 60)
        : (isBreak ? 5 : parseInt(setupDuration));

      if (minutesFinished > 0) {
        await request('/focus/sessions', {
          method: 'POST',
          body: {
            taskId,
            taskTitle: taskTitle || 'Ambient Flow',
            duration: minutesFinished,
            mode,
            rounds: mode === 'pomodoro' ? 1 : 1,
          },
        });
      }

      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
      toast.success('Session logged successfully! Congratulations 🎉');
      
      endSession();
    } catch (e: any) {
      toast.error('Session logging failed');
      endSession();
    }
  };

  const handleStart = () => {
    startSession({
      mode: setupMode,
      duration: parseInt(setupDuration),
      taskTitle: setupTask || 'Ambient Focus Flow',
      taskId: pendingTasks.find(t => t.title === setupTask)?.id || null,
      rounds: setupMode === 'pomodoro' ? parseInt(setupRounds) : 1,
    });
  };

  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const pad = (num: number) => num.toString().padStart(2, '0');

    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  const ambientOptions = [
    { value: 'none', label: 'Silence' },
    { value: 'white_noise', label: 'White Noise 🌌' },
    { value: 'pink_noise', label: 'Pink Noise 🌸' },
    { value: 'brown_noise', label: 'Brown Noise 🪵' },
    { value: 'rain', label: 'Rain Forest 🌧️' },
    { value: 'lofi', label: 'Lo-Fi Chill 🎵' },
    { value: 'forest', label: 'Natural Birds 🌿' },
    { value: 'cafe', label: 'Parisian Cafe ☕' },
  ];

  // Calculate progress percentage
  const totalSeconds = mode === 'stopwatch' ? 3600 : (isBreak ? 5 * 60 : parseInt(setupDuration) * 60);
  const progressPct = mode === 'stopwatch' ? 100 : Math.min(((totalSeconds - timeRemaining) / totalSeconds) * 100, 100);

  // Render Fullscreen Focus Lock
  if (isFullscreenLock && isActive) {
    return (
      <div className="fixed inset-0 z-50 bg-bg-dark flex flex-col justify-between p-8 font-mono">
        <div className="flex justify-between items-center w-full max-w-4xl mx-auto">
          <span className="text-xs font-bold text-accent-primary uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
            <Compass size={14} />
            Focus Lock Enabled
          </span>
          <button
            onClick={() => setFullscreenLock(false)}
            className="p-1.5 rounded-full hover:bg-white/5 text-text-secondary hover:text-text-primary"
          >
            <Minimize2 size={18} />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center text-center my-auto space-y-6">
          <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            {isBreak ? '☕ REST BREAK' : `🎯 FOCUSING: ${taskTitle}`}
          </span>
          
          <h1 className="text-8xl font-black font-mono tracking-tight text-text-primary">
            {formatTimer(timeRemaining)}
          </h1>

          {mode === 'pomodoro' && (
            <div className="flex gap-2">
              {Array.from({ length: parseInt(setupRounds) }).map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 w-2 rounded-full ${idx < completedRounds ? 'bg-accent-primary' : 'bg-white/10'}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-6 w-full max-w-lg mx-auto">
          <Button variant="secondary" className="px-6 py-2.5 font-bold" onClick={isPaused ? resumeSession : pauseSession}>
            {isPaused ? <Play size={16} className="inline mr-1" /> : <Pause size={16} className="inline mr-1" />}
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          <Button variant="danger" className="px-6 py-2.5 font-bold" onClick={handleCompleteSession}>
            <Square size={16} className="inline mr-1" />
            End Session
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-display font-extrabold text-text-primary">Deep Focus Chamber</h2>
        <p className="text-xs text-text-secondary mt-1">
          Block visual noise, select ambient soundscapes, and enter Focus Lock.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Timer Display Card (Span 2) */}
        <Card variant="glass" className="lg:col-span-2 flex flex-col justify-between p-8 min-h-[350px]">
          {isActive ? (
            <div className="flex flex-col items-center justify-center text-center my-auto space-y-5">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                {isBreak ? '☕ Rest Break' : `🎯 Active Task: ${taskTitle}`}
              </span>

              {/* Monospace timer */}
              <h1 className="text-6xl font-black font-mono text-text-primary tracking-tight">
                {formatTimer(timeRemaining)}
              </h1>

              {/* Progress ring/linear indicator */}
              <div className="w-full max-w-md">
                <Progress value={progressPct} />
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4 pt-4 w-full justify-center">
                <Button variant="secondary" size="md" onClick={isPaused ? resumeSession : pauseSession} className="px-6 font-bold">
                  {isPaused ? <Play size={14} className="inline mr-1" /> : <Pause size={14} className="inline mr-1" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>
                <Button variant="danger" size="md" onClick={handleCompleteSession} className="px-6 font-bold">
                  <Square size={14} className="inline mr-1" />
                  Complete
                </Button>
                <Button variant="ghost" size="md" onClick={() => setFullscreenLock(true)} className="p-2">
                  <Maximize2 size={16} />
                </Button>
              </div>
            </div>
          ) : (
            // SETUP SESSION INTERFACE
            <div className="space-y-5">
              <h3 className="font-display font-bold text-text-primary">Configure Focus Session</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Dropdown
                  label="Session Mode"
                  options={[
                    { value: 'pomodoro', label: 'Pomodoro Timer (25/5)' },
                    { value: 'custom', label: 'Custom Countdown' },
                    { value: 'stopwatch', label: 'Stopwatch Mode' },
                  ]}
                  value={setupMode}
                  onChange={(v) => {
                    setSetupMode(v as any);
                    if (v === 'pomodoro') setSetupDuration('25');
                  }}
                />

                {setupMode !== 'stopwatch' && (
                  <Input
                    label="Duration (minutes)"
                    type="number"
                    value={setupDuration}
                    onChange={(e) => setSetupDuration(e.target.value)}
                    placeholder="25"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Dropdown
                  label="Focus Task Link"
                  options={[
                    { value: '', label: 'General / Pinned Task' },
                    ...pendingTasks.map(t => ({ value: t.title, label: `📋 ${t.title}` }))
                  ]}
                  value={setupTask}
                  onChange={setSetupTask}
                />

                {setupMode === 'pomodoro' && (
                  <Input
                    label="Rounds Count"
                    type="number"
                    value={setupRounds}
                    onChange={(e) => setSetupRounds(e.target.value)}
                    placeholder="4"
                  />
                )}
              </div>

              <Button variant="primary" className="w-full py-3 font-bold mt-4" onClick={handleStart}>
                🚀 Enter Focus Chamber
              </Button>
            </div>
          )}
        </Card>

        {/* Ambient Soundboard card */}
        <Card variant="glass" className="space-y-5">
          <h3 className="font-display font-bold text-text-primary flex items-center gap-2">
            <Music size={18} className="text-accent-primary" />
            Soundscapes Mixer
          </h3>

          <div className="space-y-4">
            <Dropdown
              label="Ambient Noise Synthesizer"
              options={ambientOptions}
              value={ambientSound}
              onChange={(v) => setAmbientSound(v as any)}
            />

            {ambientSound !== 'none' && (
              <div className="space-y-2 border-t border-white/5 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-text-secondary flex items-center gap-1">
                    <Volume2 size={14} />
                    Chamber Volume
                  </span>
                  <span className="text-xs font-mono font-bold text-text-primary">{(volume * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-accent-primary"
                />
              </div>
            )}
          </div>
          
          <div className="p-4 rounded-card border border-white/5 bg-white/[0.01] text-[10px] text-text-secondary leading-relaxed">
            <span className="font-bold text-text-primary block mb-1">Chamber Synths</span>
            White, pink, and brown noises are generated locally on your processor via Web Audio API. 100% network latency-free.
          </div>
        </Card>
      </div>
    </div>
  );
};
