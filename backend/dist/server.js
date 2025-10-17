"use strict";
// backend/src/server.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const client_1 = require("@prisma/client");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const process_1 = __importDefault(require("process"));
const routes_1 = __importDefault(require("./routes"));
const error_middleware_1 = require("./middleware/error.middleware");
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
const port = process_1.default.env.PORT || 3001;
// 1) Configurar CORS para permitir seu front
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:3000',
        'http://31.97.170.240',
        'http://31.97.170.240:3000',
        'http://31.97.170.240:80',
        'http://31.97.170.240:443'
    ],
    credentials: true,
}));
app.use(express_1.default.json());
// Configurar o diretório de uploads
console.log('=== SERVER UPLOADS INFO ===');
console.log('__dirname:', __dirname);
console.log('Caminho atual:', process_1.default.cwd());
const uploadsPath = path_1.default.join(process_1.default.cwd(), 'uploads');
console.log('Caminho da pasta uploads:', uploadsPath);
if (!fs_1.default.existsSync(uploadsPath)) {
    console.log('Criando diretório uploads...');
    fs_1.default.mkdirSync(uploadsPath, { recursive: true });
}
console.log('Configuração do uploads:', {
    __dirname,
    uploadsPath,
    exists: fs_1.default.existsSync(uploadsPath),
    isDirectory: fs_1.default.existsSync(uploadsPath) ? fs_1.default.statSync(uploadsPath).isDirectory() : false,
    permissions: fs_1.default.existsSync(uploadsPath) ? fs_1.default.statSync(uploadsPath).mode : 'N/A',
    files: fs_1.default.existsSync(uploadsPath) ? fs_1.default.readdirSync(uploadsPath) : []
});
// 3) Servir arquivos estáticos de /uploads com melhor tratamento de erros
app.use('/uploads', express_1.default.static(uploadsPath, {
    maxAge: '30d',
    setHeaders(res, filePath) {
        // Permitir CORS também nos assets
        const allowedOrigins = [
            'http://localhost:3000',
            'http://31.97.170.240',
            'http://31.97.170.240:3000',
            'http://31.97.170.240:80',
            'http://31.97.170.240:443'
        ];
        const origin = res.req.headers.origin;
        if (origin && allowedOrigins.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        }
        // Log para debug
        console.log('📁 Servindo arquivo:', filePath);
        console.log('📁 Arquivo existe:', fs_1.default.existsSync(filePath));
        if (fs_1.default.existsSync(filePath)) {
            const stats = fs_1.default.statSync(filePath);
            console.log('📁 Tamanho do arquivo:', stats.size, 'bytes');
            console.log('📁 Permissões:', stats.mode);
        }
    },
}));
// Middleware para log de requisições de imagens
app.use('/uploads', (req, res, next) => {
    console.log('🖼️ Requisição de imagem:', req.url);
    console.log('🖼️ Caminho completo:', path_1.default.join(uploadsPath, req.url));
    console.log('🖼️ Arquivo existe:', fs_1.default.existsSync(path_1.default.join(uploadsPath, req.url)));
    next();
});
// 4) Montar rotas da API
app.use('/api', routes_1.default);
// 5) Middleware de tratamento de erro
app.use(error_middleware_1.errorHandler);
// 6) Conectar ao banco e iniciar o servidor
prisma.$connect()
    .then(() => {
    console.log('✅ Conectado ao banco de dados');
    app.listen(port, () => {
        console.log(`🚀 Server rodando em http://localhost:${port}`);
    });
})
    .catch(err => {
    console.error('❌ Falha ao conectar ao banco:', err);
});
