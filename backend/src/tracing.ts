// =============================================================================
// OpenTelemetry Tracing Configuration for Honeycomb
// =============================================================================
// This file MUST be imported FIRST in server.ts before any other imports
// It initializes distributed tracing, metrics, and observability for the app
// =============================================================================

// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
import type { IncomingMessage } from 'http';

// =============================================================================
// Configuration
// =============================================================================

const isTelemetryEnabled = process.env.ENABLE_TELEMETRY !== 'false';
const hasApiKey = process.env.OTEL_EXPORTER_OTLP_HEADERS?.includes('x-honeycomb-team=');

if (!isTelemetryEnabled) {
  console.log('⚠️  OpenTelemetry disabled: ENABLE_TELEMETRY=false');
} else if (!hasApiKey) {
  console.log('⚠️  OpenTelemetry disabled: missing Honeycomb API key in OTEL_EXPORTER_OTLP_HEADERS');
}

// =============================================================================
// Resource Configuration
// =============================================================================

const resource = resourceFromAttributes({
  [SEMRESATTRS_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'txai-support-backend',
  [SEMRESATTRS_SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION || '1.0.0',
  [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
});

// =============================================================================
// Parse Headers from Environment Variable
// =============================================================================

function parseHeaders(headersString: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (!headersString) return headers;

  headersString.split(',').forEach((pair) => {
    const [key, value] = pair.split('=').map((s) => s.trim());
    if (key && value) {
      headers[key] = value;
    }
  });

  return headers;
}

// =============================================================================
// Trace Exporter Configuration
// =============================================================================

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    ? `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`
    : 'https://api.honeycomb.io/v1/traces',
  headers: parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS || ''),
});

// =============================================================================
// SDK Initialization
// =============================================================================

const sdk = new NodeSDK({
  resource,

  // Batch span processor for efficient export
  spanProcessor: new BatchSpanProcessor(traceExporter, {
    maxQueueSize: 500,
    scheduledDelayMillis: 5000, // Export every 5 seconds
    maxExportBatchSize: 200,
  }),

  // Auto-instrumentation for popular libraries
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable file system instrumentation (too noisy)
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },

      // Configure HTTP instrumentation
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        // Ignore health check endpoints to reduce noise
        ignoreIncomingRequestHook: (req) => {
          const ignorePatterns = ['/health', '/healthz', '/api/health'];
          return ignorePatterns.some((pattern) => req.url?.includes(pattern)) || false;
        },
        // Add custom attributes to HTTP spans
        requestHook: (span, request) => {
          // Type guard: only IncomingMessage has headers property
          if ('headers' in request) {
            span.setAttribute('http.request.id', request.headers['x-request-id'] || '');
            span.setAttribute('http.user_agent', request.headers['user-agent'] || '');
          }
        },
      },

      // Express instrumentation
      '@opentelemetry/instrumentation-express': {
        enabled: true,
      },

      // DNS instrumentation (disabled - can be noisy)
      '@opentelemetry/instrumentation-dns': {
        enabled: false,
      },
    }),
  ],
});

// =============================================================================
// Start SDK
// =============================================================================

if (isTelemetryEnabled && hasApiKey) {
  try {
    sdk.start();
    console.log('✅ OpenTelemetry initialized and exporting to Honeycomb');
    console.log(`📊 Service: ${resource.attributes[SEMRESATTRS_SERVICE_NAME]}`);
    console.log(`🌍 Environment: ${resource.attributes[SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]}`);
    console.log(`📡 Endpoint: ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'https://api.honeycomb.io'}`);
  } catch (error) {
    console.error('❌ Error initializing OpenTelemetry:', error);
  }

  // Gracefully shutdown on process termination
  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => console.log('OpenTelemetry SDK shut down successfully'))
      .catch((error: Error) => console.error('Error shutting down OpenTelemetry SDK', error))
      .finally(() => process.exit(0));
  });
}

export default sdk;
