import jwt from "jsonwebtoken"
import { prisma } from "../lib/prisma.js"
import { hasProductAccess } from "../utils/subscription.js"
import { resolveJwtSecret } from "../utils/jwt.js"

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || ""
    const [type, token] = header.split(" ")

    if (type !== "Bearer" || !token) {
      res.status(401).json({ message: "Autenticação obrigatória" })
      return
    }

    const payload = jwt.verify(token, resolveJwtSecret(), {
      algorithms: ["HS256"]
    })
    const user = await prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        nome: true,
        login: true,
        email: true,
        role: true,
        cpf: true,
        endereco: true,
        crm: true,
        pendingEmail: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        mercadoPagoPreapprovalId: true,
        mercadoPagoInitPoint: true,
        mercadoPagoCardLastFour: true,
        mercadoPagoPaymentMethodId: true,
        subscriptionStartedAt: true,
        subscriptionCanceledAt: true,
        hospitalAtualId: true
      }
    })

    if (!user) {
      res.status(401).json({ message: "Sessão inválida" })
      return
    }

    req.user = user
    next()
  } catch (error) {
    res.status(401).json({ message: "Sessão inválida" })
  }
}

export function requireProductAccess(req, res, next) {
  if (hasProductAccess(req.user)) {
    next()
    return
  }

  res.status(402).json({
    message: "Assinatura obrigatória para acessar o produto",
    subscriptionStatus: req.user.subscriptionStatus,
    mercadoPagoInitPoint: req.user.mercadoPagoInitPoint
  })
}
