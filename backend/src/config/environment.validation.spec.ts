import { validateEnvironment } from './environment.validation';

describe('validateEnvironment', () => {
  const productionEnvironment = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://user:password@localhost:5432/bookingmate',
    JWT_SECRET: 'a-long-random-production-secret',
    FRONTEND_URL: 'https://booking.example.com',
  };

  it('accepts valid production configuration', () => {
    expect(validateEnvironment(productionEnvironment)).toEqual(
      productionEnvironment,
    );
  });

  it('requires the production variables', () => {
    expect(() =>
      validateEnvironment({ ...productionEnvironment, FRONTEND_URL: ' ' }),
    ).toThrow('FRONTEND_URL is required when NODE_ENV=production.');
  });

  it('rejects development JWT placeholders in production', () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        JWT_SECRET: 'replace-with-your-local-secret',
      }),
    ).toThrow(
      'JWT_SECRET must not use a development placeholder in production.',
    );
  });

  it('rejects invalid configured port and output token values', () => {
    expect(() =>
      validateEnvironment({ ...productionEnvironment, PORT: 'not-a-port' }),
    ).toThrow('PORT must be a valid positive integer.');
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        OPENAI_MAX_OUTPUT_TOKENS: '0',
      }),
    ).toThrow('OPENAI_MAX_OUTPUT_TOKENS must be a valid positive integer.');
  });
});
