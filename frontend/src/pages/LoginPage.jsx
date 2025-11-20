import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api/auth';
import { setToken } from '../utils/auth';

function LoginPage({ setIsAuthenticated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(email, password);
      setToken(response.data.token);
      setIsAuthenticated(true);
      navigate('/decks');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Anki Clone</h1>
        <h2 style={styles.subtitle}>Login</h2>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p style={styles.link}>
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: 'var(--bg-color)',
    color: 'var(--text-color)',
  },
  card: {
    backgroundColor: 'var(--panel-bg)',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 10px var(--shadow-color)',
    width: '100%',
    maxWidth: '400px',
    border: '1px solid var(--border-color)',
  },
  title: {
    textAlign: 'center',
    marginBottom: '0.5rem',
    color: 'var(--text-color)',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: '1.5rem',
    color: 'var(--text-muted)',
    fontSize: '1.2rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  input: {
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    fontSize: '1rem',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-color)',
  },
  button: {
    padding: '0.75rem',
    backgroundColor: 'var(--primary-color)',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  error: {
    color: 'var(--danger-color)',
    marginBottom: '1rem',
    padding: '0.5rem',
    backgroundColor: 'rgba(220, 53, 69, 0.15)',
    borderRadius: '4px',
  },
  link: {
    textAlign: 'center',
    marginTop: '1rem',
  },
};

export default LoginPage;

