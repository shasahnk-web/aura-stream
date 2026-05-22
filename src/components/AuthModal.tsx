import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import { Mail, Lock, User, LogIn, UserPlus, Music2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-md w-[92vw] border-border/40 overflow-hidden rounded-3xl bg-background/80 backdrop-blur-2xl">
        {/* Ambient gradient blobs */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-16 w-72 h-72 rounded-full opacity-40 blur-3xl"
               style={{ background: 'var(--gradient-primary)' }} />
          <div className="absolute -bottom-24 -right-16 w-72 h-72 rounded-full opacity-30 blur-3xl bg-accent" />
        </div>

        <div className="relative px-7 pt-8 pb-7">
          {/* Brand */}
          <div className="flex flex-col items-center text-center mb-6">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18 }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-xl"
              style={{ background: 'var(--gradient-primary)' }}
            >
              <Music2 className="w-7 h-7 text-primary-foreground" />
            </motion.div>
            <h2 className="text-2xl font-bold font-display gradient-text">
              {mode === 'login' ? 'Welcome back' : 'Join KanaKö'}
            </h2>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              {mode === 'login' ? 'Pick up where you left off' : 'Free forever, no ads, no paywalls'}
            </p>
          </div>

          {/* Tabs */}
          <div className="relative grid grid-cols-2 p-1 rounded-2xl bg-secondary/40 mb-5">
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl shadow-md"
              style={{
                background: 'var(--gradient-primary)',
                left: mode === 'login' ? 4 : 'calc(50% + 0px)',
              }}
            />
            <button
              onClick={() => setMode('login')}
              className={`relative z-10 py-2 text-sm font-semibold transition-colors ${
                mode === 'login' ? 'text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`relative z-10 py-2 text-sm font-semibold transition-colors ${
                mode === 'signup' ? 'text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="space-y-3" onKeyDown={onKey}>
            <AnimatePresence mode="popLayout" initial={false}>
              {mode === 'signup' && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0, marginBottom: -12 }}
                  transition={{ duration: 0.22 }}
                >
                  <Field icon={<User className="w-4 h-4" />} label="Name">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="bg-transparent text-sm text-foreground w-full outline-none placeholder:text-muted-foreground/50"
                    />
                  </Field>
                </motion.div>
              )}
            </AnimatePresence>

            <Field icon={<Mail className="w-4 h-4" />} label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="bg-transparent text-sm text-foreground w-full outline-none placeholder:text-muted-foreground/50"
              />
            </Field>

            <Field icon={<Lock className="w-4 h-4" />} label="Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="bg-transparent text-sm text-foreground w-full outline-none placeholder:text-muted-foreground/50"
              />
            </Field>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3 rounded-2xl text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl mt-1"
              style={{ background: 'var(--gradient-primary)' }}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
              ) : mode === 'login' ? (
                <LogIn className="w-4 h-4" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
            </motion.button>

            <p className="text-[11px] text-center text-muted-foreground pt-1">
              By continuing you agree to KanaKö's terms. Always free.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.14em]">{label}</label>
      <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 bg-secondary/30 border border-border/40 focus-within:border-primary/60 focus-within:bg-secondary/50 transition-colors">
        <span className="text-muted-foreground shrink-0">{icon}</span>
        {children}
      </div>
    </div>
  );
}
