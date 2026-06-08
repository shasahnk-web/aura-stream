import { useMemo, useState } from 'react';
import { Eye, EyeOff, Lock, Mail, Music2, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import SEO from '@/components/SEO';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp } = useAuthStore();

  const heading = useMemo(
    () => (mode === 'login' ? 'Welcome Back to KanaKö' : 'Create Your KanaKö Account'),
    [mode],
  );

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return toast.error('Enter your email and password');
    if (mode === 'signup' && !name.trim()) return toast.error('Enter your name');

    setLoading(true);
    const result = mode === 'login'
      ? await signIn(email.trim(), password)
      : await signUp(email.trim(), password, name.trim());
    setLoading(false);

    if (result.error) return toast.error(result.error);
    toast.success(mode === 'login' ? 'Signed in' : 'Account created');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(52,211,235,0.18),transparent_24%),radial-gradient(circle_at_80%_18%,_rgba(168,85,247,0.28),transparent_25%),radial-gradient(circle_at_20%_82%,_rgba(59,130,246,0.24),transparent_22%),linear-gradient(135deg,#050816_0%,#0a1030_42%,#090b1d_100%)] text-foreground">
      <SEO
        title="KanaKö Login"
        description="Sign in to access your KanaKö music library, playlists, rooms, and friends activity."
        path="/"
        noindex
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8%] top-[12%] h-[26rem] w-[26rem] rounded-full bg-cyan-400/14 blur-3xl" />
        <div className="absolute right-[-8%] top-[6%] h-[24rem] w-[24rem] rounded-full bg-fuchsia-500/16 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[35%] h-[22rem] w-[22rem] rounded-full bg-violet-400/12 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.06)_24%,transparent_38%,transparent_62%,rgba(255,255,255,0.05)_76%,transparent_100%)] opacity-60" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 md:px-8">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-[30px] border border-white/20 bg-white/8 shadow-[0_20px_80px_rgba(8,12,40,0.55)] backdrop-blur-[28px] md:grid-cols-[1.05fr_0.95fr]">
          <div className="relative hidden min-h-[640px] overflow-hidden md:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(103,232,249,0.16),transparent_22%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]" />
            <div className="absolute inset-y-10 left-12 right-12 rounded-[34px] border border-white/12 bg-white/4 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]" />
            <div className="absolute left-1/2 top-1/2 w-[78%] -translate-x-1/2 -translate-y-1/2">
              <motion.div
                initial={{ opacity: 0, scale: 0.92, rotate: -8 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="relative aspect-square"
              >
                <div className="absolute inset-[10%] rounded-full border border-cyan-200/35 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.45),rgba(255,255,255,0.08)_34%,rgba(111,76,255,0.18)_58%,rgba(0,0,0,0.08)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_0_80px_rgba(97,218,251,0.18)] backdrop-blur-xl" />
                <div className="absolute inset-[24%] rounded-[32%] border border-fuchsia-300/40 bg-[linear-gradient(135deg,rgba(85,220,255,0.18),rgba(186,112,255,0.14),rgba(255,255,255,0.08))] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_0_44px_rgba(180,120,255,0.2)] backdrop-blur-xl" />
                <div className="absolute inset-[35%] flex items-center justify-center rounded-[28%] border border-white/35 bg-[linear-gradient(135deg,rgba(255,255,255,0.26),rgba(255,255,255,0.08))] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
                  <Music2 className="h-28 w-28 text-cyan-100 drop-shadow-[0_0_25px_rgba(140,255,255,0.7)]" />
                </div>
                <div className="absolute left-[4%] right-[4%] top-1/2 h-[2px] -translate-y-1/2 bg-[linear-gradient(90deg,transparent,rgba(102,250,255,0.9),rgba(237,132,255,0.9),transparent)] shadow-[0_0_20px_rgba(104,244,255,0.5)]" />
              </motion.div>
            </div>
          </div>

          <div className="relative flex min-h-[640px] items-center px-6 py-8 sm:px-10 md:px-12" onKeyDown={onKeyDown}>
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))]" />
            <div className="relative z-10 mx-auto w-full max-w-md">
              <div className="mb-8">
                <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-white/18 bg-white/8 px-4 py-2 backdrop-blur-xl">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
                    <Music2 className="h-5 w-5 text-cyan-100" />
                  </div>
                  <span className="text-xl font-semibold tracking-wide text-white">KanaKö</span>
                </div>
                <h1 className="max-w-sm text-4xl font-semibold leading-[1.02] text-white md:text-5xl">{heading}</h1>
                <p className="mt-4 text-sm text-white/70">
                  Stream your library, rooms, playlists, and live activity from one private account.
                </p>
              </div>

              <div className="mb-6 flex rounded-full border border-white/12 bg-white/6 p-1.5 backdrop-blur-xl">
                {(['login', 'signup'] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => setMode(value)}
                    className={`flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition-all ${
                      mode === value
                        ? 'bg-[linear-gradient(135deg,rgba(165,105,255,0.9),rgba(85,220,255,0.9))] text-white shadow-[0_10px_30px_rgba(118,99,255,0.28)]'
                        : 'text-white/68 hover:text-white'
                    }`}
                  >
                    {value === 'login' ? 'Sign In' : 'Create Account'}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                {mode === 'signup' && (
                  <Field icon={<User className="h-4 w-4" />} label="Name">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                    />
                  </Field>
                )}

                <Field icon={<Mail className="h-4 w-4" />} label="Email">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                  />
                </Field>

                <Field icon={<Lock className="h-4 w-4" />} label="Password">
                  <div className="flex items-center gap-3">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="text-white/60 transition hover:text-white"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="group relative mt-2 flex h-14 w-full items-center justify-center overflow-hidden rounded-full border border-white/20 bg-[linear-gradient(135deg,rgba(137,82,255,0.9),rgba(72,220,255,0.95),rgba(216,109,255,0.88))] text-base font-semibold text-white shadow-[0_12px_40px_rgba(107,122,255,0.35)] transition disabled:opacity-60"
                >
                  <span className="absolute inset-[1px] rounded-full bg-[linear-gradient(135deg,rgba(255,255,255,0.18),rgba(255,255,255,0.03))]" />
                  <span className="absolute inset-0 opacity-70 mix-blend-screen bg-[linear-gradient(110deg,transparent_20%,rgba(255,255,255,0.45)_48%,transparent_72%)] translate-x-[-140%] group-hover:translate-x-[140%] transition-transform duration-1000" />
                  <span className="relative z-10">{loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                </button>
              </div>

              <p className="mt-6 text-center text-sm text-white/62">
                {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  className="font-medium text-cyan-200 hover:text-white"
                >
                  {mode === 'login' ? 'Create account' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/56">{label}</span>
      <div className="flex items-center gap-3 rounded-[22px] border border-white/16 bg-white/8 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl">
        <span className="text-white/58">{icon}</span>
        {children}
      </div>
    </label>
  );
}
