import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthPage } from './pages/AuthPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { HabitsPage } from './pages/HabitsPage';
import { TasksPage } from './pages/TasksPage';
import { CalendarPage } from './pages/CalendarPage';
import { HealthPage } from './pages/HealthPage';
import { FocusPage } from './pages/FocusPage';
import { WeeklyReviewPage } from './pages/WeeklyReviewPage';
import { SettingsPage } from './pages/SettingsPage';
import { PageWrapper } from './components/layout/PageWrapper';

import { useAuthStore } from './store/authStore';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#111118',
            color: '#F0F0FF',
            border: '1px solid rgba(255,255,255,0.08)',
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
          },
          success: {
            iconTheme: {
              primary: '#00D4AA',
              secondary: '#111118',
            },
          },
        }}
      />
      
      <Routes>
        {/* Unauthenticated Auth flows */}
        <Route path="/login" element={<AuthPage />} />
        <Route path="/signup" element={<AuthPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* Protected Dashboard deck layouts */}
        <Route element={<PageWrapper />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/health" element={<HealthPage />} />
          <Route path="/focus" element={<FocusPage />} />
          <Route path="/weekly-review" element={<WeeklyReviewPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          
          {/* Default routes fallback */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* Wildcard redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
