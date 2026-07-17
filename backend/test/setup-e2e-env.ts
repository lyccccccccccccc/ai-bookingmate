import { getTestDatabaseUrl } from './helpers/test-database'

process.env.NODE_ENV = 'test'
process.env.OPENAI_API_KEY = ''
process.env.DATABASE_URL = getTestDatabaseUrl()
