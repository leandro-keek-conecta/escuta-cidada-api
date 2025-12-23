import 'dotenv/config'
import z from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['dev', 'homolog', 'production']).default('dev'),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().default("postgresql://postgres:drVoXSqIafSixqWqhNJClrefMMfxhJwJ@junction.proxy.rlwy.net:21618/railway"),
  ENDPOINT: z.string(),
})
const _env = envSchema.safeParse(process.env)

if (_env.success === false) {
  // Log the general error message once
  console.error('Invalid environment variable')
  throw new Error('Invalid environment variable')
}

export const env = _env.data