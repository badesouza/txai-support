import bcrypt from 'bcrypt';

async function testPassword() {
    const password = '123';
    const saltRounds = 10;
    
    try {
        // Gerar o hash
        const hash = await bcrypt.hash(password, saltRounds);
        console.log('Hash gerado:', hash);
        
        // Verificar se o hash funciona
        const isValid = await bcrypt.compare(password, hash);
        console.log('Hash é válido?', isValid);
        
        // Testar com o hash que você colocou no banco
        const storedHash = '$2b$10$3euPcmQFCiblsZeEu5s7p.9BUe7QzQxQxQxQxQxQxQxQxQxQxQxQx';
        const isValidStored = await bcrypt.compare(password, storedHash);
        console.log('Hash armazenado é válido?', isValidStored);
    } catch (error) {
        console.error('Erro:', error);
    }
}

testPassword(); 