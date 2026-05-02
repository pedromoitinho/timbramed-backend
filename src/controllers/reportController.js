import { z } from "zod"
import { ReportStatus } from "@prisma/client"
import { prisma } from "../lib/prisma.js"
import { normalizeReport } from "../utils/serializers.js"

const createReportSchema = z.object({
  hospitalId: z.string().min(1),
  medicoId: z.string().optional().nullable(),
  sintomaId: z.string().optional().nullable(),
  pacienteNome: z.string().min(2),
  mensagemFinal: z.string().min(5),
  cid: z.string().optional().nullable()
})

export async function listReports(req, res, next) {
  try {
    const status = req.query.status && Object.values(ReportStatus).includes(req.query.status) ? req.query.status : undefined
    const hospitalId = req.query.hospitalId ? String(req.query.hospitalId) : undefined
    const reports = await prisma.relatoriosFila.findMany({
      where: {
        hospitalId,
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
    const symptom = payload.sintomaId
      ? await prisma.sintoma.findUnique({ where: { id: payload.sintomaId } })
      : null

    const report = await prisma.relatoriosFila.create({
      data: {
        hospitalId: payload.hospitalId,
        medicoId: payload.medicoId || null,
        sintomaId: payload.sintomaId || null,
        pacienteNome: payload.pacienteNome,
        sintomaNome: symptom?.nome || null,
        mensagemFinal: payload.mensagemFinal,
        cid: payload.cid || symptom?.cid || null,
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

