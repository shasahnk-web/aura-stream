import { Home, Search, Library, Heart, ListMusic, Radio, TrendingUp, Music, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import kanakoLogo from '@/assets/kanako-logo.png';
import { Send } from 'lucide-react';

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Search, label: 'Search', path: '/search' },
  { icon: Library, label: 'Library', path: '/library' },
];

const libraryItems = [
  { icon: Heart, label: 'Liked Songs', path: '/liked' },
  { icon: TrendingUp, label: 'Trending', path: '/trending' },
  { icon: Radio, label: 'Radio', path: '/radio' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function Sidebar() {
  return (
    <motion.aside
      initial={{ x: -80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="hidden md:flex flex-col w-[240px] h-full glass border-r border-border/50 overflow-hidden"
    >
      <div className="p-5 pb-2 flex items-center gap-3">
        <img src={kanakoLogo} alt="KanaKö" className="w-11 h-11 rounded-lg" />
        <div>
          <h1 className="text-lg font-bold gradient-text tracking-wide">KanaKö</h1>
          <p className="text-[10px] text-muted-foreground">by TRMS</p>
        </div>
      </div>

      <nav className="px-3 mt-5">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group mb-0.5 ${
                isActive
                  ? 'bg-white/10 text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`
            }
          >
            <item.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6 px-3">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
          Your Library
        </p>
        {libraryItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 mb-0.5 ${
                isActive
                  ? 'text-foreground bg-white/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
      </div>

      <div className="mt-auto p-4 space-y-3">
        {/* Telegram button */}
        <a
          href="https://t.me/traboratory"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl glass hover:bg-white/10 transition-all group cursor-pointer"
        >
          <Send className="w-5 h-5 text-[#29b6f6] group-hover:scale-110 transition-transform" />
          <div>
            <span className="text-sm font-medium text-foreground">Telegram</span>
            <p className="text-[10px] text-muted-foreground">Join our channel</p>
          </div>
        </a>

      </div>
    </motion.aside>
  );
}
