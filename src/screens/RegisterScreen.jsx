import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register(username, email, password);
      navigate('/login', { state: { message: 'Account created successfully. Please sign in.' } });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed. Please try again.');
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
              <span className="input-icon">&#9823;</span>
              <input
                className="form-input"
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

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
                autoComplete="new-password"
              />
            </div>

            <div className="input-group">
              <span className="input-icon">&#128273;</span>
              <input
                className="form-input"
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            {error && <p style={styles.error}>{error}</p>}

            <button className="btn-accent" type="submit" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p style={styles.footer}>
            Already have an account?
            <Link to="/login" style={styles.link}>Sign In</Link>
          </p>
        </GlassCard>
      </div>
    </>
  );
}
