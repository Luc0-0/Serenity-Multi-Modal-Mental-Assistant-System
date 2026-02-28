import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { validateSignup } from '../utils/validation';
import { Button } from '../components/Button';
import { AnimatedInput } from '../components/AnimatedInput';
import { BorderBeam } from '../components/BorderBeam';
import styles from './Signup.module.css';

export function Signup() {
  const navigate = useNavigate();
  const { signup, isLoading } = useAuth();
  const { error: showError } = useNotification();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
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
    const validation = validateSignup(
      formData.email,
      formData.password,
      formData.confirmPassword,
      formData.name
    );

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      await signup(formData.email, formData.password, formData.name);
      navigate('/check-in');
    } catch (err) {
      showError('Signup failed. Please try again.');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card} style={{ position: 'relative', overflow: 'hidden' }}>
        <BorderBeam />
        <h1 className={styles.title}>Join Serenity</h1>
        <p className={styles.subtitle}>Create your account to get started</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <AnimatedInput
              label="Full Name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your name"
              disabled={isLoading}
            />
            {errors.name && <span className={styles.error}>{errors.name}</span>}
          </div>

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
              placeholder="At least 8 characters"
              disabled={isLoading}
            />
            {errors.password && (
              <span className={styles.error}>{errors.password}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <AnimatedInput
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              disabled={isLoading}
            />
            {errors.confirmPassword && (
              <span className={styles.error}>{errors.confirmPassword}</span>
            )}
          </div>

          <Button
            type="submit"
            fullWidth
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <div className={styles.footer}>
          <p>
            Already have an account?{' '}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/login')}
              disabled={isLoading}
              style={{ padding: '0 4px', display: 'inline' }}
            >
              Sign in
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}
