import { z } from "zod"
import { prisma } from "../lib/prisma.js"

const symptomSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  cidId: z.string().optional().nullable()
})

const cidSchema = z.object({
  codigo: z.string().trim().min(2).max(16)
})

const messageSchema = z.object({
  texto: z.string().trim().min(5).max(3000),
  sintomaId: z.string().optional().nullable()
})

function canAccessHospital(req, hospitalId) {
  return req.user.hospitalAtualId === hospitalId || req.user.role === "ADMIN"
}

function ensureHospitalAccess(req, res, hospitalId) {
  if (!hospitalId) {
    res.status(400).json({ message: "Hospital atual nao configurado" })
    return false
  }

  if (!canAccessHospital(req, hospitalId)) {
    res.status(403).json({ message: "Hospital nao permitido para este medico" })
    return false
  }

  return true
}

async function ensureCidBelongsToHospital(cidId, hospitalId) {
  if (!cidId) {
    return null
  }

  const cid = await prisma.cid.findFirst({ where: { id: cidId, hospitalId } })
  return cid ? cid.id : null
}

async function ensureSymptomBelongsToHospital(sintomaId, hospitalId) {
  if (!sintomaId) {
    return null
  }

  const symptom = await prisma.sintoma.findFirst({ where: { id: sintomaId, hospitalId } })
  return symptom ? symptom.id : null
}

function buildMessageTitle(sintomaId, fallback) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return `${fallback || "Mensagem"}-${sintomaId || "geral"}-${suffix}`
}

export async function listMedicalCatalog(req, res, next) {
  try {
    const hospitalId = req.params.hospitalId || req.user.hospitalAtualId

    if (!ensureHospitalAccess(req, res, hospitalId)) {
      return
    }

    const [sintomas, cids, mensagens] = await Promise.all([
      prisma.sintoma.findMany({ where: { hospitalId }, include: { cidPadrao: true }, orderBy: { nome: "asc" } }),
      prisma.cid.findMany({ where: { hospitalId }, orderBy: { codigo: "asc" } }),
      prisma.mensagemPredefinida.findMany({ where: { hospitalId }, include: { sintoma: true }, orderBy: { createdAt: "asc" } })
    ])

    res.json({ sintomas, cids, mensagens })
  } catch (error) {
    next(error)
  }
}

export async function createSymptom(req, res, next) {
  try {
    const hospitalId = req.params.hospitalId || req.user.hospitalAtualId

    if (!ensureHospitalAccess(req, res, hospitalId)) {
      return
    }

    const payload = symptomSchema.parse(req.body)
    const cidId = await ensureCidBelongsToHospital(payload.cidId, hospitalId)
    const symptom = await prisma.sintoma.create({
      data: {
        hospitalId,
        nome: payload.nome,
        cidId,
        cid: null,
        mensagemPredeterminada: null
      },
      include: { cidPadrao: true }
    })

    res.status(201).json(symptom)
  } catch (error) {
    next(error)
  }
}

export async function updateSymptom(req, res, next) {
  try {
    const payload = symptomSchema.parse(req.body)
    const current = await prisma.sintoma.findUnique({ where: { id: req.params.id } })

    if (!current || !ensureHospitalAccess(req, res, current.hospitalId)) {
      return
    }

    const cidId = await ensureCidBelongsToHospital(payload.cidId, current.hospitalId)
    const symptom = await prisma.sintoma.update({
      where: { id: req.params.id },
      data: { nome: payload.nome, cidId },
      include: { cidPadrao: true }
    })

    res.json(symptom)
  } catch (error) {
    next(error)
  }
}

export async function deleteSymptom(req, res, next) {
  try {
    const current = await prisma.sintoma.findUnique({ where: { id: req.params.id } })

    if (!current || !ensureHospitalAccess(req, res, current.hospitalId)) {
      return
    }

    await prisma.sintoma.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

export async function createCid(req, res, next) {
  try {
    const hospitalId = req.params.hospitalId || req.user.hospitalAtualId

    if (!ensureHospitalAccess(req, res, hospitalId)) {
      return
    }

    const payload = cidSchema.parse(req.body)
    const cid = await prisma.cid.create({
      data: {
        hospitalId,
        codigo: payload.codigo
      }
    })

    res.status(201).json(cid)
  } catch (error) {
    next(error)
  }
}

export async function updateCid(req, res, next) {
  try {
    const payload = cidSchema.parse(req.body)
    const current = await prisma.cid.findUnique({ where: { id: req.params.id } })

    if (!current || !ensureHospitalAccess(req, res, current.hospitalId)) {
      return
    }

    const cid = await prisma.cid.update({
      where: { id: req.params.id },
      data: { codigo: payload.codigo }
    })

    res.json(cid)
  } catch (error) {
    next(error)
  }
}

export async function deleteCid(req, res, next) {
  try {
    const current = await prisma.cid.findUnique({ where: { id: req.params.id } })

    if (!current || !ensureHospitalAccess(req, res, current.hospitalId)) {
      return
    }

    await prisma.cid.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

export async function createMessage(req, res, next) {
  try {
    const hospitalId = req.params.hospitalId || req.user.hospitalAtualId

    if (!ensureHospitalAccess(req, res, hospitalId)) {
      return
    }

    const payload = messageSchema.parse(req.body)
    const sintomaId = await ensureSymptomBelongsToHospital(payload.sintomaId, hospitalId)
    const symptom = sintomaId ? await prisma.sintoma.findUnique({ where: { id: sintomaId } }) : null
    const message = await prisma.mensagemPredefinida.create({
      data: {
        hospitalId,
        sintomaId,
        titulo: buildMessageTitle(sintomaId, symptom?.nome),
        texto: payload.texto
      },
      include: { sintoma: true }
    })

    res.status(201).json(message)
  } catch (error) {
    next(error)
  }
}

export async function updateMessage(req, res, next) {
  try {
    const payload = messageSchema.parse(req.body)
    const current = await prisma.mensagemPredefinida.findUnique({ where: { id: req.params.id } })

    if (!current || !ensureHospitalAccess(req, res, current.hospitalId)) {
      return
    }

    const sintomaId = await ensureSymptomBelongsToHospital(payload.sintomaId, current.hospitalId)
    const symptom = sintomaId ? await prisma.sintoma.findUnique({ where: { id: sintomaId } }) : null
    const message = await prisma.mensagemPredefinida.update({
      where: { id: req.params.id },
      data: {
        sintomaId,
        titulo: current.titulo || buildMessageTitle(sintomaId, symptom?.nome),
        texto: payload.texto
      },
      include: { sintoma: true }
    })

    res.json(message)
  } catch (error) {
    next(error)
  }
}

export async function deleteMessage(req, res, next) {
  try {
    const current = await prisma.mensagemPredefinida.findUnique({ where: { id: req.params.id } })

    if (!current || !ensureHospitalAccess(req, res, current.hospitalId)) {
      return
    }

    await prisma.mensagemPredefinida.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}
