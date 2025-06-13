import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import process from 'process';

// Garantir que o diretório de uploads existe (na raiz do backend)
console.log('=== DIRNAME INFO ===');
console.log('__dirname:', __dirname);
console.log('Caminho atual:', process.cwd());

const uploadDir = path.join(process.cwd(), 'uploads');
console.log('Caminho da pasta uploads:', uploadDir);

if (!fs.existsSync(uploadDir)) {
  console.log('Criando diretório uploads...');
  fs.mkdirSync(uploadDir, { recursive: true });
}

console.log('Configuração do upload:', {
  __dirname,
  uploadDir,
  exists: fs.existsSync(uploadDir),
  isDirectory: fs.existsSync(uploadDir) ? fs.statSync(uploadDir).isDirectory() : false,
  permissions: fs.existsSync(uploadDir) ? fs.statSync(uploadDir).mode : 'N/A',
  files: fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : []
});

// Configurar o armazenamento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('=== MULTER STORAGE ===');
    console.log('Tentando salvar arquivo em:', uploadDir);
    console.log('Arquivo recebido:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Gerar nome único para o arquivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = `images-${uniqueSuffix}${ext}`;
    console.log('Nome do arquivo gerado:', filename);
    cb(null, filename);
  }
});

// Configurar o filtro de arquivos
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  console.log('=== MULTER FILTER ===');
  console.log('Verificando arquivo:', {
    originalname: file.originalname,
    mimetype: file.mimetype
  });
  // Aceitar apenas imagens
  if (file.mimetype.startsWith('image/')) {
    console.log('Arquivo aceito');
    cb(null, true);
  } else {
    console.log('Arquivo rejeitado - não é uma imagem');
    cb(new Error('Only image files are allowed'));
  }
};

// Criar o middleware de upload
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB
    files: 10 // Até 10 arquivos
  }
}).array('images', 10); // Usar array ao invés de fields

// Middleware para processar os arquivos após o upload
export const processUploadedFiles = (req: Request, res: Response, next: NextFunction) => {
  console.log('=== PROCESSING FILES ===');
  console.log('Request files:', req.files);
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);

  if (!req.files || !Array.isArray(req.files)) {
    console.log('Nenhum arquivo encontrado na requisição');
    return next();
  }

  // Atualizar os caminhos dos arquivos para serem relativos à pasta uploads
  req.files = req.files.map(file => {
    console.log('=== PROCESSING FILE ===');
    console.log('Arquivo original:', file);
    
    // Extrair apenas o nome do arquivo do caminho completo
    const filename = path.basename(file.path);
    const filePath = path.join(uploadDir, filename);
    
    // Garantir que o caminho seja consistente
    const relativePath = `/uploads/${filename}`;
    
    console.log('Detalhes do processamento:', {
      originalPath: file.path,
      filename: filename,
      filePath: filePath,
      relativePath: relativePath,
      exists: fs.existsSync(filePath),
      isFile: fs.existsSync(filePath) ? fs.statSync(filePath).isFile() : false,
      permissions: fs.existsSync(filePath) ? fs.statSync(filePath).mode : 'N/A',
      size: fs.existsSync(filePath) ? fs.statSync(filePath).size : 'N/A'
    });

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

  next();
}; 