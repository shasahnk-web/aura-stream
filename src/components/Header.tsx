import { Search, Bell, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import kanakoLogo from '@/assets/kanako-logo.png';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header className="glass border-b border-border/50 px-5 py-[18px] flex items-center justify-between z-50 shrink-0">
      {/* Logo */}
      <div className="cursor-pointer" onClick={() => navigate('/')}>
        <span className="text-[26px] font-bold gradient-text tracking-wide">KanaKo</span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-5">
        <button
          onClick={() => navigate('/search')}
          className={`text-muted-foreground hover:text-foreground transition-all hover:scale-110 ${location.pathname === '/search' ? 'text-foreground' : ''}`}
        >
          <Search className="w-[18px] h-[18px]" />
        </button>
        <button className="text-muted-foreground hover:text-foreground transition-all hover:scale-110">
          <Bell className="w-[18px] h-[18px]" />
        </button>
        <div
          onClick={() => navigate('/profile')}
          className="w-[42px] h-[42px] rounded-full flex items-center justify-center cursor-pointer border-2 border-border/50 overflow-hidden"
          style={{ background: 'var(--gradient-primary)' }}
        >
          <User className="w-5 h-5 text-primary-foreground" />
        </div>
      </div>
    </header>
  );
}
