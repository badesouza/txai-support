# Testes

Backend usa Jest (unit + integration). Frontend usa as ferramentas do CRA.

## Backend
```bash
cd backend
npm test
npm run test:watch
npm run test:coverage
npm run test:integration
```

## Frontend
```bash
cd frontend
npm test
npm run test:coverage
npm run test:ci
```

## Notas de CI
Hoje existem scripts PowerShell em `scripts/`.
Para CI em Linux/macOS adicionaremos versões `.sh` quando a pipeline for ligada.
