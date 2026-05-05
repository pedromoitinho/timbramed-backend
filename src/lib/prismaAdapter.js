import { PrismaPg } from "@prisma/adapter-pg"

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])

export function createPrismaPgAdapter(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set")
  }

  const url = new URL(connectionString)
  const useSsl = !LOCAL_HOSTS.has(url.hostname)

  return new PrismaPg({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : false
  })
}
