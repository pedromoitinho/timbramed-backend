const mercadoPagoBaseUrl = "https://api.mercadopago.com"

function getAccessToken() {
  return process.env.MERCADOPAGO_ACCESS_TOKEN
}

function getPublicKey() {
  return process.env.MERCADOPAGO_PUBLIC_KEY || ""
}

function getMonthlyAmount() {
  return Number(process.env.MERCADOPAGO_MONTHLY_AMOUNT || 79.9)
}

function getTrialDays() {
  return Number(process.env.MERCADOPAGO_TRIAL_DAYS || 7)
}

function getAppUrl() {
  return process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:5173"
}

function assertConfigured() {
  if (!getAccessToken()) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado")
  }
}

async function mercadoPagoRequest(path, options = {}) {
  assertConfigured()

  const response = await fetch(`${mercadoPagoBaseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  })

  let data = null

  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    throw new Error(data?.message || "Mercado Pago recusou a solicitação")
  }

  return data
}

export function getBillingConfig() {
  return {
    monthlyAmount: getMonthlyAmount(),
    trialDays: getTrialDays(),
    mercadoPagoPublicKey: getPublicKey()
  }
}

export async function createSubscriptionCheckout(user) {
  const payload = {
    reason: "TimbraMed - assinatura mensal",
    external_reference: user.id,
    payer_email: user.email,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: getMonthlyAmount(),
      currency_id: "BRL",
      free_trial: {
        frequency: getTrialDays(),
        frequency_type: "days"
      }
    },
    back_url: `${getAppUrl()}/app?assinatura=retorno`,
    status: "pending"
  }

  if (process.env.MERCADOPAGO_PREAPPROVAL_PLAN_ID) {
    payload.preapproval_plan_id = process.env.MERCADOPAGO_PREAPPROVAL_PLAN_ID
  }

  return mercadoPagoRequest("/preapproval", {
    method: "POST",
    headers: {
      "X-Idempotency-Key": `timbramed-subscription-${user.id}-${Date.now()}`
    },
    body: JSON.stringify(payload)
  })
}

export async function createAuthorizedSubscription(user, cardTokenId) {
  const payload = {
    reason: "TimbraMed - assinatura mensal",
    external_reference: user.id,
    payer_email: user.email,
    card_token_id: cardTokenId,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: getMonthlyAmount(),
      currency_id: "BRL",
      free_trial: {
        frequency: getTrialDays(),
        frequency_type: "days"
      }
    },
    back_url: `${getAppUrl()}/perfil?assinatura=ativa`,
    status: "authorized"
  }

  if (process.env.MERCADOPAGO_PREAPPROVAL_PLAN_ID) {
    payload.preapproval_plan_id = process.env.MERCADOPAGO_PREAPPROVAL_PLAN_ID
  }

  return mercadoPagoRequest("/preapproval", {
    method: "POST",
    headers: {
      "X-Idempotency-Key": `timbramed-card-subscription-${user.id}-${Date.now()}`
    },
    body: JSON.stringify(payload)
  })
}

export async function getSubscription(preapprovalId) {
  return mercadoPagoRequest(`/preapproval/${preapprovalId}`)
}

export async function cancelSubscription(preapprovalId) {
  return mercadoPagoRequest(`/preapproval/${preapprovalId}`, {
    method: "PUT",
    body: JSON.stringify({ status: "canceled" })
  })
}
