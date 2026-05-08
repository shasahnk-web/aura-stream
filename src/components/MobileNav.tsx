import { Home, Music, Heart, User, Headphones, Search, Users, MoreHorizontal, Settings } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const primary = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Music, label: 'Library', path: '/library' },
  { icon: Headphones, label: 'Together', path: '/together', isCenter: true },
  { icon: Heart, label: 'Liked', path: '/liked' },
  { icon: User, label: 'Profile', path: '/profile' },
];

const more = [
  { icon: Search, label: 'Search', path: '/search' },
  { icon: Users, label: 'Friends', path: '/friends' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function MobileNav() {
  const [openMore, setOpenMore] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <nav
        className="fixed bottom-3 left-3 right-3 z-[60] md:hidden"
        style={{ height: 'var(--nav-height, 72px)' }}
      >
        <div
          className="flex items-center justify-around h-full px-2 rounded-full glass shadow-2xl"
          style={{ backdropFilter: 'blur(18px)', boxShadow: '0 10px 35px hsl(0 0% 0% / 0.5)' }}
        >
          {primary.map((item) =>
            item.isCenter ? (
              <NavLink key={item.path} to={item.path} className="flex flex-col items-center justify-center flex-1">
                {({ isActive }) => (
                  <div
                    className={`flex items-center justify-center w-14 h-14 -mt-7 rounded-full shadow-xl border-4 border-background transition-all ${
                      isActive
                        ? 'bg-gradient-to-br from-primary to-accent text-primary-foreground'
                        : 'bg-foreground text-primary'
                    }`}
                    style={{ boxShadow: '0 8px 24px hsl(8 85% 58% / 0.5)' }}
                  >
                    <Headphones className="w-6 h-6" />
                  </div>
                )}
              </NavLink>
            ) : (
              <NavLink key={item.path} to={item.path} className="flex-1 flex items-center justify-center py-1.5">
                {({ isActive }) => (
                  <div
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-lg'
                        : 'text-muted-foreground'
                    }`}
                    style={isActive ? { boxShadow: '0 4px 14px hsl(8 85% 58% / 0.5)' } : undefined}
                  >
                    <item.icon className="w-5 h-5" />
                    {isActive && <span className="text-xs font-semibold">{item.label}</span>}
                  </div>
                )}
              </NavLink>
            )
          )}
          <button
            onClick={() => setOpenMore(true)}
            className="flex-1 flex items-center justify-center py-1.5 text-muted-foreground"
            aria-label="More"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </nav>

      <Sheet open={openMore} onOpenChange={setOpenMore}>
        <SheetContent side="bottom" className="glass border-border/50 rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="text-foreground">More</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-3 mt-4 pb-6">
            {more.map((m) => (
              <button
                key={m.path}
                onClick={() => { setOpenMore(false); navigate(m.path); }}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl glass"
              >
                <m.icon className="w-6 h-6 text-primary" />
                <span className="text-xs font-medium text-foreground">{m.label}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
