export function sanitizeUser(user) {
  if (!user) {
    return null
  }

  return {
    id: user.id,
    nome: user.nome,
    login: user.login,
    cpf: user.cpf,
    endereco: user.endereco,
    crm: user.crm,
    email: user.email,
    pendingEmail: user.pendingEmail,
    role: user.role,
    subscriptionStatus: user.subscriptionStatus,
    trialEndsAt: user.trialEndsAt,
    mercadoPagoInitPoint: user.mercadoPagoInitPoint,
    mercadoPagoPreapprovalId: user.mercadoPagoPreapprovalId,
    mercadoPagoCardLastFour: user.mercadoPagoCardLastFour,
    mercadoPagoPaymentMethodId: user.mercadoPagoPaymentMethodId,
    subscriptionStartedAt: user.subscriptionStartedAt,
    subscriptionCanceledAt: user.subscriptionCanceledAt,
    hospitalAtualId: user.hospitalAtualId,
    hospitalAtual: user.hospitalAtual || null
  }
}
