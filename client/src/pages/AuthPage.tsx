import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { BASE_URL } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { KeyRound, Mail, User as UserIcon, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const loginStore = useAuthStore(state => state.login);
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const tempErrors: Record<string, string> = {};
    if (!email) tempErrors.email = 'Email address is required';
    else if (!/\S+@\S+\.\S+/.test(email)) tempErrors.email = 'Invalid email address';
    
    if (!password) tempErrors.password = 'Password is required';
    else if (password.length < 6) tempErrors.password = 'Password must be at least 6 characters';
    
    if (!isLogin && !name) tempErrors.name = 'Full name is required';
    
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const endpoint = isLogin ? '/auth/login' : '/auth/signup';
    
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
      
      // Save state to store
      loginStore(data.user, data.accessToken, data.refreshToken);
      
      if (isLogin) {
        navigate('/dashboard');
      } else {
        navigate('/onboarding');
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-bg-dark text-text-primary">
      {/* Left panel: Tagline & Visuals */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-gradient-to-br from-[#0A0A0F] via-[#111118] to-[#6C63FF]/15 border-r border-white/10 relative overflow-hidden">
        {/* Ambient glow blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-primary/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-secondary/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex items-center gap-2 relative z-10">
          <span className="text-2xl font-display font-extrabold text-accent-primary tracking-tight">🧭 Life Director</span>
        </div>

        <div className="my-auto max-w-lg relative z-10 space-y-6">
          <h2 className="text-5xl font-display font-extrabold text-text-primary leading-[1.15]">
            Your life, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-primary to-accent-secondary">orchestrated.</span>
          </h2>
          <p className="text-text-secondary leading-relaxed">
            Consolidate your habits, task management, metrics, and deep focus sessions into a beautiful, futuristic home. Experience cognitive harmony today.
          </p>
          
          <div className="flex items-center gap-6 pt-4 border-t border-white/5 font-mono text-xs text-text-muted">
            <div>
              <span className="block text-xl font-bold text-accent-secondary font-mono">100%</span>
              Self-contained
            </div>
            <div>
              <span className="block text-xl font-bold text-accent-primary font-mono">24/7</span>
              Focus Lock
            </div>
            <div>
              <span className="block text-xl font-bold text-accent-gold font-mono">0</span>
              Bloatware
            </div>
          </div>
        </div>

        <div className="text-xs text-text-muted relative z-10">
          © {new Date().getFullYear()} Life Director Corp. All rights reserved.
        </div>
      </div>

      {/* Right panel: Login/Signup Form */}
      <div className="flex items-center justify-center w-full lg:w-1/2 p-6 md:p-12 relative">
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-accent-warm/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="w-full max-w-md space-y-8 glass-panel bg-bg-card/50 p-8 shadow-2xl relative z-10">
          <div className="text-center">
            <h3 className="text-2xl font-display font-extrabold text-text-primary">
              {isLogin ? 'Access Console' : 'Initialize Command'}
            </h3>
            <p className="text-text-secondary text-sm mt-2">
              {isLogin ? 'Provide credentials to boot workspace' : 'Create a master directory for your life OS'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <Input
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Oliver Thorne"
                icon={<UserIcon size={16} />}
                error={errors.name}
              />
            )}
            
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="oliver@lifedirector.app"
              icon={<Mail size={16} />}
              error={errors.email}
            />

            <Input
              label="Secret Key (Password)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              icon={<KeyRound size={16} />}
              error={errors.password}
            />

            {isLogin && (
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-text-secondary hover:text-text-primary">
                  <input type="checkbox" className="rounded bg-white/5 border-white/10 text-accent-primary focus:ring-accent-primary" />
                  Remember console
                </label>
                <button type="button" onClick={() => toast.error('Check seed database credentials: demo@lifedirector.app / password123')} className="text-accent-primary hover:underline font-semibold">
                  Forgot key?
                </button>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-6 py-2.5 font-bold"
              disabled={loading}
            >
              {loading ? 'Processing...' : isLogin ? 'Boot Dashboard' : 'Initialize OS'}
            </Button>
          </form>

          {/* Social Auth */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="flex-shrink mx-4 text-text-muted text-[10px] uppercase font-bold tracking-wider">or continue with</span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-full flex items-center justify-center gap-2.5 py-2"
            onClick={() => {
              // Mock auth login using standard mock credentials
              setEmail('demo@lifedirector.app');
              setPassword('password123');
              setIsLogin(true);
              toast.success('Loaded mock developer account! Click Boot Dashboard.');
            }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Developer Sandbox Account
          </Button>

          <div className="text-center text-xs">
            <span className="text-text-secondary">
              {isLogin ? 'New controller?' : 'Console registered?'}
            </span>{' '}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
              }}
              className="text-accent-primary hover:underline font-semibold"
            >
              {isLogin ? 'Create directory' : 'Load Console'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
