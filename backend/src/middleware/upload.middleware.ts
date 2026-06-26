import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage/storage';

// Generate unique filename for uploads
const generateFilename = (originalName: string) => {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const dotIndex = originalName.lastIndexOf('.');
  const ext = dotIndex >= 0 ? originalName.slice(dotIndex) : '';
  return `images-${uniqueSuffix}${ext}`;
};

// Use memory storage - files are persisted via the storage layer (local disk)
const multerStorage = multer.memoryStorage();

// Configurar o filtro de arquivos
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Aceitar apenas imagens
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

// Criar o middleware de upload
export const upload = multer({
  storage: multerStorage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB (local/non-prod safe default)
    files: 10 // Até 10 arquivos
  }
}).array('images', 10); // Usar array ao invés de fields

// Middleware para processar os arquivos após o upload
// All files are persisted via the storage layer (local disk)
export const processUploadedFiles = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.files || !Array.isArray(req.files)) {
    return next();
  }

  try {
    // Persist all files via the storage layer
    await Promise.all(
      req.files.map(async (file: Express.Multer.File) => {
        if (!file.buffer) {
          throw new Error('File buffer not found for upload');
        }
        
        const filename = generateFilename(file.originalname);
        const { relativePath } = await storage.saveBuffer({
          buffer: file.buffer as Buffer,
          filename,
          contentType: file.mimetype,
        });
        
        file.filename = filename;
        file.path = relativePath;
      })
    );
    
    next();
  } catch (error) {
    console.error('Error saving uploaded file:', error);
    next(error);
  }
};
