import * as Sentry from "@sentry/astro";
import { scrubEvent, scrubBreadcrumb } from "./src/lib/sentry-scrub";

const dsn = import.meta.env.SENTRY_DSN || import.meta.env.PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: dsn || undefined,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  environment: import.meta.env.PUBLIC_VERCEL_ENV || import.meta.env.MODE,
  release: import.meta.env.PUBLIC_VERCEL_GIT_COMMIT_SHA,
  beforeSend: scrubEvent,
  beforeBreadcrumb: scrubBreadcrumb,
});
