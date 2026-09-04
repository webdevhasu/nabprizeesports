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
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '18px', color: '#2E2A26', marginBottom: '20px' }}>
            How NabPrize Esports Works
          </h2>
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
