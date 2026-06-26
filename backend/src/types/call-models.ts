/**
 * Call Data Models
 *
 * Unified type definitions for call-related entities (messages, attachments,
 * history) persisted in PostgreSQL.
 */

// =============================================================================
// Enums and Types
// =============================================================================

export type CallStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'system';
export type MessageSource = 'whatsapp' | 'web' | 'system';
export type MessageDirection = 'inbound' | 'outbound';
export type AttachmentSource = 'upload' | 'whatsapp';
export type HistoryEntryType = 'status_change' | 'assignment' | 'note' | 'department_change' | 'local_change';
export type HistoryField = 'departamento' | 'chamadoLocal';

// =============================================================================
// Call Document (Enhanced)
// Path: calls/{callId}
// =============================================================================

export interface CallDocument {
  id: string;
  title: string;
  description: string;
  status: CallStatus;
  priority: Priority;
  userId: string;
  
  // Denormalized user data for faster reads
  userName?: string;
  userEmail?: string;
  userPhone?: string;

  // Linked reference entities
  chamadoLocalId?: string;
  chamadoLocalName?: string;
  departamentoId?: string;
  departamentoName?: string;
  
  // Aggregated counts (denormalized for fast list queries)
  messageCount: number;
  attachmentCount: number;
  
  // Last activity summary
  lastActivityAt: Date;
  lastMessagePreview?: string;  // First 100 chars of last message
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CallCreateInput {
  title: string;
  description: string;
  status?: CallStatus;
  priority?: Priority;
  userId: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  chamadoLocalId?: string;
  chamadoLocalName?: string;
  departamentoId?: string;
  departamentoName?: string;
}

export interface CallUpdateInput {
  title?: string;
  description?: string;
  status?: CallStatus;
  priority?: Priority;
  chamadoLocalId?: string;
  chamadoLocalName?: string;
  departamentoId?: string;
  departamentoName?: string;
}

// =============================================================================
// Call Message (Subcollection)
// Path: calls/{callId}/messages/{messageId}
// =============================================================================

export interface CallMessage {
  id: string;
  
  // Message content
  content: string;
  messageType: MessageType;
  
  // Source tracking
  source: MessageSource;
  sessionName?: string;  // WhatsApp session (e.g., "txai-whatsapp", "support")
  
  // Sender info
  direction: MessageDirection;
  senderPhone?: string;
  senderName?: string;
  
  // Media reference (if applicable)
  attachmentId?: string;  // Reference to attachments subcollection
  
  // Original WhatsApp message ID (for deduplication)
  externalMessageId?: string;
  
  createdAt: Date;
}

export interface CallMessageCreateInput {
  content: string;
  messageType?: MessageType;
  source: MessageSource;
  sessionName?: string;
  direction: MessageDirection;
  senderPhone?: string;
  senderName?: string;
  attachmentId?: string;
  externalMessageId?: string;
}

// =============================================================================
// Call Attachment (Unified Subcollection)
// Path: calls/{callId}/attachments/{attachmentId}
// =============================================================================

export interface CallAttachment {
  id: string;
  filename: string;
  path: string;           // GCS path
  mimetype: string;
  size?: number;
  
  // Source tracking
  source: AttachmentSource;
  sessionName?: string;   // If from WhatsApp
  messageId?: string;     // Reference to message (if from WhatsApp)
  
  createdAt: Date;
}

export interface CallAttachmentCreateInput {
  filename: string;
  path: string;
  mimetype: string;
  size?: number;
  source: AttachmentSource;
  sessionName?: string;
  messageId?: string;
}

// =============================================================================
// Call History Entry (Subcollection)
// Path: calls/{callId}/history/{historyId}
// =============================================================================

export interface CallHistoryEntry {
  id: string;
  type: HistoryEntryType;
  
  // For status changes
  oldStatus?: string;
  newStatus?: string;
  
  // Actor
  userId: string;
  userName?: string;
  
  // Optional note/comment
  note?: string;

  // For department/local changes
  oldValue?: string;
  newValue?: string;
  field?: HistoryField;
  
  createdAt: Date;
}

export interface CallHistoryEntryCreateInput {
  type: HistoryEntryType;
  oldStatus?: string;
  newStatus?: string;
  userId: string;
  userName?: string;
  note?: string;
  oldValue?: string;
  newValue?: string;
  field?: HistoryField;
}

// =============================================================================
// API Response Types (for frontend consumption)
// =============================================================================

export interface CallWithDetails extends CallDocument {
  messages?: CallMessage[];
  attachments?: CallAttachment[];
  history?: CallHistoryEntry[];
}

export interface CallListItem {
  id: string;
  title: string;
  description: string;
  status: CallStatus;
  priority: Priority;
  userId: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  chamadoLocalId?: string;
  chamadoLocalName?: string;
  departamentoId?: string;
  departamentoName?: string;
  messageCount: number;
  attachmentCount: number;
  lastActivityAt: Date;
  lastMessagePreview?: string;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Call Subcollection Names (legacy constant, retained for compatibility)
// =============================================================================

export const CallSubcollections = {
  MESSAGES: 'messages',
  ATTACHMENTS: 'attachments',
  HISTORY: 'history',
} as const;

