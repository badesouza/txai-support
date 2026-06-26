CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  phone TEXT NOT NULL,
  profile TEXT NOT NULL DEFAULT 'USER' CHECK (profile IN ('ADMIN', 'USER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);

CREATE TABLE IF NOT EXISTS chamado_locais (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departamentos (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  user_id UUID NOT NULL REFERENCES users (id),
  user_name TEXT,
  user_email TEXT,
  user_phone TEXT,
  chamado_local_id UUID REFERENCES chamado_locais (id),
  chamado_local_name TEXT,
  departamento_id UUID REFERENCES departamentos (id),
  departamento_name TEXT,
  image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  message_count INT NOT NULL DEFAULT 0,
  attachment_count INT NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_preview TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calls_user_id ON calls (user_id);
CREATE INDEX IF NOT EXISTS idx_calls_user_status_created ON calls (user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_chamado_local_id ON calls (chamado_local_id);
CREATE INDEX IF NOT EXISTS idx_calls_departamento_id ON calls (departamento_id);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls (created_at);

CREATE TABLE IF NOT EXISTS call_images (
  id UUID PRIMARY KEY,
  filename TEXT NOT NULL,
  path TEXT NOT NULL,
  call_id UUID NOT NULL REFERENCES calls (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_images_call_id ON call_images (call_id, created_at);

CREATE TABLE IF NOT EXISTS call_messages (
  id UUID PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES calls (id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  source TEXT NOT NULL,
  session_name TEXT,
  direction TEXT NOT NULL,
  sender_phone TEXT,
  sender_name TEXT,
  attachment_id UUID,
  external_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_messages_call_created ON call_messages (call_id, created_at);
CREATE INDEX IF NOT EXISTS idx_call_messages_external ON call_messages (call_id, external_message_id);
CREATE INDEX IF NOT EXISTS idx_call_messages_session ON call_messages (call_id, session_name, created_at);

CREATE TABLE IF NOT EXISTS call_attachments (
  id UUID PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES calls (id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  path TEXT NOT NULL,
  mimetype TEXT NOT NULL,
  size BIGINT,
  source TEXT NOT NULL DEFAULT 'upload',
  session_name TEXT,
  message_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_attachments_call_created ON call_attachments (call_id, created_at);
CREATE INDEX IF NOT EXISTS idx_call_attachments_call_source ON call_attachments (call_id, source, created_at);
CREATE INDEX IF NOT EXISTS idx_call_attachments_message_id ON call_attachments (call_id, message_id);

CREATE TABLE IF NOT EXISTS call_history (
  id UUID PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES calls (id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  user_id UUID NOT NULL REFERENCES users (id),
  user_name TEXT,
  note TEXT,
  old_value TEXT,
  new_value TEXT,
  field TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_history_call_created ON call_history (call_id, created_at);
CREATE INDEX IF NOT EXISTS idx_call_history_call_type ON call_history (call_id, type, created_at);

CREATE TABLE IF NOT EXISTS user_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_tokens_token ON user_tokens (token);
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_created ON user_tokens (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS call_status_history (
  id UUID PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES calls (id) ON DELETE CASCADE,
  old_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users (id),
  user_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_status_history_call ON call_status_history (call_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_status_history_user ON call_status_history (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY,
  call_id UUID REFERENCES calls (id) ON DELETE CASCADE,
  user_id UUID REFERENCES users (id),
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  is_from_user BOOLEAN NOT NULL DEFAULT TRUE,
  media_path TEXT,
  media_filename TEXT,
  media_mimetype TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_call ON whatsapp_messages (call_id, created_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages (phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user ON whatsapp_messages (user_id, created_at DESC);
