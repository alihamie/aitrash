type LogLevel = "debug" | "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

const REDACT_KEYS = [
  "token",
  "secret",
  "key",
  "password",
  "cookie",
  "authorization",
];

function shouldRedact(key: string) {
  const lowered = key.toLowerCase();
  return REDACT_KEYS.some((needle) => lowered.includes(needle));
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (shouldRedact(key)) {
        sanitized[key] = "[redacted]";
      } else {
        sanitized[key] = sanitizeValue(item);
      }
    }
    return sanitized;
  }

  return value;
}

function canDebug() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_DEBUG_LOGS === "1"
  );
}

function emit(level: LogLevel, event: string, fields?: LogFields) {
  if (level === "debug" && !canDebug()) {
    return;
  }

  const payload = {
    event,
    timestamp: new Date().toISOString(),
    ...(fields ? (sanitizeValue(fields) as LogFields) : {}),
  };

  if (level === "debug" || level === "info") {
    console.log(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

  console.error(payload);
}

export const log = {
  debug(event: string, fields?: LogFields) {
    emit("debug", event, fields);
  },
  info(event: string, fields?: LogFields) {
    emit("info", event, fields);
  },
  warn(event: string, fields?: LogFields) {
    emit("warn", event, fields);
  },
  error(event: string, fields?: LogFields) {
    emit("error", event, fields);
  },
};

export function createRequestId(prefix = "req") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
