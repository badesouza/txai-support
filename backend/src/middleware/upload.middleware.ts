import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage/storage';

// Garantir que o diretório de uploads existe (na raiz do backend)
const uploadDir = storage.uploadsDir;

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configurar o armazenamento
const generateFilename = (originalName: string) => {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const ext = path.extname(originalName);
  return `images-${uniqueSuffix}${ext}`;
};

const multerStorage = storage.driver === 'gcs'
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const filename = generateFilename(file.originalname);
        cb(null, filename);
      }
    });

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
export const processUploadedFiles = (req: Request, res: Response, next: NextFunction) => {
  if (!req.files || !Array.isArray(req.files)) {
    return next();
  }

  // Atualizar os caminhos dos arquivos para serem relativos à pasta uploads
  req.files = req.files.map(file => {
    if (storage.driver === 'gcs') {
      const filename = generateFilename(file.originalname);
      return {
        ...file,
        filename,
        path: filename,
      };
    }
    
    // Extrair apenas o nome do arquivo do caminho completo
    const filename = path.basename(file.path);
    const filePath = path.join(uploadDir, filename);
    
    // Garantir que o caminho seja consistente
    const relativePath = `/uploads/${filename}`;

    // Verificar se o arquivo existe e tem as permissões corretas
    if (!fs.existsSync(filePath)) {
      console.error('Arquivo não encontrado após upload:', filePath);
      throw new Error('Arquivo não encontrado após upload');
    }

    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      console.error('Caminho não é um arquivo:', filePath);
      throw new Error('Caminho não é um arquivo');
    }

    return {
      ...file,
      path: relativePath // Caminho relativo consistente
    };
  });

  if (storage.driver === 'gcs') {
    Promise.all(
      req.files.map(async (file: Express.Multer.File) => {
        if (!file.buffer) {
          throw new Error('Arquivo em memória não encontrado para upload no GCS');
        }
        const { relativePath } = await storage.saveBuffer({
          buffer: file.buffer as Buffer,
          filename: file.filename,
          contentType: file.mimetype,
        });
        file.path = relativePath;
      })
    )
      .then(() => next())
      .catch((error) => {
        console.error('Erro ao enviar arquivo para GCS:', error);
        next(error);
      });
    return;
  }

  next();
};
