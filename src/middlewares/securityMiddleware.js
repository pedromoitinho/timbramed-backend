const DEFAULT_RATE_LIMIT_WINDOW_MS = 60 * 1000

function normalizeOrigin(value) {
  try {
    const url = new URL(value)
    return url.origin
  } catch {
    return null
  }
}

function parseAllowedOrigins() {
  const entries = new Set([
    process.env.APP_URL,
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173"
  ])

  String(process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean)
    .forEach(item => entries.add(item))

  return new Set([...entries].map(normalizeOrigin).filter(Boolean))
}

export function createCorsOriginValidator() {
  const allowedOrigins = parseAllowedOrigins()

  return origin => {
    if (!origin) {
      return true
    }

    const normalized = normalizeOrigin(origin)

    if (!normalized) {
      return false
    }

    return allowedOrigins.has(normalized)
  }
}

export function applySecurityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff")
  res.setHeader("X-Frame-Options", "DENY")
  res.setHeader("X-DNS-Prefetch-Control", "off")
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none")
  res.setHeader("Referrer-Policy", "no-referrer")
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin")
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin")
  res.setHeader("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'")

  if (req.secure || req.headers["x-forwarded-proto"] === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
  }

  next()
}

export function createRateLimiter({
  windowMs = DEFAULT_RATE_LIMIT_WINDOW_MS,
  max = 20,
  message = "Muitas tentativas, aguarde alguns segundos."
} = {}) {
  const storage = new Map()

  function cleanup(now) {
    for (const [key, value] of storage.entries()) {
      if (value.expiresAt <= now) {
        storage.delete(key)
      }
    }
  }

  return function rateLimiter(req, res, next) {
    const now = Date.now()
    cleanup(now)
    const key = `${req.ip || "ip"}:${req.path}`
    const item = storage.get(key)

    if (!item || item.expiresAt <= now) {
      storage.set(key, { count: 1, expiresAt: now + windowMs })
      next()
      return
    }

    if (item.count >= max) {
      const retryAfterSeconds = Math.ceil((item.expiresAt - now) / 1000)
      res.setHeader("Retry-After", String(Math.max(retryAfterSeconds, 1)))
      res.status(429).json({ message })
      return
    }

    item.count += 1
    next()
  }
}
