import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, getDocs, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { notifyAllUsers, notifyMultipleUsers } from '../utils/notify';
import {
  Plus,
  Trash2,
  Users,
  DollarSign,
  Calendar,
  Search,
  Trophy,
  Play,
  Square,
  AlertCircle,
  Key,
  Copy,
  Check,
  X,
  Edit3,
  Star,
  Sparkles,
  BookmarkPlus,
  Clock,
  ArrowRight,
  Layers,
  Zap,
  CheckCircle2
} from 'lucide-react';
import AdminLayout from './AdminLayout';
import LoadingSpinner from '../components/LoadingSpinner';

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid #D9D3CC',
  fontSize: '13px',
  boxSizing: 'border-box',
  background: '#FFFFFF',
  outline: 'none',
  transition: 'border-color 0.15s ease',
};

const labelStyle = {
  fontSize: '12px',
  fontWeight: 600,
  color: '#5E5851',
  marginBottom: '6px',
  display: 'block',
};

const helpStyle = {
  fontSize: '11px',
  color: '#8A8078',
  marginTop: '4px',
};

const cardStyle = {
  background: '#FFFFFF',
  borderRadius: '14px',
  padding: '24px',
  border: '1px solid #EBE4DA',
  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
};

const DEFAULT_STARTER_PRESETS = [
  {
    id: 'starter-pubg-solo',
    presetName: 'PUBG Solo Daily',
    name: 'PUBG Solo Daily Match',
    game: 'pubg',
    matchType: 'Solo',
    tournamentType: 'Daily',
    maxSlots: '25',
    registrationCharge: '50',
    fixedReward: '200',
    mapName: 'Erangel',
    rules: 'No teaming, no hacks/cheats. Emulators strictly banned. Room ID & Password released 10 mins before match.',
    isStarter: true,
  },
  {
    id: 'starter-pubg-squad',
    presetName: 'PUBG Squad Showdown',
    name: 'PUBG Squad Battle',
    game: 'pubg',
    matchType: 'Squad',
    tournamentType: 'Daily',
    maxSlots: '25',
    registrationCharge: '200',
    fixedReward: '1000',
    mapName: 'Erangel',
    rules: 'Squad team match. All 4 team members must be ready. No emulator allowed.',
    isStarter: true,
  },
  {
    id: 'starter-ff-solo',
    presetName: 'Free Fire Solo Daily',
    name: 'Free Fire Solo Rush',
    game: 'freefire',
    matchType: 'Solo',
    tournamentType: 'Daily',
    maxSlots: '25',
    registrationCharge: '30',
    fixedReward: '150',
    mapName: 'Bermuda',
    rules: 'Gun properties OFF, Character skills ON. No hack/script allowed. Instant DQ for rule breakers.',
    isStarter: true,
  },
  {
    id: 'starter-weekly-champ',
    presetName: 'Weekly Championship',
    name: 'Weekly Mega Championship',
    game: 'pubg',
    matchType: 'Squad',
    tournamentType: 'Weekly Championship',
    maxSlots: '25',
    registrationCharge: '100',
    fixedReward: '2500',
    mapName: 'Erangel',
    rules: 'Major Weekly Tournament. High rewards. Screenshot proof mandatory for winners.',
    isStarter: true,
  },
];

export default function CreateTournament() {
  // Main Tab State: 'tournaments' or 'favorites'
  const [activeMainTab, setActiveMainTab] = useState('tournaments');

  const [tournaments, setTournaments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTournament, setEditingTournament] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSuccessMsg, setTemplateSuccessMsg] = useState('');

  // New Preset Modal State (in Favorites tab)
  const [showCreatePresetModal, setShowCreatePresetModal] = useState(false);
  const [presetModalData, setPresetModalData] = useState({
    presetName: '',
    name: '',
    game: 'pubg',
    matchType: 'Solo',
    tournamentType: 'Daily',
    maxSlots: '25',
    registrationCharge: '50',
    fixedReward: '200',
    mapName: 'Erangel',
    rules: '',
  });
  
  // Room ID & Password Modal State
  const [roomModalTournament, setRoomModalTournament] = useState(null);
  const [modalRoomId, setModalRoomId] = useState('');
  const [modalPassword, setModalPassword] = useState('');
  const [modalSaving, setModalSaving] = useState(false);

  // Joined Players Modal State
  const [playersModalTournament, setPlayersModalTournament] = useState(null);
  const [tournamentPlayers, setTournamentPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [playersSearchQuery, setPlayersSearchQuery] = useState('');
  const [copiedPlayerUid, setCopiedPlayerUid] = useState(null);
  const [copiedAllRoster, setCopiedAllRoster] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    game: 'pubg',
    matchType: 'Solo',
    tournamentType: 'Daily',
    maxSlots: '25',
    registrationCharge: '',
    fixedReward: '',
    startTime: '',
    mapName: 'Erangel',
    rules: '',
    roomId: '',
    roomPassword: '',
    status: 'upcoming',
  });

  // Realtime Tournaments Listener
  useEffect(() => {
    const unsubTournaments = onSnapshot(
      query(collection(db, 'tournaments'), orderBy('createdAt', 'desc')),
      (snap) => setTournaments(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.error('Tournaments sync error:', err)
    );

    // Realtime Templates / Presets Listener
    const unsubTemplates = onSnapshot(
      collection(db, 'tournamentTemplates'),
      (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTemplates(list);
      },
      (err) => console.error('Templates sync error:', err)
    );

    return () => {
      unsubTournaments();
      unsubTemplates();
    };
  }, []);

  // Combine user-created templates with default starter presets
  const allTemplates = [
    ...templates,
    ...DEFAULT_STARTER_PRESETS.filter(sp => !templates.some(t => t.presetName === sp.presetName))
  ];

  const handleStartCreate = () => {
    setEditingTournament(null);
    setFormData({
      name: '',
      game: 'pubg',
      matchType: 'Solo',
      tournamentType: 'Daily',
      maxSlots: '25',
      registrationCharge: '',
      fixedReward: '',
      startTime: '',
      mapName: 'Erangel',
      rules: '',
      roomId: '',
      roomPassword: '',
      status: 'upcoming',
    });
    setActiveMainTab('tournaments');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartEdit = (t) => {
    setEditingTournament(t);
    setFormData({
      name: t.name || '',
      game: t.game || 'pubg',
      matchType: t.matchType || 'Solo',
      tournamentType: t.tournamentType || 'Daily',
      maxSlots: t.maxSlots !== undefined ? t.maxSlots.toString() : '25',
      registrationCharge: t.registrationCharge !== undefined ? t.registrationCharge.toString() : '',
      fixedReward: t.fixedReward !== undefined ? t.fixedReward.toString() : '',
      startTime: t.startTime || '',
      mapName: t.mapName || 'Erangel',
      rules: t.rules || '',
      roomId: t.roomId || '',
      roomPassword: t.roomPassword || '',
      status: t.status || 'upcoming',
    });
    setActiveMainTab('tournaments');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingTournament(null);
    setTemplateSuccessMsg('');
  };

  // Submit Handler: Supports both Create and Update
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setLoading(true);
    try {
      const maxSlots = Number(formData.maxSlots) || 25;
      const registrationCharge = Number(formData.registrationCharge) || 0;
      const fixedReward = Number(formData.fixedReward) || 0;

      if (editingTournament) {
        // UPDATE EXISTING TOURNAMENT
        await updateDoc(doc(db, 'tournaments', editingTournament.id), {
          name: formData.name.trim(),
          game: formData.game,
          matchType: formData.matchType,
          tournamentType: formData.tournamentType,
          maxSlots,
          registrationCharge,
          fixedReward,
          startTime: formData.startTime,
          mapName: formData.mapName,
          rules: formData.rules,
          roomReleased: Boolean(formData.roomId),
          status: formData.status || editingTournament.status || 'upcoming',
          updatedAt: serverTimestamp(),
        });

        if (formData.roomId) {
          await setDoc(doc(db, 'tournaments', editingTournament.id, 'roomDetails', 'info'), {
            roomId: formData.roomId.trim(),
            roomPassword: formData.roomPassword ? formData.roomPassword.trim() : ''
          });
        }

        alert(`Tournament "${formData.name}" updated successfully!`);
      } else {
        // CREATE NEW TOURNAMENT — strip sensitive fields before writing public doc
        const { roomId: _roomId, roomPassword: _roomPass, ...safeFormData } = formData;
        const newDocRef = await addDoc(collection(db, 'tournaments'), {
          ...safeFormData,
          name: formData.name.trim(),
          maxSlots,
          registrationCharge,
          fixedReward,
          status: 'upcoming',
          slotsFilled: 0,
          roomReleased: Boolean(formData.roomId),
          createdAt: serverTimestamp(),
        });

        if (formData.roomId) {
          await setDoc(doc(db, 'tournaments', newDocRef.id, 'roomDetails', 'info'), {
            roomId: formData.roomId.trim(),
            roomPassword: formData.roomPassword ? formData.roomPassword.trim() : ''
          });
        }

        // Auto-notify all users about new tournament
        const gameLabel = formData.game === 'pubg' ? 'PUBG Mobile' : 'Free Fire';
        notifyAllUsers({
          type: 'tournament',
          title: 'New Tournament Available!',
          body: `${formData.name} (${gameLabel} ${formData.matchType}) — Reward: Rs ${fixedReward.toLocaleString()} | Register now!`,
          url: '/',
        }).catch(() => {});
      }

      setShowForm(false);
      setEditingTournament(null);
      setFormData({
        name: '',
        game: 'pubg',
        matchType: 'Solo',
        tournamentType: 'Daily',
        maxSlots: '25',
        registrationCharge: '',
        fixedReward: '',
        startTime: '',
        mapName: 'Erangel',
        rules: '',
        roomId: '',
        roomPassword: '',
        status: 'upcoming',
      });
    } catch (error) {
      console.error('Error saving tournament:', error);
      alert('Failed to save tournament: ' + error.message);
    }
    setLoading(false);
  };

  // Quick Apply Favorite Preset
  const handleApplyPreset = (preset) => {
    setFormData(prev => ({
      ...prev,
      name: preset.name || prev.name,
      game: preset.game || 'pubg',
      matchType: preset.matchType || 'Solo',
      tournamentType: preset.tournamentType || 'Daily',
      maxSlots: preset.maxSlots !== undefined ? preset.maxSlots.toString() : '25',
      registrationCharge: preset.registrationCharge !== undefined ? preset.registrationCharge.toString() : '',
      fixedReward: preset.fixedReward !== undefined ? preset.fixedReward.toString() : '',
      mapName: preset.mapName || 'Erangel',
      rules: preset.rules || '',
    }));
    setActiveMainTab('tournaments');
    setShowForm(true);
    setTemplateSuccessMsg(`⭐ Loaded template "${preset.presetName || preset.name}"! Pick the match time and click Publish.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setTemplateSuccessMsg(''), 5000);
  };

  // Save current Form as Favorite Preset Template
  const handleSaveAsPreset = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a Tournament Title first before saving as template.');
      return;
    }
    const presetName = prompt('Enter a name for this Favorite Template / Preset:', `${formData.name} (${formData.matchType})`);
    if (!presetName || !presetName.trim()) return;

    setSavingTemplate(true);
    try {
      await addDoc(collection(db, 'tournamentTemplates'), {
        presetName: presetName.trim(),
        name: formData.name.trim(),
        game: formData.game,
        matchType: formData.matchType,
        tournamentType: formData.tournamentType,
        maxSlots: formData.maxSlots || '25',
        registrationCharge: formData.registrationCharge || '0',
        fixedReward: formData.fixedReward || '0',
        mapName: formData.mapName || 'Erangel',
        rules: formData.rules || '',
        createdAt: serverTimestamp(),
      });
      setTemplateSuccessMsg(`⭐ Template "${presetName}" saved to Favorites Tab!`);
      setTimeout(() => setTemplateSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error saving template:', err);
      alert('Failed to save template: ' + err.message);
    }
    setSavingTemplate(false);
  };

  // Save an existing Tournament from Table directly as Template
  const handleSaveTournamentAsTemplate = async (t) => {
    const defaultName = `${t.name} (Preset)`;
    const presetName = prompt('Save this Tournament as Favorite Template / Preset:', defaultName);
    if (!presetName || !presetName.trim()) return;

    try {
      await addDoc(collection(db, 'tournamentTemplates'), {
        presetName: presetName.trim(),
        name: t.name,
        game: t.game || 'pubg',
        matchType: t.matchType || 'Solo',
        tournamentType: t.tournamentType || 'Daily',
        maxSlots: t.maxSlots ? t.maxSlots.toString() : '25',
        registrationCharge: t.registrationCharge !== undefined ? t.registrationCharge.toString() : '0',
        fixedReward: t.fixedReward !== undefined ? t.fixedReward.toString() : '0',
        mapName: t.mapName || 'Erangel',
        rules: t.rules || '',
        createdAt: serverTimestamp(),
      });
      alert(`⭐ Template "${presetName}" saved successfully in Favorites tab!`);
    } catch (err) {
      console.error('Error saving template:', err);
      alert('Failed to save template: ' + err.message);
    }
  };

  // Create new Template directly from Favorites Tab Modal
  const handleCreatePresetFromModal = async (e) => {
    e.preventDefault();
    if (!presetModalData.presetName.trim() || !presetModalData.name.trim()) return;

    try {
      await addDoc(collection(db, 'tournamentTemplates'), {
        presetName: presetModalData.presetName.trim(),
        name: presetModalData.name.trim(),
        game: presetModalData.game,
        matchType: presetModalData.matchType,
        tournamentType: presetModalData.tournamentType,
        maxSlots: presetModalData.maxSlots || '25',
        registrationCharge: presetModalData.registrationCharge || '0',
        fixedReward: presetModalData.fixedReward || '0',
        mapName: presetModalData.mapName || 'Erangel',
        rules: presetModalData.rules || '',
        createdAt: serverTimestamp(),
      });
      setShowCreatePresetModal(false);
      setPresetModalData({
        presetName: '',
        name: '',
        game: 'pubg',
        matchType: 'Solo',
        tournamentType: 'Daily',
        maxSlots: '25',
        registrationCharge: '50',
        fixedReward: '200',
        mapName: 'Erangel',
        rules: '',
      });
      alert('⭐ New Favorite Template added successfully!');
    } catch (err) {
      console.error('Error creating template:', err);
      alert('Failed to create template: ' + err.message);
    }
  };

  // Delete Custom Template
  const handleDeleteTemplate = async (tplId, tplName) => {
    if (window.confirm(`Delete preset "${tplName}" from Favorites?`)) {
      try {
        await deleteDoc(doc(db, 'tournamentTemplates', tplId));
      } catch (err) {
        console.error('Delete template error:', err);
      }
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await deleteDoc(doc(db, 'tournaments', id));
      } catch (e) {
        console.error('Delete error:', e);
      }
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    const tournament = tournaments.find(t => t.id === id);
    if (!tournament) return;
    const currentStatus = tournament.status;
    const validTransitions = { upcoming: ['live'], live: ['completed'], ended: [] };
    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      alert(`Cannot change from "${currentStatus}" to "${newStatus}"`);
      return;
    }
    try {
      await updateDoc(doc(db, 'tournaments', id), { status: newStatus });
    } catch (e) {
      console.error('Status update error:', e);
    }
  };

  // Open Room ID & Password Modal
  const openRoomModal = async (tournament) => {
    setRoomModalTournament(tournament);
    setModalRoomId('');
    setModalPassword('');
    // Fetch existing credentials from secure subcollection
    try {
      const roomSnap = await getDoc(doc(db, 'tournaments', tournament.id, 'roomDetails', 'info'));
      if (roomSnap.exists()) {
        setModalRoomId(roomSnap.data().roomId || '');
        setModalPassword(roomSnap.data().roomPassword || '');
      }
    } catch (e) {
      console.error('Error fetching room details:', e);
    }
  };

  const handleSaveRoomDetails = async (e) => {
    e.preventDefault();
    if (!roomModalTournament) return;
    setModalSaving(true);
    try {
      await updateDoc(doc(db, 'tournaments', roomModalTournament.id), {
        roomReleased: true,
      });
      await setDoc(doc(db, 'tournaments', roomModalTournament.id, 'roomDetails', 'info'), {
        roomId: modalRoomId.trim(),
        roomPassword: modalPassword.trim(),
      });

      // Auto-notify registered players about Room ID
      try {
        const playersSnap = await getDocs(collection(db, 'tournaments', roomModalTournament.id, 'players'));
        const playerUids = playersSnap.docs.map(d => d.data().userId).filter(Boolean);
        if (playerUids.length > 0) {
          notifyMultipleUsers(playerUids, {
            type: 'tournament',
            title: 'Room ID Available!',
            body: `Room ID & Password for "${roomModalTournament.name}" is now live. Join quickly!`,
            url: `/tournament/${roomModalTournament.id}`,
          }).catch(() => {});
        }
      } catch (e) {
        console.error('Room notify error:', e);
      }
      setRoomModalTournament(null);
    } catch (err) {
      console.error('Error saving room details:', err);
      alert('Failed to update Room details');
    }
    setModalSaving(false);
  };

  // Open Joined Players Roster Modal
  const openPlayersModal = async (tournament) => {
    setPlayersModalTournament(tournament);
    setLoadingPlayers(true);
    setPlayersSearchQuery('');
    setCopiedAllRoster(false);
    try {
      const snap = await getDocs(collection(db, 'tournaments', tournament.id, 'players'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        const timeA = a.registeredAt?.toMillis?.() || (a.registeredAt ? new Date(a.registeredAt).getTime() : 0);
        const timeB = b.registeredAt?.toMillis?.() || (b.registeredAt ? new Date(b.registeredAt).getTime() : 0);
        return timeA - timeB;
      });
      setTournamentPlayers(list);
    } catch (err) {
      console.error('Error fetching tournament players:', err);
      setTournamentPlayers([]);
    }
    setLoadingPlayers(false);
  };

  const handleCopyUid = (uid) => {
    if (!uid) return;
    navigator.clipboard.writeText(uid);
    setCopiedPlayerUid(uid);
    setTimeout(() => setCopiedPlayerUid(null), 2000);
  };

  const handleCopyAllRoster = () => {
    if (tournamentPlayers.length === 0) return;
    const text = tournamentPlayers
      .map((p, i) => `${i + 1}. @${p.username} | IGN: ${p.ign || 'N/A'} | UID: ${p.uid || 'N/A'}`)
      .join('\n');
    navigator.clipboard.writeText(`Roster for ${playersModalTournament.name} (${tournamentPlayers.length} Players):\n\n${text}`);
    setCopiedAllRoster(true);
    setTimeout(() => setCopiedAllRoster(false), 2000);
  };

  const formatSchedulePKT = (startTimeStr) => {
    if (!startTimeStr) return 'No schedule';
    const regClose = new Date(startTimeStr);
    if (isNaN(regClose.getTime())) return 'Invalid date';
    const matchStart = new Date(regClose.getTime() + 10 * 60 * 1000);
    const regCloseTime = regClose.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
    const matchStartTime = matchStart.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
    return {
      dateStr: regClose.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }),
      regCloseTime: `${regCloseTime} PKT`,
      matchStartTime: `${matchStartTime} PKT`,
    };
  };

  const filteredTournaments = tournaments.filter(t => {
    const matchesSearch = !searchQuery ||
      t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.game?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.matchType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.roomId?.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredModalPlayers = tournamentPlayers.filter(p => {
    if (!playersSearchQuery) return true;
    const q = playersSearchQuery.toLowerCase();
    return (
      p.username?.toLowerCase().includes(q) ||
      p.ign?.toLowerCase().includes(q) ||
      p.uid?.toString().includes(q) ||
      p.userId?.toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout
      title="Tournament Management"
      subtitle="Manage live tournaments, edit parameters, and quick-launch matches with Favorite Presets"
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          {activeMainTab === 'tournaments' ? (
            <button
              onClick={showForm ? handleCancelForm : handleStartCreate}
              style={{
                padding: '8px 18px',
                background: showForm ? '#F0ECE4' : '#FF6B4A',
                color: showForm ? '#2E2A26' : '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: showForm ? 'none' : '0 2px 6px rgba(255, 107, 74, 0.25)',
              }}
            >
              {showForm ? <X size={16} /> : <Plus size={16} />}
              {showForm ? (editingTournament ? 'Cancel Edit' : 'Close Form') : 'New Tournament'}
            </button>
          ) : (
            <button
              onClick={() => setShowCreatePresetModal(true)}
              style={{
                padding: '8px 18px',
                background: '#E88B00',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(232, 139, 0, 0.3)',
              }}
            >
              <BookmarkPlus size={16} />
              + Add Favorite Preset
            </button>
          )}
        </div>
      }
    >
      {/* TOP NAVIGATION TABS (TOURNAMENTS vs FAVORITES) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '22px',
        background: '#FFFFFF',
        padding: '8px',
        borderRadius: '12px',
        border: '1px solid #EBE4DA',
        boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
      }}>
        <button
          onClick={() => setActiveMainTab('tournaments')}
          style={{
            flex: 1,
            padding: '10px 18px',
            borderRadius: '9px',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            border: 'none',
            background: activeMainTab === 'tournaments' ? '#FF6B4A' : 'transparent',
            color: activeMainTab === 'tournaments' ? '#FFFFFF' : '#5E5851',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
            boxShadow: activeMainTab === 'tournaments' ? '0 2px 8px rgba(255, 107, 74, 0.25)' : 'none',
          }}
        >
          <Trophy size={16} />
          <span>Tournaments & Matches ({tournaments.length})</span>
        </button>

        <button
          onClick={() => setActiveMainTab('favorites')}
          style={{
            flex: 1,
            padding: '10px 18px',
            borderRadius: '9px',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            border: 'none',
            background: activeMainTab === 'favorites' ? '#E88B00' : 'transparent',
            color: activeMainTab === 'favorites' ? '#FFFFFF' : '#5E5851',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
            boxShadow: activeMainTab === 'favorites' ? '0 2px 8px rgba(232, 139, 0, 0.25)' : 'none',
          }}
        >
          <Star size={16} fill={activeMainTab === 'favorites' ? '#FFFFFF' : '#F4B740'} color={activeMainTab === 'favorites' ? '#FFFFFF' : '#F4B740'} />
          <span>⭐ Favorite Presets & Templates ({allTemplates.length})</span>
        </button>
      </div>

      {/* TAB 1: TOURNAMENTS & MATCHES */}
      {activeMainTab === 'tournaments' && (
        <>
          {/* Create / Edit Form Card */}
          {showForm && (
            <div style={{
              ...cardStyle,
              marginBottom: '28px',
              border: editingTournament ? '2px solid #F4B740' : '2px solid #FFDACF',
              background: '#FFFFFF',
              boxShadow: editingTournament ? '0 4px 20px rgba(244, 183, 64, 0.15)' : '0 4px 20px rgba(255, 107, 74, 0.12)',
            }}>
              
              {/* Header Banner */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '18px',
                flexWrap: 'wrap',
                gap: '12px',
                paddingBottom: '14px',
                borderBottom: '1px solid #F0ECE4',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {editingTournament ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#E88B00', fontWeight: 800, fontSize: '18px' }}>
                        <Edit3 size={20} />
                        <span>Editing Tournament: {editingTournament.name}</span>
                      </div>
                    ) : (
                      <h3 style={{ fontWeight: 800, fontSize: '18px', color: '#2E2A26', margin: 0 }}>
                        Create New Tournament
                      </h3>
                    )}
                  </div>
                  <p style={{ fontSize: '12px', color: '#8A8078', margin: '4px 0 0' }}>
                    {editingTournament
                      ? 'Update tournament info, timings, prize reward, or room credentials without affecting registered players.'
                      : 'Fill details below, or pick any of your saved Favorite Presets for 1-click publishing.'}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {editingTournament ? (
                    <span style={{
                      fontSize: '12px',
                      background: '#FFF6E0',
                      color: '#E88B00',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '8px',
                      border: '1px solid #FFE4A0',
                    }}>
                      Status: {formData.status?.toUpperCase() || 'UPCOMING'}
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '12px',
                      background: '#FFF0EC',
                      color: '#FF6B4A',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: '8px',
                    }}>
                      Status: Upcoming
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Favorite Presets Bar */}
              <div style={{
                background: '#FAF8F5',
                border: '1px solid #EBE4DA',
                borderRadius: '12px',
                padding: '12px 14px',
                marginBottom: '20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#2E2A26' }}>
                    <Star size={15} color="#F4B740" fill="#F4B740" />
                    <span>Quick Fill from Favorite Presets:</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveAsPreset}
                    disabled={savingTemplate}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #F4B740',
                      color: '#E88B00',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <BookmarkPlus size={13} />
                    {savingTemplate ? 'Saving...' : '⭐ Save Form as Favorite Preset'}
                  </button>
                </div>

                {templateSuccessMsg && (
                  <div style={{
                    background: '#E8F5E9',
                    color: '#2E7D32',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '6px 10px',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <Check size={14} /> {templateSuccessMsg}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {allTemplates.map((tpl) => (
                    <div
                      key={tpl.id || tpl.presetName}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        background: '#FFFFFF',
                        border: '1px solid #E0D7CC',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleApplyPreset(tpl)}
                        title={`Click to fill: Fee Rs ${tpl.registrationCharge || 0} • Reward Rs ${tpl.fixedReward || 0} • ${tpl.matchType} • ${tpl.mapName}`}
                        style={{
                          border: 'none',
                          background: 'none',
                          padding: '6px 10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#2E2A26',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Sparkles size={12} color="#F4B740" />
                        <span>{tpl.presetName || tpl.name}</span>
                        <span style={{ color: '#8A8078', fontSize: '10px' }}>
                          ({Number(tpl.registrationCharge) > 0 ? `Rs ${tpl.registrationCharge}` : 'Free'}/{tpl.fixedReward || 0})
                        </span>
                      </button>
                      {!tpl.isStarter && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tpl.id, tpl.presetName)}
                          title="Remove this preset"
                          style={{
                            border: 'none',
                            borderLeft: '1px solid #EBE4DA',
                            background: 'none',
                            padding: '6px 8px',
                            cursor: 'pointer',
                            color: '#A69E94',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '18px',
                }}>

                  {/* Tournament Name */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Tournament Title *</label>
                    <input
                      type="text"
                      placeholder="e.g. PUBG Daily Showdown - Match #12"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      required
                      style={inputStyle}
                    />
                  </div>

                  {/* Game */}
                  <div>
                    <label style={labelStyle}>Game Title *</label>
                    <select
                      value={formData.game}
                      onChange={e => setFormData({ ...formData, game: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="pubg">PUBG Mobile</option>
                      <option value="freefire">Free Fire</option>
                    </select>
                  </div>

                  {/* Match Type */}
                  <div>
                    <label style={labelStyle}>Match Format *</label>
                    <select
                      value={formData.matchType}
                      onChange={e => setFormData({ ...formData, matchType: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="Solo">Solo (1 vs All)</option>
                      <option value="Duo">Duo (Team of 2)</option>
                      <option value="Squad">Squad (Team of 4)</option>
                    </select>
                  </div>

                  {/* Tournament Type */}
                  <div>
                    <label style={labelStyle}>Category / Schedule *</label>
                    <select
                      value={formData.tournamentType}
                      onChange={e => setFormData({ ...formData, tournamentType: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="Daily">Daily Match</option>
                      <option value="Weekly Championship">Weekly Championship</option>
                      <option value="Special Cup">Special Cup</option>
                    </select>
                  </div>

                  {/* Max Slots */}
                  <div>
                    <label style={labelStyle}>Maximum Player Slots *</label>
                    <input
                      type="number"
                      min="2"
                      max="100"
                      placeholder="25"
                      value={formData.maxSlots}
                      onChange={e => setFormData({ ...formData, maxSlots: e.target.value })}
                      style={inputStyle}
                      required
                    />
                  </div>

                  {/* Registration Charge */}
                  <div>
                    <label style={labelStyle}>Registration Fee per Player (PKR) *</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0 for Free or e.g. 50"
                      value={formData.registrationCharge}
                      onChange={e => setFormData({ ...formData, registrationCharge: e.target.value })}
                      style={inputStyle}
                      required
                    />
                  </div>

                  {/* Fixed Reward */}
                  <div>
                    <label style={labelStyle}>Winner Prize Reward (PKR) *</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 200"
                      value={formData.fixedReward}
                      onChange={e => setFormData({ ...formData, fixedReward: e.target.value })}
                      style={inputStyle}
                      required
                    />
                  </div>

                  {/* Start Time (Registration Close Time) */}
                  <div>
                    <label style={labelStyle}>Registration Close Time (PKT) *</label>
                    <input
                      type="datetime-local"
                      value={formData.startTime}
                      onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                      style={inputStyle}
                      required
                    />
                    <p style={helpStyle}>Room opens at this time for 10 mins before match starts</p>
                  </div>

                  {/* Map */}
                  <div>
                    <label style={labelStyle}>Map Arena *</label>
                    <select
                      value={formData.mapName}
                      onChange={e => setFormData({ ...formData, mapName: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="Erangel">Erangel (PUBG)</option>
                      <option value="Miramar">Miramar (PUBG)</option>
                      <option value="Sanhok">Sanhok (PUBG)</option>
                      <option value="Livik">Livik (PUBG)</option>
                      <option value="Bermuda">Bermuda (Free Fire)</option>
                      <option value="Purgatory">Purgatory (Free Fire)</option>
                      <option value="Kalahari">Kalahari (Free Fire)</option>
                    </select>
                  </div>

                  {/* Status Selector (Only when editing) */}
                  {editingTournament && (
                    <div>
                      <label style={labelStyle}>Match Status *</label>
                      <select
                        value={formData.status || 'upcoming'}
                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                        style={inputStyle}
                      >
                        <option value="upcoming">Upcoming (Registration Open)</option>
                        <option value="live">Live (Match in Progress)</option>
                        <option value="completed">Completed (Ended)</option>
                      </select>
                    </div>
                  )}

                  {/* Room ID & Password */}
                  <div>
                    <label style={labelStyle}>Custom Room ID (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 5928192"
                      value={formData.roomId}
                      onChange={e => setFormData({ ...formData, roomId: e.target.value })}
                      style={inputStyle}
                    />
                    <p style={helpStyle}>Can also be set or updated later from the table</p>
                  </div>

                  <div>
                    <label style={labelStyle}>Room Password (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 1234"
                      value={formData.roomPassword}
                      onChange={e => setFormData({ ...formData, roomPassword: e.target.value })}
                      style={inputStyle}
                    />
                  </div>

                  {/* Rules / Description */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Custom Rules (Optional)</label>
                    <textarea
                      placeholder="e.g. No teaming, no hacks. Room ID & Password will be released 10 minutes before match start."
                      value={formData.rules}
                      onChange={e => setFormData({ ...formData, rules: e.target.value })}
                      rows={2}
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />
                  </div>

                  {/* Submit Buttons */}
                  <div style={{
                    gridColumn: '1 / -1',
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '12px',
                    paddingTop: '16px',
                    borderTop: '1px solid #F0ECE4',
                    flexWrap: 'wrap',
                  }}>
                    <button
                      type="button"
                      onClick={handleSaveAsPreset}
                      disabled={savingTemplate}
                      style={{
                        padding: '10px 16px',
                        background: '#FFF8E1',
                        color: '#E88B00',
                        border: '1px solid #FFE082',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Star size={15} fill="#E88B00" />
                      {savingTemplate ? 'Saving...' : 'Save as Favorite Template'}
                    </button>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={handleCancelForm}
                        style={{
                          padding: '12px 24px',
                          background: '#F0ECE4',
                          color: '#5E5851',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 600,
                          fontSize: '14px',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        style={{
                          padding: '12px 32px',
                          background: editingTournament ? '#E88B00' : '#3FA65C',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '14px',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          boxShadow: editingTournament ? '0 2px 8px rgba(232, 139, 0, 0.35)' : '0 2px 8px rgba(63, 166, 92, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {loading ? (
                          'Saving...'
                        ) : editingTournament ? (
                          <>
                            <Check size={16} /> Update Tournament
                          </>
                        ) : (
                          <>
                            <Plus size={16} /> Publish Tournament
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                </div>
              </form>
            </div>
          )}

          {/* Main Tournaments Table View */}
          <div style={cardStyle}>
            
            {/* Controls Bar: Search & Status Filters */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
              marginBottom: '20px',
            }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
                <Search size={16} color="#A69E94" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search by name, game, mode, or Room ID..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: '36px' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: '#8A8078', fontWeight: 600 }}>Filter:</span>
                {[
                  { key: 'all', label: 'All' },
                  { key: 'upcoming', label: 'Upcoming' },
                  { key: 'live', label: 'Live' },
                  { key: 'completed', label: 'Completed' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: statusFilter === f.key ? '1px solid #FF6B4A' : '1px solid #E8E2DA',
                      background: statusFilter === f.key ? '#FF6B4A' : '#FFFFFF',
                      color: statusFilter === f.key ? '#FFFFFF' : '#8A8078',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Responsive Table Container */}
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '950px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #F0ECE4', background: '#FCFAF7' }}>
                    <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Tournament (Click for Players)</th>
                    <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Timeline (PKT)</th>
                    <th style={{ textAlign: 'left', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Room ID & Pass</th>
                    <th style={{ textAlign: 'center', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Joined Players</th>
                    <th style={{ textAlign: 'center', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Fee / Reward</th>
                    <th style={{ textAlign: 'center', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ textAlign: 'center', padding: '12px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTournaments.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#8A8078' }}>
                        No tournaments match your search or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTournaments.map(t => {
                      const schedule = formatSchedulePKT(t.startTime);

                      return (
                        <tr
                          key={t.id}
                          style={{
                            borderBottom: '1px solid #F0ECE4',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          {/* Tournament Name & Format */}
                          <td style={{ padding: '14px' }}>
                            <div
                              onClick={() => openPlayersModal(t)}
                              title="Click to view joined players roster"
                              style={{
                                fontWeight: 700,
                                color: '#FF6B4A',
                                fontSize: '14px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <span>{t.name}</span>
                              <Users size={14} color="#FF6B4A" />
                            </div>
                            <div style={{ fontSize: '11px', color: '#8A8078', marginTop: '2px' }}>
                              {t.game === 'pubg' ? 'PUBG Mobile' : 'Free Fire'} • {t.matchType} • {t.mapName || 'Erangel'}
                            </div>
                          </td>

                          {/* PKT Timeline */}
                          <td style={{ padding: '14px' }}>
                            {typeof schedule === 'object' ? (
                              <div>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#2E2A26' }}>
                                  Reg Closes: <span style={{ color: '#E8552F' }}>{schedule.regCloseTime}</span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#3FA65C', marginTop: '2px', fontWeight: 600 }}>
                                  Match Starts: {schedule.matchStartTime}
                                </div>
                                <div style={{ fontSize: '10px', color: '#A69E94' }}>{schedule.dateStr} (10m room window)</div>
                              </div>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#A69E94' }}>TBD</span>
                            )}
                          </td>

                          {/* Room ID & Pass Column */}
                          <td style={{ padding: '14px' }}>
                            {t.roomId ? (
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: '#2E2A26' }}>
                                    ID: {t.roomId}
                                  </span>
                                  <span style={{ fontSize: '10px', background: '#E8F5E9', color: '#3FA65C', padding: '1px 6px', borderRadius: '6px', fontWeight: 700 }}>
                                    Live
                                  </span>
                                </div>
                                <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#8A8078', marginTop: '2px' }}>
                                  Pass: {t.roomPassword || 'None'}
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#E88B00', fontSize: '11px', fontWeight: 600 }}>
                                <AlertCircle size={13} />
                                <span>Room Not Set</span>
                              </div>
                            )}
                            {(t.status === 'upcoming' || t.status === 'live') && (
                            <button
                              onClick={() => openRoomModal(t)}
                              style={{
                                marginTop: '6px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                border: '1px solid #EBE4DA',
                                background: '#FAF8F5',
                                color: '#FF6B4A',
                                fontSize: '10px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Key size={11} /> {t.roomId ? 'Edit Room Details' : '+ Set Room ID & Pass'}
                            </button>
                            )}
                          </td>

                          {/* Joined Players Column */}
                          <td style={{ padding: '14px', textAlign: 'center' }}>
                            <button
                              onClick={() => openPlayersModal(t)}
                              style={{
                                background: '#FFF0EC',
                                border: '1px solid #FFDACF',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '2px',
                              }}
                            >
                              <div style={{ fontWeight: 800, color: '#FF6B4A', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Users size={13} />
                                <span>{t.slotsFilled || 0} / {t.maxSlots}</span>
                              </div>
                              <span style={{ fontSize: '10px', color: '#8A8078', fontWeight: 600 }}>
                                View Players →
                              </span>
                            </button>
                          </td>

                          {/* Fee & Reward */}
                          <td style={{ padding: '14px', textAlign: 'center' }}>
                            <div style={{ fontWeight: 600, color: t.registrationCharge > 0 ? '#5E5851' : '#2E7D32' }}>
                              {t.registrationCharge > 0 ? `Rs ${t.registrationCharge}` : 'Free'}
                            </div>
                            <div style={{ fontWeight: 800, color: '#FF6B4A', fontSize: '13px' }}>
                              Reward: Rs {t.fixedReward}
                            </div>
                          </td>

                          {/* Status */}
                          <td style={{ padding: '14px', textAlign: 'center' }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '4px 10px',
                              borderRadius: '8px',
                              background: t.status === 'live' ? '#E8F5E9' : t.status === 'upcoming' ? '#FFF8E1' : '#F0ECE4',
                              color: t.status === 'live' ? '#3FA65C' : t.status === 'upcoming' ? '#E88B00' : '#8A8078',
                            }}>
                              {t.status?.toUpperCase()}
                            </span>
                          </td>

                          {/* Controls */}
                          <td style={{ padding: '14px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                              {/* EDIT TOURNAMENT BUTTON */}
                              <button
                                onClick={() => handleStartEdit(t)}
                                title="Edit Tournament Details & Dates"
                                style={{
                                  padding: '6px 10px',
                                  background: '#FFF8E1',
                                  color: '#E88B00',
                                  border: '1px solid #FFE082',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Edit3 size={12} /> Edit
                              </button>

                              {/* SAVE AS TEMPLATE BUTTON */}
                              <button
                                onClick={() => handleSaveTournamentAsTemplate(t)}
                                title="Save this tournament config as a Favorite Preset"
                                style={{
                                  padding: '6px 8px',
                                  background: '#FAF8F5',
                                  color: '#8A8078',
                                  border: '1px solid #EBE4DA',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Star size={12} color="#F4B740" fill="#F4B740" />
                              </button>

                              {t.status === 'upcoming' && (
                                <button
                                  onClick={() => handleStatusChange(t.id, 'live')}
                                  title="Start Match (Go Live)"
                                  style={{
                                    padding: '6px 10px',
                                    background: '#3FA65C',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <Play size={12} /> Live
                                </button>
                              )}

                              {t.status === 'live' && (
                                <button
                                  onClick={() => handleStatusChange(t.id, 'completed')}
                                  title="End Match"
                                  style={{
                                    padding: '6px 10px',
                                    background: '#7B4FE0',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <Square size={12} /> End
                                </button>
                              )}

                              <button
                                onClick={() => handleDelete(t.id, t.name)}
                                title="Delete Tournament"
                                style={{
                                  padding: '6px 8px',
                                  background: '#FFEBEE',
                                  color: '#D9503F',
                                  border: '1px solid #FFCDD2',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: FAVORITE PRESETS & TEMPLATES (DEDICATED VIEW) */}
      {activeMainTab === 'favorites' && (
        <div>
          {/* Favorites Header Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #FFF9ED 0%, #FFF3DC 100%)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #FFE4A0',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Star size={24} color="#E88B00" fill="#F4B740" />
                <h2 style={{ fontWeight: 800, fontSize: '20px', color: '#2E2A26', margin: 0 }}>
                  Favorite Tournament Presets
                </h2>
              </div>
              <p style={{ fontSize: '13px', color: '#5E5851', margin: '6px 0 0', maxWidth: '650px', lineHeight: 1.4 }}>
                Instant 1-click tournament creation. All entry charges, rewards, slots, map, and rules are pre-filled. Just pick the date & launch!
              </p>
            </div>

            <button
              onClick={() => setShowCreatePresetModal(true)}
              style={{
                padding: '10px 20px',
                background: '#E88B00',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 3px 10px rgba(232, 139, 0, 0.3)',
              }}
            >
              <Plus size={16} /> + Create New Preset
            </button>
          </div>

          {/* Presets Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '18px',
          }}>
            {allTemplates.map((tpl) => (
              <div
                key={tpl.id || tpl.presetName}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #EBE4DA',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <div>
                  {/* Preset Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: tpl.game === 'pubg' ? '#FFF0EC' : '#F3EEFF',
                        color: tpl.game === 'pubg' ? '#FF6B4A' : '#7B4FE0',
                      }}>
                        {tpl.game === 'pubg' ? 'PUBG' : 'FREE FIRE'}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#5E5851', background: '#F0ECE4', padding: '3px 8px', borderRadius: '6px' }}>
                        {tpl.matchType} • {tpl.mapName}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {tpl.isStarter ? (
                        <span style={{ fontSize: '10px', background: '#FFF6E0', color: '#E88B00', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          STARTER
                        </span>
                      ) : (
                        <button
                          onClick={() => handleDeleteTemplate(tpl.id, tpl.presetName)}
                          title="Delete Preset"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#D9503F',
                            padding: '4px',
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Preset Title */}
                  <h3 style={{ fontWeight: 800, fontSize: '16px', color: '#2E2A26', margin: '0 0 6px' }}>
                    {tpl.presetName || tpl.name}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#8A8078', margin: '0 0 14px' }}>
                    Default Title: <em>"{tpl.name}"</em>
                  </p>

                  {/* Metrics Box */}
                  <div style={{
                    background: '#FAF8F5',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '8px',
                    border: '1px solid #F0ECE4',
                    marginBottom: '14px',
                  }}>
                    <div>
                      <div style={{ fontSize: '10px', color: '#8A8078', fontWeight: 600, textTransform: 'uppercase' }}>Entry Fee</div>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: '#2E2A26', marginTop: '2px' }}>
                        {Number(tpl.registrationCharge) > 0 ? `Rs ${tpl.registrationCharge}` : 'FREE'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10px', color: '#8A8078', fontWeight: 600, textTransform: 'uppercase' }}>Prize Pool</div>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: '#FF6B4A', marginTop: '2px' }}>
                        Rs {tpl.fixedReward || 0}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10px', color: '#8A8078', fontWeight: 600, textTransform: 'uppercase' }}>Slots</div>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: '#2E2A26', marginTop: '2px' }}>
                        {tpl.maxSlots || 25}
                      </div>
                    </div>
                  </div>

                  {/* Rules preview */}
                  {tpl.rules && (
                    <div style={{ fontSize: '11px', color: '#8A8078', marginBottom: '16px', lineHeight: 1.4, maxHeight: '36px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <strong>Rules:</strong> {tpl.rules}
                    </div>
                  )}
                </div>

                {/* Big Action Button */}
                <button
                  onClick={() => handleApplyPreset(tpl)}
                  style={{
                    width: '100%',
                    padding: '11px',
                    background: '#FF6B4A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 3px 10px rgba(255, 107, 74, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Zap size={15} />
                  <span>Use Template & Publish Tournament</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE NEW PRESET MODAL */}
      {showCreatePresetModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(3px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }} onClick={() => setShowCreatePresetModal(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '18px',
              padding: '28px',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
              border: '1px solid #EBE4DA',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Star size={20} color="#E88B00" fill="#F4B740" />
                <h3 style={{ fontWeight: 800, fontSize: '18px', color: '#2E2A26', margin: 0 }}>
                  Create Favorite Preset Template
                </h3>
              </div>
              <button
                onClick={() => setShowCreatePresetModal(false)}
                style={{
                  background: '#F0ECE4',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2E2A26',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreatePresetFromModal}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Favorite Preset Name (for your dashboard) *</label>
                  <input
                    type="text"
                    placeholder="e.g. PUBG Solo Daily Rs 50"
                    value={presetModalData.presetName}
                    onChange={e => setPresetModalData({ ...presetModalData, presetName: e.target.value })}
                    required
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Default Tournament Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. PUBG Daily Showdown - Match"
                    value={presetModalData.name}
                    onChange={e => setPresetModalData({ ...presetModalData, name: e.target.value })}
                    required
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Game Title *</label>
                    <select
                      value={presetModalData.game}
                      onChange={e => setPresetModalData({ ...presetModalData, game: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="pubg">PUBG Mobile</option>
                      <option value="freefire">Free Fire</option>
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Match Format *</label>
                    <select
                      value={presetModalData.matchType}
                      onChange={e => setPresetModalData({ ...presetModalData, matchType: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="Solo">Solo</option>
                      <option value="Duo">Duo</option>
                      <option value="Squad">Squad</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={labelStyle}>Entry Fee (PKR)</label>
                    <input
                      type="number"
                      min="0"
                      value={presetModalData.registrationCharge}
                      onChange={e => setPresetModalData({ ...presetModalData, registrationCharge: e.target.value })}
                      style={inputStyle}
                      required
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Prize Reward (PKR)</label>
                    <input
                      type="number"
                      min="0"
                      value={presetModalData.fixedReward}
                      onChange={e => setPresetModalData({ ...presetModalData, fixedReward: e.target.value })}
                      style={inputStyle}
                      required
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Max Slots</label>
                    <input
                      type="number"
                      min="2"
                      max="100"
                      value={presetModalData.maxSlots}
                      onChange={e => setPresetModalData({ ...presetModalData, maxSlots: e.target.value })}
                      style={inputStyle}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Map Arena</label>
                  <select
                    value={presetModalData.mapName}
                    onChange={e => setPresetModalData({ ...presetModalData, mapName: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="Erangel">Erangel (PUBG)</option>
                    <option value="Miramar">Miramar (PUBG)</option>
                    <option value="Sanhok">Sanhok (PUBG)</option>
                    <option value="Livik">Livik (PUBG)</option>
                    <option value="Bermuda">Bermuda (Free Fire)</option>
                    <option value="Purgatory">Purgatory (Free Fire)</option>
                    <option value="Kalahari">Kalahari (Free Fire)</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Custom Rules (Optional)</label>
                  <textarea
                    placeholder="Rules for this preset..."
                    value={presetModalData.rules}
                    onChange={e => setPresetModalData({ ...presetModalData, rules: e.target.value })}
                    rows={2}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowCreatePresetModal(false)}
                    style={{
                      padding: '10px 18px',
                      background: '#F0ECE4',
                      color: '#5E5851',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '10px 24px',
                      background: '#E88B00',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(232, 139, 0, 0.35)',
                    }}
                  >
                    Save Favorite Preset
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOINED PLAYERS ROSTER MODAL */}
      {playersModalTournament && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(3px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }} onClick={() => setPlayersModalTournament(null)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '18px',
              padding: '28px',
              width: '100%',
              maxWidth: '750px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
              border: '1px solid #EBE4DA',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: playersModalTournament.game === 'pubg' ? '#FFF0EC' : '#F3EEFF',
                    color: playersModalTournament.game === 'pubg' ? '#FF6B4A' : '#7B4FE0',
                  }}>
                    {playersModalTournament.game === 'pubg' ? 'PUBG MOBILE' : 'FREE FIRE'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#8A8078', fontWeight: 600 }}>
                    {playersModalTournament.matchType} • {playersModalTournament.mapName || 'Erangel'}
                  </span>
                </div>
                <h3 style={{ fontWeight: 800, fontSize: '18px', color: '#2E2A26', margin: 0 }}>
                  {playersModalTournament.name}
                </h3>
                <p style={{ fontSize: '12px', color: '#8A8078', margin: '2px 0 0' }}>
                  Total Joined: <strong>{tournamentPlayers.length} / {playersModalTournament.maxSlots} Players</strong> • Total Collected: <strong>{playersModalTournament.registrationCharge > 0 ? `Rs ${(playersModalTournament.registrationCharge || 0) * tournamentPlayers.length}` : 'Free'}</strong>
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {tournamentPlayers.length > 0 && (
                  <button
                    onClick={handleCopyAllRoster}
                    title="Copy full player list to clipboard"
                    style={{
                      background: '#FAF8F5',
                      border: '1px solid #EBE4DA',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#5E5851',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {copiedAllRoster ? <Check size={14} color="#3FA65C" /> : <Copy size={14} />}
                    <span>{copiedAllRoster ? 'Copied List!' : 'Copy Roster'}</span>
                  </button>
                )}

                <button
                  onClick={() => setPlayersModalTournament(null)}
                  style={{
                    background: '#F0ECE4',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2E2A26',
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Search Input for Roster */}
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <Search size={16} color="#A69E94" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search participant by username, IGN, or UID..."
                value={playersSearchQuery}
                onChange={e => setPlayersSearchQuery(e.target.value)}
                style={{ ...inputStyle, paddingLeft: '36px' }}
              />
            </div>

            {/* Players Table */}
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #EBE4DA', borderRadius: '12px' }}>
              {loadingPlayers ? (
                <LoadingSpinner text="Loading registered players..." />
              ) : filteredModalPlayers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8A8078' }}>
                  <Users size={36} color="#C4BCB2" style={{ margin: '0 auto 8px', display: 'block' }} />
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#2E2A26' }}>
                    {playersSearchQuery ? 'No players found matching your search' : 'No players registered yet'}
                  </div>
                  <p style={{ fontSize: '12px', color: '#8A8078', margin: '4px 0 0' }}>
                    Players will appear here as soon as they register from the mobile app.
                  </p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#FCFAF7', borderBottom: '2px solid #F0ECE4', position: 'sticky', top: 0 }}>
                      <th style={{ textAlign: 'left', padding: '10px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px' }}>#</th>
                      <th style={{ textAlign: 'left', padding: '10px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px' }}>APP USERNAME</th>
                      <th style={{ textAlign: 'left', padding: '10px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px' }}>IN-GAME NAME (IGN)</th>
                      <th style={{ textAlign: 'left', padding: '10px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px' }}>GAME UID</th>
                      <th style={{ textAlign: 'center', padding: '10px 14px', color: '#8A8078', fontWeight: 600, fontSize: '11px' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredModalPlayers.map((player, idx) => (
                      <tr
                        key={player.id}
                        style={{
                          borderBottom: '1px solid #F0ECE4',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: '#A69E94' }}>
                          {idx + 1}
                        </td>

                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 700, color: '#2E2A26' }}>
                            @{player.username}
                          </div>
                          <div style={{ fontSize: '10px', color: '#A69E94', fontFamily: 'monospace' }}>
                            ID: {player.userId?.slice(0, 10)}...
                          </div>
                        </td>

                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#FF6B4A',
                            background: '#FFF0EC',
                            padding: '3px 8px',
                            borderRadius: '6px',
                          }}>
                            {player.ign || 'Unknown IGN'}
                          </span>
                        </td>

                        <td style={{ padding: '12px 14px' }}>
                          {player.uid ? (
                            <button
                              onClick={() => handleCopyUid(player.uid)}
                              title="Click to copy Game UID"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '12px',
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                color: '#5E5851',
                                background: '#F0ECE4',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <span>{player.uid}</span>
                              {copiedPlayerUid === player.uid ? <Check size={12} color="#3FA65C" /> : <Copy size={12} color="#8A8078" />}
                            </button>
                          ) : (
                            <span style={{ color: '#C4BCB2', fontSize: '11px' }}>—</span>
                          )}
                        </td>

                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: '#E8F5E9',
                            color: '#3FA65C',
                          }}>
                            REGISTERED ✓
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #F0ECE4' }}>
              <div style={{ fontSize: '12px', color: '#8A8078' }}>
                Showing {filteredModalPlayers.length} of {tournamentPlayers.length} participants
              </div>
              <button
                onClick={() => setPlayersModalTournament(null)}
                style={{
                  padding: '10px 20px',
                  background: '#2E2A26',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Close Roster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ROOM ID & PASSWORD MODAL */}
      {roomModalTournament && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(3px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }} onClick={() => setRoomModalTournament(null)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '28px',
              width: '100%',
              maxWidth: '460px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
              border: '1px solid #EBE4DA',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: '#FFF0EC',
                  color: '#FF6B4A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Key size={18} />
                </div>
                <div>
                  <h3 style={{ fontWeight: 800, fontSize: '16px', color: '#2E2A26', margin: 0 }}>
                    Custom Room Credentials
                  </h3>
                  <p style={{ fontSize: '11px', color: '#8A8078', margin: '2px 0 0' }}>
                    {roomModalTournament.name}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setRoomModalTournament(null)}
                style={{
                  background: '#F0ECE4',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2E2A26',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{
              background: '#FFF9F5',
              border: '1px solid #FFE4D3',
              borderRadius: '10px',
              padding: '12px 14px',
              fontSize: '12px',
              color: '#5E5851',
              marginBottom: '18px',
              lineHeight: 1.4,
            }}>
              💡 <strong>Instant Release</strong>: Registered players will immediately see this Room ID & Password with copy buttons on their tournament details screen during the 10-minute joining window.
            </div>

            <form onSubmit={handleSaveRoomDetails}>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Custom Room ID *</label>
                <input
                  type="text"
                  placeholder="e.g. 8492019"
                  value={modalRoomId}
                  onChange={e => setModalRoomId(e.target.value)}
                  required
                  style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '15px', fontWeight: 700 }}
                />
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={labelStyle}>Room Password</label>
                <input
                  type="text"
                  placeholder="e.g. 1234 or nabprize"
                  value={modalPassword}
                  onChange={e => setModalPassword(e.target.value)}
                  style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '15px', fontWeight: 700 }}
                />
                <p style={helpStyle}>Leave empty if room has no password</p>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setRoomModalTournament(null)}
                  style={{
                    padding: '10px 18px',
                    background: '#F0ECE4',
                    color: '#5E5851',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  style={{
                    padding: '10px 24px',
                    background: '#FF6B4A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: modalSaving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(255, 107, 74, 0.3)',
                  }}
                >
                  {modalSaving ? 'Saving...' : 'Save & Release Room Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
