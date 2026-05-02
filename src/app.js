import express from "express"
import cors from "cors"
import { ZodError } from "zod"
import { router } from "./routes/index.js"

export const app = express()

const corsOrigin = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true

app.use(cors({ origin: corsOrigin }))
app.use(express.json({ limit: "2mb" }))
app.use(router)

app.use((req, res) => {
  res.status(404).json({ message: "Endpoint não encontrado" })
})

app.use((error, req, res, next) => {
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

  res.status(500).json({ message: error.message || "Erro interno" })
})
