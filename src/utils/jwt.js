const defaultDevSecret = "timbramed-local-dev-secret"

export function resolveJwtSecret() {
  const secret = String(process.env.JWT_SECRET || "").trim()

  if (secret) {
    return secret
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET nao configurado")
  }

  return defaultDevSecret
}
