import { z } from "zod"
import { ReportStatus } from "@prisma/client"
import { prisma } from "../lib/prisma.js"
import { normalizeReport } from "../utils/serializers.js"

const reportDateSchema = z.coerce.date().refine(value => !Number.isNaN(value.getTime()), { message: "Data do relatorio invalida" })

const createReportSchema = z.object({
  hospitalId: z.string().min(1),
  pacienteNome: z.string().trim().min(2).max(120),
  mensagemFinal: z.string().trim().min(5).max(4000),
  cid: z.string().trim().max(120).optional().nullable(),
  dataRelatorio: reportDateSchema.optional().nullable(),
  comCarimbo: z.boolean().optional(),
  comData: z.boolean().optional()
})

const updateReportSchema = z.object({
  dataRelatorio: reportDateSchema.optional(),
  comCarimbo: z.boolean().optional(),
  comData: z.boolean().optional()
}).refine(value => Object.values(value).some(item => item !== undefined), { message: "Nenhum campo para atualizar" })

function resolveHospitalId(req, requestedHospitalId) {
  return req.user.role === "MEDICO" ? req.user.hospitalAtualId : requestedHospitalId
}

export async function listReports(req, res, next) {
  try {
    const status = req.query.status && Object.values(ReportStatus).includes(req.query.status) ? req.query.status : undefined
    const requestedHospitalId = req.query.hospitalId ? String(req.query.hospitalId) : undefined
    const hospitalId = resolveHospitalId(req, requestedHospitalId)
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
    const hospitalId = resolveHospitalId(req, payload.hospitalId)

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
        dataRelatorio: payload.dataRelatorio || undefined,
        comCarimbo: payload.comCarimbo ?? true,
        comData: payload.comData ?? true,
        status: ReportStatus.PENDENTE
      }
    })

    res.status(201).json(normalizeReport(report))
  } catch (error) {
    next(error)
  }
}

export async function updateReport(req, res, next) {
  try {
    const payload = updateReportSchema.parse(req.body)
    const existing = await prisma.relatoriosFila.findUnique({ where: { id: req.params.id } })

    if (!existing) {
      res.status(404).json({ message: "Relatorio nao encontrado" })
      return
    }

    if (req.user.role === "MEDICO" && existing.hospitalId !== req.user.hospitalAtualId) {
      res.status(403).json({ message: "Relatorio nao permitido para este medico" })
      return
    }

    const report = await prisma.relatoriosFila.update({
      where: { id: existing.id },
      data: {
        dataRelatorio: payload.dataRelatorio,
        comCarimbo: payload.comCarimbo,
        comData: payload.comData
      }
    })

    res.json(normalizeReport(report))
  } catch (error) {
    next(error)
  }
}

export async function completeReports(hospitalId, patients) {
  const printable = (patients || []).filter(patient => patient?.id)

  if (!printable.length) {
    return
  }

  const impressoEm = new Date()

  await prisma.$transaction(printable.map(patient => {
    const dataRelatorio = patient.dataRelatorio ? new Date(patient.dataRelatorio) : null

    return prisma.relatoriosFila.updateMany({
      where: { id: patient.id, hospitalId },
      data: {
        status: ReportStatus.CONCLUIDO,
        impressoEm,
        comCarimbo: patient.comCarimbo !== false,
        comData: patient.comData !== false,
        dataRelatorio: dataRelatorio && !Number.isNaN(dataRelatorio.getTime()) ? dataRelatorio : undefined
      }
    })
  }))
}
