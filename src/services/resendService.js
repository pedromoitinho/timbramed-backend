function getApiKey() {
  return process.env.RESEND_API_KEY
}

function getFromEmail() {
  return process.env.RESEND_FROM_EMAIL || "TimbraMed <onboarding@resend.dev>"
}

function getAppUrl() {
  return process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:5173"
}

function assertConfigured() {
  if (!getApiKey()) {
    throw new Error("RESEND_API_KEY não configurado")
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

async function resendRequest(path, payload, idempotencyKey) {
  assertConfigured()

  const response = await fetch(`https://api.resend.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {})
    },
    body: JSON.stringify(payload)
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.message || "Não foi possível enviar o e-mail de confirmação")
  }

  return data
}

export async function sendEmailChangeConfirmation({ user, newEmail, token }) {
  const confirmationUrl = `${getAppUrl()}/confirmar-email?token=${encodeURIComponent(token)}`
  const subject = "Confirme a troca de email no TimbraMed"
  const safeName = escapeHtml(user.nome)
  const safeEmail = escapeHtml(newEmail)
  const safeUrl = escapeHtml(confirmationUrl)
  const html = `
    <div style="font-family: Arial, sans-serif; color: #101936; line-height: 1.6;">
      <h1 style="margin: 0 0 16px;">Confirme a troca de email</h1>
      <p>Olá, ${safeName}.</p>
      <p>Recebemos uma solicitação para trocar o e-mail da sua conta TimbraMed para <strong>${safeEmail}</strong>.</p>
      <p>Para concluir a alteração, confirme pelo link abaixo. Se você não pediu essa troca, ignore este e-mail.</p>
      <p><a href="${safeUrl}" style="display: inline-block; background: #101936; color: #fff; padding: 12px 18px; border-radius: 12px; text-decoration: none; font-weight: 700;">Confirmar novo email</a></p>
      <p style="font-size: 12px; color: #65734B;">Este link expira em 30 minutos.</p>
    </div>
  `

  return resendRequest("/emails", {
    from: getFromEmail(),
    to: [user.email],
    subject,
    html,
    text: `Confirme a troca de e-mail para ${newEmail}: ${confirmationUrl}`
  }, `email-change-${user.id}-${Date.now()}`)
}
