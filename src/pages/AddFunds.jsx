import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { useAuth } from '../hooks/useAuth';
import TopBar from '../components/TopBar';
import {
  Wallet,
  Copy,
  Check,
  Upload,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Image as ImageIcon,
  X,
  RefreshCw
} from 'lucide-react';

const PRESET_AMOUNTS = [50, 100, 200, 500, 1000];

// Payment Accounts (Demo numbers - easily updated)
const PAYMENT_ACCOUNTS = {
  jazzcash: {
    name: 'JazzCash',
    accountNumber: '0300-1234567',
    cleanNumber: '03001234567',
    accountTitle: 'NabPrize Official',
    color: '#ED1C24',
    bg: '#FFF0F0',
    border: '#FFD1D1',
  },
  easypaisa: {
    name: 'EasyPaisa',
    accountNumber: '0345-1234567',
    cleanNumber: '03451234567',
    accountTitle: 'NabPrize Official',
    color: '#00A651',
    bg: '#F0FFF4',
    border: '#C6F6D5',
  },
};

export default function AddFunds() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const [selectedMethod, setSelectedMethod] = useState('jazzcash');
  const [amount, setAmount] = useState('100');
  const [senderNumber, setSenderNumber] = useState('');
  const [senderName, setSenderName] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [recentDeposits, setRecentDeposits] = useState([]);
  const fileInputRef = useRef(null);

  // Copy payment number
  const handleCopy = (num) => {
    navigator.clipboard.writeText(num);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Image select
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, JPEG).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Screenshot file size must be less than 8MB.');
      return;
    }

    setErrorMsg('');
    setScreenshotFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setScreenshotFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Fetch recent deposits for this user
  useEffect(() => {
    if (!currentUser?.uid) return;

    const q = query(
      collection(db, 'deposits'),
      where('userId', '==', currentUser.uid)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || (a.createdAt ? new Date(a.createdAt).getTime() : Date.now());
          const timeB = b.createdAt?.toMillis?.() || (b.createdAt ? new Date(b.createdAt).getTime() : Date.now());
          return timeB - timeA;
        });
        setRecentDeposits(list.slice(0, 5));
      },
      (err) => console.error('Error fetching user deposits:', err)
    );

    return unsub;
  }, [currentUser?.uid]);

  // Submit deposit request
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount < 30) {
      setErrorMsg('Minimum deposit amount is Rs 30.');
      return;
    }

    if (parsedAmount > 20000) {
      setErrorMsg('Maximum single deposit limit is Rs 20,000.');
      return;
    }

    const cleanSender = senderNumber.replace(/\D/g, '');
    if (!cleanSender || !/^03\d{9}$/.test(cleanSender)) {
      setErrorMsg('Please enter a valid 11-digit Pakistani mobile number starting with 03 (e.g. 03001234567).');
      return;
    }

    if (!screenshotFile) {
      setErrorMsg('Please attach the payment screenshot as proof.');
      return;
    }

    if (!currentUser?.uid) {
      setErrorMsg('Please log in to submit a deposit request.');
      return;
    }

    setSubmitting(true);
    setUploadProgress(10);

    try {
      // 1. Upload screenshot to Firebase Storage
      const fileExt = screenshotFile.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storagePath = `deposits/${currentUser.uid}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      const uploadTask = uploadBytesResumable(storageRef, screenshotFile);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 80
          );
          setUploadProgress(10 + progress);
        },
        (error) => {
          console.error('Storage upload error:', error);
          setErrorMsg('Failed to upload screenshot. Please verify your connection.');
          setSubmitting(false);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            setUploadProgress(95);

            // 2. Save deposit document in Firestore
            const payload = {
              userId: currentUser.uid,
              userEmail: currentUser.email || '',
              username: userProfile?.username || currentUser.displayName || 'Player',
              fullName: userProfile?.fullName || '',
              games: userProfile?.games || [],
              amount: parsedAmount,
              paymentMethod: selectedMethod || 'jazzcash',
              targetNumber: PAYMENT_ACCOUNTS[selectedMethod]?.cleanNumber || '',
              senderNumber: cleanSender,
              senderName: senderName.trim() || '',
              transactionId: transactionId.trim() || '',
              screenshotUrl: downloadUrl,
              storagePath: storagePath,
              status: 'pending',
              createdAt: serverTimestamp(),
            };

            await addDoc(collection(db, 'deposits'), payload);

            setUploadProgress(100);
            setSuccessMsg(`Deposit request of Rs ${parsedAmount} submitted successfully! Admin will verify and credit your wallet shortly.`);
            
            // Reset form
            handleRemoveImage();
            setSenderNumber('');
            setSenderName('');
            setTransactionId('');
            setSubmitting(false);
          } catch (dbErr) {
            console.error('Firestore save error:', dbErr);
            setErrorMsg('Failed to save deposit: ' + (dbErr.message || 'Please check Firestore rules.'));
            setSubmitting(false);
          }
        }
      );
    } catch (err) {
      console.error('Submission error:', err);
      setErrorMsg('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  const currentAccount = PAYMENT_ACCOUNTS[selectedMethod];

  return (
    <>
      <TopBar title="Deposit Funds" showBack />

      <div className="responsive-page-container" style={{ padding: '16px', maxWidth: '680px', margin: '0 auto', paddingBottom: '90px' }}>
        
        {/* Wallet Balance Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, #FF6B4A 0%, #E8552F 100%)',
            borderRadius: '16px',
            padding: '20px',
            color: '#FFFFFF',
            boxShadow: '0 4px 14px rgba(232, 85, 47, 0.25)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '13px', opacity: 0.9, fontWeight: 500, marginBottom: '4px' }}>
              Current Wallet Balance
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px' }}>
              Rs {userProfile?.walletBalance || 0}
            </div>
          </div>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Wallet size={26} color="#FFFFFF" />
          </div>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div
            style={{
              background: '#EDFDF5',
              border: '1px solid #B8F2D2',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <CheckCircle2 size={22} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '13px', color: '#065F46', lineHeight: 1.5, fontWeight: 500 }}>
              {successMsg}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div
            style={{
              background: '#FFF5F5',
              border: '1px solid #FED7D7',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <AlertCircle size={22} color="#E53E3E" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '13px', color: '#9B2C2C', lineHeight: 1.5, fontWeight: 500 }}>
              {errorMsg}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          
          {/* STEP 1: Select Amount */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '18px',
              border: '1px solid #EBE4DA',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#FF6B4A',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                1
              </span>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#2E2A26', margin: 0 }}>
                Select Deposit Amount
              </h3>
            </div>

            {/* Presets */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '12px' }}>
              {PRESET_AMOUNTS.map((amt) => {
                const isSel = Number(amount) === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmount(amt.toString())}
                    style={{
                      padding: '10px 4px',
                      borderRadius: '10px',
                      border: isSel ? '2px solid #FF6B4A' : '1px solid #EBE4DA',
                      background: isSel ? '#FFF4EC' : '#FAFAF8',
                      color: isSel ? '#FF6B4A' : '#2E2A26',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    Rs {amt}
                  </button>
                );
              })}
            </div>

            {/* Custom Amount Input */}
            <div>
              <label style={{ fontSize: '12px', color: '#8A8078', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Or enter custom amount (PKR)
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontWeight: 700,
                    color: '#8A8078',
                    fontSize: '14px',
                  }}
                >
                  Rs
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="Enter amount (Min Rs 30, Max 20,000)"
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: '10px',
                    border: '1px solid #D9D3CC',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#2E2A26',
                    background: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>
            </div>
          </div>

          {/* STEP 2: Choose Payment Method & Account Info */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '18px',
              border: '1px solid #EBE4DA',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#FF6B4A',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                2
              </span>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#2E2A26', margin: 0 }}>
                Transfer to Account
              </h3>
            </div>

            {/* Method Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              {/* JazzCash */}
              <button
                type="button"
                onClick={() => setSelectedMethod('jazzcash')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  borderRadius: '12px',
                  border: selectedMethod === 'jazzcash' ? '2px solid #ED1C24' : '1px solid #EBE4DA',
                  background: selectedMethod === 'jazzcash' ? '#FFF5F5' : '#FAFAF8',
                  color: selectedMethod === 'jazzcash' ? '#ED1C24' : '#5E5851',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <span
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: '#ED1C24',
                    display: 'inline-block',
                  }}
                />
                JazzCash
              </button>

              {/* EasyPaisa */}
              <button
                type="button"
                onClick={() => setSelectedMethod('easypaisa')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  borderRadius: '12px',
                  border: selectedMethod === 'easypaisa' ? '2px solid #00A651' : '1px solid #EBE4DA',
                  background: selectedMethod === 'easypaisa' ? '#F0FFF4' : '#FAFAF8',
                  color: selectedMethod === 'easypaisa' ? '#00A651' : '#5E5851',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <span
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: '#00A651',
                    display: 'inline-block',
                  }}
                />
                EasyPaisa
              </button>
            </div>

            {/* Selected Account Box */}
            <div
              style={{
                background: currentAccount.bg,
                border: `1px solid ${currentAccount.border}`,
                borderRadius: '12px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#5E5851', fontWeight: 600 }}>
                  Account Title:
                </span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#2E2A26' }}>
                  {currentAccount.accountTitle}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', color: '#5E5851', fontWeight: 600 }}>
                  {currentAccount.name} Number:
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: currentAccount.color, letterSpacing: '0.5px' }}>
                    {currentAccount.accountNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(currentAccount.cleanNumber)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: '#FFFFFF',
                      border: '1px solid #D9D3CC',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#2E2A26',
                      cursor: 'pointer',
                    }}
                  >
                    {copied ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '11px',
                  color: '#666',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ShieldCheck size={14} color="#FF6B4A" />
                <span>Send exact amount of <strong>Rs {amount || 0}</strong> to this account.</span>
              </div>
            </div>
          </div>

          {/* STEP 3: Upload Screenshot & Sender Info */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '18px',
              border: '1px solid #EBE4DA',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#FF6B4A',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                3
              </span>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#2E2A26', margin: 0 }}>
                Payment Verification Proof
              </h3>
            </div>

            {/* Sender Number Input */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#5E5851', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Your Sender Account / Mobile Number * (11 digits)
              </label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={11}
                value={senderNumber}
                onChange={(e) => setSenderNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="03XXXXXXXXX"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: senderNumber.length === 11
                    ? (/^03\d{9}$/.test(senderNumber) ? '1px solid #3FA65C' : '1px solid #D9503F')
                    : '1px solid #D9D3CC',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#2E2A26',
                  background: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box',
                  letterSpacing: '0.5px',
                }}
                required
              />
              {senderNumber.length > 0 && (
                <div style={{ fontSize: '11px', marginTop: '4px', fontWeight: 500 }}>
                  {!senderNumber.startsWith('03') ? (
                    <span style={{ color: '#D9503F' }}>✕ Must start with 03 (e.g. 03001234567)</span>
                  ) : senderNumber.length < 11 ? (
                    <span style={{ color: '#E88B00' }}>⚠ {11 - senderNumber.length} digits remaining</span>
                  ) : (
                    <span style={{ color: '#3FA65C' }}>✓ Valid 11-digit mobile number</span>
                  )}
                </div>
              )}
            </div>

            {/* Sender Account Name (Optional) */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#5E5851', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Sender Account Title / Name (Optional)
              </label>
              <input
                type="text"
                maxLength={40}
                value={senderName}
                onChange={(e) => setSenderName(e.target.value.slice(0, 40))}
                placeholder="Name on your JazzCash/EasyPaisa"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #D9D3CC',
                  fontSize: '13px',
                  color: '#2E2A26',
                  background: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Transaction ID / TID (Optional) */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: '#5E5851', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Transaction ID / TID (Optional)
              </label>
              <input
                type="text"
                maxLength={25}
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value.trim().slice(0, 25))}
                placeholder="e.g. 01234567890"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #D9D3CC',
                  fontSize: '13px',
                  color: '#2E2A26',
                  background: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Screenshot Upload Area */}
            <div>
              <label style={{ fontSize: '12px', color: '#5E5851', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Payment Screenshot *
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="screenshot-file-input"
              />

              {!previewUrl ? (
                <label
                  htmlFor="screenshot-file-input"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px 16px',
                    border: '2px dashed #D9D3CC',
                    borderRadius: '12px',
                    background: '#FAFAF8',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: '#FFF0EC',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '8px',
                    }}
                  >
                    <Upload size={22} color="#FF6B4A" />
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#2E2A26', marginBottom: '2px' }}>
                    Click to Upload Screenshot
                  </div>
                  <div style={{ fontSize: '11px', color: '#8A8078' }}>
                    PNG, JPG or WEBP (Max 8MB)
                  </div>
                </label>
              ) : (
                <div
                  style={{
                    position: 'relative',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid #EBE4DA',
                    background: '#FAFAF8',
                    padding: '8px',
                  }}
                >
                  <img
                    src={previewUrl}
                    alt="Payment Proof"
                    style={{
                      width: '100%',
                      maxHeight: '220px',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      display: 'block',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    style={{
                      position: 'absolute',
                      top: '14px',
                      right: '14px',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.65)',
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={16} />
                  </button>
                  <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 600, textAlign: 'center', marginTop: '6px' }}>
                    Screenshot attached successfully
                  </div>
                </div>
              )}
            </div>

            {/* Upload Progress */}
            {submitting && (
              <div style={{ marginTop: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8A8078', marginBottom: '4px' }}>
                  <span>Uploading proof...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div style={{ height: '6px', background: '#F0ECE4', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${uploadProgress}%`,
                      background: '#FF6B4A',
                      transition: 'width 0.2s ease',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '15px',
              background: submitting ? '#C7BFB5' : '#FF6B4A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '14px',
              fontWeight: 700,
              fontSize: '15px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: submitting ? 'none' : '0 4px 14px rgba(255, 107, 74, 0.3)',
              transition: 'all 0.2s',
            }}
          >
            {submitting ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Submitting Request...
              </>
            ) : (
              <>
                Submit Deposit Request (Rs {amount || 0})
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Recent Deposit History */}
        <div style={{ marginTop: '30px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#2E2A26', marginBottom: '12px' }}>
            Recent Deposit Requests
          </h4>

          {recentDeposits.length === 0 ? (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '14px',
                padding: '24px 16px',
                textAlign: 'center',
                border: '1px solid #EBE4DA',
                color: '#8A8078',
                fontSize: '13px',
              }}
            >
              No deposit requests yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentDeposits.map((dep) => {
                const isPending = dep.status === 'pending';
                const isApproved = dep.status === 'approved';
                const isRejected = dep.status === 'rejected';

                const statusColor = isApproved ? '#10B981' : isRejected ? '#EF4444' : '#F59E0B';
                const statusBg = isApproved ? '#EDFDF5' : isRejected ? '#FEF2F2' : '#FFFBEB';
                const statusLabel = isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending';

                const dateStr = dep.createdAt?.toDate
                  ? dep.createdAt.toDate().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : 'Just now';

                return (
                  <div
                    key={dep.id}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      border: '1px solid #EBE4DA',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: '#2E2A26' }}>
                          Rs {dep.amount}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '6px',
                            background: dep.paymentMethod === 'jazzcash' ? '#FFF0F0' : '#F0FFF4',
                            color: dep.paymentMethod === 'jazzcash' ? '#ED1C24' : '#00A651',
                            textTransform: 'capitalize',
                          }}
                        >
                          {dep.paymentMethod}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#8A8078' }}>
                        {dateStr} • Sent from {dep.senderNumber}
                      </div>
                      {isRejected && dep.rejectionReason && (
                        <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px' }}>
                          Reason: {dep.rejectionReason}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        background: statusBg,
                        color: statusColor,
                        fontSize: '11px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0,
                      }}
                    >
                      {isApproved && <CheckCircle2 size={13} />}
                      {isPending && <Clock size={13} />}
                      {isRejected && <XCircle size={13} />}
                      {statusLabel}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
