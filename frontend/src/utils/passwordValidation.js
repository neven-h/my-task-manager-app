/**
 * Check password strength and return validation results
 * @param {string} password - The password to validate
 * @returns {Object} Object with validation status for each requirement
 */
export const checkPasswordStrength = (password) => {
  return {
    hasLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSymbol: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)
  };
};

/**
 * Check if all password requirements are met
 * @param {Object} passwordStrength - Result from checkPasswordStrength
 * @returns {boolean} True if all requirements are met
 */
export const allPasswordRequirementsMet = (passwordStrength) => {
  return Object.values(passwordStrength).every(v => v);
};

export default { checkPasswordStrength, allPasswordRequirementsMet };