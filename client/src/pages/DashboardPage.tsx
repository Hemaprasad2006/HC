import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Progress } from '../components/ui/Progress';
import { Button } from '../components/ui/Button';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { useAuthStore } from '../store/authStore';
import { request } from '../lib/api';
import {
  Flame,
  Droplet,
  Compass,
  CheckCircle,
  Plus,
  PlusCircle,
  Calendar,
  CloudSun,
  AlertCircle
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as ChartTooltip } from 'recharts';
import toast from 'react-hot-toast';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Local weather caching
  const [weather, setWeather] = useState({ temp: '22°C', cond: 'Sunny 🌤️' });

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await request('/reports/dashboard');
      setData(res);
    } catch (e: any) {
      toast.error(e.message || 'Error loading dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    
    // Fetch local client weather from Open-Meteo based on geolocation (default to NYC if blocked)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
          if (wRes.ok) {
            const wData = await wRes.json();
            const temp = wData.current_weather.temperature;
            const code = wData.current_weather.weathercode;
            let condition = 'Cloudy ⛅';
            if (code === 0) condition = 'Sunny ☀️';
            else if (code >= 1 && code <= 3) condition = 'Clear Sky 🌤️';
            else if (code >= 51 && code <= 67) condition = 'Rainy 🌧️';
            setWeather({ temp: `${Math.round(temp)}°C`, cond: condition });
          }
        } catch (e) {}
      },
      () => {
        // default NYC
      }
    );
  }, []);

  const handleQuickAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      await request('/tasks', {
        method: 'POST',
        body: { title: newTaskTitle, priority: 4 },
      });
      toast.success('Task logged in console!');
      setNewTaskTitle('');
      loadDashboard();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleLogWaterQuick = async () => {
    try {
      await request('/health/water', {
        method: 'POST',
        body: { amount: 250 },
      });
      toast.success('+250ml Water logged!');
      loadDashboard();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <SkeletonLoader className="h-10 w-1/3" />
          <SkeletonLoader className="h-10 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SkeletonLoader type="card" />
          <SkeletonLoader type="card" />
          <SkeletonLoader type="card" />
        </div>
        <SkeletonLoader type="list" className="mt-8" />
      </div>
    );
  }

  // Calculate Life Score color mapping
  let lifeScoreColor = 'stroke-accent-primary';
  if (data?.lifeScore >= 80) lifeScoreColor = 'stroke-accent-secondary';
  else if (data?.lifeScore < 50) lifeScoreColor = 'stroke-accent-warm';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Welcome Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-display font-extrabold tracking-tight text-text-primary">
            {data?.greeting || `Hello, ${user?.name}`}
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            "Your life, orchestrated." Experience complete cognitive synchronization.
          </p>
        </div>
        
        {/* Weather Widget */}
        <div className="flex items-center gap-3 bg-bg-card border border-white/10 px-4 py-2 rounded-full glass-panel shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
          <CloudSun size={18} className="text-accent-secondary" />
          <span className="text-xs font-semibold text-text-secondary">{weather.cond}</span>
          <span className="text-xs font-mono font-bold text-text-primary border-l border-white/10 pl-2">{weather.temp}</span>
        </div>
      </div>

      {/* Main 3-Column Deck Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Today's Summary */}
        <Card variant="glass" className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-text-primary">Today's Summary</h3>
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold">Ring Balance</span>
          </div>

          <div className="flex flex-col items-center justify-center py-4 text-center">
            <Progress value={data?.habitsRate || 0} type="circle" size={130} strokeWidth={10} color="stroke-accent-primary">
              <span className="text-2xl font-mono font-black text-text-primary">{Math.round(data?.habitsRate || 0)}%</span>
              <span className="text-[9px] uppercase tracking-wider text-text-secondary font-bold mt-1">Habits Done</span>
            </Progress>
          </div>

          {/* Pinned Focus Task */}
          <div className="border-t border-white/5 pt-4">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-2">Pinnned Priority Task</span>
            {data?.pinnedTask ? (
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-card flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-text-primary truncate">{data.pinnedTask.title}</p>
                  <p className="text-[10px] text-text-secondary mt-0.5">Priority P{data.pinnedTask.priority} — {data.pinnedTask.project || 'General'}</p>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full" onClick={() => navigate('/tasks')}>
                  <CheckCircle size={16} className="text-text-secondary hover:text-accent-secondary transition-colors" />
                </Button>
              </div>
            ) : (
              <p className="text-xs text-text-muted italic">No active tasks pinned. Add a task to initialize focus.</p>
            )}
          </div>
        </Card>

        {/* Column 2: Quick Add Panel */}
        <Card variant="glass" className="space-y-5">
          <h3 className="font-display font-bold text-text-primary">Console Quick Logs</h3>

          {/* Quick task form */}
          <form onSubmit={handleQuickAddTask} className="space-y-2">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Log a task</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="+ Add task immediately..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="flex-1 py-1.5 px-3 glass-input text-xs"
              />
              <Button type="submit" variant="secondary" size="sm" className="p-2">
                <Plus size={14} />
              </Button>
            </div>
          </form>

          {/* Hydration quick log */}
          <div className="border-t border-white/5 pt-4 space-y-2">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Hydration logging</label>
            <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-card">
              <div className="flex items-center gap-2.5">
                <Droplet size={18} className="text-accent-secondary" />
                <div>
                  <p className="text-xs font-bold text-text-primary">Water Intake</p>
                  <p className="text-[10px] text-text-secondary mt-0.5">Goal: 2L (2000ml)</p>
                </div>
              </div>
              <Button variant="primary" size="sm" onClick={handleLogWaterQuick} className="px-2.5 py-1 text-xs">
                +250ml Glass
              </Button>
            </div>
          </div>

          {/* Active Focus mode button */}
          <div className="border-t border-white/5 pt-4">
            <Button
              variant="secondary"
              className="w-full flex items-center justify-center gap-2 text-xs py-2 border-dashed border-accent-primary/30"
              onClick={() => navigate('/focus')}
            >
              <Compass size={16} className="text-accent-primary" />
              Initialize Focus chamber
            </Button>
          </div>
        </Card>

        {/* Column 3: Life Score & Streaks */}
        <Card variant="glass" className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-text-primary">Life Score OS</h3>
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold">Health Composite</span>
          </div>

          <div className="flex items-center gap-4 py-1">
            <Progress value={data?.lifeScore || 0} type="circle" size={85} strokeWidth={7} color={lifeScoreColor}>
              <span className="text-xl font-mono font-black text-text-primary">{data?.lifeScore || 0}</span>
            </Progress>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-accent-gold">
                <Flame size={16} fill="currentColor" />
                <span className="text-sm font-mono font-bold">{data?.streak || 0} Day Streak</span>
              </div>
              <p className="text-[10px] text-text-secondary leading-relaxed">
                Aggregates habits completion, water logs, sleep indices, and tasks done today. Keep it above 80!
              </p>
            </div>
          </div>

          {/* Recharts Weekly Trend Line Chart */}
          <div className="border-t border-white/5 pt-4">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-2">7-Day Life Score Trend</span>
            <div className="h-28 w-full font-mono text-[9px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.weeklyTrend || []} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6C63FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" stroke="#4A4A60" tickLine={false} />
                  <YAxis stroke="#4A4A60" domain={[0, 100]} tickLine={false} />
                  <ChartTooltip
                    contentStyle={{
                      background: '#111118',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      color: '#F0F0FF',
                      fontSize: '10px',
                    }}
                  />
                  <Area type="monotone" dataKey="lifeScore" stroke="#6C63FF" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Sections: Events & Quotes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upcoming events (Span 2) */}
        <Card variant="glass" className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-text-primary">Upcoming Events Matrix</h3>
            <Button variant="ghost" size="sm" className="text-xs flex items-center gap-1.5" onClick={() => navigate('/calendar')}>
              <Calendar size={14} />
              Open calendar
            </Button>
          </div>

          <div className="space-y-3">
            {data?.upcomingEvents?.length === 0 ? (
              <p className="text-xs text-text-muted italic py-6 text-center">No upcoming events scheduled. Time is free!</p>
            ) : (
              data?.upcomingEvents?.map((e: any) => (
                <div key={e.id} className="p-3 bg-white/[0.01] border border-white/5 rounded-card flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: e.color || '#6C63FF' }} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text-primary truncate">{e.title}</p>
                      <p className="text-[10px] text-text-secondary mt-0.5 truncate">{e.description || 'Calendar Event'}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-text-muted font-bold bg-white/5 px-2 py-1 rounded">
                    {new Date(e.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Motivational rotating quote */}
        <Card variant="glass" className="flex flex-col justify-center text-center p-6 bg-gradient-to-br from-bg-card to-accent-primary/5">
          <span className="text-2xl font-serif text-accent-primary opacity-60">“</span>
          <p className="text-sm font-semibold text-text-primary leading-relaxed px-4">
            {data?.quote?.text || "Your life does not get better by chance, it gets better by change."}
          </p>
          <span className="text-xs font-bold text-text-secondary mt-3">— {data?.quote?.author || "Jim Rohn"}</span>
        </Card>
      </div>
    </div>
  );
};
