import { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, Headphones, Library, Settings } from 'lucide-react';

const leftItems = [
  { icon: Home, text: 'Home', path: '/' },
  { icon: Search, text: 'Search', path: '/search' },
];

const rightItems = [
  { icon: Library, text: 'Library', path: '/library' },
  { icon: Settings, text: 'Settings', path: '/settings' },
];

export default function MobileNav() {
  const { pathname } = useLocation();
  const isTogetherActive = pathname === '/together' || pathname.startsWith('/room/');

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden z-[100]" style={{ height: 'var(--nav-height)', paddingBottom: 'env(safe-area-inset-bottom, 0px)', background: 'rgba(20, 20, 30, 0.95)', backdropFilter: 'blur(20px)', boxShadow: '0 -4px 30px rgba(0,0,0,0.5)' }}>
      <div className="flex items-end justify-around w-full h-full relative">
        {/* Left items */}
        {leftItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 flex-1 transition-all duration-200 ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.text}</span>
            </NavLink>
          );
        })}

        {/* Center spacer + floating button */}
        <div className="flex-1 relative">
          <NavLink
            to="/together"
            className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center"
            style={{ bottom: '18px', zIndex: 400 }}
          >
            <div
              className={`w-[62px] h-[62px] rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ${
                isTogetherActive
                  ? 'bg-gradient-to-br from-primary to-accent scale-110'
                  : 'bg-gradient-to-br from-primary/80 to-accent/80'
              }`}
              style={{ boxShadow: isTogetherActive ? '0 0 25px rgba(168,85,247,0.7)' : '0 4px 20px rgba(0,0,0,0.4)' }}
            >
              <Headphones className="w-6 h-6 text-white" />
            </div>
          </NavLink>
        </div>

        {/* Right items */}
        {rightItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 flex-1 transition-all duration-200 ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
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
