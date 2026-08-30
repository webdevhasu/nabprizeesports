import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import {
  LayoutDashboard,
  Trophy,
  Gamepad2,
  DollarSign,
  Users,
  LogOut,
  Menu,
  X,
  Crown,
  ExternalLink,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/tournaments', label: 'Tournaments', icon: Trophy },
  { to: '/admin/match-results', label: 'Match Results', icon: Gamepad2 },
  { to: '/admin/hall-of-fame', label: 'All-Time Hall of Fame', icon: Crown },
  { to: '/admin/withdrawals', label: 'Withdrawals', icon: DollarSign, hasBadge: true },
  { to: '/admin/users', label: 'User Management', icon: Users },
];

export default function AdminLayout({ children, title, subtitle, actions }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'withdrawals'), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, (snap) => {
      setPendingWithdrawals(snap.size);
    }, () => {});
    return unsub;
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/admin/login', { replace: true });
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8F6F1', display: 'flex', color: '#2E2A26' }}>
      
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(2px)',
            zIndex: 998,
          }}
        />
      )}

      {/* Sidebar (Desktop Fixed & Mobile Drawer) */}
      <aside
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
          transform: mobileOpen ? 'translateX(0)' : 'none',
          transition: 'transform 0.25s ease-in-out',
          boxShadow: '2px 0 16px rgba(0,0,0,0.03)',
        }}
        className="admin-sidebar"
      >
        {/* Brand Header */}
        <div style={{
          padding: '20px 20px 18px',
          borderBottom: '1px solid #F0ECE4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #FF6B4A 0%, #E8552F 100%)',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '14px',
              padding: '6px 10px',
              borderRadius: '8px',
              letterSpacing: '0.5px',
              boxShadow: '0 2px 6px rgba(255, 107, 74, 0.3)'
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
                <ShieldCheck size={12} /> Admin Portal
              </div>
            </div>
          </div>

          <button
            onClick={() => setMobileOpen(false)}
            className="mobile-close-btn"
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

        {/* Navigation Items */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#A69E94', padding: '0 12px 6px', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            Main Menu
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 14px',
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
                <Icon size={18} color={isActive ? '#FF6B4A' : '#8A8078'} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.hasBadge && pendingWithdrawals > 0 && (
                  <span style={{
                    background: '#D9503F',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '12px',
                  }}>
                    {pendingWithdrawals}
                  </span>
                )}
                {isActive && <ChevronRight size={14} color="#FF6B4A" />}
              </NavLink>
            );
          })}

          <div style={{ height: '1px', background: '#F0ECE4', margin: '14px 4px' }} />

          <div style={{ fontSize: '11px', fontWeight: 700, color: '#A69E94', padding: '0 12px 6px', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            Quick Links
          </div>

          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontSize: '12px',
              fontWeight: 500,
              color: '#8A8078',
              transition: 'background 0.15s ease',
            }}
          >
            <ExternalLink size={15} />
            <span>Open Player WebApp</span>
          </a>
        </nav>

        {/* Footer / Logout */}
        <div style={{
          padding: '14px 16px',
          borderTop: '1px solid #F0ECE4',
          background: '#FCFAF7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#FFF0EC',
              color: '#FF6B4A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '13px',
            }}>
              A
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '12px', color: '#2E2A26' }}>Admin User</div>
              <div style={{ fontSize: '10px', color: '#8A8078' }}>Master Control</div>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            title="Sign Out"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E4DCD2',
              borderRadius: '8px',
              padding: '7px',
              cursor: 'pointer',
              color: '#D9503F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s',
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className="admin-main-wrapper"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: '100%',
        }}
      >
        {/* Top Header */}
        <header
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
              onClick={() => setMobileOpen(true)}
              className="mobile-menu-btn"
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
              {title && (
                <h1 style={{ fontWeight: 700, fontSize: '18px', color: '#2E2A26', margin: 0, lineHeight: 1.2 }}>
                  {title}
                </h1>
              )}
              {subtitle && (
                <p style={{ fontSize: '12px', color: '#8A8078', margin: '2px 0 0' }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {actions}
            <button
              onClick={handleSignOut}
              className="desktop-signout-btn"
              style={{
                background: '#FFF5F3',
                border: '1px solid #FFDACF',
                cursor: 'pointer',
                color: '#FF6B4A',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main style={{ flex: 1, padding: '24px 28px', maxWidth: '1600px', width: '100%', boxSizing: 'border-box' }}>
          {children}
        </main>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .admin-main-wrapper {
            margin-left: 260px;
          }
          .admin-sidebar {
            transform: translateX(0) !important;
          }
        }
        @media (max-width: 899px) {
          .admin-sidebar {
            transform: translateX(${mobileOpen ? '0' : '-100%'});
          }
          .mobile-menu-btn {
            display: flex !important;
          }
          .mobile-close-btn {
            display: block !important;
          }
          .desktop-signout-btn {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
