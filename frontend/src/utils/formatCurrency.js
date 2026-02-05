/**
 * Format a number as Israeli currency (ILS) - default
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 2
  }).format(amount);
};

/**
 * Format a number with a specific currency
 * @param {number} amount - The amount to format
 * @param {string} currencyCode - The currency code (e.g., 'USD', 'EUR', 'ILS')
 * @returns {string} Formatted currency string
 */
export const formatCurrencyWithCode = (amount, currencyCode = 'ILS') => {
  if (!amount && amount !== 0) return '-';
  
  // Map currency codes to appropriate locales
  const localeMap = {
    'USD': 'en-US',
    'EUR': 'de-DE',
    'GBP': 'en-GB',
    'ILS': 'he-IL',
    'JPY': 'ja-JP',
    'CNY': 'zh-CN',
    'CAD': 'en-CA',
    'AUD': 'en-AU'
  };
  
  const locale = localeMap[currencyCode] || 'en-US';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export default formatCurrency;