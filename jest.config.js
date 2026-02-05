/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: ['src/generator/**/*.ts', 'src/adaptive/**/*.ts'],
  coveragePathIgnorePatterns: ['/node_modules/', '/__tests__/'],
};

module.exports = config;
