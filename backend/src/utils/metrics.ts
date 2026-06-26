// =============================================================================
// Custom Metrics for Business KPIs
// =============================================================================
// Define and export custom metrics to track business-level events
// Metrics appear in Honeycomb alongside traces
// =============================================================================

import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('txai-support', '1.0.0');

// =============================================================================
// Ticket Metrics
// =============================================================================

/**
 * Counter: Total tickets created
 */
export const ticketsCreatedCounter = meter.createCounter('tickets.created', {
  description: 'Total number of tickets created',
  unit: '1',
});

/**
 * Histogram: Ticket resolution time in milliseconds
 */
export const ticketResolutionTime = meter.createHistogram('tickets.resolution_time', {
  description: 'Time taken to resolve tickets',
  unit: 'ms',
});

/**
 * UpDownCounter: Active (open) tickets
 */
export const activeTicketsCounter = meter.createUpDownCounter('tickets.active', {
  description: 'Number of currently active tickets',
  unit: '1',
});

// =============================================================================
// WhatsApp/WPPConnect Metrics
// =============================================================================

/**
 * UpDownCounter: Active WhatsApp sessions
 */
export const activeWhatsAppSessions = meter.createUpDownCounter('whatsapp.active_sessions', {
  description: 'Number of active WhatsApp sessions',
  unit: '1',
});

/**
 * Counter: WhatsApp messages sent
 */
export const whatsappMessagesSent = meter.createCounter('whatsapp.messages.sent', {
  description: 'Total WhatsApp messages sent',
  unit: '1',
});

/**
 * Counter: WhatsApp messages received
 */
export const whatsappMessagesReceived = meter.createCounter('whatsapp.messages.received', {
  description: 'Total WhatsApp messages received',
  unit: '1',
});

/**
 * Histogram: WhatsApp message processing time
 */
export const whatsappMessageProcessingTime = meter.createHistogram('whatsapp.message.processing_time', {
  description: 'Time taken to process a WhatsApp message',
  unit: 'ms',
});

// =============================================================================
// User Metrics
// =============================================================================

/**
 * Counter: User registrations
 */
export const userRegistrationsCounter = meter.createCounter('users.registrations', {
  description: 'Total user registrations',
  unit: '1',
});

/**
 * Counter: User logins
 */
export const userLoginsCounter = meter.createCounter('users.logins', {
  description: 'Total user logins',
  unit: '1',
});

// =============================================================================
// API Metrics
// =============================================================================

/**
 * Histogram: API request duration
 * Note: HTTP instrumentation already tracks this, but you can add custom dimensions
 */
export const apiRequestDuration = meter.createHistogram('api.request.duration', {
  description: 'API request duration',
  unit: 'ms',
});

/**
 * Counter: API errors
 */
export const apiErrorsCounter = meter.createCounter('api.errors', {
  description: 'Total API errors',
  unit: '1',
});

// =============================================================================
// Storage Metrics
// =============================================================================

/**
 * Counter: Files uploaded
 */
export const filesUploadedCounter = meter.createCounter('storage.files.uploaded', {
  description: 'Total files uploaded to storage',
  unit: '1',
});

/**
 * Histogram: File upload size in bytes
 */
export const fileUploadSize = meter.createHistogram('storage.files.upload_size', {
  description: 'Size of uploaded files',
  unit: 'bytes',
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Record a ticket creation event
 */
export function recordTicketCreated(attributes: { priority?: string; category?: string } = {}) {
  ticketsCreatedCounter.add(1, attributes);
  activeTicketsCounter.add(1, attributes);
}

/**
 * Record a ticket resolution event
 */
export function recordTicketResolved(
  resolutionTimeMs: number,
  attributes: { priority?: string; category?: string } = {}
) {
  ticketResolutionTime.record(resolutionTimeMs, attributes);
  activeTicketsCounter.add(-1, attributes);
}

/**
 * Record a WhatsApp session start
 */
export function recordWhatsAppSessionStart(attributes: { session_id?: string } = {}) {
  activeWhatsAppSessions.add(1, attributes);
}

/**
 * Record a WhatsApp session end
 */
export function recordWhatsAppSessionEnd(attributes: { session_id?: string } = {}) {
  activeWhatsAppSessions.add(-1, attributes);
}

/**
 * Record a WhatsApp message event
 */
export function recordWhatsAppMessage(
  direction: 'sent' | 'received',
  processingTimeMs: number,
  attributes: { message_type?: string } = {}
) {
  if (direction === 'sent') {
    whatsappMessagesSent.add(1, attributes);
  } else {
    whatsappMessagesReceived.add(1, attributes);
  }
  whatsappMessageProcessingTime.record(processingTimeMs, attributes);
}

/**
 * Record a file upload event
 */
export function recordFileUpload(sizeBytes: number, attributes: { file_type?: string } = {}) {
  filesUploadedCounter.add(1, attributes);
  fileUploadSize.record(sizeBytes, attributes);
}

/**
 * Record an API error
 */
export function recordAPIError(attributes: {
  error_type?: string;
  endpoint?: string;
  status_code?: number;
} = {}) {
  apiErrorsCounter.add(1, attributes);
}
