import { Home, Search, Music, Settings, Headphones } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const leftItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Search, label: 'Search', path: '/search' },
];

const rightItems = [
  { icon: Music, label: 'Library', path: '/library' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function MobileNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[1000] md:hidden glass border-t border-border/50"
      style={{ backdropFilter: 'blur(12px)' }}
    >
      <div className="flex items-center justify-between h-16 px-2">
        {/* Left items */}
        <div className="flex items-center gap-1">
          {leftItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-4 py-1 rounded-lg transition-all duration-300 ${
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
        </div>

        {/* Center Together button */}
        <NavLink
          to="/together"
          className={({ isActive }) =>
            `absolute -top-7 left-1/2 transform -translate-x-1/2 flex flex-col items-center justify-center w-14 h-14 rounded-full shadow-lg border-4 border-background transition-all duration-300 hover:scale-105 ${
              isActive 
                ? 'bg-gradient-to-br from-primary to-accent text-primary-foreground scale-110' 
                : 'bg-foreground text-primary hover:bg-foreground/90'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Headphones className={`w-5 h-5 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
              <span className={`text-[8px] font-semibold mt-0.5 ${isActive ? 'text-primary-foreground' : 'text-primary'}`}>Together</span>
            </>
          )}
        </NavLink>

        {/* Right items */}
        <div className="flex items-center gap-1">
          {rightItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-4 py-1 rounded-lg transition-all duration-300 ${
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
        </div>

        {/* SVG gradient */}
        <svg width="0" height="0" className="absolute">
          <defs>
            <linearGradient id="nav-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--accent))" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </nav>
  );
}
