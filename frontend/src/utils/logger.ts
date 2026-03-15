type FrontendLogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_ORDER: Record<FrontendLogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const DEFAULT_LOG_LEVEL: FrontendLogLevel = process.env.NODE_ENV === 'production' ? 'warn' : 'debug';

function getConfiguredLogLevel(): FrontendLogLevel {
  const configuredLevel = String(process.env.REACT_APP_LOG_LEVEL || DEFAULT_LOG_LEVEL).toLowerCase();
  if (configuredLevel in LOG_LEVEL_ORDER) {
    return configuredLevel as FrontendLogLevel;
  }

  return DEFAULT_LOG_LEVEL;
}

function shouldLog(level: FrontendLogLevel): boolean {
  return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[getConfiguredLogLevel()];
}

function writeLog(level: FrontendLogLevel, scope: string, message: string, meta?: Record<string, unknown>) {
  if (!shouldLog(level)) {
    return;
  }

  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level.toUpperCase()}] [${scope}] ${message}`;

  if (level === 'error') {
    console.error(line, meta ?? {});
    return;
  }

  if (level === 'warn') {
    console.warn(line, meta ?? {});
    return;
  }

  console.log(line, meta ?? {});
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
