const fs = require('fs');
const path = require('path');

console.log('=== TESTE DE IMAGENS ===');

// Verificar se a pasta uploads existe
const uploadsPath = path.join(__dirname, 'backend', 'uploads');
console.log('📁 Caminho da pasta uploads:', uploadsPath);

if (!fs.existsSync(uploadsPath)) {
    console.log('❌ Pasta uploads não encontrada');
    process.exit(1);
}

// Listar arquivos na pasta uploads
const files = fs.readdirSync(uploadsPath);
console.log('📁 Arquivos encontrados:', files.length);

if (files.length === 0) {
    console.log('⚠️ Nenhum arquivo encontrado na pasta uploads');
} else {
    console.log('📁 Lista de arquivos:');
    files.forEach((file, index) => {
        const filePath = path.join(uploadsPath, file);
        const stats = fs.statSync(filePath);
        console.log(`  ${index + 1}. ${file} (${stats.size} bytes)`);
    });
}

// Testar URLs de imagens
const testUrls = [
    'http://localhost:3001/uploads/test.jpg',
    'http://31.97.170.240/uploads/test.jpg'
];

console.log('\n🔗 URLs de teste:');
testUrls.forEach(url => {
    console.log(`  - ${url}`);
});

console.log('\n✅ Teste concluído. Verifique se os arquivos existem e têm permissões corretas.'); 