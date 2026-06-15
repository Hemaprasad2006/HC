import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Progress } from '../components/ui/Progress';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { request } from '../lib/api';
import {
  TrendingUp,
  Award,
  Calendar,
  Sparkles,
  CheckCircle,
  Clock,
  Droplet,
  Moon
} from 'lucide-react';
import toast from 'react-hot-toast';

export const WeeklyReviewPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadReview = async () => {
    try {
      setLoading(true);
      const res = await request('/reports/weekly-review');
      setData(res);
    } catch (e: any) {
      toast.error(e.message || 'Error compiling weekly review');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReview();
  }, []);

  if (loading && !data) {
    return <SkeletonLoader type="card" className="h-[400px]" />;
  }

  // Calculate habit completion percentage
  const habitPercentage = data?.totalHabits > 0 ? (data.habitsCompleted / (data.totalHabits * 7)) * 100 : 100;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="p-6 rounded-card bg-gradient-to-r from-bg-card via-accent-primary/10 to-accent-secondary/5 border border-white/10 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="absolute top-0 right-0 w-80 h-80 bg-accent-primary/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="space-y-1 relative z-10">
          <span className="text-[10px] font-bold text-accent-primary uppercase tracking-widest font-mono">Recap report</span>
          <h2 className="text-2xl font-display font-extrabold text-text-primary">
            Weekly Symphony Review
          </h2>
          <p className="text-xs text-text-secondary">
            Time period: <strong>{data?.weekStart} — {data?.weekEnd}</strong>. Orchestrator diagnostic checks complete.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={loadReview} className="relative z-10 font-bold text-xs">
          🔄 Refresh Diagnostic
        </Button>
      </div>

      {/* Grid Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Habit consistency ring */}
        <Card variant="glass" className="flex flex-col items-center justify-center text-center p-6">
          <h3 className="font-display font-bold text-text-primary mb-3">Habit Orchestration</h3>
          <Progress
            value={habitPercentage}
            type="circle"
            size={110}
            strokeWidth={8}
            color="stroke-accent-primary"
          >
            <span className="text-xl font-mono font-black text-text-primary">{Math.round(habitPercentage)}%</span>
            <span className="text-[8px] uppercase tracking-wider text-text-secondary font-bold mt-1">Consistency</span>
          </Progress>
          <div className="text-xs text-text-secondary mt-4 space-y-1">
            <p><strong>{data?.habitsCompleted}</strong> check-ins logged this week</p>
            <p className="text-[10px] text-text-muted">Best Streak: {data?.bestStreak} Days 🔥</p>
          </div>
        </Card>

        {/* Card 2: Biometrics Averages */}
        <Card variant="glass" className="space-y-4 p-6">
          <h3 className="font-display font-bold text-text-primary flex items-center gap-1.5">
            <TrendingUp size={16} className="text-accent-secondary" />
            Biometrics Daily Averages
          </h3>
          
          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center p-2.5 bg-white/[0.01] border border-white/5 rounded-card">
              <span className="flex items-center gap-2 text-text-secondary">
                <Droplet size={14} className="text-accent-secondary" />
                Water Logged
              </span>
              <span className="font-bold text-text-primary">{data?.healthAverages?.water || 0} ml</span>
            </div>

            <div className="flex justify-between items-center p-2.5 bg-white/[0.01] border border-white/5 rounded-card">
              <span className="flex items-center gap-2 text-text-secondary">
                <Moon size={14} className="text-accent-primary" />
                Sleep Duration
              </span>
              <span className="font-bold text-text-primary">{data?.healthAverages?.sleep || 0} Hours</span>
            </div>

            <div className="flex justify-between items-center p-2.5 bg-white/[0.01] border border-white/5 rounded-card">
              <span className="flex items-center gap-2 text-text-secondary">
                <Award size={14} className="text-accent-gold" />
                Daily Steps
              </span>
              <span className="font-bold text-text-primary">{data?.healthAverages?.steps || 0} Steps</span>
            </div>
          </div>
        </Card>

        {/* Card 3: Deep Focus chamber stats */}
        <Card variant="glass" className="flex flex-col justify-between p-6">
          <div className="space-y-3">
            <h3 className="font-display font-bold text-text-primary flex items-center gap-1.5">
              <Clock size={16} className="text-accent-primary" />
              Focus Chamber Logs
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Consolidated deep focus sessions. Time logged inside focus lock mode with ambient audio loops.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 mt-4 text-center font-mono">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-text-secondary font-bold">Total Focused</span>
              <span className="block text-xl font-bold text-accent-primary mt-1">{data?.focusMinutes} mins</span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-text-secondary font-bold">Sessions</span>
              <span className="block text-xl font-bold text-accent-secondary mt-1">{data?.focusSessionsCount}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Review footer message */}
      <Card variant="glass" className="p-5 flex items-start gap-4">
        <CheckCircle className="text-accent-secondary flex-shrink-0 mt-0.5" size={18} />
        <div>
          <h4 className="text-xs font-bold text-text-primary">Diagnostic evaluation complete</h4>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">
            Your orchestration indicators are stable. Establish more daily custom habits to increase overall Life Score averages. Review again next Sunday.
          </p>
        </div>
      </Card>
    </div>
  );
};
