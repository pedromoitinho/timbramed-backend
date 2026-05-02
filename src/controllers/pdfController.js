import { z } from "zod"
import { prisma } from "../lib/prisma.js"
import { createBatchReportPdf } from "../services/pdfReportService.js"
import { completeReports } from "./reportController.js"

const patientSchema = z.object({
  id: z.string().optional().nullable(),
  pacienteNome: z.string().min(2),
  sintomaId: z.string().optional().nullable(),
  sintomaNome: z.string().optional().nullable(),
  mensagemFinal: z.string().optional(),
  mensagem: z.string().optional(),
  cid: z.string().optional().nullable(),
  dataRelatorio: z.string().optional().nullable(),
  data: z.string().optional().nullable(),
  medicoNome: z.string().optional().nullable()
})

const generatePdfSchema = z.object({
  hospitalId: z.string().min(1),
  pacientes: z.array(patientSchema).min(1)
})

export async function generatePdf(req, res, next) {
  try {
    const payload = generatePdfSchema.parse(req.body)
    const hospital = await prisma.hospital.findUnique({
      where: { id: payload.hospitalId },
      include: { coordenadas: true }
    })

    if (!hospital) {
      res.status(404).json({ message: "Hospital não encontrado" })
      return
    }

    const patients = payload.pacientes.map(patient => ({
      ...patient,
      mensagemFinal: patient.mensagemFinal || patient.mensagem || "",
      dataRelatorio: patient.dataRelatorio || patient.data || new Date().toISOString()
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
