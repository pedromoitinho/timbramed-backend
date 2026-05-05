import { z } from "zod"
import { prisma } from "../lib/prisma.js"

const cidSchema = z.object({
  codigo: z.string().trim().min(2).max(16)
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

export async function listMedicalCatalog(req, res, next) {
  try {
    const hospitalId = req.params.hospitalId || req.user.hospitalAtualId

    if (!ensureHospitalAccess(req, res, hospitalId)) {
      return
    }

    const cids = await prisma.cid.findMany({ where: { hospitalId }, orderBy: { codigo: "asc" } })

    res.json({ cids })
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
