const fs = require('fs');
const file = 'src/pages/TournamentDetail.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    const [joinError, setJoinError] = useState('');\n  const [copiedField, setCopiedField] = useState(null);,
    const [joinError, setJoinError] = useState('');\n  const [copiedField, setCopiedField] = useState(null);\n\n  // Squad State\n  const [teamName, setTeamName] = useState('');\n  const [teamLogo, setTeamLogo] = useState(null);\n  const [teammate1, setTeammate1] = useState({ ign: '', uid: '' });\n  const [teammate2, setTeammate2] = useState({ ign: '', uid: '' });\n  const [teammate3, setTeammate3] = useState({ ign: '', uid: '' });\n  const [uploadingLogo, setUploadingLogo] = useState(false);
);

fs.writeFileSync(file, content, 'utf8');
