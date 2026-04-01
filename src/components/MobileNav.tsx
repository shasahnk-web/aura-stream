import { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, Headphones, Library, Settings } from 'lucide-react';

const navItems = [
  { icon: Home, text: 'Home', path: '/' },
  { icon: Search, text: 'Search', path: '/search' },
  { icon: Headphones, text: 'Together', path: '/together' },
  { icon: Library, text: 'Library', path: '/library' },
  { icon: Settings, text: 'Settings', path: '/settings' },
];

export default function MobileNav() {
  const location = useLocation();
  const activeIndex = useMemo(() => navItems.findIndex(item => item.path === location.pathname), [location.pathname]);

  return (
    <nav className="bottom-nav md:hidden" style={{ zIndex: 90 }}>
      <div className="flex items-end justify-around w-full h-full px-2 relative">
        {navItems.map((item, index) => {
          const isCenter = index === 2;
          const isActive = activeIndex === index;

          if (isCenter) {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="flex flex-col items-center justify-center relative -mt-7"
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-br from-primary to-accent scale-110'
                      : 'bg-gradient-to-br from-primary/80 to-accent/80'
                  }`}
                  style={{ boxShadow: isActive ? '0 0 24px rgba(168,85,247,0.5)' : '0 4px 20px rgba(0,0,0,0.4)' }}
                >
                  <Headphones className="w-6 h-6 text-white" />
                </div>
              </NavLink>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 transition-all duration-200 ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
              style={isActive ? { textShadow: '0 0 10px #a855f7' } : undefined}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.text}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
