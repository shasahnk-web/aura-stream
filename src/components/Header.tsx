import { useState } from 'react';
import { Search, Bell, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import kanakoLogo from '@/assets/kanako-logo.png';
import ProfileEditModal from './ProfileEditModal';
import { useProfileStore } from '@/store/profileStore';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const { name } = useProfileStore();

  return (
    <>
      <header className="glass border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between z-50 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <img src={kanakoLogo} alt="KanaKö" className="w-8 h-8 rounded-lg" />
          <span className="text-xl font-bold gradient-text tracking-wide font-display">KanaKö</span>
        </div>

        {/* Right actions */}
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
            style={{ background: 'var(--gradient-primary)' }}
            onClick={() => setProfileOpen(true)}
            title={name}
          >
            <User className="w-4 h-4 text-primary-foreground" />
          </div>
        </div>
      </header>
      <ProfileEditModal open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}
