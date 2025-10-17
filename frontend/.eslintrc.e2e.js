module.exports = {
    extends: ['../node_modules/@playwright/test/lib/test-runner'],
    env: {
        node: true,
        es6: true,
    },
    rules: {
        // Disable React Testing Library rules for E2E tests
        'testing-library/prefer-screen-queries': 'off',
    },
};
