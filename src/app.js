import express from "express"
import cors from "cors"
import { ZodError } from "zod"
import { applySecurityHeaders, createCorsOriginValidator } from "./middlewares/securityMiddleware.js"
import { router } from "./routes/index.js"

export const app = express()
const allowOrigin = createCorsOriginValidator()

app.disable("x-powered-by")

if (process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1)
}

const corsOptions = {
  origin(origin, callback) {
    if (allowOrigin(origin)) {
      callback(null, true)
      return
    }

    callback(new Error("Origem não permitida pelo CORS"))
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false
}

app.use(cors(corsOptions))
app.options("*", cors(corsOptions))
app.use(applySecurityHeaders)
app.use(express.json({ limit: "10mb" }))
app.use(router)

app.use((req, res) => {
  res.status(404).json({ message: "Endpoint não encontrado" })
})

app.use((error, req, res, next) => {
  console.error("[api-error]", {
    path: req.path,
    method: req.method,
    message: error?.message,
    code: error?.code,
    name: error?.name
  })

  if (error instanceof ZodError) {
    res.status(400).json({ message: "Dados inválidos", issues: error.issues })
    return
  }

  if (error.code === "P2002") {
    res.status(409).json({ message: "Registro duplicado" })
    return
  }

  if (error.code === "P2025") {
    res.status(404).json({ message: "Registro não encontrado" })
    return
  }

  if (error.message === "Origem não permitida pelo CORS") {
    res.status(403).json({ message: error.message })
    return
  }

  const internalMessage = error.message || "Erro interno"
  const responseMessage = process.env.NODE_ENV === "production" ? "Erro interno" : internalMessage
  res.status(500).json({ message: responseMessage })
})
