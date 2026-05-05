export function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "")
}

export function isValidCpf(value) {
  const cpf = onlyDigits(value)

  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) {
    return false
  }

  const digit = size => {
    let sum = 0

    for (let index = 0; index < size; index += 1) {
      sum += Number(cpf[index]) * (size + 1 - index)
    }

    const result = (sum * 10) % 11
    return result === 10 ? 0 : result
  }

  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10])
}

export function normalizeCpf(value) {
  return onlyDigits(value)
}

export function normalizeCrm(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "")
}

export function isValidCrm(value) {
  return /^\d{4,8}\/?[A-Z]{2}$/.test(normalizeCrm(value))
}
