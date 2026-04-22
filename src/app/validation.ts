const CONTROL_CHAR_REGEX = /[\u0000-\u001F\u007F]/g;

export const LIMITS = {
  shortText: 80,
  mediumText: 120,
  longText: 255,
  address: 500,
  reason: 300,
  email: 254,
  phone: 15,
  pincode: 6,
  gstin: 15,
  pan: 10,
  sku: 40,
  vehicleNumber: 20,
  employeeId: 30,
  password: 128,
  csvFileBytes: 5 * 1024 * 1024,
} as const;

export const normalizeSpaces = (value: string) => value.replace(/\s+/g, ' ').trim();

export const stripControlChars = (value: string) => value.replace(CONTROL_CHAR_REGEX, '');

export const sanitizeText = (value: string, maxLength = LIMITS.longText) =>
  normalizeSpaces(stripControlChars(value)).slice(0, maxLength);

export const sanitizeMultilineText = (value: string, maxLength = LIMITS.address) =>
  stripControlChars(value)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => normalizeSpaces(line))
    .filter((line, index, lines) => line.length > 0 || (index > 0 && index < lines.length - 1))
    .join('\n')
    .slice(0, maxLength)
    .trim();

export const sanitizeUpperAlnum = (value: string, maxLength: number) =>
  stripControlChars(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, maxLength);

export const sanitizeSku = (value: string) =>
  stripControlChars(value)
    .toUpperCase()
    .replace(/[^A-Z0-9/_-]/g, '')
    .slice(0, LIMITS.sku);

export const sanitizeVehicleNumber = (value: string) =>
  stripControlChars(value)
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, LIMITS.vehicleNumber);

export const sanitizePhone = (value: string) =>
  stripControlChars(value)
    .replace(/[^\d+]/g, '')
    .slice(0, LIMITS.phone);

export const sanitizeDigits = (value: string, maxLength: number) =>
  stripControlChars(value)
    .replace(/\D/g, '')
    .slice(0, maxLength);

export const sanitizeEmail = (value: string) =>
  stripControlChars(value).trim().toLowerCase().slice(0, LIMITS.email);

export const sanitizeDecimalInput = (value: string, maxLength = 18) =>
  stripControlChars(value)
    .replace(/[^0-9.-]/g, '')
    .slice(0, maxLength);

export const sanitizeIntegerInput = (value: string, maxLength = 9) =>
  stripControlChars(value)
    .replace(/[^\d-]/g, '')
    .slice(0, maxLength);

export const validateRequired = (value: string, label: string) => {
  if (!value.trim()) {
    throw new Error(`${label} is required`);
  }
};

export const validateEmail = (value: string) => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error('Enter a valid email address');
  }
};

export const validatePhone = (value: string, label = 'Phone number') => {
  if (!/^\+?\d{7,15}$/.test(value)) {
    throw new Error(`Enter a valid ${label.toLowerCase()}`);
  }
};

export const validatePincode = (value: string) => {
  if (value && !/^\d{6}$/.test(value)) {
    throw new Error('Pincode must be exactly 6 digits');
  }
};

export const validatePAN = (value: string) => {
  if (value && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value)) {
    throw new Error('PAN number must be 10 characters in valid format');
  }
};

export const validateGSTIN = (value: string) => {
  if (value && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value)) {
    throw new Error('GSTIN must be 15 characters in valid format');
  }
};

export const validateSku = (value: string) => {
  if (!/^[A-Z0-9][A-Z0-9/_-]{1,39}$/i.test(value)) {
    throw new Error('SKU may contain letters, numbers, "/", "_" and "-" only');
  }
};

export const validateVehicleNumber = (value: string) => {
  if (value && !/^[A-Z0-9-]{6,20}$/.test(value)) {
    throw new Error('Vehicle number must contain 6-20 letters, numbers or "-" only');
  }
};

export const validatePositiveAmount = (value: number, label: string) => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be greater than 0`);
  }
};

export const validateNonNegativeAmount = (value: number, label: string) => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} cannot be negative`);
  }
};

export const validatePasswordStrength = (value: string) => {
  if (value.length < 8 || value.length > LIMITS.password) {
    throw new Error('Password must be 8-128 characters long');
  }
  if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/\d/.test(value) || !/[^a-zA-Z0-9\s]/.test(value)) {
    throw new Error('Password must include uppercase, lowercase, number and special character');
  }
};

export const safeLower = (value: string) => value.toLowerCase();
