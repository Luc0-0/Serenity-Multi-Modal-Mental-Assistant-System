import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { validateLogin } from '../utils/validation';
import { Button } from '../components/Button';
import { AnimatedInput } from '../components/AnimatedInput';
import { BorderBeam } from '../components/BorderBeam';
import styles from './Login.module.css';

export function Login() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const { error: showError } = useNotification();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateLogin(formData.email, formData.password);

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      await login(formData.email, formData.password);
      navigate('/check-in');
    } catch (err) {
      showError('Login failed. Please check your credentials.');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card} style={{ position: 'relative', overflow: 'hidden' }}>
        <BorderBeam />
        <h1 className={styles.title}>Welcome Back</h1>
        <p className={styles.subtitle}>Sign in to your Serenity account</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <AnimatedInput
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              disabled={isLoading}
            />
            {errors.email && <span className={styles.error}>{errors.email}</span>}
          </div>

          <div className={styles.formGroup}>
            <AnimatedInput
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              disabled={isLoading}
            />
            {errors.password && (
              <span className={styles.error}>{errors.password}</span>
            )}
          </div>

          <Button
            type="submit"
            fullWidth
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className={styles.footer}>
          <p>
            Don't have an account?{' '}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/signup')}
              disabled={isLoading}
              style={{ padding: '0 4px', display: 'inline' }}
            >
              Sign up
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}
