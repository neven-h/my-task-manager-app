// Crash and error reporting. Inert unless VITE_SENTRY_DSN is set at build time.
// On iOS the native SDK also catches native crashes (e.g. a missing Info.plist
// permission), which JavaScript error handlers never see.
import * as Sentry from '@sentry/capacitor';
import { init as sentryReactInit } from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN;

if (dsn) {
  Sentry.init({ dsn, sendDefaultPii: false }, sentryReactInit);
}
