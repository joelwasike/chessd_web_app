import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimatedBackground from '../components/AnimatedBackground';
import GlassCard from '../components/GlassCard';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import logo from '../assets/logo.png';

const GAME_MODES = [
  {
    key: 'online',
    icon: '\u{1F310}',
    title: 'Play Online',
    subtitle: 'Challenge players worldwide',
    gradient: ['#FFB300', '#FF8F00'],
  },
  {
    key: 'bot',
    icon: '\u{1F916}',
    title: 'Play vs Bot',
    subtitle: 'Practice against AI',
    gradient: ['#66BB6A', '#43A047'],
  },
  {
    key: 'local',
    icon: '\u{1F465}',
    title: 'Local Play',
    subtitle: 'Play with a friend nearby',
    gradient: ['#42A5F5', '#1E88E5'],
  },
];

const BOT_LEVELS = [
  { level: 1, name: 'Beginner' },
  { level: 2, name: 'Novice' },
  { level: 3, name: 'Intermediate' },
  { level: 4, name: 'Club' },
  { level: 5, name: 'Advanced' },
  { level: 6, name: 'Expert' },
  { level: 7, name: 'Master' },
  { level: 8, name: 'Grandmaster' },
];

function getDifficultyColor(level) {
  const colors = [
    ['#66BB6A', '#43A047'],
    ['#8BC34A', '#689F38'],
    ['#CDDC39', '#AFB42B'],
    ['#FFEB3B', '#FBC02D'],
    ['#FFC107', '#FFA000'],
    ['#FF9800', '#F57C00'],
    ['#FF5722', '#E64A19'],
    ['#F44336', '#D32F2F'],
  ];
  return colors[level - 1] || colors[0];
}

const slideUpKeyframes = `
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes glow {
  0%, 100% { box-shadow: 0 0 15px rgba(255, 179, 0, 0.4); }
  50% { box-shadow: 0 0 25px rgba(255, 179, 0, 0.7); }
}
`;

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState(null);
  const [showBotModal, setShowBotModal] = useState(false);

  const isLoggedIn = !!user;

  useEffect(() => {
    if (isLoggedIn) {
      api.getBalance()
        .then((data) => {
          const w = data?.wallet || data;
          const val = w?.balance ?? w?.amount ?? 0;
          setBalance(typeof val === 'number' ? val : Number(val) || 0);
        })
        .catch(() => {});
    }
  }, [isLoggedIn]);

  const handleModeClick = (mode) => {
    if (mode.key === 'online') {
      navigate('/lobby');
    } else if (mode.key === 'bot') {
      setShowBotModal(true);
    } else if (mode.key === 'local') {
      navigate('/game?mode=local');
    }
  };

  const handleBotSelect = (level) => {
    setShowBotModal(false);
    navigate(`/game?mode=bot&difficulty=${level}`);
  };

  const username = user?.username || user?.name || 'Player';

  return (
    <div className="page" style={styles.page}>
      <style>{slideUpKeyframes}</style>
      <AnimatedBackground />

      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <img
            src={logo}
            alt="Chessd"
            style={styles.logo}
          />
          <h1 style={styles.title}>Chessd</h1>
          <p style={styles.welcome}>
            {isLoggedIn ? `Welcome, ${username}` : 'Welcome to Chessd'}
          </p>

          {isLoggedIn && balance !== null && (
            <GlassCard style={styles.balanceCard}>
              <span style={styles.balanceLabel}>Balance</span>
              <span style={styles.balanceAmount}>
                KES {Number(balance || 0).toLocaleString()}
              </span>
            </GlassCard>
          )}
        </div>

        {/* Game Mode Cards */}
        <div style={styles.modesContainer}>
          {GAME_MODES.map((mode, index) => (
            <GlassCard
              key={mode.key}
              style={{
                ...styles.modeCard,
                animationDelay: `${index * 0.1}s`,
              }}
              onClick={() => handleModeClick(mode)}
            >
              <div
                style={{
                  ...styles.accentBar,
                  background: `linear-gradient(to bottom, ${mode.gradient[0]}, ${mode.gradient[1]})`,
                }}
              />
              <div style={styles.modeCardContent}>
                <div
                  style={{
                    ...styles.iconCircle,
                    background: `linear-gradient(135deg, ${mode.gradient[0]}, ${mode.gradient[1]})`,
                  }}
                >
                  <span style={styles.iconText}>{mode.icon}</span>
                </div>
                <div style={styles.modeTextContainer}>
                  <span style={styles.modeTitle}>{mode.title}</span>
                  <span style={styles.modeSubtitle}>{mode.subtitle}</span>
                </div>
                <span style={styles.chevron}>{'\u203A'}</span>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Bottom Nav (logged in) */}
        {isLoggedIn && (
          <div style={styles.bottomNav}>
            <GlassCard style={styles.navButton} onClick={() => navigate('/profile')}>
              <span style={styles.navIcon}>{'\u{1F464}'}</span>
              <span style={styles.navLabel}>Profile</span>
            </GlassCard>
            <GlassCard style={styles.navButton} onClick={() => navigate('/wallet')}>
              <span style={styles.navIcon}>{'\u{1F4B0}'}</span>
              <span style={styles.navLabel}>Wallet</span>
            </GlassCard>
            <GlassCard style={styles.navButton} onClick={logout}>
              <span style={styles.navIcon}>{'\u{1F6AA}'}</span>
              <span style={styles.navLabel}>Logout</span>
            </GlassCard>
          </div>
        )}
      </div>

      {/* Bot Difficulty Modal */}
      {showBotModal && (
        <div style={styles.overlay} onClick={() => setShowBotModal(false)}>
          <GlassCard
            style={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={styles.modalTitle}>Select Difficulty</h2>
            <div style={styles.difficultyGrid}>
              {BOT_LEVELS.map(({ level, name }) => {
                const [c1, c2] = getDifficultyColor(level);
                return (
                  <GlassCard
                    key={level}
                    style={styles.difficultyCard}
                    onClick={() => handleBotSelect(level)}
                  >
                    <div
                      style={{
                        ...styles.difficultyBadge,
                        background: `linear-gradient(135deg, ${c1}, ${c2})`,
                      }}
                    >
                      {level}
                    </div>
                    <span style={styles.difficultyName}>{name}</span>
                  </GlassCard>
                );
              })}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    position: 'relative',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    maxWidth: 800,
    width: '100%',
    padding: '40px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 32,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    objectFit: 'cover',
    animation: 'glow 3s ease-in-out infinite',
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFD54F',
    margin: 0,
    textShadow: '0 0 20px rgba(255, 179, 0, 0.5)',
  },
  welcome: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    margin: 0,
  },
  balanceCard: {
    marginTop: 8,
    padding: '8px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  balanceLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD54F',
  },
  modesContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  modeCard: {
    position: 'relative',
    overflow: 'hidden',
    padding: 0,
    cursor: 'pointer',
    animation: 'slideUp 0.5s ease-out both',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderRadius: '4px 0 0 4px',
  },
  modeCardContent: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 18px 16px 22px',
    gap: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconText: {
    fontSize: 24,
    lineHeight: 1,
  },
  modeTextContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  modeTitle: {
    fontSize: 17,
    fontWeight: 600,
    color: '#fff',
  },
  modeSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.55)',
  },
  chevron: {
    fontSize: 28,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: 300,
    flexShrink: 0,
  },
  bottomNav: {
    display: 'flex',
    gap: 12,
    marginTop: 16,
    width: '100%',
    justifyContent: 'center',
  },
  navButton: {
    padding: '12px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
    flex: 1,
    maxWidth: 140,
  },
  navIcon: {
    fontSize: 22,
  },
  navLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    animation: 'fadeIn 0.2s ease-out',
  },
  modal: {
    padding: '28px 24px',
    maxWidth: 400,
    width: '90%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD54F',
    margin: '0 0 20px 0',
    textAlign: 'center',
    fontFamily: "'Playfair Display', serif",
  },
  difficultyGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
  difficultyCard: {
    padding: '14px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
  },
  difficultyBadge: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
    flexShrink: 0,
  },
  difficultyName: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: 500,
  },
};
