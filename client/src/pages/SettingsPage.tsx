import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Tabs } from '../components/ui/Tabs';
import { Dropdown } from '../components/ui/Dropdown';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { request } from '../lib/api';
import {
  User as UserIcon,
  Settings as SettingsIcon,
  Shield,
  Download,
  Calendar,
  Trash2,
  Moon,
  Sun
} from 'lucide-react';
import toast from 'react-hot-toast';

export const SettingsPage: React.FC = () => {
  const { user, updateUser, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();

  const [activeTab, setActiveTab] = useState('profile');

  // Forms states
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');

  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await request('/user/profile', {
        method: 'PATCH',
        body: { name, email, timezone },
      });
      updateUser(data);
      toast.success('System profile updated!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerDailyDigestTest = async () => {
    try {
      toast.loading('Compiling digest logs...');
      const res = await request('/reports/trigger-digest', { method: 'POST' });
      toast.dismiss();
      toast.success('Daily Digest triggered! View server/digest-logs/ files.');
    } catch (e: any) {
      toast.dismiss();
      toast.error(e.message);
    }
  };

  const handleExportICS = () => {
    const token = useAuthStore.getState().accessToken;
    // Download standard .ics file from server endpoint
    window.open(`http://localhost:3000/api/events/export?token=${token}`, '_blank');
    toast.success('iCal export completed! Check downloads.');
  };

  const handleExportJSON = async () => {
    const token = useAuthStore.getState().accessToken;
    window.open(`http://localhost:3000/api/user/export?token=${token}`, '_blank');
    toast.success('JSON backup exported!');
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('WARNING: Irreversibly delete this user account? All habits, tasks, sleep logs, and calendar data will be erased.')) return;
    try {
      await request('/user/account', { method: 'DELETE' });
      toast.success('Account de-registered');
      logout();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const tabOptions = [
    { id: 'profile', label: 'Console Profile' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'danger', label: 'System Security' },
  ];

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      <div>
        <h2 className="text-2xl font-display font-extrabold text-text-primary">System Settings</h2>
        <p className="text-xs text-text-secondary mt-1">
          Calibrate timezones, configure calendar integrations, and manage data exports.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-1/4">
          <Tabs
            options={tabOptions}
            activeTab={activeTab}
            onChange={setActiveTab}
            className="flex-col border-b-0 border-r border-white/5 space-y-1 items-start"
          />
        </div>

        {/* Tab content panel */}
        <div className="w-full md:w-3/4">
          <Card variant="glass" className="p-6">
            
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <h3 className="font-display font-bold text-sm text-text-primary flex items-center gap-1.5 border-b border-white/5 pb-3">
                  <UserIcon size={16} className="text-accent-primary" />
                  Console Profile
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Operator Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Oliver Thorne"
                    required
                  />
                  <Input
                    label="Registry Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="oliver@lifedirector.app"
                    required
                  />
                </div>

                <Dropdown
                  label="Local Timezone"
                  options={[
                    { value: 'UTC', label: 'Universal Coordinate Time (UTC)' },
                    { value: 'America/New_York', label: 'Eastern Standard Time (EST)' },
                    { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
                    { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
                  ]}
                  value={timezone}
                  onChange={setTimezone}
                />

                <Button type="submit" variant="primary" className="py-2 px-6 font-bold" disabled={loading}>
                  {loading ? 'Saving...' : 'Update Settings'}
                </Button>
              </form>
            )}

            {/* PREFERENCES TAB */}
            {activeTab === 'preferences' && (
              <div className="space-y-5">
                <h3 className="font-display font-bold text-sm text-text-primary flex items-center gap-1.5 border-b border-white/5 pb-3">
                  <SettingsIcon size={16} className="text-accent-primary" />
                  Interface Calibration
                </h3>

                <div className="space-y-3">
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">Visual Theme Mode</label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setTheme('dark')}
                      className={`flex-1 p-4 rounded-card border bg-[#0A0A0F] text-center font-bold text-xs text-text-primary transition-all duration-200 ${theme === 'dark' ? 'border-accent-primary' : 'border-white/10'}`}
                    >
                      🌌 Space Dark Mode
                    </button>
                    <button
                      onClick={() => setTheme('light')}
                      className={`flex-1 p-4 rounded-card border bg-[#F8F8FF] text-center font-bold text-xs text-text-primary-light transition-all duration-200 ${theme === 'light' ? 'border-accent-primary' : 'border-white/10'}`}
                    >
                      ☀️ Symphony Light Mode
                    </button>
                  </div>
                </div>

                {/* Daily digest test panel */}
                <div className="p-4 rounded-card border border-white/5 bg-white/[0.01] space-y-3">
                  <h4 className="text-xs font-bold text-text-primary">Daily Digest Diagnostic Check</h4>
                  <p className="text-[10px] text-text-secondary leading-relaxed">
                    Trigger the daily digest cron task manually. This compiles today's tasks/habits and writes a formatted HTML email layout inside the backend folders.
                  </p>
                  <Button variant="secondary" size="sm" onClick={handleTriggerDailyDigestTest} className="text-xs font-bold">
                    🚀 Dispatch Digest Test
                  </Button>
                </div>
              </div>
            )}

            {/* INTEGRATIONS TAB */}
            {activeTab === 'integrations' && (
              <div className="space-y-6">
                <h3 className="font-display font-bold text-sm text-text-primary flex items-center gap-1.5 border-b border-white/5 pb-3">
                  <Calendar size={16} className="text-accent-primary" />
                  Integrations & Exports
                </h3>

                {/* iCal / Google Calendar Exporter */}
                <div className="p-4 rounded-card border border-white/5 bg-white/[0.01] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-text-primary">iCal format schedule exporter</h4>
                    <p className="text-[10px] text-text-secondary max-w-md">
                      Export your calendar events (custom blocks and due tasks) as a standard `.ics` file. Compatible with Google Calendar, Outlook, and Apple Calendar.
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleExportICS} className="flex items-center gap-1.5 text-xs font-bold font-mono">
                    <Download size={14} />
                    Export .ics
                  </Button>
                </div>

                {/* JSON export */}
                <div className="p-4 rounded-card border border-white/5 bg-white/[0.01] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-text-primary">Full User JSON Archive</h4>
                    <p className="text-[10px] text-text-secondary max-w-md">
                      Backup your entire database timeline history. Includes completed habits check-ins, tasks lists, steps/sleep metrics, and focus sessions.
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleExportJSON} className="flex items-center gap-1.5 text-xs font-bold font-mono">
                    <Download size={14} />
                    Download JSON
                  </Button>
                </div>
              </div>
            )}

            {/* SYSTEM SECURITY TAB */}
            {activeTab === 'danger' && (
              <div className="space-y-5">
                <h3 className="font-display font-bold text-sm text-accent-warm flex items-center gap-1.5 border-b border-white/5 pb-3">
                  <Shield size={16} className="text-accent-warm" />
                  System Security & Destruct
                </h3>

                <p className="text-xs text-text-secondary leading-relaxed">
                  De-initialize the database profile. All synced records will be permanently removed. There is no undo recovery mechanism.
                </p>

                <div className="pt-4">
                  <Button variant="danger" size="sm" onClick={handleDeleteAccount} className="flex items-center gap-1.5 font-bold text-xs py-2 px-5">
                    <Trash2 size={14} />
                    Destroy Operator Account
                  </Button>
                </div>
              </div>
            )}

          </Card>
        </div>
      </div>
    </div>
  );
};
