import { SubscriptionStatus } from "@prisma/client"

export function hasProductAccess(user) {
  if (!user) {
    return false
  }

  if (user.role === "ADMIN") {
    return true
  }

  if (user.subscriptionStatus === SubscriptionStatus.ACTIVE) {
    return true
  }

  if (user.subscriptionStatus !== SubscriptionStatus.TRIALING || !user.trialEndsAt) {
    return false
  }

  return new Date(user.trialEndsAt).getTime() > Date.now()
}

export function daysUntilTrialEnds(user) {
  if (!user?.trialEndsAt) {
    return null
  }

  return Math.max(0, Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / 86400000))
}
