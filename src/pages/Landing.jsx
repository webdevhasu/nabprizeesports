import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isStandalone, isIOSDevice, promptPwaInstall } from '../utils/pwa';
import {
  Download,
  Smartphone,
  Globe,
  ArrowRight,
  ShieldCheck,
  Trophy,
  Zap,
  CheckCircle2,
  Gamepad2,
  Flame,
  Share,
  PlusSquare,
  X,
  Star,
  Users,
  Clock,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [canInstall, setCanInstall] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    // 1. If opened inside installed PWA / standalone mode, bypass landing page completely!
    if (isStandalone()) {
      if (currentUser) {
        navigate('/', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
      return;
    }

    // 2. Check if PWA prompt is ready
    if (window.__np_deferred_prompt) {
      setCanInstall(true);
    }

    const handlePromptReady = () => {
      setCanInstall(true);
    };

    window.addEventListener('np_prompt_ready', handlePromptReady);
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      window.__np_deferred_prompt = e;
      setCanInstall(true);
    });

    return () => {
      window.removeEventListener('np_prompt_ready', handlePromptReady);
    };
  }, [currentUser, navigate]);

  // Handle "Install App" button
  const handleInstallClick = async () => {
    if (isIOSDevice()) {
      setShowIOSModal(true);
      return;
    }

    if (window.__np_deferred_prompt) {
      const result = await promptPwaInstall();
      if (result.success) {
        setInstallSuccess(true);
        setTimeout(() => {
          if (currentUser) navigate('/');
          else navigate('/login');
        }, 2000);
      }
    } else {
      // If prompt not natively available yet on this browser, show guidance modal
      setShowIOSModal(true);
    }
  };

  // Handle "Continue in Browser" button
  const handleContinueInBrowser = () => {
    try {
      window.sessionStorage.setItem('np_continue_browser', 'true');
    } catch (_) {}

    if (currentUser) {
      navigate('/');
    } else {
      navigate('/login');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0D0B0A',
      color: '#FAF8F5',
      fontFamily: "'Inter', sans-serif",
      overflowX: 'hidden',
      position: 'relative',
    }}>
      {/* Background Ambient Glows */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '1200px', height: '480px',
        background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255, 107, 74, 0.22) 0%, rgba(0,0,0,0) 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* 1. TOP NAVBAR */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(13, 11, 10, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
        padding: '12px 20px',
      }}>
        <div style={{
          maxWidth: '1140px', margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src="/icon-192.png"
              alt="NabPrize Esports"
              style={{
                width: '36px', height: '36px', borderRadius: '10px',
                boxShadow: '0 2px 10px rgba(255, 107, 74, 0.4)',
                border: '1.5px solid rgba(255, 107, 74, 0.5)',
              }}
            />
            <div>
              <span style={{
                fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '18px',
                letterSpacing: '-0.3px', color: '#FFFFFF',
              }}>
                Nab<span style={{ color: '#FF6B4A' }}>Prize</span>
              </span>
              <span style={{
                display: 'block', fontSize: '10px', color: '#A69E94',
                letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600,
              }}>
                Esports Arena
              </span>
            </div>
          </div>

          {/* Right Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'none',
              alignItems: 'center', gap: '6px',
              background: 'rgba(63, 166, 92, 0.12)',
              border: '1px solid rgba(63, 166, 92, 0.3)',
              padding: '4px 10px', borderRadius: '20px',
              fontSize: '11px', color: '#4ADE80', fontWeight: 600,
            }} className="desktop-online-badge">
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ADE80', display: 'inline-block' }} />
              Live Matches Running
            </div>

            {currentUser ? (
              <button
                onClick={() => navigate('/')}
                style={{
                  background: 'linear-gradient(135deg, #FF6B4A 0%, #E8552F 100%)',
                  color: '#FFFFFF', border: 'none', borderRadius: '10px',
                  padding: '8px 18px', fontSize: '13px', fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 2px 10px rgba(255, 107, 74, 0.3)',
                }}
              >
                Go to Arena
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#FAF8F5', border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px', padding: '8px 16px', fontSize: '13px',
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                Log In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <header style={{
        position: 'relative', zIndex: 1,
        padding: '50px 20px 40px',
        maxWidth: '1140px', margin: '0 auto', textAlign: 'center',
      }}>
        {/* Live Pill Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(255, 107, 74, 0.12)',
          border: '1px solid rgba(255, 107, 74, 0.3)',
          padding: '6px 14px', borderRadius: '30px',
          marginBottom: '22px', fontSize: '12px', color: '#FF8A65', fontWeight: 600,
        }}>
          <Sparkles size={14} color="#F4B740" />
          <span>Totally Skill-Based Esports Tournament Platform</span>
        </div>

        {/* Main Headline */}
        <h1 style={{
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 900,
          fontSize: 'clamp(28px, 6vw, 54px)',
          lineHeight: 1.15,
          color: '#FFFFFF',
          margin: '0 auto 18px',
          maxWidth: '860px',
          letterSpacing: '-0.5px',
        }}>
          Play PUBG & Free Fire.{' '}
          <span style={{
            background: 'linear-gradient(135deg, #FF7B59 0%, #F4B740 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Earn Fixed Skill Rewards.
          </span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 'clamp(14px, 2.5vw, 17px)',
          color: '#C4BCB2',
          maxWidth: '680px',
          margin: '0 auto 34px',
          lineHeight: 1.6,
        }}>
          Earn fixed skill rewards, join daily small free to play tournaments & verified custom rooms, and withdraw cash rewards directly to <strong>JazzCash</strong> or <strong>EasyPaisa</strong>.
        </p>

        {/* 🌟 THE TWO PRIMARY CTA BUTTONS 🌟 */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          maxWidth: '560px',
          margin: '0 auto 36px',
        }}>
          {/* 1. INSTALL APP BUTTON */}
          <button
            onClick={handleInstallClick}
            style={{
              flex: '1 1 240px',
              padding: '16px 24px',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, #FF6B4A 0%, #E8552F 100%)',
              color: '#FFFFFF',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(255, 107, 74, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              fontWeight: 800,
              fontSize: '15px',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
          >
            <Download size={20} />
            <div style={{ textAlign: 'left' }}>
              <div>Install Mobile App</div>
              <div style={{ fontSize: '11px', fontWeight: 500, opacity: 0.9 }}>
                Fast 1-Tap Play • Instant Alerts
              </div>
            </div>
          </button>

          {/* 2. CONTINUE IN BROWSER BUTTON */}
          <button
            onClick={handleContinueInBrowser}
            style={{
              flex: '1 1 220px',
              padding: '16px 24px',
              borderRadius: '14px',
              border: '1.5px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(8px)',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              fontWeight: 700,
              fontSize: '15px',
              transition: 'background 0.15s ease',
            }}
          >
            <Globe size={19} color="#FF8A65" />
            <div style={{ textAlign: 'left' }}>
              <div>Continue in Browser</div>
              <div style={{ fontSize: '11px', fontWeight: 400, color: '#A69E94' }}>
                Play Online No Download
              </div>
            </div>
            <ArrowRight size={16} color="#A69E94" style={{ marginLeft: 'auto' }} />
          </button>
        </div>

        {/* Install Success Toast */}
        {installSuccess && (
          <div style={{
            background: 'rgba(63, 166, 92, 0.2)', border: '1px solid #3FA65C',
            borderRadius: '12px', padding: '12px 20px', color: '#4ADE80',
            fontSize: '13px', fontWeight: 600, maxWidth: '400px', margin: '0 auto 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
            <CheckCircle2 size={16} /> App installed successfully! Launching Arena...
          </div>
        )}

        {/* Trust Badges Ribbon */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          fontSize: '13px',
          color: '#A69E94',
          paddingTop: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={15} color="#FF6B4A" /> Instant JazzCash & EasyPaisa
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={15} color="#3FA65C" /> 100% Fair Anti-Cheat
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Gamepad2 size={15} color="#FF6B4A" /> Free to Play Tournaments
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Trophy size={15} color="#F4B740" /> Fixed Skill Rewards
          </div>
        </div>
      </header>

      {/* 3. LIVE STATS STRIP */}
      <section style={{
        maxWidth: '1140px', margin: '0 auto 50px', padding: '0 20px',
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          padding: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '20px',
          textAlign: 'center',
        }}>
          <div>
            <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: '30px', fontWeight: 800, color: '#FF7B59' }}>
              10,000+
            </div>
            <div style={{ fontSize: '12px', color: '#8A8078', marginTop: '2px', fontWeight: 500 }}>
              Registered Gamers
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: '30px', fontWeight: 800, color: '#F4B740' }}>
              PKR 500K+
            </div>
            <div style={{ fontSize: '12px', color: '#8A8078', marginTop: '2px', fontWeight: 500 }}>
              Skill Rewards Distributed
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: '30px', fontWeight: 800, color: '#3FA65C' }}>
              40+ Matches
            </div>
            <div style={{ fontSize: '12px', color: '#8A8078', marginTop: '2px', fontWeight: 500 }}>
              Hosted Daily
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: '30px', fontWeight: 800, color: '#FAF8F5' }}>
              15 Minutes
            </div>
            <div style={{ fontSize: '12px', color: '#8A8078', marginTop: '2px', fontWeight: 500 }}>
              Average Withdrawal Speed
            </div>
          </div>
        </div>
      </section>

      {/* 4. WHY INSTALL APP SECTION */}
      <section style={{
        maxWidth: '1140px', margin: '0 auto 60px', padding: '0 20px',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #1C1512 0%, #2A1C16 100%)',
          border: '1px solid rgba(255, 107, 74, 0.25)',
          borderRadius: '24px',
          padding: '36px 28px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '-60px', right: '-60px',
            width: '200px', height: '200px',
            background: 'radial-gradient(circle, rgba(255,107,74,0.2) 0%, transparent 70%)',
            borderRadius: '50%', pointerEvents: 'none',
          }} />

          <div style={{ maxWidth: '640px', position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              color: '#FF7B59', fontSize: '12px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px',
            }}>
              <Smartphone size={14} /> PWA Mobile Experience
            </div>
            <h2 style={{
              fontFamily: "'Poppins', sans-serif", fontSize: 'clamp(22px, 4vw, 32px)',
              fontWeight: 800, color: '#FFFFFF', margin: '0 0 12px', lineHeight: 1.25,
            }}>
              Install NabPrize on Your Phone in 5 Seconds
            </h2>
            <p style={{ fontSize: '14px', color: '#C4BCB2', lineHeight: 1.6, margin: '0 0 24px' }}>
              No huge 2GB app store downloads. NabPrize installs directly onto your Android or iPhone home screen with zero lag, instant match ID notifications, and automatic cloud updates.
            </p>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px', marginBottom: '28px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                <CheckCircle2 size={16} color="#3FA65C" style={{ flexShrink: 0 }} />
                <span>Instant Room ID/Pass push notifications</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                <CheckCircle2 size={16} color="#3FA65C" style={{ flexShrink: 0 }} />
                <span>Ultra-fast 60 FPS mobile interface</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                <CheckCircle2 size={16} color="#3FA65C" style={{ flexShrink: 0 }} />
                <span>Saves phone storage & mobile data</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                <CheckCircle2 size={16} color="#3FA65C" style={{ flexShrink: 0 }} />
                <span>1-Tap direct match joining</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
              <button
                onClick={handleInstallClick}
                style={{
                  padding: '13px 24px', borderRadius: '12px', border: 'none',
                  background: '#FF6B4A', color: '#FFFFFF', fontWeight: 800,
                  fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                  boxShadow: '0 4px 16px rgba(255, 107, 74, 0.4)',
                }}
              >
                <Download size={16} /> Install App Now
              </button>
              <button
                onClick={handleContinueInBrowser}
                style={{
                  padding: '13px 20px', borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent', color: '#FAF8F5', fontWeight: 600,
                  fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                Continue in Browser <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FEATURED GAMES */}
      <section style={{
        maxWidth: '1140px', margin: '0 auto 60px', padding: '0 20px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{
            fontFamily: "'Poppins', sans-serif", fontSize: '28px',
            fontWeight: 800, color: '#FFFFFF', margin: 0,
          }}>
            Compete In Top Mobile Titles
          </h2>
          <p style={{ fontSize: '14px', color: '#8A8078', marginTop: '6px' }}>
            Totally skill-based esports tournaments with verified custom rooms and direct rewards
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
        }}>
          {/* PUBG Mobile Card */}
          <div style={{
            background: '#181412',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            overflow: 'hidden',
            transition: 'transform 0.2s',
          }}>
            <div style={{ height: '170px', position: 'relative', overflow: 'hidden' }}>
              <img
                src="/banner-pubg-daily.jpg"
                alt="PUBG Mobile"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute', top: '12px', left: '12px',
                background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
                borderRadius: '8px', padding: '4px 10px',
                fontSize: '11px', fontWeight: 700, color: '#F4B740',
              }}>
                PUBG MOBILE
              </div>
            </div>
            <div style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 8px' }}>
                Daily Erangel & TDM Customs
              </h3>
              <p style={{ fontSize: '13px', color: '#A69E94', lineHeight: 1.5, margin: '0 0 16px' }}>
                Solo & Squad battle royale matches. Verified rooms with kill rewards and champion rewards sent directly to your wallet.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#3FA65C', fontWeight: 700 }}>
                  Service Charges PKR 50
                </span>
                <button
                  onClick={handleContinueInBrowser}
                  style={{
                    background: 'none', border: 'none', color: '#FF6B4A',
                    fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}
                >
                  Join Match <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Free Fire Card */}
          <div style={{
            background: '#181412',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            overflow: 'hidden',
          }}>
            <div style={{ height: '170px', position: 'relative', overflow: 'hidden' }}>
              <img
                src="/banner-ff-daily.jpg"
                alt="Free Fire"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute', top: '12px', left: '12px',
                background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
                borderRadius: '8px', padding: '4px 10px',
                fontSize: '11px', fontWeight: 700, color: '#FF6B4A',
              }}>
                FREE FIRE MAX
              </div>
            </div>
            <div style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 8px' }}>
                Clash Squad & Bermuda Cups
              </h3>
              <p style={{ fontSize: '13px', color: '#A69E94', lineHeight: 1.5, margin: '0 0 16px' }}>
                Compete in intense 4v4 clash squad battles or full lobby survival rooms. Verified room IDs and direct skill rewards.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#3FA65C', fontWeight: 700 }}>
                  Service Charges PKR 50
                </span>
                <button
                  onClick={handleContinueInBrowser}
                  style={{
                    background: 'none', border: 'none', color: '#FF6B4A',
                    fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}
                >
                  Join Match <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. HOW IT WORKS */}
      <section style={{
        maxWidth: '1140px', margin: '0 auto 70px', padding: '0 20px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h2 style={{
            fontFamily: "'Poppins', sans-serif", fontSize: '28px',
            fontWeight: 800, color: '#FFFFFF', margin: 0,
          }}>
            How It Works (4 Simple Steps)
          </h2>
          <p style={{ fontSize: '14px', color: '#8A8078', marginTop: '6px' }}>
            Get into the arena and withdraw your rewards within minutes
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
        }}>
          {[
            {
              num: '1',
              title: 'Create Account',
              desc: 'Sign up in under 30 seconds with your email and game IGN/UID.',
            },
            {
              num: '2',
              title: 'Deposit Funds',
              desc: 'Add wallet balance easily via JazzCash or EasyPaisa for tournament service charges.',
            },
            {
              num: '3',
              title: 'Join Custom Room',
              desc: 'Select your tournament. Receive Room ID & Password 15 min before match.',
            },
            {
              num: '4',
              title: 'Earn Rewards & Withdraw',
              desc: 'Show your skills & top the lobby. Withdraw cash rewards directly to JazzCash / EasyPaisa.',
            },
          ].map((step, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '16px',
                padding: '24px 20px',
                position: 'relative',
              }}
            >
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'rgba(255, 107, 74, 0.15)', color: '#FF7B59',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '16px', marginBottom: '14px',
              }}>
                {step.num}
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 8px' }}>
                {step.title}
              </h3>
              <p style={{ fontSize: '13px', color: '#A69E94', lineHeight: 1.5, margin: 0 }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. BOTTOM CALL TO ACTION */}
      <section style={{
        maxWidth: '1140px', margin: '0 auto 80px', padding: '0 20px', textAlign: 'center',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #241A14 0%, #15110E 100%)',
          border: '1px solid rgba(255, 107, 74, 0.3)',
          borderRadius: '24px',
          padding: '48px 24px',
        }}>
          <h2 style={{
            fontFamily: "'Poppins', sans-serif", fontSize: 'clamp(24px, 4.5vw, 36px)',
            fontWeight: 800, color: '#FFFFFF', margin: '0 0 12px',
          }}>
            Ready to Prove Your Gaming Skills?
          </h2>
          <p style={{ fontSize: '15px', color: '#C4BCB2', maxWidth: '540px', margin: '0 auto 28px' }}>
            Join Pakistan's premier totally skill-based esports platform with guaranteed fair play.
          </p>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
          }}>
            <button
              onClick={handleInstallClick}
              style={{
                padding: '15px 30px', borderRadius: '12px', border: 'none',
                background: '#FF6B4A', color: '#FFFFFF', fontWeight: 800,
                fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: '0 6px 20px rgba(255, 107, 74, 0.4)',
              }}
            >
              <Download size={18} /> Install Mobile App
            </button>
            <button
              onClick={handleContinueInBrowser}
              style={{
                padding: '15px 26px', borderRadius: '12px',
                border: '1.5px solid rgba(255, 255, 255, 0.25)',
                background: 'rgba(255,255,255,0.06)', color: '#FAF8F5', fontWeight: 700,
                fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              <Globe size={18} color="#FF7B59" /> Continue in Browser
            </button>
          </div>
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer style={{
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '30px 20px',
        fontSize: '12px',
        color: '#8A8078',
        textAlign: 'center',
      }}>
        <div style={{
          maxWidth: '1140px', margin: '0 auto',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
          gap: '16px',
        }}>
          <div>
            © 2026 NabPrize Esports. All rights reserved. Made for Pakistani Gamers.
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <Link to="/terms" style={{ color: '#A69E94', textDecoration: 'none' }}>Terms & Rules</Link>
            <Link to="/how-it-works" style={{ color: '#A69E94', textDecoration: 'none' }}>How It Works</Link>
            <Link to="/reviews" style={{ color: '#A69E94', textDecoration: 'none' }}>Player Reviews</Link>
          </div>
        </div>
      </footer>

      {/* iOS INSTALL INSTRUCTION MODAL */}
      {showIOSModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(5px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            background: '#1E1A17', border: '1px solid rgba(255,107,74,0.3)',
            borderRadius: '22px', padding: '24px', maxWidth: '380px', width: '100%',
            textAlign: 'center', boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowIOSModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.08)', border: 'none', color: '#FAF8F5',
                  borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <img
              src="/icon-192.png"
              alt="NabPrize Esports"
              style={{
                width: '64px', height: '64px', borderRadius: '16px',
                margin: '0 auto 14px', display: 'block',
                boxShadow: '0 4px 16px rgba(255,107,74,0.4)',
              }}
            />

            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 6px' }}>
              Install NabPrize App
            </h3>
            <p style={{ fontSize: '13px', color: '#A69E94', margin: '0 0 20px', lineHeight: 1.4 }}>
              To install on your mobile device home screen:
            </p>

            <div style={{
              background: 'rgba(255,255,255,0.04)', borderRadius: '12px',
              padding: '14px', textAlign: 'left', marginBottom: '20px',
              fontSize: '13px', color: '#FAF8F5', display: 'flex', flexDirection: 'column', gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  background: '#FF6B4A', color: '#FFF', borderRadius: '50%',
                  width: '22px', height: '22px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '11px', fontWeight: 800, flexShrink: 0,
                }}>1</span>
                <span>Tap the browser <strong>Share</strong> or <strong>Menu (⋮)</strong> button.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  background: '#FF6B4A', color: '#FFF', borderRadius: '50%',
                  width: '22px', height: '22px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '11px', fontWeight: 800, flexShrink: 0,
                }}>2</span>
                <span>Select <strong>Add to Home screen</strong> or <strong>Install App</strong>.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  background: '#FF6B4A', color: '#FFF', borderRadius: '50%',
                  width: '22px', height: '22px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '11px', fontWeight: 800, flexShrink: 0,
                }}>3</span>
                <span>Tap <strong>Add / Install</strong> to finish!</span>
              </div>
            </div>

            <button
              onClick={() => {
                setShowIOSModal(false);
                handleContinueInBrowser();
              }}
              style={{
                width: '100%', padding: '13px', background: '#FF6B4A',
                color: '#FFFFFF', border: 'none', borderRadius: '12px',
                fontWeight: 700, fontSize: '14px', cursor: 'pointer',
              }}
            >
              Continue in Browser Instead
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
