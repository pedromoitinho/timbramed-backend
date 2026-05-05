import { z } from "zod"
import { ReportStatus } from "@prisma/client"
import { prisma } from "../lib/prisma.js"
import { normalizeReport } from "../utils/serializers.js"

const createReportSchema = z.object({
  hospitalId: z.string().min(1),
  pacienteNome: z.string().trim().min(2).max(120),
  mensagemFinal: z.string().trim().min(5).max(4000),
  cid: z.string().trim().max(120).optional().nullable()
})

export async function listReports(req, res, next) {
  try {
    const status = req.query.status && Object.values(ReportStatus).includes(req.query.status) ? req.query.status : undefined
    const requestedHospitalId = req.query.hospitalId ? String(req.query.hospitalId) : undefined
    const hospitalId = req.user.role === "MEDICO" ? req.user.hospitalAtualId : requestedHospitalId
    const reports = await prisma.relatoriosFila.findMany({
      where: {
        hospitalId: hospitalId || undefined,
        status
      },
      orderBy: { createdAt: "desc" }
    })

    res.json(reports.map(normalizeReport))
  } catch (error) {
    next(error)
  }
}

export async function createReport(req, res, next) {
  try {
    const payload = createReportSchema.parse(req.body)
    const hospitalId = req.user.role === "MEDICO" ? req.user.hospitalAtualId : payload.hospitalId

    if (!hospitalId) {
      res.status(400).json({ message: "Medico sem hospital atual configurado" })
      return
    }

    if (req.user.role === "MEDICO" && payload.hospitalId !== hospitalId) {
      res.status(403).json({ message: "Hospital nao permitido para este medico" })
      return
    }

    const report = await prisma.relatoriosFila.create({
      data: {
        hospitalId,
        medicoId: req.user.id,
        pacienteNome: payload.pacienteNome,
        mensagemFinal: payload.mensagemFinal,
        cid: payload.cid || null,
        status: ReportStatus.PENDENTE
      }
    })

    res.status(201).json(normalizeReport(report))
  } catch (error) {
    next(error)
  }
}

export async function completeReports(ids) {
  if (!ids.length) {
    return
  }

  await prisma.relatoriosFila.updateMany({
    where: {
      id: { in: ids }
    },
      data: {
        status: ReportStatus.CONCLUIDO,
        impressoEm: new Date()
      }
  })
}
