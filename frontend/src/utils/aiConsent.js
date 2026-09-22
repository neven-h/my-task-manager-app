import storage, { STORAGE_KEYS } from './storage';

/**
 * Per-user consent for sending spending summaries to Anthropic (Claude) for the
 * AI Financial Advisor. Required by App Store Guideline 5.1.2(i) before any
 * personal data is shared with a third-party AI service.
 */
const consentKey = () => `${STORAGE_KEYS.AI_CONSENT}:${storage.get(STORAGE_KEYS.AUTH_USER) || ''}`;

export const hasAIConsent = () => storage.get(consentKey()) === 'granted';

export const setAIConsent = (granted) => {
    if (granted) storage.set(consentKey(), 'granted');
    else storage.remove(consentKey());
};

export const AI_CONSENT_DISCLOSURE =
    'To generate insights, a summary of your expenses is sent to Anthropic’s Claude AI: ' +
    'monthly spending totals and your top expense descriptions (such as merchant names) with amounts. ' +
    'Your name, email and account numbers are not sent.';
