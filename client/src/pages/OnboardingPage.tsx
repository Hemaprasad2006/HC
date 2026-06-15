import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Dropdown } from '../components/ui/Dropdown';
import { EmojiPicker } from '../components/ui/EmojiPicker';
import { Check, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const { theme, setTheme } = useThemeStore();

  const [step, setStep] = useState(1);

  // Step 1 State: Interests
  const [interests, setInterests] = useState<string[]>([]);
  const interestOptions = [
    { id: 'habits', label: 'Habit Tracking 🧘', desc: 'Build consistency on key daily actions' },
    { id: 'tasks', label: 'Task Management 📋', desc: 'Organize priorities with Kanban boards' },
    { id: 'health', label: 'Biometrics Health 💧', desc: 'Track water intake, sleep quality, and steps' },
    { id: 'focus', label: 'Deep Focus Chamber ⏱️', desc: 'Block out noise with Pomodoro soundscapes' },
    { id: 'calendar', label: 'Time Matrix Calendar 📅', desc: 'Unify tasks and custom events in one view' },
  ];

  // Step 2 State: First Habit
  const [habitName, setHabitName] = useState('Morning Meditation');
  const [habitEmoji, setHabitEmoji] = useState('🧘');
  const [habitCategory, setHabitCategory] = useState('Mind');
  const [habitTime, setHabitTime] = useState('08:00');

  // Step 3 State: Permissions
  const [pushEnabled, setPushEnabled] = useState(false);

  const toggleInterest = (id: string) => {
    if (interests.includes(id)) {
      setInterests(interests.filter((i) => i !== id));
    } else {
      setInterests([...interests, id]);
    }
  };

  const handleRequestPushPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('This browser does not support desktop notifications');
      return;
    }
    
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPushEnabled(true);
        toast.success('Push notifications enabled!');
      } else {
        toast.error('Permission denied for push notifications');
      }
    } catch (e) {
      toast.error('Failed setting notification permissions');
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFinish = async () => {
    // 1. Save onboarding habit to backend database
    try {
      const token = useAuthStore.getState().accessToken;
      await fetch('http://localhost:3000/api/habits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: habitName,
          emoji: habitEmoji,
          color: '#6C63FF',
          category: habitCategory,
          frequency: 'daily',
          reminderTime: habitTime,
        }),
      });

      // Update local profile preferences if user timezone/theme is changed
      updateUser({ theme });
      toast.success('OS Initialized! Opening command deck...');
      navigate('/dashboard');
    } catch (e) {
      // Fallback redirect if backend fails
      navigate('/dashboard');
    }
  };

  const progressPct = (step / 3) * 100;

  return (
    <div className="min-h-screen bg-bg-dark text-text-primary flex flex-col justify-between p-6 md:p-12 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-accent-primary/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between max-w-2xl mx-auto w-full mb-6">
        <span className="text-lg font-display font-extrabold text-accent-primary">🧭 Life Director</span>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
        >
          Skip onboarding
        </button>
      </div>

      {/* Progress Bar */}
      <div className="max-w-2xl mx-auto w-full mb-8">
        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-accent-primary h-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-text-muted font-bold uppercase tracking-wider mt-2">
          <span>1. Priorities</span>
          <span>2. First Habit</span>
          <span>3. Calibration</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center max-w-2xl mx-auto w-full mb-12">
        <div className="w-full glass-panel bg-bg-card/40 p-8 shadow-2xl space-y-6">
          {/* STEP 1: Categories selector */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-display font-extrabold text-text-primary flex items-center gap-2">
                  <Sparkles size={20} className="text-accent-primary animate-pulse" />
                  What do you want to improve?
                </h3>
                <p className="text-xs text-text-secondary mt-1">Select all areas you want to organize inside Life Director</p>
              </div>

              <div className="space-y-3">
                {interestOptions.map((opt) => {
                  const selected = interests.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleInterest(opt.id)}
                      className={`flex items-start gap-4 p-4 rounded-card border text-left w-full transition-all duration-200 ${selected ? 'bg-accent-primary/10 border-accent-primary shadow-[0_4px_16px_rgba(108,99,255,0.05)]' : 'bg-white/[0.01] border-white/5 hover:border-white/10'}`}
                    >
                      <div className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center ${selected ? 'bg-accent-primary border-accent-primary text-text-primary' : 'border-white/10'}`}>
                        {selected && <Check size={14} />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-text-primary">{opt.label}</h4>
                        <p className="text-xs text-text-secondary mt-0.5">{opt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Configure First Habit */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-display font-extrabold text-text-primary">
                  Establish Your First Habit
                </h3>
                <p className="text-xs text-text-secondary mt-1">Successful life orchestration starts with small, daily routines</p>
              </div>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-1/4">
                    <EmojiPicker
                      label="Icon"
                      value={habitEmoji}
                      onChange={setHabitEmoji}
                    />
                  </div>
                  <div className="w-3/4">
                    <Input
                      label="Habit Name"
                      value={habitName}
                      onChange={(e) => setHabitName(e.target.value)}
                      placeholder="Morning Meditation"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-1/2">
                    <Dropdown
                      label="Category"
                      options={[
                        { value: 'Mind', label: 'Mind 🧘' },
                        { value: 'Body', label: 'Body 🏋️' },
                        { value: 'Work', label: 'Work 💼' },
                        { value: 'Health', label: 'Health 💧' },
                        { value: 'Social', label: 'Social 🌿' },
                      ]}
                      value={habitCategory}
                      onChange={setHabitCategory}
                    />
                  </div>
                  <div className="w-1/2">
                    <Input
                      label="Daily Reminder Time"
                      type="time"
                      value={habitTime}
                      onChange={(e) => setHabitTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Calibration & Theme Selector */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-display font-extrabold text-text-primary">
                  OS Calibration & Interface
                </h3>
                <p className="text-xs text-text-secondary mt-1">Customize visual themes and notifications for your Life Director</p>
              </div>

              <div className="space-y-5">
                {/* Theme Choice */}
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-3">System Aesthetics</label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setTheme('dark')}
                      className={`flex-1 p-4 rounded-card border bg-[#0A0A0F] text-center font-bold text-sm text-text-primary transition-all duration-200 ${theme === 'dark' ? 'border-accent-primary ring-2 ring-accent-primary/20' : 'border-white/10 hover:border-white/20'}`}
                    >
                      🌌 Space Dark
                    </button>
                    <button
                      onClick={() => setTheme('light')}
                      className={`flex-1 p-4 rounded-card border bg-[#F8F8FF] text-center font-bold text-sm text-text-primary-light transition-all duration-200 ${theme === 'light' ? 'border-accent-primary ring-2 ring-accent-primary/20' : 'border-white/10 hover:border-white/20'}`}
                    >
                      ☀️ Symphony Light
                    </button>
                  </div>
                </div>

                {/* Notifications Prompt */}
                <div className="p-4 rounded-card border border-white/5 bg-white/[0.01] flex items-start gap-4">
                  <div className="p-2 bg-accent-primary/10 rounded-full text-accent-primary flex-shrink-0">
                    <ShieldAlert size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-text-primary">Push Alerts via Service Worker</h4>
                    <p className="text-xs text-text-secondary mt-0.5">Receive habit check-ins and hydration alerts in the background.</p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="mt-3"
                      onClick={handleRequestPushPermission}
                      disabled={pushEnabled}
                    >
                      {pushEnabled ? '✓ Permission Granted' : 'Enable Push Notifications'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Nav Controls */}
          <div className="flex justify-between border-t border-white/10 pt-4 mt-6">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1}
              className="px-4 text-xs font-bold"
            >
              Back
            </Button>
            <Button
              variant="primary"
              onClick={handleNext}
              className="flex items-center gap-2 px-5 font-bold text-xs"
            >
              {step === 3 ? 'Initialize Workspace' : 'Continue'}
              <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center font-mono text-[10px] text-text-muted max-w-2xl mx-auto w-full">
        Step {step} of 3. Skip is available in top right.
      </div>
    </div>
  );
};
