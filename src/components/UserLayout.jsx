import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import NotificationPanel from './NotificationPanel';
import {
  Home,
  Trophy,
  Gift,
  User,
  CreditCard,
  ArrowUpRight,
  History,
  Star,
  HelpCircle,
  FileText,
  LogOut,
  Bell,
  Menu,
  X,
  ChevronRight,
  Shield,
  Plus,
  Gamepad2,
  ExternalLink
} from 'lucide-react';

const mainNavItems = [
  { to: '/', label: 'Home / Matches', icon: Home, exact: true },
  { to: '/hall-of-fame', label: 'Hall of Fame', icon: Trophy },
  { to: '/rewards', label: 'Rewards & Winnings', icon: Gift },
  { to: '/profile', label: 'My Profile', icon: User },
];

const walletNavItems = [
  { to: '/add-funds', label: 'Add Funds', icon: Plus },
  { to: '/withdraw', label: 'Withdraw', icon: ArrowUpRight },
  { to: '/transactions', label: 'Transaction History', icon: History },
];

const communityNavItems = [
  { to: '/reviews', label: 'Player Reviews', icon: Star },
  { to: '/how-it-works', label: 'How It Works', icon: HelpCircle },
  { to: '/terms', label: 'Rules & Terms', icon: FileText },
];

export default function UserLayout({ children, title, showBack = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile, currentUser } = useAuth();
  const { unreadCount, showPanel, setShowPanel } = useNotifications();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const isAdmin = currentUser?.email === 'nabprize.official@gmail.com';

  return (
    <div className="user-layout-root" style={{ minHeight: '100vh', background: '#F8F6F1', display: 'flex', color: '#2E2A26' }}>
      
      {/* Mobile Drawer Backdrop */}
      {mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          className="user-drawer-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(3px)',
            zIndex: 998,
          }}
        />
      )}

      {/* Desktop Sidebar & Mobile Slide Drawer */}
      <aside
        className={`user-sidebar ${mobileDrawerOpen ? 'drawer-open' : ''}`}
        style={{
          width: '260px',
          background: '#FFFFFF',
          borderRight: '1px solid #EBE4DA',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 999,
          boxShadow: '2px 0 16px rgba(0,0,0,0.03)',
        }}
      >
        {/* Brand Header */}
        <div style={{
          padding: '18px 20px 16px',
          borderBottom: '1px solid #F0ECE4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #FF6B4A 0%, #E8552F 100%)',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '14px',
              padding: '6px 10px',
              borderRadius: '8px',
              letterSpacing: '0.5px',
              boxShadow: '0 2px 8px rgba(255, 107, 74, 0.35)'
            }}>
              NP
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: '#2E2A26', lineHeight: 1.2 }}>
                NabPrize
              </div>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#FF6B4A',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <Gamepad2 size={12} /> Esports Arena
              </div>
            </div>
          </Link>

          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="user-sidebar-close-btn"
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#8A8078',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* User Mini Profile & Wallet Pill in Sidebar */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid #F0ECE4',
          background: 'linear-gradient(135deg, #FFF8F4 0%, #FFF2EB 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FF6B4A 0%, #E8552F 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '15px',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(255, 107, 74, 0.25)',
            }}>
              {userProfile?.username?.charAt(0)?.toUpperCase() || 'P'}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontWeight: 700,
                fontSize: '13px',
                color: '#2E2A26',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {userProfile?.username || 'Player'}
              </div>
              <div style={{
                fontSize: '11px',
                color: '#8A8078',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#3FA65C',
                }} />
                {userProfile?.pubgIgn || userProfile?.ffIgn || 'Active Player'}
              </div>
            </div>
          </div>

          {/* Wallet Balance Display */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            padding: '10px 12px',
            border: '1px solid #FFE2D6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#A69E94', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                Wallet Balance
              </div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: '#FF6B4A' }}>
                Rs {(userProfile?.walletBalance || 0).toLocaleString()}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <Link
                to="/add-funds"
                title="Add Funds"
                style={{
                  background: '#FF6B4A',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  padding: '5px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <Plus size={12} /> Add
              </Link>
            </div>
          </div>
        </div>

        {/* Navigation Links Scrollable Area */}
        <nav style={{ flex: 1, padding: '14px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#A69E94', padding: '0 10px 6px', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            Main Menu
          </div>

          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#FF6B4A' : '#5E5851',
                  background: isActive ? '#FFF1EC' : 'transparent',
                  border: isActive ? '1px solid #FFDACF' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={17} color={isActive ? '#FF6B4A' : '#8A8078'} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {isActive && <ChevronRight size={14} color="#FF6B4A" />}
              </NavLink>
            );
          })}

          <div style={{ height: '1px', background: '#F0ECE4', margin: '10px 4px' }} />

          <div style={{ fontSize: '10px', fontWeight: 700, color: '#A69E94', padding: '0 10px 6px', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            Wallet & Payments
          </div>

          {walletNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#FF6B4A' : '#5E5851',
                  background: isActive ? '#FFF1EC' : 'transparent',
                  border: isActive ? '1px solid #FFDACF' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={17} color={isActive ? '#FF6B4A' : '#8A8078'} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {isActive && <ChevronRight size={14} color="#FF6B4A" />}
              </NavLink>
            );
          })}

          <div style={{ height: '1px', background: '#F0ECE4', margin: '10px 4px' }} />

          <div style={{ fontSize: '10px', fontWeight: 700, color: '#A69E94', padding: '0 10px 6px', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            Community & Rules
          </div>

          {communityNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#FF6B4A' : '#5E5851',
                  background: isActive ? '#FFF1EC' : 'transparent',
                  border: isActive ? '1px solid #FFDACF' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={17} color={isActive ? '#FF6B4A' : '#8A8078'} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {isActive && <ChevronRight size={14} color="#FF6B4A" />}
              </NavLink>
            );
          })}

          {isAdmin && (
            <>
              <div style={{ height: '1px', background: '#F0ECE4', margin: '10px 4px' }} />
              <Link
                to="/admin"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#7B4FE0',
                  background: '#F5F0FF',
                  border: '1px solid #E4D5FF',
                }}
              >
                <Shield size={17} color="#7B4FE0" />
                <span style={{ flex: 1 }}>Admin Portal</span>
                <ExternalLink size={13} color="#7B4FE0" />
              </Link>
            </>
          )}
        </nav>

        {/* Sidebar Footer / Sign Out */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid #F0ECE4',
          background: '#FCFAF7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: '11px', color: '#8A8078', fontWeight: 500 }}>
            v2.4 • Secure Arena
          </div>

          <button
            onClick={handleSignOut}
            title="Sign Out"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E4DCD2',
              borderRadius: '8px',
              padding: '6px 12px',
              cursor: 'pointer',
              color: '#D9503F',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s',
            }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div
        className="user-main-wrapper"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: '100%',
        }}
      >
        {/* Desktop Top Header Bar (Visible on >= 900px) */}
        <header
          className="user-desktop-header"
          style={{
            height: '64px',
            background: '#FFFFFF',
            borderBottom: '1px solid #EBE4DA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 28px',
            position: 'sticky',
            top: 0,
            zIndex: 90,
            boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="user-mobile-menu-btn"
              style={{
                display: 'none',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#2E2A26',
                padding: '6px',
                borderRadius: '6px',
              }}
            >
              <Menu size={22} />
            </button>

            <div>
              <h1 style={{ fontWeight: 700, fontSize: '18px', color: '#2E2A26', margin: 0, lineHeight: 1.2 }}>
                {title || 'NabPrize Esports'}
              </h1>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Wallet Quick Pill */}
            <Link
              to="/add-funds"
              style={{
                background: 'linear-gradient(135deg, #FFF4EE 0%, #FFE9DF 100%)',
                border: '1px solid #FFDACF',
                borderRadius: '20px',
                padding: '6px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                boxShadow: '0 1px 3px rgba(255, 107, 74, 0.1)',
              }}
            >
              <CreditCard size={15} color="#FF6B4A" />
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#FF6B4A' }}>
                Rs {(userProfile?.walletBalance || 0).toLocaleString()}
              </span>
              <span style={{
                background: '#FF6B4A',
                color: '#FFFFFF',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 800,
              }}>
                +
              </span>
            </Link>

            {/* Notification Bell */}
            <button
              onClick={() => setShowPanel(true)}
              style={{
                background: '#F8F6F1',
                border: '1px solid #EBE4DA',
                borderRadius: '10px',
                padding: '8px',
                cursor: 'pointer',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2E2A26',
              }}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  background: '#FF6B4A',
                  color: '#FFFFFF',
                  fontSize: '10px',
                  fontWeight: 700,
                  minWidth: '17px',
                  height: '17px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #FFFFFF',
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* User Profile Avatar Link */}
            <Link
              to="/profile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                padding: '4px 8px 4px 4px',
                borderRadius: '20px',
                background: '#F8F6F1',
                border: '1px solid #EBE4DA',
              }}
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FF6B4A 0%, #E8552F 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '12px',
              }}>
                {userProfile?.username?.charAt(0)?.toUpperCase() || 'P'}
              </div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#2E2A26', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userProfile?.username || 'Player'}
              </span>
            </Link>
          </div>
        </header>

        {/* Page Content Container */}
        <main
          className="user-page-content"
          style={{
            flex: 1,
            width: '100%',
            maxWidth: '1440px',
            margin: '0 auto',
            boxSizing: 'border-box',
          }}
        >
          {children}
        </main>
      </div>

      {/* Global Notification Panel */}
      <NotificationPanel isOpen={showPanel} onClose={() => setShowPanel(false)} />

      {/* Responsive Styles */}
      <style>{`
        @media (min-width: 900px) {
          .user-main-wrapper {
            margin-left: 260px;
          }
          .user-sidebar {
            transform: translateX(0) !important;
          }
          .user-desktop-header {
            display: flex !important;
          }
          .user-mobile-topbar {
            display: none !important;
          }
          .user-bottom-nav {
            display: none !important;
          }
          .user-page-content {
            padding: 24px 32px 40px !important;
          }
        }
        @media (max-width: 899px) {
          .user-sidebar {
            transform: translateX(${mobileDrawerOpen ? '0' : '-100%'});
            transition: transform 0.25s ease-in-out;
          }
          .user-sidebar.drawer-open {
            transform: translateX(0) !important;
          }
          .user-sidebar-close-btn {
            display: block !important;
          }
          .user-mobile-menu-btn {
            display: flex !important;
          }
          .user-desktop-header {
            display: none !important;
          }
          .user-mobile-topbar {
            display: flex !important;
          }
          .user-bottom-nav {
            display: flex !important;
          }
          .user-page-content {
            padding-top: 56px !important;
            padding-bottom: calc(68px + env(safe-area-inset-bottom)) !important;
          }
        }
      `}</style>
    </div>
  );
}
