export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const isValidPassword = (password) => {
  return password && password.length >= 8;
};

export const isValidName = (name) => {
  return name && name.trim().length >= 2;
};

export const isValidMessage = (message) => {
  const trimmed = message?.trim() || '';
  return trimmed.length > 0 && trimmed.length <= 2000;
};

export const validateSignup = (email, password, confirmPassword, name) => {
  const errors = {};

  if (!isValidEmail(email)) {
    errors.email = 'Invalid email address';
  }

  if (!isValidPassword(password)) {
    errors.password = 'Password must be at least 8 characters';
  }

  if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  if (!isValidName(name)) {
    errors.name = 'Name must be at least 2 characters';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};

export const validateLogin = (email, password) => {
  const errors = {};

  if (!email) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(email)) {
    errors.email = 'Invalid email address';
  }

  if (!password) {
    errors.password = 'Password is required';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};
