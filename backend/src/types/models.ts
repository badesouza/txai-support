// =============================================================================
// Data Models for Firestore
// =============================================================================

export type Profile = 'ADMIN' | 'USER';
export type CallStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

// =============================================================================
// User
// =============================================================================

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  profile: Profile;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreateInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  profile: Profile;
}

export interface UserUpdateInput {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  profile?: Profile;
}

// =============================================================================
// Call
// =============================================================================

export interface Call {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  userId: string;
  // Denormalized user data for faster reads
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  // Image URLs (denormalized) - legacy, use attachments subcollection
  imageUrls?: string[];
  
  // Aggregated counts (denormalized for fast list queries)
  messageCount?: number;
  attachmentCount?: number;
  
  // Last activity summary
  lastActivityAt?: Date;
  lastMessagePreview?: string;  // First 100 chars of last message
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CallCreateInput {
  title: string;
  description: string;
  status?: string;
  priority?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
}

export interface CallUpdateInput {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
}

// =============================================================================
// Call Image
// =============================================================================

export interface CallImage {
  id: string;
  filename: string;
  path: string;
  callId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CallImageCreateInput {
  filename: string;
  path: string;
  callId: string;
}

// =============================================================================
// User Token
// =============================================================================

export interface UserToken {
  id: string;
  userId: string;
  token: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserTokenCreateInput {
  userId: string;
  token: string;
}

// =============================================================================
// Call Status History
// =============================================================================

export interface CallStatusHistory {
  id: string;
  callId: string;
  oldStatus: string;
  newStatus: string;
  userId: string;
  userName?: string;
  createdAt: Date;
}

export interface CallStatusHistoryCreateInput {
  callId: string;
  oldStatus: string;
  newStatus: string;
  userId: string;
  userName?: string;
}

// =============================================================================
// WhatsApp Message
// =============================================================================

export interface WhatsAppMessage {
  id: string;
  callId?: string;
  userId?: string;
  phone: string;
  message: string;
  messageType: string;
  isFromUser: boolean;
  // Optional media metadata for image/video messages
  mediaPath?: string;
  mediaFilename?: string;
  mediaMimetype?: string;
  createdAt: Date;
}

export interface WhatsAppMessageCreateInput {
  callId?: string;
  userId?: string;
  phone: string;
  message: string;
  messageType?: string;
  isFromUser?: boolean;
  mediaPath?: string;
  mediaFilename?: string;
  mediaMimetype?: string;
}

// =============================================================================
// Pagination
// =============================================================================

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  lastDoc?: FirebaseFirestore.QueryDocumentSnapshot;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  startAfter?: FirebaseFirestore.QueryDocumentSnapshot;
}

// =============================================================================
// Counter (for pagination totals)
// =============================================================================

export interface Counter {
  id: string;
  count: number;
}

