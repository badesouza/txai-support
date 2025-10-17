# 🧪 Guia de Testes - TXAI Support

Este documento descreve como executar e entender os testes unitários do projeto TXAI Support.

## 📋 Índice

- [Estrutura de Testes](#estrutura-de-testes)
- [Testes Unitários](#testes-unitários)
- [Testes de Integração](#testes-de-integração)
- [Executando Testes](#executando-testes)
- [Relatórios de Cobertura](#relatórios-de-cobertura)
- [Configuração CI/CD](#configuração-cicd)

## 🏗️ Estrutura de Testes

```
├── backend/
│   ├── tests/
│   │   ├── setup.ts                 # Configuração global dos testes
│   │   ├── unit/
│   │   │   └── services/            # Testes unitários dos serviços
│   │   └── integration/
│   │       └── controllers/         # Testes de integração dos controllers
│   └── jest.config.js              # Configuração do Jest
├── frontend/
│   ├── src/
│   │   ├── components/__tests__/    # Testes unitários dos componentes
│   │   └── setupTests.ts           # Configuração dos testes do React
└── scripts/
    ├── test-backend.ps1            # Script para testar backend
    ├── test-frontend.ps1           # Script para testar frontend
    └── test-all.ps1               # Script para todos os testes
```

## 🔬 Testes Unitários

### Backend

Os testes unitários do backend focam em testar serviços isoladamente, usando mocks para dependências externas.

**Exemplos:**

- `UserService.test.ts` - Testa operações CRUD de usuários
- `WhatsAppService.test.ts` - Testa funcionalidades do WhatsApp

**Características:**

- ✅ Testam lógica de negócio isoladamente
- ✅ Usam mocks para Prisma e dependências externas
- ✅ Executam rapidamente
- ✅ São determinísticos

### Frontend

Os testes unitários do frontend testam componentes React isoladamente.

**Exemplos:**

- `WhatsAppConnection.test.tsx` - Testa componente de conexão WhatsApp
- `Login.test.tsx` - Testa componente de login

**Características:**

- ✅ Testam renderização e interações
- ✅ Usam React Testing Library
- ✅ Mockam chamadas de API
- ✅ Testam diferentes estados dos componentes

## 🔗 Testes de Integração

### Backend

Os testes de integração testam controllers com o Express app real, mas com banco de dados de teste.

**Exemplos:**

- `user.controller.test.ts` - Testa endpoints de usuários
- `whatsapp.controller.test.ts` - Testa endpoints do WhatsApp

**Características:**

- ✅ Testam fluxos completos de API
- ✅ Usam banco de dados de teste
- ✅ Verificam respostas HTTP reais
- ✅ Testam middleware e validações

## 🚀 Executando Testes

### Comandos Individuais

```bash
# Backend - Testes unitários e integração
cd backend
npm test                    # Executa todos os testes
npm run test:watch         # Modo watch
npm run test:coverage      # Com relatório de cobertura
npm run test:integration   # Apenas testes de integração

# Frontend - Testes unitários
cd frontend
npm test                   # Executa todos os testes
npm run test:coverage      # Com relatório de cobertura
npm run test:ci           # Para CI/CD
```

### Scripts PowerShell

```powershell
# Executar todos os testes
.\scripts\test-all.ps1

# Executar apenas backend
.\scripts\test-backend.ps1

# Executar apenas frontend
.\scripts\test-frontend.ps1
```

## 📊 Relatórios de Cobertura

### Backend

```bash
cd backend
npm run test:coverage
```

**Relatório:** `backend/coverage/index.html`

**Métricas:**

- Statements: % de linhas executadas
- Branches: % de ramificações testadas
- Functions: % de funções chamadas
- Lines: % de linhas de código executadas

### Frontend

```bash
cd frontend
npm run test:coverage
```

**Relatório:** `frontend/coverage/index.html`

**Métricas:**

- Statements: % de linhas executadas
- Branches: % de ramificações testadas
- Functions: % de funções chamadas
- Lines: % de linhas de código executadas

## ⚙️ Configuração

### Jest (Backend)

```javascript
// backend/jest.config.js
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
  transform: { "^.+\\.ts$": "ts-jest" },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/server.ts",
    "!src/config/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testTimeout: 30000,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
```

### React Testing Library (Frontend)

```typescript
// frontend/src/setupTests.ts
import "@testing-library/jest-dom";

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;
```

## 🎯 Boas Práticas

### Estrutura de Testes

```typescript
describe("ComponentName", () => {
  beforeEach(() => {
    // Setup antes de cada teste
  });

  afterEach(() => {
    // Cleanup após cada teste
  });

  describe("método específico", () => {
    it("deve fazer algo quando condição X", () => {
      // Arrange
      const input = "valor de teste";

      // Act
      const result = component.method(input);

      // Assert
      expect(result).toBe("resultado esperado");
    });
  });
});
```

### Nomenclatura

- **Arquivos:** `ComponentName.test.tsx` ou `ServiceName.test.ts`
- **Describes:** Nome do componente/serviço
- **Its:** Comportamento específico testado
- **Variáveis:** Nomes descritivos (`mockUser`, `expectedResult`)

### Mocks

```typescript
// Mock de API
const mockApi = {
  get: jest.fn(),
  post: jest.fn(),
};
jest.mock("../config/axios", () => mockApi);

// Mock de componente
jest.mock("../components/ChildComponent", () => {
  return function MockChildComponent() {
    return <div data-testid="mock-child">Mock Child</div>;
  };
});
```

## 🐛 Debugging

### Backend

```bash
# Executar teste específico
npm test -- --testNamePattern="should create user"

# Executar com debug
npm test -- --verbose --no-coverage

# Executar arquivo específico
npm test -- UserService.test.ts
```

### Frontend

```bash
# Executar teste específico
npm test -- --testNamePattern="should render login form"

# Executar com debug
npm test -- --verbose --no-coverage

# Executar arquivo específico
npm test -- Login.test.tsx
```

## 🔄 CI/CD

### GitHub Actions

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"

      # Backend tests
      - name: Backend Tests
        run: |
          cd backend
          npm ci
          npm run test:coverage

      # Frontend tests
      - name: Frontend Tests
        run: |
          cd frontend
          npm ci
          npm run test:ci
```

## 📈 Métricas de Qualidade

### Cobertura Mínima

- **Backend:** 80% statements, 70% branches
- **Frontend:** 70% statements, 60% branches

### Tipos de Testes

- **Unitários:** 70% dos testes
- **Integração:** 30% dos testes

## 🚨 Troubleshooting

### Problemas Comuns

1. **Testes falhando intermitentemente**

   - Verificar se há dependências assíncronas não aguardadas
   - Usar `waitFor` para elementos que aparecem dinamicamente

2. **Mocks não funcionando**

   - Verificar ordem dos imports
   - Usar `jest.clearAllMocks()` no `beforeEach`

3. **Timeout em testes**

   - Aumentar `testTimeout` no Jest
   - Verificar se há operações assíncronas não aguardadas

4. **Cobertura baixa**
   - Verificar se arquivos estão sendo excluídos incorretamente
   - Adicionar testes para branches não cobertos

## 📚 Recursos Adicionais

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
