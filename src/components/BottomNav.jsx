import { NavLink } from 'react-router-dom';
import { Home, Trophy, Gift, User } from 'lucide-react';

const tabs = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/hall-of-fame', icon: Trophy, label: 'Hall of Fame' },
  { to: '/rewards', icon: Gift, label: 'Rewards' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '480px',
      height: '64px',
      background: '#FFFFFF',
      borderTop: '1px solid #F0E6D8',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 100,
    }}>
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            textDecoration: 'none',
            fontSize: '11px',
            fontWeight: isActive ? 600 : 400,
            color: isActive ? '#FF6B4A' : '#8A8078',
          })}
        >
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
