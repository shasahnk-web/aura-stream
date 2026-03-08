import { Home, Search, Send, Music, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const items = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Search, label: 'Search', path: '/search' },
  { icon: Music, label: 'Library', path: '/library' },
  { icon: Settings, label: 'Settings', path: '/trending' },
];

export default function MobileNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[60] md:hidden glass border-t border-border/50"
      style={{ backdropFilter: 'blur(12px)' }}
    >
      <div className="flex items-center justify-around h-16 px-1 relative">
        {/* Left items */}
        {items.slice(0, 2).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-all duration-300 ${
                isActive ? 'text-foreground -translate-y-1' : 'text-muted-foreground'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={`w-[22px] h-[22px] transition-all ${isActive ? 'gradient-text' : ''}`}
                  style={isActive ? { stroke: 'url(#nav-gradient)' } : {}}
                />
                <span className="text-[11px] font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Center Telegram button */}
        <a
          href="https://t.me/traboratory"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute left-1/2 -translate-x-1/2 -top-5 w-14 h-14 rounded-full bg-foreground flex items-center justify-center shadow-lg z-10 border-4 border-background"
        >
          <Send className="w-6 h-6 text-primary" />
        </a>

        {/* Right items */}
        {items.slice(2).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-all duration-300 ${
                isActive ? 'text-foreground -translate-y-1' : 'text-muted-foreground'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={`w-[22px] h-[22px] transition-all ${isActive ? 'gradient-text' : ''}`}
                  style={isActive ? { stroke: 'url(#nav-gradient)' } : {}}
                />
                <span className="text-[11px] font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* SVG gradient */}
        <svg width="0" height="0" className="absolute">
          <defs>
            <linearGradient id="nav-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(270, 76%, 53%)" />
              <stop offset="100%" stopColor="hsl(350, 100%, 71%)" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </nav>
  );
}
