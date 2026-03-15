interface CallAttachment {
  id: string;
  filename: string;
  path: string;
  url?: string;
  mimetype: string;
  source: 'upload' | 'whatsapp';
}

interface CallAttachmentGridProps {
  attachments: CallAttachment[];
  onRemove: (attachmentId: string) => void;
}

export default function CallAttachmentGrid({ attachments, onRemove }: CallAttachmentGridProps) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Anexos existentes ({attachments.length})
      </h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {attachments.map((attachment) => {
          const attachmentUrl = attachment.url || attachment.path;
          const isVideo = attachment.mimetype?.startsWith('video/');
          const isImage = attachment.mimetype?.startsWith('image/');
          const sourceLabel = attachment.source === 'whatsapp' ? 'WhatsApp' : 'Upload';
          const sourceClassName =
            attachment.source === 'whatsapp' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white';

          return (
            <div key={attachment.id} className="relative group">
              {isImage ? (
                <img
                  src={attachmentUrl}
                  alt={attachment.filename}
                  className="h-24 w-24 object-cover rounded-lg"
                />
              ) : isVideo ? (
                <div className="h-24 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                  <video src={attachmentUrl} className="h-24 w-24 object-cover rounded-lg" preload="metadata" />
                </div>
              ) : (
                <div className="h-24 w-24 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <span className="text-xs text-gray-500 text-center px-1">{attachment.filename}</span>
                </div>
              )}
              <span className={`absolute bottom-1 left-1 text-[10px] px-1 py-0.5 rounded ${sourceClassName}`}>
                {sourceLabel}
              </span>
              <button
                type="button"
                onClick={() => onRemove(attachment.id)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
