import TopBar from '../components/TopBar';

export default function HowItWorks() {
  const steps = [
    { icon: '1️⃣', title: 'Create Account', desc: 'Sign up with Google or email, add your game UID & IGN' },
    { icon: '2️⃣', title: 'Add Funds', desc: 'Deposit money via JazzCash or EasyPaisa using Safepay' },
    { icon: '3️⃣', title: 'Join Tournament', desc: 'Browse tournaments, pay registration charges from your wallet' },
    { icon: '4️⃣', title: 'Compete', desc: 'Get Room ID & Password, join the in-game match' },
    { icon: '5️⃣', title: 'Win Rewards', desc: 'Top performers earn fixed rewards credited to your wallet' },
    { icon: '6️⃣', title: 'Withdraw', desc: 'Cash out via JazzCash or EasyPaisa within 3-5 business days' },
  ];

  return (
    <>
      <TopBar title="How It Works" showBack />
      <div className="responsive-page-container" style={{ padding: '16px', maxWidth: '860px', margin: '0 auto' }}>
        <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '20px' }}>
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '18px', color: '#2E2A26', marginBottom: '16px' }}>
            How NabPrize Esports Works
          </h2>

          <a
            href="https://www.youtube.com/shorts/L5KtdDgm34Q"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, #FFF5F2 0%, #FFEBE5 100%)',
              borderRadius: '14px',
              padding: '14px 16px',
              marginBottom: '24px',
              border: '1.5px solid #FFD4C7',
              textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(255,107,74,0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: '#FF0000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 3px 8px rgba(255,0,0,0.3)',
                flexShrink: 0,
              }}>
                ▶
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#2E2A26' }}>
                  Watch Video Tutorial
                </div>
                <div style={{ fontSize: '12px', color: '#8A8078' }}>
                  Step-by-step YouTube Shorts guide (1 min)
                </div>
              </div>
            </div>
            <span style={{
              background: '#FF6B4A',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 700,
              padding: '8px 14px',
              borderRadius: '8px',
              flexShrink: 0,
            }}>
              Watch ▶
            </span>
          </a>
          {steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <div style={{ fontSize: '24px' }}>{step.icon}</div>
              <div>
                <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: '14px', color: '#2E2A26', margin: 0 }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '13px', color: '#8A8078', marginTop: '4px' }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
