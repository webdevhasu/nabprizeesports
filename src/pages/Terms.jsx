import TopBar from '../components/TopBar';

export default function Terms() {
  const sections = [
    {
      title: '1. About NabPrize Esports',
      content: `NabPrize Esports is a skill-based mobile gaming platform serving players in Pakistan. We organize custom-room tournaments for PUBG Mobile and Free Fire. These terms explain how paid participation, fixed platform rewards, refunds and fair play work.`,
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
      title: '4. Service Fee & Tournament Registration',
      content: `A paid tournament's displayed registration/service fee is charged for access to the organized match service, custom-room coordination, server and platform operations, administration, verification and support. The fee is not described as a wager, bet or pooled prize contribution.\n\nThe fixed reward shown on the tournament page is determined and funded by NabPrize/platform funds. It is not increased according to the number of registrations and is not a prize pool collected from players. We will not use wording that conflicts with the actual accounting of a tournament; if a tournament structure changes, its listing and these terms will be updated before registration.`,
    },
    {
      title: '5. Fixed Rewards & Results',
      content: `Winners and kill performers are determined by the published scoring rules and verified in-game results. The fixed reward and per-kill reward are displayed before joining. Rewards are credited to the NabPrize wallet after verification; withdrawals to JazzCash or EasyPaisa are processed according to the stated withdrawal rules and available verification checks.`,
    },
    {
      title: '6. Refund & Cancellation Policy',
      content: `A full service-fee refund or wallet credit is provided when NabPrize cancels a tournament, fails to provide the scheduled room or match because of a platform-side issue, or cannot conduct the tournament for an operational/technical reason.\n\nAfter a valid slot is locked, fees are non-refundable when a player changes their mind, does not join on time, submits an incorrect UID, loses the match, has a device or internet problem, or is removed for cheating, teaming, abuse or another rule violation. If a platform-side issue is disputed, contact support promptly with the tournament ID and evidence; we will review the records and announce the resolution.`,
    },
    {
      title: '7. Fair Play',
      content: `All players must compete fairly. The following will result in a permanent ban and forfeiture of any winnings:\n• Use of hacks, cheats, or aimbots\n• Teaming with opponents\n• Account sharing or selling\n• Any form of match manipulation`,
    },
    {
      title: '8. Room Credentials',
      content: `Custom Room ID and Password are released 10 minutes before match start. It is the player's responsibility to join the room within this window. Failure to join on time does not qualify for a refund.`,
    },
    {
      title: '9. Platform Conduct',
      content: `Players must behave respectfully toward other participants and our team. Any harassment, abuse, or threats via chat or any channel will result in account suspension.`,
    },
    {
      title: '10. Changes to Terms',
      content: `NabPrize Esports may update these terms at any time. Continued use of the platform after changes are posted means you accept the updated terms.`,
    },
    {
      title: '11. Contact',
      content: `For any questions, disputes, or support regarding tournaments, withdrawals, or your account, reach out to us via our support channel. We aim to respond within a few hours.`,
    },
  ];

  return (
    <>
      <TopBar title="Terms & Conditions" showBack />
      <div className="responsive-page-container" style={{ padding: '72px 16px 40px', maxWidth: '860px', margin: '0 auto' }}>
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
            Last updated: September 2026 — By using this app, you agree to these terms.
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
              NabPrize Esports is a skill-based esports platform. Tournament outcomes are determined by in-game performance and verified by our admin team. These terms are general platform terms, not a guarantee of legal or religious compliance in every jurisdiction; obtain independent advice before participating if you need a formal opinion.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
