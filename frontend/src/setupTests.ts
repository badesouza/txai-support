import '@testing-library/jest-dom';

// MSW setup removed for now - will be restored when needed

// Mock SweetAlert2 to avoid jsdom stylesheet issues in tests
jest.mock('sweetalert2', () => ({
  fire: jest.fn(),
}));

// Mock axios globally to avoid ESM import issues in Jest
jest.mock('axios', () => {
  const mockInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn((onFulfilled: any) => {
          // simulate interceptor by calling onFulfilled immediately
          if (typeof onFulfilled === 'function') {
            onFulfilled({ headers: {} });
          }
        }),
      },
      response: {
        use: jest.fn(),
      },
    },
  };
  const axiosCore = {
    create: jest.fn(() => mockInstance),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  } as any;
  const axios = {
    __esModule: true,
    default: axiosCore,
    ...axiosCore,
  } as any;
  return axios;
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
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

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
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

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock as any;