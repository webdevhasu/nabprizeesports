import TopBar from '../components/TopBar';

export default function Terms() {
  const sections = [
    {
      title: '1. About NabPrize Esports',
      content: `NabPrize Esports is a competitive mobile gaming platform based in Pakistan. We organize daily and weekly Custom Room tournaments for PUBG Mobile and Free Fire, where players compete and winners earn cash prizes directly to their wallets.`,
    },
    {
      title: '2. Eligibility',
      content: `You must be 18 years or older to register and participate. By creating an account, you confirm that all information provided (name, phone number, game UID, payment account) is accurate and belongs to you.`,
    },
    {
      title: '3. One Account Per Player',
      content: `Each player is allowed one account only. Creating multiple accounts, sharing accounts, or using fake identities will result in permanent removal from the platform and forfeiture of any wallet balance.`,
    },
    {
      title: '4. Tournament Entry & Registration',
      content: `Each tournament has a registration fee which covers the operational costs of running the platform and organizing the match. This includes:\n• Server hosting & app maintenance\n• Tournament management & admin oversight\n• Custom room creation & coordination\n• Development & support staff costs\n\nAll registration fees and prize amounts are clearly displayed before registration. Once you have joined a tournament, the registration fee is non-refundable unless the tournament is cancelled by us.`,
    },
    {
      title: '5. Prize Payouts',
      content: `Winners are determined by in-game performance (kills, placement) verified by our admin team. Prize money is credited to your NabPrize wallet within a few hours of match completion. Withdrawals to JazzCash or EasyPaisa are processed within 24 hours of request, with a minimum withdrawal of Rs 100.`,
    },
    {
      title: '6. Fair Play',
      content: `All players must compete fairly. The following will result in a permanent ban and forfeiture of any winnings:\n• Use of hacks, cheats, or aimbots\n• Teaming with opponents\n• Account sharing or selling\n• Any form of match manipulation`,
    },
    {
      title: '7. Room Credentials',
      content: `Custom Room ID and Password are released 10 minutes before match start. It is the player's responsibility to join the room within this window. Failure to join on time does not qualify for a refund.`,
    },
    {
      title: '8. Platform Conduct',
      content: `Players must behave respectfully toward other participants and our team. Any harassment, abuse, or threats via chat or any channel will result in account suspension.`,
    },
    {
      title: '9. Changes to Terms',
      content: `NabPrize Esports may update these terms at any time. Continued use of the platform after changes are posted means you accept the updated terms.`,
    },
    {
      title: '10. Contact',
      content: `For any questions, disputes, or support regarding tournaments, withdrawals, or your account, reach out to us via our support channel. We aim to respond within a few hours.`,
    },
  ];

  return (
    <>
      <TopBar title="Terms & Conditions" showBack />
      <div className="responsive-page-container" style={{ padding: '16px 16px 40px', maxWidth: '860px', margin: '0 auto' }}>
        <div style={{
          background: '#FFFFFF',
          borderRadius: '18px',
          padding: '22px 20px',
          border: '1px solid #EBE4DA',
        }}>
          <h2 style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 800,
            fontSize: '18px',
            color: '#2E2A26',
            margin: '0 0 4px',
          }}>
            Terms & Conditions
          </h2>
          <p style={{ fontSize: '12px', color: '#A69E94', margin: '0 0 24px' }}>
            Last updated: August 2026 — By using this app, you agree to these terms.
          </p>

          {sections.map((section, i) => (
            <div
              key={i}
              style={{
                marginBottom: '20px',
                paddingBottom: '20px',
                borderBottom: i < sections.length - 1 ? '1px solid #F0ECE4' : 'none',
              }}
            >
              <h3 style={{
                fontWeight: 700,
                fontSize: '13px',
                color: '#FF6B4A',
                margin: '0 0 8px',
              }}>
                {section.title}
              </h3>
              <p style={{
                fontSize: '13px',
                color: '#5E5851',
                lineHeight: '1.7',
                margin: 0,
                whiteSpace: 'pre-line',
              }}>
                {section.content}
              </p>
            </div>
          ))}

          <div style={{
            background: '#FAF8F5',
            borderRadius: '10px',
            padding: '14px',
            marginTop: '8px',
            border: '1px solid #EBE4DA',
          }}>
            <p style={{ fontSize: '12px', color: '#8A8078', lineHeight: '1.6', margin: 0 }}>
              NabPrize Esports is a skill-based esports platform. All tournament outcomes are determined by in-game player performance, verified by our admin team.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
