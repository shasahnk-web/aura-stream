import { Home, Search, Music, Settings, Headphones } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Search, label: 'Search', path: '/search' },
  { icon: Headphones, label: 'Together', path: '/together', isCenter: true },
  { icon: Music, label: 'Library', path: '/library' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function MobileNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[60] md:hidden glass border-t border-border/50"
      style={{ backdropFilter: 'blur(12px)', height: 'var(--nav-height, 64px)' }}
    >
      <div className="flex items-center justify-around h-full px-1">
        {navItems.map((item) =>
          item.isCenter ? (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center flex-1`
              }
            >
              {({ isActive }) => (
                <div
                  className={`flex flex-col items-center justify-center w-14 h-14 -mt-8 rounded-full shadow-lg border-4 border-background transition-all ${
                    isActive
                      ? 'bg-gradient-to-br from-primary to-accent text-primary-foreground'
                      : 'bg-foreground text-primary'
                  }`}
                >
                  <Headphones className="w-5 h-5" />
                  <span className="text-[8px] font-semibold mt-0.5">Together</span>
                </div>
              )}
            </NavLink>
          ) : (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-all duration-200 ${
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          )
        )}
      </div>
    </nav>
  );
}
