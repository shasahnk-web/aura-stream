import { useState, useEffect } from 'react';
import { Search, Bell, User, LogIn } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import kanakoLogo from '@/assets/kanako-logo.png';
import AuthModal from './AuthModal';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [authOpen, setAuthOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    if (!user) { setAvatarUrl(''); setName(''); return; }
    supabase.from('profiles').select('name, avatar_url').eq('id', user.id).single().then(({ data }) => {
      if (data) { setAvatarUrl(data.avatar_url || ''); setName(data.name || ''); }
    });
  }, [user]);

  const handleAvatarClick = () => {
    if (user) navigate('/profile');
    else setAuthOpen(true);
  };

  return (
    <>
      <header className="glass border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between z-50 shrink-0">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <img src={kanakoLogo} alt="KanaKö" className="w-10 h-10 rounded-lg" />
          <span className="text-xl font-bold gradient-text tracking-wide font-display">KanaKö</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/search')}
            className={`text-muted-foreground hover:text-foreground transition-all hover:scale-110 ${location.pathname === '/search' ? 'text-foreground' : ''}`}
          >
            <Search className="w-5 h-5" />
          </button>
          <button className="text-muted-foreground hover:text-foreground transition-all hover:scale-110">
            <Bell className="w-5 h-5" />
          </button>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border-2 border-border/50 overflow-hidden"
            style={!avatarUrl ? { background: 'var(--gradient-primary)' } : {}}
            onClick={handleAvatarClick}
            title={user ? name : 'Login'}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : user ? (
              <User className="w-4 h-4 text-primary-foreground" />
            ) : (
              <LogIn className="w-4 h-4 text-primary-foreground" />
            )}
          </div>
        </div>
      </header>
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
}
