import bcrypt from 'bcrypt';

async function generateHash() {
    const password = '1';
    const saltRounds = 10;
    
    try {
        const hash = await bcrypt.hash(password, saltRounds);
        console.log('Senha:', password);
        console.log('Hash gerado:', hash);
        
        // Verificar se o hash funciona
        const isValid = await bcrypt.compare(password, hash);
        console.log('Hash é válido?', isValid);
        
        // Verificar novamente com a senha original
        const isValid2 = await bcrypt.compare('1', hash);
        console.log('Hash é válido com senha original?', isValid2);
    } catch (error) {
        console.error('Erro:', error);
    }
}

generateHash(); 