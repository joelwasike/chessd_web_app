import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import AnimatedBackground from '../components/AnimatedBackground';
import GlassCard from '../components/GlassCard';

const KES_TO_USD = 0.0077;

const styles = {
  wrapper: {
    position: 'relative',
    zIndex: 1,
    minHeight: '100vh',
    padding: '24px 16px',
    maxWidth: 520,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  backBtn: {
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10,
    color: 'var(--text-primary)',
    fontSize: 18,
    width: 38,
    height: 38,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: 2,
  },
  balanceCard: {
    textAlign: 'center',
    padding: '28px 24px',
    marginBottom: 20,
    boxShadow: '0 0 30px rgba(212,160,60,0.25), 0 0 60px rgba(212,160,60,0.1)',
  },
  balanceLabel: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  balanceAmount: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 36,
    fontWeight: 700,
    color: '#D4A03C',
    marginBottom: 4,
  },
  balanceUsd: {
    fontSize: 14,
    color: 'var(--text-secondary)',
  },
  actionsRow: {
    display: 'flex',
    gap: 12,
    marginBottom: 24,
  },
  depositBtn: {
    flex: 1,
    padding: '14px 0',
    border: 'none',
    borderRadius: 12,
    fontWeight: 600,
    fontSize: 15,
    cursor: 'pointer',
    color: '#fff',
    background: 'linear-gradient(135deg, #2E7D32, #388E3C)',
    boxShadow: '0 0 20px rgba(46,125,50,0.35)',
    letterSpacing: 1,
  },
  withdrawBtn: {
    flex: 1,
    padding: '14px 0',
    border: 'none',
    borderRadius: 12,
    fontWeight: 600,
    fontSize: 15,
    cursor: 'pointer',
    color: '#fff',
    background: 'linear-gradient(135deg, #D4A03C, #BF8C2C)',
    boxShadow: '0 0 20px rgba(212,160,60,0.35)',
    letterSpacing: 1,
  },
  refreshRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  refreshBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    color: 'var(--text-secondary)',
    fontSize: 13,
    padding: '6px 14px',
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
  },
  txCard: {
    padding: '14px 16px',
    marginBottom: 10,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  txType: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
    textTransform: 'capitalize',
  },
  txDate: {
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  txRight: {
    textAlign: 'right',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  txStatus: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  spinner: {
    display: 'flex',
    justifyContent: 'center',
    padding: 40,
    color: 'var(--text-secondary)',
    fontSize: 14,
  },
  // Modal
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    width: '90%',
    maxWidth: 380,
    padding: '28px 24px',
  },
  modalTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    marginBottom: 6,
    display: 'block',
    letterSpacing: 0.5,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.06)',
    color: 'var(--text-primary)',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
  },
  modalError: {
    color: '#EF5350',
    fontSize: 13,
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSuccess: {
    color: '#2E7D32',
    fontSize: 13,
    marginBottom: 10,
    textAlign: 'center',
  },
  modalActions: {
    display: 'flex',
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    flex: 1,
    padding: '12px 0',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 10,
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: 14,
    cursor: 'pointer',
  },
  submitBtn: {
    flex: 1,
    padding: '12px 0',
    border: 'none',
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    color: '#fff',
  },
  emptyText: {
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: 14,
    padding: 32,
  },
};

const TX_LABELS = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  game_win: 'Game Win',
  game_loss: 'Game Loss',
  stake_lock: 'Stake Lock',
  stake_refund: 'Stake Refund',
};

const POSITIVE_TYPES = new Set(['deposit', 'game_win', 'stake_refund']);

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const methodTabStyle = (active) => ({
  flex: 1,
  padding: '10px 0',
  border: active ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10,
  background: active ? 'rgba(212,160,60,0.15)' : 'rgba(255,255,255,0.05)',
  color: active ? 'var(--accent)' : 'var(--text-secondary)',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  textAlign: 'center',
  transition: 'all 0.2s',
});

function TransactionModal({ type, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('mpesa');
  const [phone, setPhone] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isDeposit = type === 'deposit';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) { setError('Enter a valid amount'); return; }
    if (method === 'mpesa' && !phone.trim()) { setError('Enter your M-Pesa phone number'); return; }
    if (method === 'usdt' && !isDeposit && !walletAddress.trim()) { setError('Enter your USDT wallet address'); return; }
    setLoading(true);
    try {
      if (isDeposit) {
        const result = await api.deposit(numAmount, method, { phone: phone.trim() || undefined });
        if (method === 'usdt' && result.page_url) {
          window.open(result.page_url, '_blank');
          setSuccess('Redirecting to USDT payment page. Your balance will update once confirmed.');
        } else {
          setSuccess('Deposit initiated successfully');
        }
      } else {
        await api.withdraw(numAmount, method, {
          phone: method === 'mpesa' ? phone.trim() : undefined,
          walletAddress: method === 'usdt' ? walletAddress.trim() : undefined,
        });
        setSuccess('Withdrawal initiated successfully');
      }
      setTimeout(() => { onSuccess(); }, 1500);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <GlassCard style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>{isDeposit ? 'Deposit Funds' : 'Withdraw Funds'}</h2>
        <form onSubmit={handleSubmit}>
          {/* Method selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button type="button" style={methodTabStyle(method === 'mpesa')} onClick={() => setMethod('mpesa')}>
              M-Pesa
            </button>
            <button type="button" style={methodTabStyle(method === 'usdt')} onClick={() => setMethod('usdt')}>
              USDT
            </button>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Amount (KES)</label>
            <input
              style={styles.input}
              type="number"
              placeholder="e.g. 500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              step="any"
            />
          </div>

          {method === 'mpesa' && (
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>M-Pesa Phone Number</label>
              <input
                style={styles.input}
                type="tel"
                placeholder="e.g. 0712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          )}

          {method === 'usdt' && !isDeposit && (
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>USDT Wallet Address (TRC-20)</label>
              <input
                style={styles.input}
                type="text"
                placeholder="e.g. TXyz..."
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
              />
            </div>
          )}

          {method === 'usdt' && isDeposit && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              You will be redirected to complete the USDT payment.
            </p>
          )}

          {error && <p style={styles.modalError}>{error}</p>}
          {success && <p style={styles.modalSuccess}>{success}</p>}
          <div style={styles.modalActions}>
            <button type="button" style={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitBtn,
                background: isDeposit
                  ? 'linear-gradient(135deg, #2E7D32, #388E3C)'
                  : 'linear-gradient(135deg, #D4A03C, #BF8C2C)',
              }}
            >
              {loading ? 'Processing...' : isDeposit ? 'Deposit' : 'Withdraw'}
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}

export default function WalletScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'deposit' | 'withdraw' | null

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [balData, txData] = await Promise.all([
        api.getBalance(),
        api.getTransactions(),
      ]);
      const w = balData.wallet || balData;
      setBalance(w.balance ?? w.amount ?? 0);
      setTransactions(txData.transactions || txData || []);
    } catch (err) {
      console.error('Wallet fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleModalSuccess = () => {
    setModal(null);
    fetchData();
  };

  const balNum = typeof balance === 'number' ? balance : 0;

  return (
    <>
      <AnimatedBackground />
      <div style={styles.wrapper}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate(-1)} aria-label="Go back">
            &#8592;
          </button>
          <h1 style={styles.title}>Wallet</h1>
        </div>

        {/* Balance Card */}
        <GlassCard style={styles.balanceCard}>
          <p style={styles.balanceLabel}>Your Balance</p>
          {loading ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading...</p>
          ) : (
            <>
              <p style={styles.balanceAmount}>KES {balNum.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</p>
              <p style={styles.balanceUsd}>
                ≈ USD {(balNum * KES_TO_USD).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </>
          )}
        </GlassCard>

        {/* Action Buttons */}
        <div style={styles.actionsRow}>
          <button style={styles.depositBtn} onClick={() => setModal('deposit')}>
            Deposit
          </button>
          <button style={styles.withdrawBtn} onClick={() => setModal('withdraw')}>
            Withdraw
          </button>
        </div>

        {/* Transaction History */}
        <div style={styles.refreshRow}>
          <span style={styles.sectionTitle}>Transactions</span>
          <button style={styles.refreshBtn} onClick={fetchData} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <div style={styles.spinner}>Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <p style={styles.emptyText}>No transactions yet</p>
        ) : (
          transactions.map((tx, i) => {
            const isPositive = POSITIVE_TYPES.has(tx.type);
            const amountColor = isPositive ? '#4CAF50' : '#EF5350';
            const sign = isPositive ? '+' : '-';
            const statusColor =
              tx.status === 'completed' ? '#4CAF50' :
              tx.status === 'pending' ? '#D4A03C' :
              tx.status === 'failed' ? '#EF5350' : 'var(--text-secondary)';

            return (
              <GlassCard key={tx.id || i} style={styles.txCard}>
                <div style={styles.txLeft}>
                  <span style={styles.txType}>{TX_LABELS[tx.type] || tx.type}</span>
                  <span style={styles.txDate}>{formatDate(tx.created_at || tx.date)}</span>
                </div>
                <div style={styles.txRight}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: amountColor }}>
                    {sign} KES {Math.abs(tx.amount).toLocaleString('en-KE')}
                  </span>
                  <span style={{ ...styles.txStatus, color: statusColor }}>
                    {tx.status || 'completed'}
                  </span>
                </div>
              </GlassCard>
            );
          })
        )}
      </div>

      {/* Modal */}
      {modal && (
        <TransactionModal
          type={modal}
          onClose={() => setModal(null)}
          onSuccess={handleModalSuccess}
        />
      )}
    </>
  );
}
