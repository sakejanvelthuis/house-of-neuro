import SHA256 from 'crypto-js/sha256';

export function hashPassword(password) {
  return SHA256(password).toString();
}

export function comparePassword(password, hash) {
  if (!hash) return false;
  return hashPassword(password) === hash;
}
