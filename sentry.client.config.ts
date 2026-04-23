import * as Sentry from "@sentry/astro";

const dsn = import.meta.env.PUBLIC_SENTRY_DSN;

function scrubEvent(event: any): any {
  if (event?.request?.headers) {
    delete event.request.headers.authorization;
    delete event.request.headers.cookie;
    delete event.request.headers["x-forwarded-for"];
  }

  if (event?.request) {
    delete event.request.cookies;
    delete event.request.data;
    delete event.request.query_string;
  }

  if (event?.user) {
    delete event.user.email;
    delete event.user.ip_address;
    delete event.user.username;
  }

  return event;
}

Sentry.init({
  dsn: dsn || undefined,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  environment: import.meta.env.PUBLIC_VERCEL_ENV || import.meta.env.MODE,
  release: import.meta.env.PUBLIC_VERCEL_GIT_COMMIT_SHA,
  beforeSend: scrubEvent,
});
