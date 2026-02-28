import { Home, Search, Library, Heart } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const items = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Search, label: 'Search', path: '/search' },
  { icon: Library, label: 'Library', path: '/library' },
  { icon: Heart, label: 'Liked', path: '/liked' },
];

export default function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden glass border-t border-border/50"
      style={{ backdropFilter: 'blur(30px)' }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
