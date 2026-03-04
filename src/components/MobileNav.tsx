import { Home, Search, Library, Heart, TrendingUp, Radio } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const items = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Search, label: 'Search', path: '/search' },
  { icon: Library, label: 'Library', path: '/library' },
  { icon: TrendingUp, label: 'Trending', path: '/trending' },
  { icon: Radio, label: 'Radio', path: '/radio' },
];

export default function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden glass border-t border-border/50"
      style={{ backdropFilter: 'blur(30px)' }}
    >
      <div className="flex items-center justify-around h-16 px-1">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all duration-200 ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[9px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
