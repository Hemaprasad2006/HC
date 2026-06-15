import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Dropdown } from '../components/ui/Dropdown';
import { EmojiPicker } from '../components/ui/EmojiPicker';
import { Badge } from '../components/ui/Badge';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { EmptyState } from '../components/ui/EmptyState';
import { request } from '../lib/api';
import {
  Plus,
  Flame,
  Check,
  Calendar,
  Trash2,
  Archive,
  Info,
  Clock,
  Compass,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { format, subDays, isSameDay, eachDayOfInterval, startOfDay } from 'date-fns';
import toast from 'react-hot-toast';

export const HabitsPage: React.FC = () => {
  const [habits, setHabits] = useState<any[]>([]);
  const [remainingFreezes, setRemainingFreezes] = useState(1);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<any>(null);
  const [habitHistory, setHabitHistory] = useState<any>(null);

  // Form state
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🧘');
  const [color, setColor] = useState('#6C63FF');
  const [category, setCategory] = useState('Mind');
  const [frequency, setFrequency] = useState('daily');
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [reminderTime, setReminderTime] = useState('08:00');

  const loadHabits = async () => {
    try {
      setLoading(true);
      const data = await request('/habits');
      setHabits(data.habits);
      setRemainingFreezes(data.remainingFreezes);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load habits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHabits();

    const query = new URLSearchParams(window.location.search);
    if (query.get('create') === 'true') {
      setIsCreateOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleCheckIn = async (habitId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent opening detail modal
    try {
      const res = await request(`/habits/${habitId}/checkin`, {
        method: 'POST',
      });

      if (res.checkedIn) {
        // Satisfying confetti burst
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 }
        });

        // Full screen celebration on milestones (7, 14, 30, 100)
        if (res.milestoneAchieved) {
          toast.success(`🔥 Streak milestone achieved! ${res.milestoneAchieved} Days!`, {
            duration: 5000,
            icon: '🎉',
          });

          // Multi-angle confetti celebration
          const end = Date.now() + (3 * 1000);
          const interval = setInterval(() => {
            if (Date.now() > end) return clearInterval(interval);
            confetti({ startVelocity: 30, spread: 360, ticks: 60, origin: { x: Math.random(), y: Math.random() - 0.2 } });
          }, 200);
        } else {
          toast.success('Habit checked in!');
        }
      } else {
        toast.success('Check-in undone');
      }

      loadHabits();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleFreeze = async (habitId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await request(`/habits/${habitId}/freeze`, {
        method: 'POST',
      });
      toast.success(`Streak frozen! Freezes remaining: ${res.remainingFreezes}`);
      loadHabits();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await request('/habits', {
        method: 'POST',
        body: {
          name,
          emoji,
          color,
          category,
          frequency,
          customDays,
          reminderTime,
        },
      });

      toast.success('Habit initialized!');
      setIsCreateOpen(false);
      
      // Reset form
      setName('');
      setEmoji('🧘');
      setColor('#6C63FF');
      setReminderTime('08:00');
      setCustomDays([]);

      loadHabits();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleOpenDetails = async (habit: any) => {
    setSelectedHabit(habit);
    setIsDetailOpen(true);
    try {
      const data = await request(`/habits/${habit.id}/history`);
      setHabitHistory(data);
    } catch (e) {
      toast.error('Error loading history');
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (!window.confirm('De-initialize this habit? History logs will be deleted.')) return;
    try {
      await request(`/habits/${habitId}`, {
        method: 'DELETE',
      });
      toast.success('Habit deleted');
      setIsDetailOpen(false);
      loadHabits();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Helper to check if checked in today
  const isCheckedInToday = (habit: any) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return habit.checkIns.some((c: any) => format(new Date(c.date), 'yyyy-MM-dd') === todayStr);
  };

  const getWeekdaysList = () => {
    return [
      { id: 0, label: 'Su' },
      { id: 1, label: 'Mo' },
      { id: 2, label: 'Tu' },
      { id: 3, label: 'We' },
      { id: 4, label: 'Th' },
      { id: 5, label: 'Fr' },
      { id: 6, label: 'Sa' },
    ];
  };

  const toggleCustomDay = (id: number) => {
    if (customDays.includes(id)) {
      setCustomDays(customDays.filter(d => d !== id));
    } else {
      setCustomDays([...customDays, id]);
    }
  };

  // Draw GitHub-style heatmap (last 180 days)
  const renderHeatmap = () => {
    if (!habitHistory) return <SkeletonLoader type="line" />;

    const today = startOfDay(new Date());
    const days = eachDayOfInterval({
      start: subDays(today, 179),
      end: today,
    });

    const checkDates = habitHistory.checkIns.map((c: any) => format(new Date(c.date), 'yyyy-MM-dd'));
    const freezeDates = habitHistory.freezes.map((f: any) => format(new Date(f.date), 'yyyy-MM-dd'));

    return (
      <div className="flex flex-col gap-2 p-4 rounded-card bg-white/[0.01] border border-white/5 font-mono text-[10px]">
        <span className="text-text-secondary font-bold uppercase tracking-wider mb-2">180-Day Sync Matrix</span>
        <div className="flex flex-wrap gap-1">
          {days.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const checked = checkDates.includes(dateStr);
            const frozen = freezeDates.includes(dateStr);
            
            let colorClass = 'bg-white/5';
            let title = `${format(day, 'MMM dd')}: Incomplete`;

            if (checked) {
              colorClass = 'bg-accent-secondary';
              title = `${format(day, 'MMM dd')}: Checked In`;
            } else if (frozen) {
              colorClass = 'bg-accent-gold/45';
              title = `${format(day, 'MMM dd')}: Frozen ❄️`;
            }

            return (
              <div
                key={idx}
                title={title}
                className={`h-3 w-3 rounded-sm transition-colors cursor-pointer ${colorClass} hover:ring-1 hover:ring-white/20`}
              />
            );
          })}
        </div>
        <div className="flex items-center gap-3 text-text-muted mt-2">
          <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-sm bg-white/5" /> Missed</div>
          <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-sm bg-accent-gold/45" /> Frozen</div>
          <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-sm bg-accent-secondary" /> Completed</div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header and top tools */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-extrabold text-text-primary">Habit Orchestrator</h2>
          <p className="text-xs text-text-secondary mt-1">
            Establish routines, secure streaks, and track biometrics consistency.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono font-bold text-accent-gold border border-accent-gold/20 bg-accent-gold/5 px-3 py-1.5 rounded-full flex items-center gap-1">
            ❄️ {remainingFreezes} Freezes
          </span>
          <Button variant="primary" size="sm" className="flex items-center gap-1.5" onClick={() => setIsCreateOpen(true)}>
            <Plus size={16} />
            New Habit
          </Button>
        </div>
      </div>

      {loading && habits.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonLoader type="card" />
          <SkeletonLoader type="card" />
          <SkeletonLoader type="card" />
        </div>
      ) : habits.length === 0 ? (
        <EmptyState
          title="No Habits Initialized"
          description="Establish habits to start generating streaks and calculating composite Life Scores."
          icon={<Flame size={40} className="text-accent-primary opacity-60" />}
          actionLabel="Create First Habit"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {habits.map((h) => {
            const doneToday = isCheckedInToday(h);
            const weeklyCircles = Array.from({ length: 7 }).map((_, i) => {
              const day = subDays(new Date(), 6 - i);
              const dayStr = format(day, 'yyyy-MM-dd');
              const checked = h.checkIns.some((c: any) => format(new Date(c.date), 'yyyy-MM-dd') === dayStr);
              return { checked, label: format(day, 'EEEEE') };
            });

            return (
              <Card
                key={h.id}
                variant="glass"
                className="hover:scale-[1.02] cursor-pointer space-y-4 flex flex-col justify-between"
                onClick={() => handleOpenDetails(h)}
              >
                <div className="space-y-3">
                  {/* Top: Icon, name, category */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl p-2 bg-white/5 rounded-card flex items-center justify-center">{h.emoji}</span>
                      <div>
                        <h4 className="text-sm font-bold text-text-primary">{h.name}</h4>
                        <span className="text-[10px] text-text-secondary uppercase tracking-wider font-extrabold">{h.category}</span>
                      </div>
                    </div>
                    
                    <Badge color="violet" className="font-mono">
                      🔥 {h.streak}d
                    </Badge>
                  </div>

                  {/* 7-Day History Bubbles */}
                  <div className="flex items-center gap-2 border-t border-white/5 pt-3 justify-between">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-text-muted">7-Day Log</span>
                    <div className="flex gap-1.5">
                      {weeklyCircles.map((w, idx) => (
                        <div
                          key={idx}
                          title={w.label}
                          className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[8px] font-bold ${w.checked ? 'bg-accent-secondary text-bg-dark border border-accent-secondary' : 'bg-white/5 text-text-muted border border-white/10'}`}
                        >
                          {w.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex gap-2 border-t border-white/5 pt-3">
                  <Button
                    variant={doneToday ? 'secondary' : 'primary'}
                    size="sm"
                    className="flex-1 py-1.5 font-bold"
                    onClick={(e) => handleCheckIn(h.id, e)}
                  >
                    {doneToday ? '✓ Done' : 'Check In'}
                  </Button>
                  
                  {!doneToday && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="p-2"
                      onClick={(e) => handleFreeze(h.id, e)}
                      disabled={remainingFreezes <= 0}
                      title="Freeze Streak"
                    >
                      ❄️
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Habit Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Initialize Habit">
        <form onSubmit={handleCreateHabit} className="space-y-4">
          <div className="flex gap-4">
            <div className="w-1/4">
              <EmojiPicker label="Icon" value={emoji} onChange={setEmoji} />
            </div>
            <div className="w-3/4">
              <Input
                label="Habit Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Morning Meditation"
                required
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
                value={category}
                onChange={setCategory}
              />
            </div>
            <div className="w-1/2">
              <Dropdown
                label="Frequency"
                options={[
                  { value: 'daily', label: 'Everyday' },
                  { value: 'custom', label: 'Custom Schedule' },
                ]}
                value={frequency}
                onChange={setFrequency}
              />
            </div>
          </div>

          {frequency === 'custom' && (
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-2">Scheduled Days</label>
              <div className="flex gap-2">
                {getWeekdaysList().map((d) => {
                  const selected = customDays.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleCustomDay(d.id)}
                      className={`flex-1 py-2 rounded font-bold text-xs border transition-all ${selected ? 'bg-accent-primary border-accent-primary text-text-primary' : 'bg-white/5 border-white/10 text-text-secondary'}`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <div className="w-1/2">
              <Input
                label="Daily Reminder Time"
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
              />
            </div>
            <div className="w-1/2">
              <Dropdown
                label="Habit Theme Color"
                options={[
                  { value: '#6C63FF', label: 'Violet 🟣' },
                  { value: '#00D4AA', label: 'Mint Green 🟢' },
                  { value: '#FF6B6B', label: 'Coral Red 🔴' },
                  { value: '#FFD166', label: 'Amber Gold 🟡' },
                ]}
                value={color}
                onChange={setColor}
              />
            </div>
          </div>

          <Button type="submit" variant="primary" className="w-full mt-6 py-2.5 font-bold">
            Initialize Habit
          </Button>
        </form>
      </Modal>

      {/* Habit Details Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setHabitHistory(null);
        }}
        title={selectedHabit ? `${selectedHabit.emoji} ${selectedHabit.name}` : 'Habit History'}
        size="lg"
      >
        {selectedHabit && (
          <div className="space-y-6">
            {/* Stats section */}
            <div className="grid grid-cols-3 gap-4 text-center font-mono">
              <div className="p-3 bg-white/5 border border-white/5 rounded-card">
                <span className="block text-text-secondary text-[10px] uppercase font-bold tracking-wider">Current Streak</span>
                <span className="text-xl font-bold text-accent-gold mt-1 block">🔥 {selectedHabit.streak} Days</span>
              </div>
              <div className="p-3 bg-white/5 border border-white/5 rounded-card">
                <span className="block text-text-secondary text-[10px] uppercase font-bold tracking-wider">Longest Streak</span>
                <span className="text-xl font-bold text-accent-primary mt-1 block">⭐ {selectedHabit.longestStreak} Days</span>
              </div>
              <div className="p-3 bg-white/5 border border-white/5 rounded-card">
                <span className="block text-text-secondary text-[10px] uppercase font-bold tracking-wider">Frequency</span>
                <span className="text-xs font-semibold text-text-primary mt-2.5 block uppercase tracking-wider">
                  {selectedHabit.frequency}
                </span>
              </div>
            </div>

            {/* Render Heatmap */}
            {renderHeatmap()}

            {/* Actions */}
            <div className="flex gap-4 border-t border-white/10 pt-6">
              <Button
                variant="danger"
                size="sm"
                className="flex-1 py-2.5 font-bold flex items-center justify-center gap-2"
                onClick={() => handleDeleteHabit(selectedHabit.id)}
              >
                <Trash2 size={16} />
                Delete Habit Record
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 py-2.5 font-bold"
                onClick={() => {
                  toast.success('Habit archiving is a v2 metadata feature.');
                }}
              >
                <Archive size={16} className="inline mr-1" />
                Archive Habit
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
