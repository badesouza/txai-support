import bcrypt from 'bcrypt';

async function generateHash() {
    const password = '123';
    const saltRounds = 10;
    
    try {
        const hash = await bcrypt.hash(password, saltRounds);
        console.log('Senha criptografada:', hash);
    } catch (error) {
        console.error('Erro ao gerar hash:', error);
    }
}

generateHash(); 