import { useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { icon: 'home-outline', text: 'Home', path: '/' },
  { icon: 'search-outline', text: 'Search', path: '/search' },
  { icon: 'headset-outline', text: 'Together', path: '/together' },
  { icon: 'albums-outline', text: 'Library', path: '/library' },
  { icon: 'settings-outline', text: 'Settings', path: '/settings' },
];

export default function MobileNav() {
  const location = useLocation();
  const activeIndex = useMemo(() => navItems.findIndex(item => item.path === location.pathname), [location.pathname]);

  useEffect(() => {
    const indicator = document.querySelector('.indicator') as HTMLElement;
    if (indicator && activeIndex !== -1) {
      indicator.style.transform = `translateX(calc(70px * ${activeIndex}))`;
    }
  }, [activeIndex]);

  return (
    <div className="bottom-nav md:hidden">
      <ul>
        {navItems.map((item, index) => (
          <li
            key={item.path}
            className={`list ${activeIndex === index ? 'active' : ''}`}
          >
            <NavLink to={item.path}>
              <span className="icon">
                <ion-icon name={item.icon}></ion-icon>
              </span>
              <span className="text">{item.text}</span>
            </NavLink>
          </li>
        ))}
        <div className="indicator"></div>
      </ul>
    </div>
  );
}
