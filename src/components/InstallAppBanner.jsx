import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles, Share, PlusSquare } from 'lucide-react';

export default function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already running in standalone/installed mode
    const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone ||
      document.referrer.includes('android-app://');

    setIsStandalone(Boolean(isRunningStandalone));

    // Check if user dismissed within last 3 days
    const dismissedAt = localStorage.getItem('np_install_dismissed');
    if (dismissedAt) {
      const diffDays = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (diffDays < 3) {
        setDismissed(true);
      }
    }

    // Detect iOS
    const isIosDevice = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    setIsIOS(isIosDevice);

    // Listen for Android / Chrome install event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert('To install, tap your browser menu (⋮) and choose "Install App" or "Add to Home Screen".');
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('np_install_dismissed', Date.now().toString());
  };

  if (isStandalone || dismissed) return null;

  return (
    <>
      <div style={{
        background: 'linear-gradient(135deg, #2E1B15 0%, #1A1310 100%)',
        border: '1px solid #FF6B4A44',
        borderRadius: '16px',
        padding: '14px 16px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: '0 4px 16px rgba(255, 107, 74, 0.12)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Glow circle */}
        <div style={{
          position: 'absolute',
          top: '-15px',
          right: '20px',
          width: '80px',
          height: '80px',
          background: 'radial-gradient(circle, rgba(255,107,74,0.25) 0%, rgba(255,107,74,0) 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <img
            src="/icon-192.png"
            alt="NabPrize Esports"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              objectFit: 'cover',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(255, 107, 74, 0.4)',
              border: '1.5px solid rgba(255, 107, 74, 0.5)',
            }}
          />

          <div style={{ minWidth: 0 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 800,
              fontSize: '13px',
              color: '#FFFFFF',
            }}>
              <span>Install NabPrize App</span>
              <span style={{
                background: '#FF6B4A',
                color: '#FFF',
                fontSize: '9px',
                padding: '1px 5px',
                borderRadius: '4px',
                fontWeight: 700,
              }}>
                FAST
              </span>
            </div>
            <div style={{
              fontSize: '11px',
              color: '#C4BCB2',
              marginTop: '2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              Instant room alerts & 1-tap matches!
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={handleInstallClick}
            style={{
              background: 'linear-gradient(135deg, #FF6B4A 0%, #E8552F 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 2px 8px rgba(255, 107, 74, 0.3)',
            }}
          >
            <Download size={14} />
            <span>Install</span>
          </button>

          <button
            onClick={handleDismiss}
            title="Dismiss"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              color: '#8A8078',
              borderRadius: '50%',
              width: '26px',
              height: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* iOS Install Instruction Modal */}
      {showIOSModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '24px',
            maxWidth: '360px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          }}>
            <img
              src="/icon-192.png"
              alt="NabPrize Esports"
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '16px',
                objectFit: 'cover',
                margin: '0 auto 16px',
                display: 'block',
                boxShadow: '0 6px 16px rgba(255, 107, 74, 0.35)',
                border: '2px solid rgba(255, 107, 74, 0.4)',
              }}
            />

            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#2E2A26', margin: '0 0 8px' }}>
              Install on iPhone / iPad
            </h3>

            <p style={{ fontSize: '13px', color: '#8A8078', margin: '0 0 20px', lineHeight: 1.4 }}>
              Follow these simple steps in Safari to add NabPrize directly to your Home Screen:
            </p>

            <div style={{
              background: '#F9F7F4',
              borderRadius: '12px',
              padding: '14px',
              textAlign: 'left',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#2E2A26',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  background: '#FF6B4A', color: '#FFF', borderRadius: '50%',
                  width: '22px', height: '22px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '11px', fontWeight: 800, flexShrink: 0,
                }}>1</span>
                <span>Tap the <strong>Share</strong> button <Share size={14} style={{ display: 'inline', verticalAlign: 'middle', color: '#007AFF' }} /> at the bottom of Safari.</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  background: '#FF6B4A', color: '#FFF', borderRadius: '50%',
                  width: '22px', height: '22px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '11px', fontWeight: 800, flexShrink: 0,
                }}>2</span>
                <span>Scroll down and select <strong>Add to Home Screen</strong> <PlusSquare size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />.</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  background: '#FF6B4A', color: '#FFF', borderRadius: '50%',
                  width: '22px', height: '22px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '11px', fontWeight: 800, flexShrink: 0,
                }}>3</span>
                <span>Tap <strong>Add</strong> at top right. Done!</span>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#2E2A26',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
}
