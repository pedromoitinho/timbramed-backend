import crypto from "node:crypto"
import { z } from "zod"
import { prisma } from "../lib/prisma.js"
import { sendEmailChangeConfirmation } from "../services/resendService.js"
import { sanitizeUser } from "../utils/auth.js"

const profileSchema = z.object({
  nome: z.string().trim().min(3).max(120),
  endereco: z.string().trim().min(5).max(220),
  email: z.string().trim().email().max(160)
})

const confirmEmailSchema = z.object({
  token: z.string().min(32)
})

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

function createEmailChangeToken() {
  return crypto.randomBytes(32).toString("hex")
}

export async function getProfile(req, res, next) {
  try {
    const user = await prisma.usuario.findUnique({
      where: { id: req.user.id },
      include: { hospitalAtual: true }
    })

    res.json(sanitizeUser(user))
  } catch (error) {
    next(error)
  }
}

export async function updateProfile(req, res, next) {
  try {
    const payload = profileSchema.parse(req.body)
    const email = payload.email.trim().toLowerCase()
    const currentUser = await prisma.usuario.findUnique({
      where: { id: req.user.id },
      include: { hospitalAtual: true }
    })

    if (!currentUser) {
      res.status(404).json({ message: "Usuário não encontrado" })
      return
    }

    const data = {
      nome: payload.nome.trim(),
      endereco: payload.endereco.trim()
    }

    let emailChangePending = false

    if (email !== currentUser.email) {
      if (!currentUser.email) {
        res.status(400).json({ message: "Conta sem e-mail atual para confirmar a troca" })
        return
      }

      const existing = await prisma.usuario.findFirst({
        where: {
          id: { not: req.user.id },
          OR: [
            { email },
            { pendingEmail: email }
          ]
        }
      })

      if (existing?.email === email || existing?.pendingEmail === email) {
        res.status(409).json({ message: "E-mail já cadastrado" })
        return
      }

      const token = createEmailChangeToken()
      data.pendingEmail = email
      data.emailChangeTokenHash = hashToken(token)
      data.emailChangeTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000)
      emailChangePending = true

      await sendEmailChangeConfirmation({
        user: currentUser,
        newEmail: email,
        token
      })
    } else {
      data.pendingEmail = null
      data.emailChangeTokenHash = null
      data.emailChangeTokenExpiresAt = null
    }

    const user = await prisma.usuario.update({
      where: { id: req.user.id },
      data,
      include: { hospitalAtual: true }
    })

    res.json({
      user: sanitizeUser(user),
      emailChangePending
    })
  } catch (error) {
    next(error)
  }
}

export async function confirmEmailChange(req, res, next) {
  try {
    const payload = confirmEmailSchema.parse(req.body)
    const tokenHash = hashToken(payload.token)
    const user = await prisma.usuario.findFirst({
      where: {
        emailChangeTokenHash: tokenHash,
        emailChangeTokenExpiresAt: {
          gt: new Date()
        },
        pendingEmail: {
          not: null
        }
      }
    })

    if (!user?.pendingEmail) {
      res.status(400).json({ message: "Link de confirmação inválido ou expirado" })
      return
    }

    const existing = await prisma.usuario.findFirst({
      where: {
        id: { not: user.id },
        email: user.pendingEmail
      }
    })

    if (existing) {
      res.status(409).json({ message: "E-mail já cadastrado" })
      return
    }

    const saved = await prisma.usuario.update({
      where: { id: user.id },
      data: {
        email: user.pendingEmail,
        login: user.pendingEmail,
        pendingEmail: null,
        emailChangeTokenHash: null,
        emailChangeTokenExpiresAt: null
      },
      include: { hospitalAtual: true }
    })

    res.json({ user: sanitizeUser(saved) })
  } catch (error) {
    next(error)
  }
}
