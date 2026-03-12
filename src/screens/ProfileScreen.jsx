import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import AnimatedBackground from '../components/AnimatedBackground';
import GlassCard from '../components/GlassCard';

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
    marginBottom: 28,
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
  avatarSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 28,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #D4A03C, #BF8C2C)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 34,
    fontWeight: 700,
    color: '#fff',
    fontFamily: "'Playfair Display', serif",
    boxShadow: '0 0 20px rgba(212,160,60,0.4), 0 0 40px rgba(212,160,60,0.15)',
    marginBottom: 14,
  },
  username: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: 'var(--text-secondary)',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    padding: '18px 14px',
    textAlign: 'center',
  },
  statEmoji: {
    fontSize: 22,
    display: 'block',
    marginBottom: 6,
  },
  statValue: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 26,
    fontWeight: 700,
    color: '#D4A03C',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 12,
  },
  gameCard: {
    padding: '12px 16px',
    marginBottom: 8,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gameLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  gameOpponent: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  gameDate: {
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  gameResult: {
    fontSize: 13,
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: 6,
  },
  logoutBtn: {
    width: '100%',
    padding: '14px 0',
    border: '2px solid #C62828',
    borderRadius: 12,
    background: 'transparent',
    color: '#C62828',
    fontWeight: 600,
    fontSize: 15,
    cursor: 'pointer',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 32,
  },
  spinner: {
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: 14,
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: 14,
    padding: 20,
  },
};

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getResultStyle(result) {
  if (result === 'win') return { background: 'rgba(46,125,50,0.2)', color: '#4CAF50' };
  if (result === 'loss') return { background: 'rgba(198,40,40,0.2)', color: '#EF5350' };
  return { background: 'rgba(212,160,60,0.2)', color: '#D4A03C' };
}

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [games, setGames] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getGames(1);
        if (!cancelled) {
          const list = data.games || data.results || data || [];
          setGames(Array.isArray(list) ? list.slice(0, 10) : []);
        }
      } catch (err) {
        console.error('Failed to load games:', err);
      } finally {
        if (!cancelled) setGamesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return (
      <>
        <AnimatedBackground />
        <div style={styles.wrapper}>
          <div style={styles.spinner}>Loading profile...</div>
        </div>
      </>
    );
  }

  const gamesPlayed = user.games_played ?? 0;
  const gamesWon = user.games_won ?? 0;
  const winRate = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;
  const firstLetter = (user.username || user.email || '?')[0].toUpperCase();

  return (
    <>
      <AnimatedBackground />
      <div style={styles.wrapper}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate(-1)} aria-label="Go back">
            &#8592;
          </button>
          <h1 style={styles.title}>Profile</h1>
        </div>

        {/* Avatar Section */}
        <div style={styles.avatarSection}>
          <div style={styles.avatar}>{firstLetter}</div>
          <h2 style={styles.username}>{user.username || 'Player'}</h2>
          <p style={styles.email}>{user.email}</p>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid-2col" style={styles.statsGrid}>
          <GlassCard style={styles.statCard}>
            <span style={styles.statEmoji}>&#11088;</span>
            <div style={styles.statValue}>{user.rating ?? 1200}</div>
            <div style={styles.statLabel}>Rating</div>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <span style={styles.statEmoji}>&#127918;</span>
            <div style={styles.statValue}>{gamesPlayed}</div>
            <div style={styles.statLabel}>Games Played</div>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <span style={styles.statEmoji}>&#127942;</span>
            <div style={styles.statValue}>{gamesWon}</div>
            <div style={styles.statLabel}>Wins</div>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <span style={styles.statEmoji}>&#128202;</span>
            <div style={styles.statValue}>{winRate}%</div>
            <div style={styles.statLabel}>Win Rate</div>
          </GlassCard>
        </div>

        {/* Recent Games */}
        <h3 style={styles.sectionTitle}>Recent Games</h3>
        {gamesLoading ? (
          <div style={styles.spinner}>Loading games...</div>
        ) : games.length === 0 ? (
          <p style={styles.emptyText}>No games played yet</p>
        ) : (
          games.map((game, i) => {
            const isWhite = game.white_player?.id === user.id || game.white_player === user.id;
            const opponent = isWhite
              ? (game.black_player?.username || 'Opponent')
              : (game.white_player?.username || 'Opponent');
            const result =
              game.winner === user.id ? 'win' :
              game.winner === null && game.status === 'completed' ? 'draw' :
              game.status === 'completed' ? 'loss' :
              game.status || 'pending';
            const resultLabel = result === 'win' ? 'Won' : result === 'loss' ? 'Lost' : result === 'draw' ? 'Draw' : result;
            const rStyle = getResultStyle(result);

            return (
              <GlassCard key={game.id || i} style={styles.gameCard}>
                <div style={styles.gameLeft}>
                  <span style={styles.gameOpponent}>vs {opponent}</span>
                  <span style={styles.gameDate}>{formatDate(game.created_at || game.date)}</span>
                </div>
                <span style={{ ...styles.gameResult, ...rStyle }}>
                  {resultLabel}
                </span>
              </GlassCard>
            );
          })
        )}

        {/* Logout */}
        <button style={styles.logoutBtn} onClick={handleLogout}>
          Log Out
        </button>
      </div>
    </>
  );
}
