import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Progress } from '../components/ui/Progress';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { request } from '../lib/api';
import {
  Droplet,
  Moon,
  Footprints,
  Scale,
  Sparkles,
  Info,
  Calendar
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, LineChart, Line } from 'recharts';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export const HealthPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  
  // Water state
  const [waterTotal, setWaterTotal] = useState(0);
  const [waterGoal] = useState(2000); // 2L
  const [waterHistory, setWaterHistory] = useState<any[]>([]);
  const [customWater, setCustomWater] = useState('');

  // Sleep state
  const [sleepLogs, setSleepLogs] = useState<any[]>([]);
  const [bedtime, setBedtime] = useState('');
  const [wakeTime, setWakeTime] = useState('');

  // Steps state
  const [stepGoal] = useState(10000);
  const [todaySteps, setTodaySteps] = useState(0);
  const [stepsHistory, setStepsHistory] = useState<any[]>([]);
  const [logStepsVal, setLogStepsVal] = useState('');

  // Weight state
  const [weightLogs, setWeightLogs] = useState<any[]>([]);
  const [weightInput, setWeightInput] = useState('');
  const [heightInput, setHeightInput] = useState('175'); // default 175cm

  // Score state
  const [healthScore, setHealthScore] = useState<any>({ healthScore: 0, breakdown: { water: { score: 0 }, sleep: { score: 0 }, steps: { score: 0 } } });

  const loadHealthData = async () => {
    try {
      setLoading(true);
      
      // Load water
      const waterData = await request('/health/water');
      setWaterTotal(waterData.total);
      setWaterHistory(waterData.weeklySummary);

      // Load sleep
      const sleepData = await request('/health/sleep?range=7');
      setSleepLogs(sleepData);

      // Load steps
      const stepsData = await request('/health/steps?range=7');
      setStepsHistory(stepsData);
      
      const todayStr = new Date().toISOString().split('T')[0];
      const todayStepsLog = stepsData.find((s: any) => s.loggedAt.split('T')[0] === todayStr);
      setTodaySteps(todayStepsLog ? todayStepsLog.value : 0);

      // Load weight
      const weightData = await request('/health/weight');
      setWeightLogs(weightData);

      // Load health score
      const scoreData = await request('/health/score');
      setHealthScore(scoreData);

    } catch (e: any) {
      toast.error(e.message || 'Error loading biometrics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealthData();
  }, []);

  const handleLogWater = async (amount: number) => {
    try {
      await request('/health/water', {
        method: 'POST',
        body: { amount },
      });
      toast.success(`Logged ${amount}ml water!`);
      loadHealthData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleLogSleep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bedtime || !wakeTime) return;

    try {
      await request('/health/sleep', {
        method: 'POST',
        body: { bedtime, wakeTime },
      });
      toast.success('Sleep session logged!');
      setBedtime('');
      setWakeTime('');
      loadHealthData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleLogSteps = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logStepsVal) return;

    try {
      await request('/health/steps', {
        method: 'POST',
        body: { value: parseInt(logStepsVal) },
      });
      toast.success('Steps logged!');
      setLogStepsVal('');
      loadHealthData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleLogWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightInput) return;

    try {
      const height = parseFloat(heightInput);
      const res = await request('/health/weight', {
        method: 'POST',
        body: { value: parseFloat(weightInput), height },
      });

      toast.success(res.bmi ? `Logged! Calculated BMI: ${res.bmi}` : 'Weight logged');
      setWeightInput('');
      loadHealthData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const waterPercent = Math.min((waterTotal / waterGoal) * 100, 100);
  const stepsPercent = Math.min((todaySteps / stepGoal) * 100, 100);

  // Latest calculated BMI
  const getLatestBMI = () => {
    if (weightLogs.length === 0) return null;
    const latest = weightLogs[weightLogs.length - 1];
    if (latest.note) {
      try {
        return JSON.parse(latest.note).bmi || null;
      } catch (e) {}
    }
    return null;
  };

  const getWaterScore = () => {
    const w = healthScore?.breakdown?.water;
    if (!w) return 0;
    if (w.score !== undefined) return w.score;
    const goal = w.goal || 2000;
    const amount = w.amount || 0;
    return goal > 0 ? Math.round(Math.min(amount / goal, 1) * 100) : 0;
  };

  const getSleepScore = () => {
    const s = healthScore?.breakdown?.sleep;
    if (!s) return 0;
    if (s.score !== undefined) return s.score;
    const goal = s.goal || 8;
    const hours = s.hours || 0;
    return goal > 0 ? Math.round(Math.min(hours / goal, 1) * 100) : 0;
  };

  const getStepsScore = () => {
    const st = healthScore?.breakdown?.steps;
    if (!st) return 0;
    if (st.score !== undefined) return st.score;
    const goal = st.goal || 8000;
    const count = st.count || 0;
    return goal > 0 ? Math.round(Math.min(count / goal, 1) * 100) : 0;
  };

  if (loading && waterHistory.length === 0) {
    return <SkeletonLoader type="card" className="h-[500px]" />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Health Score gauge overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card variant="glass" className="lg:col-span-1 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-bg-card to-accent-secondary/5">
          <h3 className="font-display font-bold text-text-primary mb-3">Daily Health Score</h3>
          <Progress
            value={healthScore.healthScore}
            type="circle"
            size={120}
            strokeWidth={9}
            color="stroke-accent-secondary"
          >
            <span className="text-2xl font-mono font-black text-text-primary">{healthScore.healthScore}</span>
            <span className="text-[8px] uppercase tracking-wider text-text-secondary font-bold mt-1">Composite</span>
          </Progress>
          <div className="flex gap-3 text-[10px] font-mono text-text-secondary mt-4">
            <div>💧 {getWaterScore()}%</div>
            <div>🛌 {getSleepScore()}%</div>
            <div>🚶 {getStepsScore()}%</div>
          </div>
        </Card>

        {/* Quick summary notes / tips */}
        <Card variant="glass" className="lg:col-span-3 flex flex-col justify-between p-6">
          <div className="flex gap-3 items-start">
            <div className="p-2.5 bg-accent-secondary/10 rounded-full text-accent-secondary flex-shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-text-primary">Orchestrator Health Engine</h4>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Biometrics signals help Life Director calculate aggregate score indexes. Complete your daily water intake (2L), log 8 hours of sleep, and track 10,000 steps.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/5 pt-4 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-accent-secondary">✓</span>
              <span>Water Hydration: {waterTotal} / {waterGoal} ml</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent-primary">✓</span>
              <span>Sleep Score: {getSleepScore()} / 100</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent-gold">✓</span>
              <span>Steps Target: {todaySteps} / {stepGoal}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Health Details layout tabs: Water & Sleep */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* WATER TRACKER */}
        <Card variant="glass" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-text-primary flex items-center gap-2">
              <Droplet size={18} className="text-accent-secondary" />
              Hydration Chamber
            </h3>
            <span className="text-[10px] font-mono font-bold text-text-secondary">{waterPercent.toFixed(0)}% Done</span>
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-center justify-center p-4">
            {/* Animated filling bottle */}
            <div className="relative h-44 w-20 border-2 border-white/20 rounded-[24px] overflow-hidden bg-white/[0.02] flex items-end">
              <div
                className="w-full bg-accent-secondary transition-all duration-700 ease-out"
                style={{ height: `${waterPercent}%` }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                <span className="font-mono text-sm font-black text-text-primary">{waterTotal}ml</span>
                <span className="text-[8px] uppercase tracking-wider text-text-secondary font-bold mt-1">Hydrated</span>
              </div>
            </div>

            {/* Quick logs buttons */}
            <div className="flex flex-col gap-2 flex-1 w-full max-w-[200px]">
              <label className="text-[9px] uppercase tracking-wider font-extrabold text-text-muted">Tap to drink</label>
              <Button variant="secondary" size="sm" onClick={() => handleLogWater(250)} className="text-xs">
                + 250ml Glass 🥛
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleLogWater(500)} className="text-xs">
                + 500ml Bottle 🫙
              </Button>
              <div className="flex gap-1">
                <input
                  type="number"
                  placeholder="Custom ml..."
                  value={customWater}
                  onChange={(e) => setCustomWater(e.target.value)}
                  className="w-2/3 py-1.5 px-3 glass-input text-xs"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const val = parseInt(customWater);
                    if (val > 0) {
                      handleLogWater(val);
                      setCustomWater('');
                    }
                  }}
                  className="w-1/3 text-xs p-0"
                >
                  Log
                </Button>
              </div>
            </div>
          </div>

          {/* Weekly Water history */}
          <div className="h-32 w-full font-mono text-[9px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <XAxis dataKey="label" stroke="#4A4A60" tickLine={false} />
                <YAxis stroke="#4A4A60" tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#111118',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    fontSize: '10px',
                  }}
                />
                <Bar dataKey="amount" fill="#00D4AA" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* SLEEP TRACKER */}
        <Card variant="glass" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-text-primary flex items-center gap-2">
              <Moon size={18} className="text-accent-primary" />
              Sleep Quality Chamber
            </h3>
            <span className="text-[10px] font-mono font-bold text-text-secondary">Weekly Logs</span>
          </div>

          <form onSubmit={handleLogSleep} className="space-y-3 p-3 bg-white/[0.01] border border-white/5 rounded-card">
            <div className="flex gap-4">
              <div className="w-1/2">
                <Input
                  label="Bedtime Time"
                  type="datetime-local"
                  value={bedtime}
                  onChange={(e) => setBedtime(e.target.value)}
                  required
                />
              </div>
              <div className="w-1/2">
                <Input
                  label="Wake Time"
                  type="datetime-local"
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" variant="primary" className="w-full py-2 text-xs font-bold">
              ✓ Log Sleep Session
            </Button>
          </form>

          {/* Sleep duration history bar chart */}
          <div className="h-36 w-full font-mono text-[9px] pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sleepLogs} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <XAxis dataKey="loggedAt" tickFormatter={(str) => format(new Date(str), 'EEE')} stroke="#4A4A60" tickLine={false} />
                <YAxis stroke="#4A4A60" label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: '#4A4A60' }} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#111118',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    fontSize: '10px',
                  }}
                />
                <Bar dataKey="duration" radius={[4, 4, 0, 0]}>
                  {sleepLogs.map((entry, index) => {
                    let fill = '#6C63FF'; // good sleep
                    if (entry.score < 60) fill = '#FF6B6B'; // poor sleep
                    else if (entry.score < 80) fill = '#FFD166'; // okay sleep
                    return <Cell key={`cell-${index}`} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Steps & Weight Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* STEPS TARGET */}
        <Card variant="glass" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-text-primary flex items-center gap-2">
              <Footprints size={18} className="text-accent-gold" />
              Steps Counter
            </h3>
            <span className="text-[10px] font-mono font-bold text-text-secondary">{stepsPercent.toFixed(0)}% Done</span>
          </div>

          <div className="flex gap-6 items-center justify-center p-4">
            <Progress value={stepsPercent} type="circle" size={90} strokeWidth={8} color="stroke-accent-gold">
              <span className="text-sm font-mono font-bold text-text-primary">{todaySteps}</span>
              <span className="text-[7px] uppercase tracking-wider text-text-secondary font-bold">Steps</span>
            </Progress>

            <form onSubmit={handleLogSteps} className="flex-1 flex flex-col gap-2 max-w-[200px]">
              <label className="text-[9px] uppercase tracking-wider font-extrabold text-text-muted">Log Steps Today</label>
              <input
                type="number"
                placeholder="E.g., 8500 steps..."
                value={logStepsVal}
                onChange={(e) => setLogStepsVal(e.target.value)}
                className="py-1.5 px-3 glass-input text-xs"
              />
              <Button type="submit" variant="secondary" size="sm" className="text-xs">
                Log steps
              </Button>
            </form>
          </div>
        </Card>

        {/* WEIGHT LOGGER & BMI CALCULATOR */}
        <Card variant="glass" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-text-primary flex items-center gap-2">
              <Scale size={18} className="text-accent-primary" />
              Body Stats Tracker
            </h3>
            {getLatestBMI() && (
              <span className="text-xs font-mono font-bold text-accent-secondary bg-accent-secondary/5 px-2.5 py-1 rounded border border-accent-secondary/10">
                BMI: {getLatestBMI()}
              </span>
            )}
          </div>

          <form onSubmit={handleLogWeight} className="flex gap-3 items-end p-3 bg-white/[0.01] border border-white/5 rounded-card">
            <div className="w-1/3">
              <Input
                label="Weight (kg)"
                type="number"
                step="0.1"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                placeholder="78"
                required
              />
            </div>
            <div className="w-1/3">
              <Input
                label="Height (cm)"
                type="number"
                value={heightInput}
                onChange={(e) => setHeightInput(e.target.value)}
                placeholder="175"
              />
            </div>
            <div className="w-1/3">
              <Button type="submit" variant="primary" size="sm" className="w-full py-2.5 font-bold text-xs">
                Log stats
              </Button>
            </div>
          </form>

          {/* Weight trend line chart */}
          {weightLogs.length > 0 && (
            <div className="h-28 w-full font-mono text-[9px] pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightLogs} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <XAxis dataKey="loggedAt" tickFormatter={(str) => format(new Date(str), 'MMM dd')} stroke="#4A4A60" tickLine={false} />
                  <YAxis stroke="#4A4A60" domain={['dataMin - 2', 'dataMax + 2']} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: '#111118',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      fontSize: '10px',
                    }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#6C63FF" strokeWidth={2.5} dot={{ fill: '#6C63FF' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
