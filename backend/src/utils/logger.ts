type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const DEFAULT_LOG_LEVEL: LogLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

function getConfiguredLogLevel(): LogLevel {
  const configuredLevel = String(process.env.LOG_LEVEL || DEFAULT_LOG_LEVEL).toLowerCase();
  if (configuredLevel in LOG_LEVEL_ORDER) {
    return configuredLevel as LogLevel;
  }

  return DEFAULT_LOG_LEVEL;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[getConfiguredLogLevel()];
}

function formatMeta(meta?: Record<string, unknown>): string {
  if (!meta || Object.keys(meta).length === 0) {
    return '';
  }

  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return ' {"meta":"[unserializable]"}';
  }
}

function writeLog(level: LogLevel, scope: string, message: string, meta?: Record<string, unknown>) {
  if (!shouldLog(level)) {
    return;
  }

  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level.toUpperCase()}] [${scope}] ${message}${formatMeta(meta)}`;

  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.log(line);
}

export function createLogger(scope: string) {
  return {
    debug(message: string, meta?: Record<string, unknown>) {
      writeLog('debug', scope, message, meta);
    },
    info(message: string, meta?: Record<string, unknown>) {
      writeLog('info', scope, message, meta);
    },
    warn(message: string, meta?: Record<string, unknown>) {
      writeLog('warn', scope, message, meta);
    },
    error(message: string, meta?: Record<string, unknown>) {
      writeLog('error', scope, message, meta);
    },
  };
}
