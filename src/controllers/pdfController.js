import { z } from "zod"
import { prisma } from "../lib/prisma.js"
import { createBatchReportPdf } from "../services/pdfReportService.js"
import { completeReports } from "./reportController.js"

const patientSchema = z.object({
  id: z.string().optional().nullable(),
  pacienteNome: z.string().trim().min(2).max(120),
  mensagemFinal: z.string().trim().max(4000).optional(),
  mensagem: z.string().trim().max(4000).optional(),
  cid: z.string().trim().max(16).optional().nullable(),
  dataRelatorio: z.string().optional().nullable(),
  data: z.string().optional().nullable(),
  medicoNome: z.string().trim().max(120).optional().nullable()
})

const generatePdfSchema = z.object({
  hospitalId: z.string().min(1),
  pacientes: z.array(patientSchema).min(1)
})

export async function generatePdf(req, res, next) {
  try {
    const payload = generatePdfSchema.parse(req.body)
    const hospitalId = req.user.role === "MEDICO" ? req.user.hospitalAtualId : payload.hospitalId

    if (!hospitalId) {
      res.status(400).json({ message: "Medico sem hospital atual configurado" })
      return
    }

    if (req.user.role === "MEDICO" && payload.hospitalId !== hospitalId) {
      res.status(403).json({ message: "Hospital nao permitido para este medico" })
      return
    }

    const hospital = await prisma.hospital.findUnique({
      where: { id: hospitalId },
      include: { coordenadas: true }
    })

    if (!hospital) {
      res.status(404).json({ message: "Hospital nao encontrado" })
      return
    }

    const patients = payload.pacientes.map(patient => ({
      ...patient,
      mensagemFinal: patient.mensagemFinal || patient.mensagem || "",
      dataRelatorio: patient.dataRelatorio || patient.data || new Date().toISOString(),
      medicoNome: patient.medicoNome || req.user.nome
    }))

    const pdf = await createBatchReportPdf({ hospital, patients })
    const reportIds = patients.map(patient => patient.id).filter(Boolean)

    await completeReports(reportIds)

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `inline; filename="timbramed-${Date.now()}.pdf"`)
    res.setHeader("Content-Length", pdf.length)
    res.end(pdf)
  } catch (error) {
    next(error)
  }
}
