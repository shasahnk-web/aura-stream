import { Home, Search, Library, Heart, ListMusic, Radio, TrendingUp, Music } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import trmsLogo from '@/assets/trms-logo.png';

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Search, label: 'Search', path: '/search' },
  { icon: Library, label: 'Library', path: '/library' },
];

const libraryItems = [
  { icon: Heart, label: 'Liked Songs', path: '/liked' },
  { icon: ListMusic, label: 'Playlists', path: '/library' },
  { icon: TrendingUp, label: 'Trending', path: '/trending' },
  { icon: Radio, label: 'Radio', path: '/radio' },
];

export default function Sidebar() {
  return (
    <motion.aside
      initial={{ x: -80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="hidden md:flex flex-col w-[240px] h-full glass border-r border-border/50 overflow-hidden"
    >
      <div className="p-6 pb-2 flex items-center gap-3">
        <img src={trmsLogo} alt="TRMS" className="w-10 h-10 rounded-lg" />
        <div>
          <h1 className="text-xl font-bold font-display gradient-text tracking-tight">TRMS</h1>
          <p className="text-[10px] text-muted-foreground">Free Music For Everyone</p>
        </div>
      </div>

      <nav className="px-3 mt-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-primary/15 text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
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
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                isActive
                  ? 'text-foreground bg-secondary/40'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
      </div>

      <div className="mt-auto p-4">
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Music className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">100% Free</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Unlimited streaming, no ads, no limits. Powered by TRMS.
          </p>
        </div>
      </div>
    </motion.aside>
  );
}
