import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AnimatedBackground from '../components/AnimatedBackground';
import GlassCard from '../components/GlassCard';
import logo from '../assets/logo.png';

const styles = {
  wrapper: {
    position: 'relative',
    zIndex: 1,
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  card: {
    maxWidth: 420,
    width: '100%',
    padding: '40px 32px 32px',
    textAlign: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    objectFit: 'cover',
    boxShadow: '0 0 25px rgba(212,160,60,0.5), 0 0 50px rgba(212,160,60,0.2)',
    marginBottom: 16,
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 32,
    fontWeight: 700,
    letterSpacing: 3,
    color: 'var(--text-primary)',
    textShadow: '0 0 25px rgba(212,160,60,0.5)',
    marginBottom: 4,
  },
  subtitle: {
    color: 'var(--text-secondary)',
    letterSpacing: 2,
    fontWeight: 300,
    fontSize: 14,
    marginBottom: 32,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  error: {
    color: '#EF5350',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  success: {
    color: 'var(--success)',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  footer: {
    marginTop: 24,
    fontSize: 14,
    color: 'var(--text-secondary)',
  },
  link: {
    color: 'var(--accent)',
    fontWeight: 600,
    marginLeft: 4,
  },
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.message || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatedBackground />
      <div style={styles.wrapper}>
        <GlassCard style={styles.card}>
          <img src={logo} alt="Chessd" style={styles.logo} />
          <h1 style={styles.title}>Chessd</h1>
          <p style={styles.subtitle}>Play Chess. Win Rewards.</p>

          <form style={styles.form} onSubmit={handleSubmit}>
            <div className="input-group">
              <span className="input-icon">&#9993;</span>
              <input
                className="form-input"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="input-group">
              <span className="input-icon">&#128274;</span>
              <input
                className="form-input"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {successMessage && <p style={styles.success}>{successMessage}</p>}
            {error && <p style={styles.error}>{error}</p>}

            <button className="btn-accent" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p style={styles.footer}>
            Don&apos;t have an account?
            <Link to="/register" style={styles.link}>Register</Link>
          </p>
        </GlassCard>
      </div>
    </>
  );
}
