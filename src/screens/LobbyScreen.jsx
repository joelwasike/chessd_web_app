import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { WebSocketService } from '../services/websocket';
import api from '../services/api';
import AnimatedBackground from '../components/AnimatedBackground';
import GlassCard from '../components/GlassCard';

const STAKE_TIERS = [20, 50, 150, 500, 1000, 5000];
const KES_TO_USD = 0.0077;
const FEE_RATE = 0.10;

const styles = {
  wrapper: {
    position: 'relative',
    zIndex: 1,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  backBtn: {
    background: 'rgba(78,52,46,0.6)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(212,160,60,0.15)',
    borderRadius: 10,
    color: 'var(--text-primary)',
    fontSize: 20,
    padding: '8px 14px',
    cursor: 'pointer',
    lineHeight: 1,
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--text-primary)',
    textShadow: '0 0 25px rgba(212,160,60,0.5)',
    margin: 0,
  },
  tabs: {
    display: 'flex',
    gap: 8,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    padding: '12px 16px',
    border: '1px solid rgba(212,160,60,0.15)',
    borderRadius: 10,
    background: 'rgba(78,52,46,0.4)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    color: 'var(--text-secondary)',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.3s ease',
  },
  tabActive: {
    background: 'rgba(212,160,60,0.15)',
    color: 'var(--accent)',
    border: '1px solid rgba(212,160,60,0.4)',
  },
  tierGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 16,
  },
  tierCard: {
    padding: '20px 16px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  tierAmount: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--accent)',
    margin: '0 0 4px',
  },
  tierUsd: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    margin: '0 0 8px',
  },
  tierWin: {
    fontSize: 14,
    fontWeight: 600,
    color: '#4CAF50',
    margin: '0 0 4px',
  },
  tierSub: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    margin: '0 0 4px',
  },
  tierPlayers: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    marginTop: 6,
  },
  queueOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    background: 'rgba(30,18,14,0.85)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  queueText: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 22,
    color: 'var(--text-primary)',
    textAlign: 'center',
  },
  cancelBtn: {
    background: 'rgba(239,83,80,0.2)',
    border: '1px solid rgba(239,83,80,0.4)',
    borderRadius: 10,
    color: '#EF5350',
    fontSize: 15,
    fontWeight: 600,
    padding: '12px 32px',
    cursor: 'pointer',
  },
  playerCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    marginBottom: 10,
  },
  playerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  playerRating: {
    fontSize: 13,
    color: 'var(--text-secondary)',
  },
  challengeBtn: {
    background: 'rgba(212,160,60,0.2)',
    border: '1px solid rgba(212,160,60,0.4)',
    borderRadius: 8,
    color: 'var(--accent)',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  modal: {
    position: 'fixed',
    inset: 0,
    zIndex: 200,
    background: 'rgba(30,18,14,0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    maxWidth: 380,
    width: '90%',
    padding: '28px 24px',
    textAlign: 'center',
  },
  modalTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: '0 0 8px',
  },
  modalSub: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    margin: '0 0 20px',
  },
  stakeOption: {
    padding: '10px',
    margin: '6px 0',
    borderRadius: 8,
    border: '1px solid rgba(212,160,60,0.15)',
    background: 'rgba(78,52,46,0.4)',
    color: 'var(--text-primary)',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s ease',
  },
  stakeOptionSelected: {
    background: 'rgba(212,160,60,0.2)',
    border: '1px solid rgba(212,160,60,0.5)',
    color: 'var(--accent)',
  },
  modalActions: {
    display: 'flex',
    gap: 10,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
  },
  btnAccept: {
    background: 'linear-gradient(135deg, #D4A03C, #B8860B)',
    color: '#1a1a1a',
  },
  btnDecline: {
    background: 'rgba(239,83,80,0.15)',
    border: '1px solid rgba(239,83,80,0.3)',
    color: '#EF5350',
  },
  btnCancel: {
    background: 'rgba(78,52,46,0.6)',
    border: '1px solid rgba(212,160,60,0.15)',
    color: 'var(--text-secondary)',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: 'var(--text-secondary)',
    fontSize: 15,
  },
  pulsingDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: 'var(--accent)',
    display: 'inline-block',
    animation: 'pulse-glow 1.5s ease-in-out infinite',
  },
};

const pulseKeyframes = `
@keyframes pulse-glow {
  0%, 100% { opacity: 0.4; box-shadow: 0 0 8px rgba(212,160,60,0.3); }
  50% { opacity: 1; box-shadow: 0 0 24px rgba(212,160,60,0.8); }
}
@keyframes tier-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(212,160,60,0); }
  50% { box-shadow: 0 0 30px 4px rgba(212,160,60,0.4); }
}
@media (min-width: 768px) {
  .lobby-tier-grid { grid-template-columns: repeat(3, 1fr) !important; }
}
`;

export default function LobbyScreen() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const wsRef = useRef(null);

  const [activeTab, setActiveTab] = useState('quickmatch');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [tierCounts, setTierCounts] = useState({});
  const [inQueue, setInQueue] = useState(null); // stake amount or null
  const [challengeModal, setChallengeModal] = useState(null); // { username, stake }
  const [challengeReceived, setChallengeReceived] = useState(null);
  const [selectedStake, setSelectedStake] = useState(STAKE_TIERS[0]);
  const [error, setError] = useState('');
  const [balance, setBalance] = useState(0);
  const [confirmTier, setConfirmTier] = useState(null); // tier amount to confirm

  // Fetch wallet balance
  useEffect(() => {
    api.getBalance()
      .then((data) => {
        const w = data?.wallet || data;
        const val = w?.balance ?? w?.amount ?? 0;
        setBalance(typeof val === 'number' ? val : Number(val) || 0);
      })
      .catch(() => {});
  }, []);

  const handleMessage = useCallback((msg) => {
    const { type, payload } = msg;

    switch (type) {
      case 'online_users':
        setOnlineUsers(payload.users || []);
        break;
      case 'user_online':
        setOnlineUsers((prev) => {
          if (prev.find((u) => u.id === payload.id)) return prev;
          return [...prev, payload];
        });
        break;
      case 'user_offline':
        setOnlineUsers((prev) => prev.filter((u) => u.id !== payload.id));
        break;
      case 'tier_counts':
        setTierCounts(payload.counts || payload || {});
        break;
      case 'challenge_received':
        setChallengeReceived(payload);
        break;
      case 'challenge_result':
        if (payload.accepted) {
          navigate('/game', {
            state: {
              mode: 'online',
              game_id: payload.game_id,
              my_color: payload.my_color,
              fen: payload.fen,
              time_control: payload.time_control,
            },
          });
        } else {
          setChallengeModal(null);
          setError('Challenge was declined.');
          setTimeout(() => setError(''), 3000);
        }
        break;
      case 'challenge_error':
        setChallengeModal(null);
        setError(payload.message || 'Challenge failed.');
        setTimeout(() => setError(''), 3000);
        break;
      case 'challenge_cancelled':
        setChallengeReceived(null);
        break;
      case 'queue_joined':
        setInQueue(payload.stake_amount_kes || inQueue);
        break;
      case 'queue_left':
        setInQueue(null);
        break;
      case 'queue_match':
        setInQueue(null);
        navigate('/game', {
          state: {
            mode: 'online',
            game_id: payload.game_id,
            my_color: payload.my_color,
            fen: payload.fen,
            time_control: payload.time_control,
          },
        });
        break;
      case 'queue_error':
        setInQueue(null);
        setError(payload.message || 'Queue error.');
        setTimeout(() => setError(''), 3000);
        break;
      default:
        break;
    }
  }, [navigate, inQueue]);

  useEffect(() => {
    if (!token) return;

    const ws = new WebSocketService('/lobby', token, handleMessage);
    ws.connect();
    wsRef.current = ws;

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [token, handleMessage]);

  const send = (type, payload) => {
    wsRef.current?.send(type, payload);
  };

  const joinQueue = (stake) => {
    setInQueue(stake);
    send('join_queue', {
      stake_amount_kes: stake,
      time_control: 600,
      increment: 0,
    });
  };

  const leaveQueue = () => {
    send('leave_queue', {});
    setInQueue(null);
  };

  const sendChallenge = () => {
    if (!challengeModal) return;
    send('challenge_request', {
      target_user_id: challengeModal.userId,
      stake_amount_kes: selectedStake,
    });
    setChallengeModal({ ...challengeModal, sent: true });
  };

  const acceptChallenge = () => {
    if (!challengeReceived) return;
    send('challenge_accepted', { challenge_id: challengeReceived.challenge_id });
    setChallengeReceived(null);
  };

  const declineChallenge = () => {
    if (!challengeReceived) return;
    send('challenge_declined', { challenge_id: challengeReceived.challenge_id });
    setChallengeReceived(null);
  };

  const filteredUsers = onlineUsers.filter((u) => u.id !== user?.id);

  return (
    <>
      <style>{pulseKeyframes}</style>
      <AnimatedBackground />
      <div style={styles.wrapper}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate(-1)}>
            &#8592;
          </button>
          <h1 style={styles.title}>Online Lobby</h1>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,83,80,0.15)',
            border: '1px solid rgba(239,83,80,0.3)',
            borderRadius: 10,
            padding: '10px 16px',
            marginBottom: 16,
            color: '#EF5350',
            fontSize: 14,
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(activeTab === 'quickmatch' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('quickmatch')}
          >
            Quick Match
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'players' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('players')}
          >
            Online Players
          </button>
        </div>

        {/* Quick Match Tab */}
        {activeTab === 'quickmatch' && (
          <div className="lobby-tier-grid" style={styles.tierGrid}>
            {STAKE_TIERS.map((tier) => {
              const usd = (tier * KES_TO_USD).toFixed(2);
              const winAmount = (tier * 2 * (1 - FEE_RATE)).toLocaleString();
              const count = tierCounts[tier];
              const isQueued = inQueue === tier;

              return (
                <GlassCard
                  key={tier}
                  style={{
                    ...styles.tierCard,
                    ...(isQueued ? { animation: 'tier-pulse 2s ease-in-out infinite' } : {}),
                  }}
                  onClick={() => !inQueue && setConfirmTier(tier)}
                >
                  <p style={styles.tierAmount}>KES {tier.toLocaleString()}</p>
                  <p style={styles.tierUsd}>~${usd} USD</p>
                  <p style={styles.tierWin}>Win: KES {winAmount}</p>
                  <p style={styles.tierSub}>10+0 blitz | 10% fee</p>
                  {count !== undefined && count !== null && (
                    <p style={styles.tierPlayers}>
                      {count} player{count !== 1 ? 's' : ''} waiting
                    </p>
                  )}
                </GlassCard>
              );
            })}
          </div>
        )}

        {/* Online Players Tab */}
        {activeTab === 'players' && (
          <div>
            {filteredUsers.length === 0 ? (
              <div style={styles.emptyState}>
                No other players online right now.
              </div>
            ) : (
              filteredUsers.map((u) => (
                <GlassCard key={u.id} style={styles.playerCard}>
                  <div style={styles.playerInfo}>
                    <span style={styles.playerName}>{u.username}</span>
                    <span style={styles.playerRating}>
                      &#11088; {u.rating || 1200}
                    </span>
                  </div>
                  <button
                    style={styles.challengeBtn}
                    onClick={() => {
                      setChallengeModal({ userId: u.id, username: u.username, sent: false });
                      setSelectedStake(STAKE_TIERS[0]);
                    }}
                  >
                    Challenge
                  </button>
                </GlassCard>
              ))
            )}
          </div>
        )}
      </div>

      {/* Queue Overlay */}
      {inQueue !== null && (
        <div style={styles.queueOverlay}>
          <div style={styles.pulsingDot} />
          <p style={styles.queueText}>
            Searching for opponent...<br />
            <span style={{ fontSize: 16, color: 'var(--accent)' }}>
              KES {inQueue.toLocaleString()} stake
            </span>
          </p>
          <button style={styles.cancelBtn} onClick={leaveQueue}>
            Cancel
          </button>
        </div>
      )}

      {/* Challenge Send Modal */}
      {challengeModal && !challengeModal.sent && (
        <div style={styles.modal}>
          <GlassCard style={styles.modalCard}>
            <p style={styles.modalTitle}>Challenge {challengeModal.username}</p>
            <p style={styles.modalSub}>Select a stake amount</p>
            <div>
              {STAKE_TIERS.map((tier) => (
                <div
                  key={tier}
                  style={{
                    ...styles.stakeOption,
                    ...(selectedStake === tier ? styles.stakeOptionSelected : {}),
                  }}
                  onClick={() => setSelectedStake(tier)}
                >
                  KES {tier.toLocaleString()}
                </div>
              ))}
            </div>
            <p style={{
              fontSize: 13,
              color: balance >= selectedStake ? 'var(--text-secondary)' : '#EF5350',
              margin: '12px 0 4px',
            }}>
              Balance: KES {balance.toLocaleString()}
            </p>
            {balance < selectedStake && (
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginBottom: 8,
                  textDecoration: 'underline',
                }}
                onClick={() => {
                  setChallengeModal(null);
                  navigate('/wallet');
                }}
              >
                Deposit Funds
              </button>
            )}
            <div style={styles.modalActions}>
              <button
                style={{ ...styles.modalBtn, ...styles.btnCancel }}
                onClick={() => setChallengeModal(null)}
              >
                Cancel
              </button>
              {balance >= selectedStake && (
                <button
                  style={{ ...styles.modalBtn, ...styles.btnAccept }}
                  onClick={sendChallenge}
                >
                  Send Challenge
                </button>
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Challenge Sent Waiting Modal */}
      {challengeModal && challengeModal.sent && (
        <div style={styles.modal}>
          <GlassCard style={styles.modalCard}>
            <div style={{ ...styles.pulsingDot, margin: '0 auto 16px' }} />
            <p style={styles.modalTitle}>Challenge Sent</p>
            <p style={styles.modalSub}>
              Waiting for {challengeModal.username} to respond...
            </p>
            <button
              style={{ ...styles.modalBtn, ...styles.btnCancel, marginTop: 16 }}
              onClick={() => {
                send('challenge_cancelled', {});
                setChallengeModal(null);
              }}
            >
              Cancel
            </button>
          </GlassCard>
        </div>
      )}

      {/* Tier Confirmation Modal */}
      {confirmTier !== null && (
        <div style={styles.modal}>
          <GlassCard style={styles.modalCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 22 }}>&#128176;</span>
              <p style={{ ...styles.modalTitle, margin: 0 }}>Join Queue</p>
            </div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: 'var(--accent)', margin: '0 0 16px' }}>
              KES {confirmTier.toLocaleString()}
            </p>
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.06)',
              padding: 12,
              marginBottom: 12,
              textAlign: 'left',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 14 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Entry</span>
                <span style={{ color: 'var(--text-primary)' }}>KES {confirmTier.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 14 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Prize</span>
                <span style={{ color: '#4CAF50', fontWeight: 600 }}>KES {(confirmTier * 2 * (1 - FEE_RATE)).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 14 }}>
                <span style={{ color: 'var(--text-secondary)' }}>House fee</span>
                <span style={{ color: 'var(--text-primary)' }}>10%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Time control</span>
                <span style={{ color: 'var(--text-primary)' }}>10+0</span>
              </div>
            </div>
            <p style={{
              fontSize: 13,
              color: balance >= confirmTier ? 'var(--text-secondary)' : '#EF5350',
              marginBottom: balance < confirmTier ? 4 : 16,
            }}>
              Balance: KES {balance.toLocaleString()}
            </p>
            {balance < confirmTier && (
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginBottom: 16,
                  textDecoration: 'underline',
                }}
                onClick={() => {
                  setConfirmTier(null);
                  navigate('/wallet');
                }}
              >
                Deposit Funds
              </button>
            )}
            <div style={styles.modalActions}>
              <button
                style={{ ...styles.modalBtn, ...styles.btnCancel }}
                onClick={() => setConfirmTier(null)}
              >
                Cancel
              </button>
              {balance >= confirmTier && (
                <button
                  style={{ ...styles.modalBtn, ...styles.btnAccept }}
                  onClick={() => {
                    const tier = confirmTier;
                    setConfirmTier(null);
                    joinQueue(tier);
                  }}
                >
                  Join Queue
                </button>
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Challenge Received Modal */}
      {challengeReceived && (
        <div style={styles.modal}>
          <GlassCard style={styles.modalCard}>
            <p style={styles.modalTitle}>Challenge Received!</p>
            <p style={styles.modalSub}>
              <strong style={{ color: 'var(--text-primary)' }}>
                {challengeReceived.challenger_username || challengeReceived.username}
              </strong>{' '}
              wants to play for{' '}
              <strong style={{ color: 'var(--accent)' }}>
                KES {(challengeReceived.stake_amount_kes || 0).toLocaleString()}
              </strong>
            </p>
            <div style={styles.modalActions}>
              <button
                style={{ ...styles.modalBtn, ...styles.btnDecline }}
                onClick={declineChallenge}
              >
                Decline
              </button>
              <button
                style={{ ...styles.modalBtn, ...styles.btnAccept }}
                onClick={acceptChallenge}
              >
                Accept
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </>
  );
}
