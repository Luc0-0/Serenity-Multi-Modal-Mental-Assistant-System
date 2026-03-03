import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { validateLogin } from '../utils/validation';
import { Button } from '../components/Button';
import { BorderBeam } from '../components/BorderBeam';
import styles from './Login.module.css';

export function Login() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const { error: showError } = useNotification();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const cardRef = useRef(null);

  // 3D Tilt effect
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateY = ((x - centerX) / centerX) * 5;
      const rotateX = ((centerY - y) / centerY) * 5;
      card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const handleMouseLeave = () => {
      card.style.transform = 'perspective(1200px) rotateX(0) rotateY(0)';
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

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
      setIsSuccess(true);
      setTimeout(() => navigate('/check-in'), 800);
    } catch (err) {
      showError('Login failed. Please check your credentials.');
    }
  };

  return (
    <div className={styles.container}>
      <div ref={cardRef} className={styles.card} style={{ position: 'relative', overflow: 'hidden', transition: 'transform 0.1s ease-out' }}>
        <BorderBeam />
        <h1 className={styles.title}>Welcome Back</h1>
        <p className={styles.subtitle}>Sign in to your Serenity account</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <div className={`${styles.inputWrapper} ${focusedField === 'email' ? styles.focused : ''}`}>
              <Mail size={16} className={styles.inputIcon} style={{ color: focusedField === 'email' ? 'rgba(196, 155, 107, 0.7)' : 'rgba(140, 110, 70, 0.5)', transition: 'color 0.3s ease' }} />
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                placeholder="you@example.com"
                disabled={isLoading}
                autoComplete="email"
                style={{ paddingLeft: '40px' }}
              />
              <div className={styles.underline} />
            </div>
            {errors.email && <span className={styles.error}>{errors.email}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <div className={`${styles.inputWrapper} ${focusedField === 'password' ? styles.focused : ''}`}>
              <Lock size={16} className={styles.inputIcon} style={{ color: focusedField === 'password' ? 'rgba(196, 155, 107, 0.7)' : 'rgba(140, 110, 70, 0.5)', transition: 'color 0.3s ease' }} />
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                placeholder="••••••••"
                disabled={isLoading}
                autoComplete="current-password"
                style={{ paddingLeft: '40px' }}
              />
              <div className={styles.underline} />
            </div>
            {errors.password && (
              <span className={styles.error}>{errors.password}</span>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <Button
              type="submit"
              fullWidth
              disabled={isLoading || isSuccess}
              style={{
                opacity: isSuccess ? 0 : 1,
                transition: 'opacity 0.3s ease',
              }}
            >
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
            {isSuccess && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.85) 0%, rgba(229, 193, 88, 0.85) 100%)',
                  borderRadius: '6px',
                  animation: 'fadeIn 0.4s ease',
                }}
              >
                <Check size={24} color="#050505" style={{ animation: 'checkmark 0.6s ease' }} />
              </div>
            )}
          </div>
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
