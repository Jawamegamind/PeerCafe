// frontend/jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

const customJestConfig = {
  // Use jsdom for browser-like testing
  testEnvironment: 'jsdom',
  // Setup file: testing-library + any global mocks
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Allow importing CSS modules/images in tests
  moduleNameMapper: {
    // Handle CSS modules (moduleNameMapper will use identity-obj-proxy)
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
    // Handle regular CSS imports (return an empty object)
    '^.+\\.(css|sass|scss)$': '<rootDir>/__mocks__/styleMock.js',
    // Handle static assets
    '^.+\\.(jpg|jpeg|png|gif|webp|avif|svg)$': '<rootDir>/__mocks__/fileMock.js',
    // If you use absolute imports like "@/components/..."
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Where to find tests
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'utils/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!app/layout.*',
    '!app/globals.css'
  ],
  // Optional: increase timeout for slow tests
  testTimeout: 30000,
  // Transform file extensions handled by next/jest (should be fine), but add explicit mapping just in case
  transformIgnorePatterns: ['/node_modules/'],
};

module.exports = createJestConfig(customJestConfig);