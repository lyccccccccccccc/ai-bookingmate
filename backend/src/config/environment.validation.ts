type Environment = Record<string, unknown>;

const requiredProductionVariables = [
  'DATABASE_URL',
  'JWT_SECRET',
  'FRONTEND_URL',
];
const placeholderJwtSecrets = new Set([
  'replace-with-your-local-secret',
  'local-dev-jwt-secret',
  'changeme',
  'change-me',
]);

function getNonEmptyString(environment: Environment, key: string) {
  const value = environment[key];

  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function validatePositiveInteger(
  value: string | undefined,
  key: string,
  maximum?: number,
) {
  if (!value) {
    return;
  }

  const parsedValue = Number(value);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue <= 0 ||
    (maximum !== undefined && parsedValue > maximum)
  ) {
    throw new Error(`${key} must be a valid positive integer.`);
  }
}

export function validateEnvironment(environment: Environment) {
  const nodeEnv = getNonEmptyString(environment, 'NODE_ENV') ?? 'development';

  validatePositiveInteger(
    getNonEmptyString(environment, 'PORT'),
    'PORT',
    65535,
  );
  validatePositiveInteger(
    getNonEmptyString(environment, 'OPENAI_MAX_OUTPUT_TOKENS'),
    'OPENAI_MAX_OUTPUT_TOKENS',
  );

  if (nodeEnv === 'production') {
    for (const key of requiredProductionVariables) {
      if (!getNonEmptyString(environment, key)) {
        throw new Error(`${key} is required when NODE_ENV=production.`);
      }
    }

    const jwtSecret = getNonEmptyString(environment, 'JWT_SECRET');

    if (jwtSecret && placeholderJwtSecrets.has(jwtSecret.toLowerCase())) {
      throw new Error(
        'JWT_SECRET must not use a development placeholder in production.',
      );
    }
  }

  return environment;
}
