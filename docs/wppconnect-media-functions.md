# Funções para Obter Imagem e Vídeo do WPPConnect

Este documento lista todas as funções usadas no projeto para baixar e processar imagens e vídeos do WPPConnect.

## 1. Função Principal: `getMediaByMessageId`

**Localização:** `backend/src/services/whatsapp/wppconnect-server.service.ts`

**Descrição:** Função privada que faz a requisição ao WPPConnect-Server para obter a mídia (imagem ou vídeo) pelo ID da mensagem.

```437:461:backend/src/services/whatsapp/wppconnect-server.service.ts
  private async getMediaByMessageId(messageId: string): Promise<{ base64?: string; mimetype?: string } | null> {
    await this.initialize();

    const payload = await this.requestJson(`/api/${encodeURIComponent(this.session)}/get-media-by-message/${encodeURIComponent(messageId)}`, {
      method: 'GET',
      auth: true,
    });

    if (typeof payload === 'string') return { base64: payload };
    if (!isRecord(payload)) return null;

    // Many versions respond with { base64, mimetype } or wrap inside response
    const base64 = typeof payload['base64'] === 'string' ? payload['base64'] : undefined;
    const mimetype = typeof payload['mimetype'] === 'string' ? payload['mimetype'] : undefined;
    if (base64) return { base64, mimetype };

    const response = payload['response'];
    if (isRecord(response)) {
      const b = typeof response['base64'] === 'string' ? response['base64'] : undefined;
      const m = typeof response['mimetype'] === 'string' ? response['mimetype'] : undefined;
      if (b) return { base64: b, mimetype: m };
    }

    return null;
  }
```

**Endpoint WPPConnect usado:**

- `GET /api/{session}/get-media-by-message/{messageId}`

**Retorno:**

- `{ base64?: string; mimetype?: string } | null`

---

## 2. Função de Download e Salvamento: `downloadAndSaveMedia`

**Localização:** `backend/src/services/whatsapp/whatsapp-message-processor.ts`

**Descrição:** Função privada que baixa a mídia usando o ID da mensagem, converte de base64 para Buffer e salva no storage (GCS).

```214:270:backend/src/services/whatsapp/whatsapp-message-processor.ts
  private async downloadAndSaveMedia(
    message: WhatsAppMessage,
    callId: string,
    kind: 'image' | 'video'
  ): Promise<{ relativePath: string; filename: string; mimetype: string } | null> {
    try {
      const messageId = typeof message.id === 'string' ? message.id : undefined;
      if (!messageId) {
        console.log(`⚠️ ${kind} message missing id; cannot download media`);
        return null;
      }

      let mediaData: Buffer | undefined;
      let mimetype: string | undefined = typeof message.mimetype === 'string' ? message.mimetype : undefined;

      const downloadedMedia = await this.deps.downloadMediaByMessageId(messageId);
      if (downloadedMedia?.base64) {
        let base64Data = downloadedMedia.base64;
        if (base64Data.includes(',')) {
          base64Data = base64Data.split(',')[1] ?? '';
        }
        base64Data = base64Data.trim().replace(/\s/g, '');
        mediaData = Buffer.from(base64Data, 'base64');
        mimetype = downloadedMedia.mimetype || mimetype;
      } else if (typeof message.body === 'string' && message.body.trim().length > 0) {
        // Fallback: sometimes the payload includes base64 in body
        const cleanedBody = message.body.trim().replace(/\s/g, '');
        mediaData = Buffer.from(cleanedBody, 'base64');
      }

      if (!mediaData || mediaData.length === 0) {
        console.log(`⚠️ ${kind} data is empty or invalid`);
        return null;
      }

      const timestamp = Date.now();
      const extension = this.getMediaExtension(mimetype || (kind === 'video' ? 'video/mp4' : 'image/jpeg'));
      const filename = `whatsapp-${timestamp}.${extension}`;

      const { relativePath } = await storage.saveBuffer({
        buffer: mediaData,
        filename,
        contentType: mimetype || (kind === 'video' ? 'video/mp4' : 'image/jpeg'),
      });

      console.log(`✅ ${kind} saved:`, filename);
      return {
        relativePath,
        filename,
        mimetype: mimetype || (kind === 'video' ? 'video/mp4' : 'image/jpeg'),
      };
    } catch (error) {
      console.error(`❌ Error downloading and saving ${kind}:`, error);
      return null;
    }
  }
```

**Parâmetros:**

- `message: WhatsAppMessage` - Objeto da mensagem do WhatsApp
- `callId: string` - ID do chamado ao qual a mídia será vinculada
- `kind: 'image' | 'video'` - Tipo de mídia

**Retorno:**

- `{ relativePath: string; filename: string; mimetype: string } | null`

**Fluxo:**

1. Extrai o `messageId` da mensagem
2. Chama `downloadMediaByMessageId` (que usa `getMediaByMessageId` do WPPConnect)
3. Converte o base64 para Buffer
4. Gera um nome de arquivo único com timestamp
5. Salva no storage usando `storage.saveBuffer()`
6. Retorna informações do arquivo salvo

---

## 3. Função de Processamento de Imagem: `handleImageMessage`

**Localização:** `backend/src/services/whatsapp/whatsapp-message-processor.ts`

**Descrição:** Processa mensagens de imagem recebidas via WhatsApp, baixa a mídia e vincula ao chamado ativo do usuário.

```126:176:backend/src/services/whatsapp/whatsapp-message-processor.ts
  /** Handle image messages and link the image to the user's last active call. */
  private async handleImageMessage(phone: string, userExists: boolean, userId?: string, message?: WhatsAppMessage): Promise<void> {
    try {
      console.log('🖼️ [handleImageMessage] Processing image message:');
      console.log(`   - Phone: ${phone}`);
      console.log(`   - User exists: ${userExists}`);
      console.log(`   - User ID: ${userId}`);
      console.log(`   - Message ID: ${message?.id}`);

      if (!userExists || !userId || !message) {
        console.log('ℹ️ Image ignored: user not registered or invalid message.');
        return;
      }

      const lastCall = await CallRepository.findActiveCallForUser(userId);
      if (!lastCall) {
        console.log('❌ No active call found for user');
        return;
      }
      console.log(`   - Found active call: ${lastCall.id} (${lastCall.title})`);

      const saved = await this.downloadAndSaveMedia(message, lastCall.id, 'image');
      console.log(`   - Media saved result:`, saved);

      // Create attachment and message in subcollections
      let attachmentId: string | undefined;
      if (saved) {
        attachmentId = await this.createAttachmentInSubcollection(lastCall.id, saved, 'image');
        console.log(`   - Created attachment in subcollection: ${attachmentId}`);
      } else {
        console.log(`   ⚠️ No media saved - attachment will be empty`);
      }

      const messageDoc = await CallMessageRepository.create(lastCall.id, {
        content: '[Imagem]',
        messageType: 'image',
        source: 'whatsapp',
        sessionName: this.sessionName,
        direction: 'inbound',
        senderPhone: phone,
        attachmentId,
        externalMessageId: typeof message.id === 'string' ? message.id : undefined,
      });
      console.log(`   - Created message in subcollection: ${messageDoc.id}`);

      await CallRepository.incrementMessageCount(lastCall.id, '[Imagem]');
      console.log('✅ Image processed and linked to call:', lastCall.id);
    } catch (error) {
      console.error('❌ Error handling image message:', error);
    }
  }
```

**Fluxo:**

1. Valida se o usuário existe e a mensagem é válida
2. Busca o chamado ativo do usuário
3. Chama `downloadAndSaveMedia` para baixar e salvar a imagem
4. Cria um attachment na subcollection do chamado
5. Cria uma mensagem na subcollection com referência ao attachment
6. Incrementa o contador de mensagens do chamado

---

## 4. Função de Processamento de Vídeo: `handleVideoMessage`

**Localização:** `backend/src/services/whatsapp/whatsapp-message-processor.ts`

**Descrição:** Processa mensagens de vídeo recebidas via WhatsApp, baixa a mídia e vincula ao chamado ativo do usuário.

```178:212:backend/src/services/whatsapp/whatsapp-message-processor.ts
  /** Handle video messages and link the video to the user's last active call. */
  private async handleVideoMessage(phone: string, userExists: boolean, userId?: string, message?: WhatsAppMessage): Promise<void> {
    try {
      if (!userExists || !userId || !message) {
        console.log('ℹ️ Video ignored: user not registered or invalid message.');
        return;
      }

      const lastCall = await CallRepository.findActiveCallForUser(userId);
      if (!lastCall) {
        console.log('❌ No active call found for user');
        return;
      }

      const saved = await this.downloadAndSaveMedia(message, lastCall.id, 'video');

      // Create attachment and message in subcollections
      const attachmentId = saved ? await this.createAttachmentInSubcollection(lastCall.id, saved, 'video') : undefined;
      await CallMessageRepository.create(lastCall.id, {
        content: '[Vídeo]',
        messageType: 'video',
        source: 'whatsapp',
        sessionName: this.sessionName,
        direction: 'inbound',
        senderPhone: phone,
        attachmentId,
        externalMessageId: typeof message.id === 'string' ? message.id : undefined,
      });
      await CallRepository.incrementMessageCount(lastCall.id, '[Vídeo]');

      console.log('✅ Video processed and linked to call:', lastCall.id);
    } catch (error) {
      console.error('❌ Error handling video message:', error);
    }
  }
```

**Fluxo:**

1. Valida se o usuário existe e a mensagem é válida
2. Busca o chamado ativo do usuário
3. Chama `downloadAndSaveMedia` para baixar e salvar o vídeo
4. Cria um attachment na subcollection do chamado
5. Cria uma mensagem na subcollection com referência ao attachment
6. Incrementa o contador de mensagens do chamado

---

## 5. Função Auxiliar: `getMediaExtension`

**Localização:** `backend/src/services/whatsapp/whatsapp-message-processor.ts`

**Descrição:** Retorna a extensão de arquivo apropriada baseada no mimetype.

```272:288:backend/src/services/whatsapp/whatsapp-message-processor.ts
  /** Return a safe file extension for a given mimetype (image/video). */
  private getMediaExtension(mimetype: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'video/webm': 'webm',
      'video/3gpp': '3gp',
    };
    if (extensions[mimetype]) return extensions[mimetype];
    if (mimetype.startsWith('video/')) return 'mp4';
    return 'jpg';
  }
```

**Mimetypes suportados:**

- **Imagens:** `image/jpeg`, `image/jpg`, `image/png`, `image/gif`, `image/webp`
- **Vídeos:** `video/mp4`, `video/quicktime`, `video/webm`, `video/3gpp`

---

## 6. Injeção de Dependência: `downloadMediaByMessageId`

**Localização:** `backend/src/services/whatsapp/wppconnect-server.service.ts`

**Descrição:** Esta função é injetada como dependência no `WhatsAppMessageProcessor` através do construtor.

```98:101:backend/src/services/whatsapp/wppconnect-server.service.ts
    this.processor = new WhatsAppMessageProcessor({
      downloadMediaByMessageId: async (messageId) => this.getMediaByMessageId(messageId),
      sendText: async (phone, message) => this.sendMessage(phone, message),
    });
```

**Interface:**

```10:13:backend/src/services/whatsapp/whatsapp-message-processor.ts
interface MediaDownloadResult {
  base64?: string;
  mimetype?: string;
}
```

```15:17:backend/src/services/whatsapp/whatsapp-message-processor.ts
interface WhatsAppMessageProcessorDeps {
  downloadMediaByMessageId: (messageId: string) => Promise<MediaDownloadResult | null>;
  sendText: (phone: string, message: string) => Promise<void>;
  sessionName?: string;
}
```

---

## 7. Roteamento de Mensagens: `processMessage`

**Localização:** `backend/src/services/whatsapp/whatsapp-message-processor.ts`

**Descrição:** Roteia mensagens recebidas para os handlers apropriados baseado no tipo.

```61:94:backend/src/services/whatsapp/whatsapp-message-processor.ts
  /** Process a message by type and route it to the correct handler. */
  private async processMessage(message: WhatsAppMessage, userExists: boolean, userId?: string): Promise<void> {
    try {
      const phone = message.from.replace('@c.us', '');

      switch (message.type) {
        case 'text':
        case 'chat':
          await this.handleTextMessage(phone, String(message.body ?? ''), userExists, userId);
          return;
        case 'image':
          await this.handleImageMessage(phone, userExists, userId, message);
          return;
        case 'video':
          await this.handleVideoMessage(phone, userExists, userId, message);
          return;
        case 'document': {
          const mimetype = typeof message.mimetype === 'string' ? message.mimetype : undefined;
          const isImageDocument = mimetype?.startsWith('image/');
          const isVideoDocument = mimetype?.startsWith('video/');
          if (isImageDocument) {
            await this.handleImageMessage(phone, userExists, userId, message);
          } else if (isVideoDocument) {
            await this.handleVideoMessage(phone, userExists, userId, message);
          }
          return;
        }
        default:
          await this.handleTextMessage(phone, String(message.body ?? ''), userExists, userId);
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
    }
  }
```

**Tipos de mensagem suportados:**

- `image` → `handleImageMessage`
- `video` → `handleVideoMessage`
- `document` → Verifica o mimetype e roteia para `handleImageMessage` ou `handleVideoMessage`

---

## Fluxo Completo de Download de Mídia

```
1. Webhook recebe mensagem do WPPConnect
   ↓
2. WhatsAppMessageProcessor.handleIncomingMessage()
   ↓
3. processMessage() roteia por tipo (image/video)
   ↓
4. handleImageMessage() ou handleVideoMessage()
   ↓
5. downloadAndSaveMedia()
   ↓
6. downloadMediaByMessageId() (injeção de dependência)
   ↓
7. WPPConnectServerService.getMediaByMessageId()
   ↓
8. Requisição HTTP GET para WPPConnect-Server:
   /api/{session}/get-media-by-message/{messageId}
   ↓
9. Retorna { base64, mimetype }
   ↓
10. Converte base64 → Buffer
   ↓
11. storage.saveBuffer() salva no GCS
   ↓
12. Cria attachment na subcollection
   ↓
13. Cria mensagem na subcollection com referência ao attachment
```

---

## Endpoints WPPConnect Utilizados

### GET `/api/{session}/get-media-by-message/{messageId}`

**Autenticação:** Bearer Token (gerado via `/api/{session}/{secretKey}/generate-token`)

**Resposta esperada:**

```json
{
  "base64": "iVBORw0KGgoAAAANSUhEUgAA...",
  "mimetype": "image/jpeg"
}
```

**Ou:**

```json
{
  "response": {
    "base64": "iVBORw0KGgoAAAANSUhEUgAA...",
    "mimetype": "image/jpeg"
  }
}
```

**Ou apenas string base64:**

```
"iVBORw0KGgoAAAANSUhEUgAA..."
```

---

## Observações Importantes

1. **Autenticação:** Todas as requisições ao WPPConnect-Server requerem um token Bearer gerado dinamicamente.

2. **Formato Base64:** O WPPConnect pode retornar base64 puro ou com prefixo `data:image/...;base64,`. A função `downloadAndSaveMedia` trata ambos os casos.

3. **Fallback:** Se `downloadMediaByMessageId` falhar, tenta usar `message.body` como base64 (caso o webhook já inclua os dados).

4. **Storage:** As mídias são salvas no Google Cloud Storage (GCS) através do serviço `storage.saveBuffer()`.

5. **Vinculação:** Todas as mídias são vinculadas a um chamado ativo do usuário. Se não houver chamado ativo, a mídia não é processada.

6. **Extensões:** A função `getMediaExtension` garante que sempre haverá uma extensão válida, mesmo se o mimetype não for reconhecido.
