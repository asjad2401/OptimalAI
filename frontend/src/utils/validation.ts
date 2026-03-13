export const validateEmail = (value: string): string | null => {
  if (!value) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address.';
  return null;
};

export const validatePassword = (value: string): string | null => {
  if (!value) return 'Password is required.';
  if (value.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(value)) return 'Password must contain at least one letter.';
  if (!/\d/.test(value)) return 'Password must contain at least one number.';
  if (!/[@$!%*?&#^_\-]/.test(value)) return 'Password must contain a special character (@$!%*?&#^_-).';
  if (!/^[A-Za-z\d@$!%*?&#^_\-]+$/.test(value)) return 'Password contains invalid characters.';
  return null;
};

export const validateProductIdentifier = (value: string): string | null => {
  const val = value.trim();
  if (!val) return 'Enter a product URL or ASIN.';
  if (/^[A-Za-z0-9]{10}$/.test(val)) return null;
  const lower = val.toLowerCase();
  if (lower.includes('amazon') && /dp\/|gp\/product\/|\/asin\//.test(lower)) return null;
  return 'Must be a valid 10-character ASIN or Amazon product URL.';
};
