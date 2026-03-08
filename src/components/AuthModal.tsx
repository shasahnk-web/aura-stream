import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import { Mail, Lock, User, LogIn, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AuthModal({ open, onOpenChange }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuthStore();

  const handleSubmit = async () => {
    if (!email || !password) return toast.error('Fill all fields');
    if (mode === 'signup' && !name) return toast.error('Enter your name');
    setLoading(true);
    const { error } = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password, name);
    setLoading(false);
    if (error) return toast.error(error);
    toast.success(mode === 'login' ? 'Welcome back!' : 'Account created!');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border/50 max-w-sm mx-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold gradient-text text-center">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2 pb-4">
          {/* Tabs */}
          <div className="flex gap-2 p-1 rounded-xl glass">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'login' ? 'text-primary-foreground' : 'text-muted-foreground'
              }`}
              style={mode === 'login' ? { background: 'var(--gradient-primary)' } : {}}
            >
              Login
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'signup' ? 'text-primary-foreground' : 'text-muted-foreground'
              }`}
              style={mode === 'signup' ? { background: 'var(--gradient-primary)' } : {}}
            >
              Sign Up
            </button>
          </div>

          {mode === 'signup' && (
            <div className="w-full space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</label>
              <div className="flex items-center gap-2 glass rounded-xl px-3 py-2.5">
                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="bg-transparent text-sm text-foreground w-full outline-none placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
          )}

          <div className="w-full space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
            <div className="flex items-center gap-2 glass rounded-xl px-3 py-2.5">
              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="bg-transparent text-sm text-foreground w-full outline-none placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          <div className="w-full space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</label>
            <div className="flex items-center gap-2 glass rounded-xl px-3 py-2.5">
              <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-transparent text-sm text-foreground w-full outline-none placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ background: 'var(--gradient-primary)' }}
          >
            {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
          </button>

          <p className="text-xs text-center text-muted-foreground">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="gradient-text font-medium"
            >
              {mode === 'login' ? 'Sign up' : 'Login'}
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
