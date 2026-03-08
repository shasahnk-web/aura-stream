import { Home, Search, Music, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const items = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Search, label: 'Search', path: '/search' },
  { icon: Music, label: 'Library', path: '/library' },
  { icon: User, label: 'Profile', path: '/trending' },
];

export default function MobileNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden glass border-t border-border/50"
      style={{ backdropFilter: 'blur(12px)' }}
    >
      <div className="flex items-center justify-around h-16 px-1">
        {items.map((item) => (
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
                <span className="text-[12px] font-medium">{item.label}</span>
                {/* SVG gradient for icons */}
                {isActive && (
                  <svg width="0" height="0" className="absolute">
                    <defs>
                      <linearGradient id="nav-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="hsl(270, 76%, 53%)" />
                        <stop offset="100%" stopColor="hsl(350, 100%, 71%)" />
                      </linearGradient>
                    </defs>
                  </svg>
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
