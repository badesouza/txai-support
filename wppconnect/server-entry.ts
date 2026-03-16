import fs from 'node:fs';
import config from './config';
import { initServer } from './index';
import { ServerOptions } from './types/ServerOptions';

type JsonValue = string | number | boolean | null | JsonMap | JsonValue[];
interface JsonMap {
  [key: string]: JsonValue;
}

function isJsonMap(value: unknown): value is JsonMap {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base: JsonMap, override: JsonMap): JsonMap {
  const merged: JsonMap = { ...base };

  for (const [key, overrideValue] of Object.entries(override)) {
    const baseValue = merged[key];
    if (isJsonMap(baseValue) && isJsonMap(overrideValue)) {
      merged[key] = deepMerge(baseValue, overrideValue);
      continue;
    }
    merged[key] = overrideValue;
  }

  return merged;
}

function readRuntimeConfig(configPath: string): JsonMap {
  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!isJsonMap(parsed)) {
      throw new Error('Runtime config must be a JSON object');
    }
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load runtime config "${configPath}": ${message}`);
  }
}

const runtimeConfigPath = process.env.WPPCONNECT_CONFIG_PATH ?? '/usr/src/wpp-server/config.json';
const runtimeConfig = readRuntimeConfig(runtimeConfigPath);
const mergedConfig = deepMerge(config as unknown as JsonMap, runtimeConfig);

// Keep compatibility with env-based overrides used by existing deploy scripts.
if (process.env.PORT) {
  mergedConfig.port = process.env.PORT;
}
if (process.env.SECRET_KEY) {
  mergedConfig.secretKey = process.env.SECRET_KEY;
}
if (process.env.HOST) {
  mergedConfig.host = process.env.HOST;
}

console.log(`[TXAI-Support] WPPConnect server-entry boot | port=${mergedConfig.port ?? 'default'} ts=${new Date().toISOString()}`);

initServer(mergedConfig as unknown as ServerOptions);
