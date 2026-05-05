import crypto from "node:crypto"
import { z } from "zod"
import { SubscriptionStatus } from "@prisma/client"
import { prisma } from "../lib/prisma.js"
import { sanitizeUser } from "../utils/auth.js"
import { daysUntilTrialEnds, hasProductAccess } from "../utils/subscription.js"
import { cancelSubscription, createAuthorizedSubscription, createSubscriptionCheckout, getBillingConfig, getSubscription } from "../services/mercadoPagoService.js"

const cardSubscriptionSchema = z.object({
  cardTokenId: z.string().min(10).max(300).regex(/^[A-Za-z0-9_-]+$/, "Token de cartão inválido"),
  paymentMethodId: z.string().min(2).max(40).regex(/^[A-Za-z0-9_]+$/, "Meio de pagamento inválido").optional(),
  lastFourDigits: z.string().regex(/^\d{4}$/, "Últimos quatro dígitos inválidos").optional()
})

const webhookResourceIdSchema = z.string().min(3).max(80).regex(/^[A-Za-z0-9_-]+$/, "Recurso de webhook inválido")
const MAX_WEBHOOK_AGE_SECONDS = 300
const replayMemory = new Map()

function statusFromMercadoPago(status) {
  if (status === "authorized") {
    return SubscriptionStatus.ACTIVE
  }

  if (status === "cancelled" || status === "canceled") {
    return SubscriptionStatus.CANCELED
  }

  if (status === "paused") {
    return SubscriptionStatus.PAST_DUE
  }

  return SubscriptionStatus.PENDING_PAYMENT
}

function trialEndsAtFromSubscription(subscription) {
  const freeTrial = subscription.auto_recurring?.free_trial

  if (!freeTrial?.frequency) {
    return null
  }

  if (subscription.next_payment_date) {
    const nextPaymentDate = new Date(subscription.next_payment_date)

    if (!Number.isNaN(nextPaymentDate.getTime()) && nextPaymentDate.getTime() > Date.now()) {
      return nextPaymentDate
    }
  }

  if (freeTrial.frequency_type !== "days") {
    return null
  }

  return new Date(Date.now() + Number(freeTrial.frequency) * 86400000)
}

function parseSignatureHeader(value) {
  return Object.fromEntries(
    String(value || "")
      .split(",")
      .map(part => part.split("=").map(item => item.trim()))
      .filter(([key, item]) => key && item)
  )
}

function safeCompare(a, b) {
  const left = Buffer.from(a || "")
  const right = Buffer.from(b || "")
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

function isValidWebhookSignature(req, resourceId) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET

  if (!secret) {
    return true
  }

  const signature = parseSignatureHeader(req.headers["x-signature"])
  const requestId = req.headers["x-request-id"]

  if (!signature.ts || !signature.v1 || !requestId || !resourceId) {
    return false
  }

  const timestamp = Number(signature.ts)

  if (!Number.isFinite(timestamp)) {
    return false
  }

  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - timestamp)

  if (ageSeconds > MAX_WEBHOOK_AGE_SECONDS) {
    return false
  }

  const manifest = `id:${String(resourceId).toLowerCase()};request-id:${requestId};ts:${signature.ts};`
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex")

  if (!safeCompare(signature.v1, expected)) {
    return false
  }

  const replayKey = `${requestId}:${signature.ts}:${String(resourceId).toLowerCase()}`
  const now = Date.now()

  for (const [key, expiresAt] of replayMemory.entries()) {
    if (expiresAt <= now) {
      replayMemory.delete(key)
    }
  }

  if (replayMemory.has(replayKey)) {
    return false
  }

  replayMemory.set(replayKey, now + MAX_WEBHOOK_AGE_SECONDS * 1000)
  return true
}

async function refreshUserFromSubscription(subscription) {
  const status = statusFromMercadoPago(subscription.status)
  const trialEndsAt = trialEndsAtFromSubscription(subscription)
  const savedStatus = status === SubscriptionStatus.ACTIVE && trialEndsAt ? SubscriptionStatus.TRIALING : status

  return prisma.usuario.update({
    where: { id: subscription.external_reference },
    data: {
      subscriptionStatus: savedStatus,
      mercadoPagoPreapprovalId: subscription.id,
      mercadoPagoInitPoint: subscription.init_point || null,
      trialEndsAt: trialEndsAt || undefined,
      subscriptionStartedAt: status === SubscriptionStatus.ACTIVE ? new Date() : undefined,
      subscriptionCanceledAt: status === SubscriptionStatus.CANCELED ? new Date() : null
    },
    include: { hospitalAtual: true }
  })
}

export async function getBillingStatus(req, res, next) {
  try {
    res.json({
      user: sanitizeUser(req.user),
      hasAccess: hasProductAccess(req.user),
      trialDaysLeft: daysUntilTrialEnds(req.user),
      billing: getBillingConfig()
    })
  } catch (error) {
    next(error)
  }
}

export async function subscribeWithCard(req, res, next) {
  try {
    const payload = cardSubscriptionSchema.parse(req.body)
    const user = await prisma.usuario.findUnique({ where: { id: req.user.id } })

    if (!user?.email) {
      res.status(400).json({ message: "Configure um e-mail valido no perfil antes de assinar" })
      return
    }

    if (hasProductAccess(user)) {
      res.json({ user: sanitizeUser(user), hasAccess: true })
      return
    }

    if (user.mercadoPagoPreapprovalId && user.subscriptionStatus === SubscriptionStatus.PENDING_PAYMENT) {
      await cancelSubscription(user.mercadoPagoPreapprovalId).catch(() => null)
    }

    const subscription = await createAuthorizedSubscription(user, payload.cardTokenId)
    const status = statusFromMercadoPago(subscription.status)
    const trialEndsAt = trialEndsAtFromSubscription(subscription)
    const savedStatus = status === SubscriptionStatus.ACTIVE && trialEndsAt ? SubscriptionStatus.TRIALING : status
    const saved = await prisma.usuario.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: savedStatus,
        mercadoPagoPreapprovalId: subscription.id,
        mercadoPagoInitPoint: subscription.init_point || subscription.sandbox_init_point || null,
        mercadoPagoPaymentMethodId: payload.paymentMethodId || subscription.payment_method_id || null,
        mercadoPagoCardLastFour: payload.lastFourDigits || null,
        trialEndsAt: trialEndsAt || undefined,
        subscriptionStartedAt: new Date(),
        subscriptionCanceledAt: null
      },
      include: { hospitalAtual: true }
    })

    res.json({
      user: sanitizeUser(saved),
      hasAccess: hasProductAccess(saved),
      trialDaysLeft: daysUntilTrialEnds(saved)
    })
  } catch (error) {
    next(error)
  }
}

export async function startSubscription(req, res, next) {
  try {
    const user = await prisma.usuario.findUnique({ where: { id: req.user.id } })

    if (hasProductAccess(user)) {
      res.json({ user: sanitizeUser(user), initPoint: user.mercadoPagoInitPoint, hasAccess: true })
      return
    }

    if (user.mercadoPagoPreapprovalId && user.mercadoPagoInitPoint && user.subscriptionStatus === SubscriptionStatus.PENDING_PAYMENT) {
      res.json({ user: sanitizeUser(user), initPoint: user.mercadoPagoInitPoint, hasAccess: false })
      return
    }

    const subscription = await createSubscriptionCheckout(user)
    const saved = await prisma.usuario.update({
      where: { id: user.id },
      data: {
        mercadoPagoPreapprovalId: subscription.id,
        mercadoPagoInitPoint: subscription.init_point || subscription.sandbox_init_point || null,
        subscriptionStatus: SubscriptionStatus.PENDING_PAYMENT
      },
      include: { hospitalAtual: true }
    })

    res.json({
      user: sanitizeUser(saved),
      initPoint: saved.mercadoPagoInitPoint,
      hasAccess: hasProductAccess(saved)
    })
  } catch (error) {
    next(error)
  }
}

export async function cancelUserSubscription(req, res, next) {
  try {
    const user = await prisma.usuario.findUnique({ where: { id: req.user.id } })

    if (user.mercadoPagoPreapprovalId) {
      await cancelSubscription(user.mercadoPagoPreapprovalId)
    }

    const saved = await prisma.usuario.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: SubscriptionStatus.CANCELED,
        subscriptionCanceledAt: new Date()
      },
      include: { hospitalAtual: true }
    })

    res.json({ user: sanitizeUser(saved), hasAccess: hasProductAccess(saved) })
  } catch (error) {
    next(error)
  }
}

export async function mercadoPagoWebhook(req, res, next) {
  try {
    const resourceIdCandidate = req.query?.["data.id"] || req.query?.id || req.body?.data?.id

    if (!resourceIdCandidate) {
      res.status(200).json({ received: true })
      return
    }

    const resourceId = webhookResourceIdSchema.parse(String(resourceIdCandidate))

    if (!isValidWebhookSignature(req, resourceId)) {
      res.status(401).json({ message: "Webhook inválido" })
      return
    }

    const subscription = await getSubscription(resourceId)
    await refreshUserFromSubscription(subscription)

    res.status(200).json({ received: true })
  } catch (error) {
    next(error)
  }
}
