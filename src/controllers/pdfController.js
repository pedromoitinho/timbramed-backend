import { z } from "zod"
import { prisma } from "../lib/prisma.js"
import { createBatchReportPdf } from "../services/pdfReportService.js"
import { createExamPdf } from "../services/pdfExamService.js"
import { completeReports } from "./reportController.js"

function firstResult(rows) {
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}

async function findReportCoordinates(hospitalId) {
  const rows = await prisma.$queryRaw`
    SELECT
      id,
      hospital_id AS "hospitalId",
      titulo_x_cm AS "tituloXcm",
      titulo_y_cm AS "tituloYcm",
      corpo_x_cm AS "corpoXcm",
      corpo_y_cm AS "corpoYcm",
      corpo_max_x_cm AS "corpoMaxXcm",
      corpo_limite_inferior_y_cm AS "corpoLimiteInferiorYcm",
      corpo_fonte_px AS "corpoFontePx",
      cid_x_cm AS "cidXcm",
      cid_y_cm AS "cidYcm",
      carimbo_x_cm AS "carimboXcm",
      carimbo_y_cm AS "carimboYcm",
      data_x_cm AS "dataXcm",
      data_y_cm AS "dataYcm",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM coordenadas
    WHERE hospital_id = ${hospitalId}
    LIMIT 1
  `

  return firstResult(rows)
}

async function findExamCoordinates(hospitalId) {
  const rows = await prisma.$queryRaw`
    SELECT
      id,
      hospital_id AS "hospitalId",
      nome_x_cm AS "nomeXcm",
      nome_y_cm AS "nomeYcm",
      endereco_x_cm AS "enderecoXcm",
      endereco_y_cm AS "enderecoYcm",
      identidade_x_cm AS "identidadeXcm",
      identidade_y_cm AS "identidadeYcm",
      motivo_x_cm AS "motivoXcm",
      motivo_y_cm AS "motivoYcm",
      exame_solicitado_x_cm AS "exameSolicitadoXcm",
      exame_solicitado_y_cm AS "exameSolicitadoYcm",
      codigo_x_cm AS "codigoXcm",
      codigo_y_cm AS "codigoYcm",
      paciente_x_cm AS "pacienteXcm",
      paciente_y_cm AS "pacienteYcm",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM coordenadas_exame
    WHERE hospital_id = ${hospitalId}
    LIMIT 1
  `

  return firstResult(rows)
}

function sendPdf(res, pdf, filename) {
  res.setHeader("Content-Type", "application/pdf")
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
  res.setHeader("Content-Length", pdf.length)
  res.end(pdf)
}

const patientSchema = z.object({
  id: z.string().optional().nullable(),
  pacienteNome: z.string().trim().min(2).max(120),
  mensagemFinal: z.string().trim().max(4000).optional(),
  mensagem: z.string().trim().max(4000).optional(),
  cid: z.string().trim().max(120).optional().nullable(),
  dataRelatorio: z.string().optional().nullable(),
  data: z.string().optional().nullable(),
  medicoNome: z.string().trim().max(120).optional().nullable(),
  comCarimbo: z.boolean().optional().default(true),
  comData: z.boolean().optional().default(true)
})

const generatePdfSchema = z.object({
  hospitalId: z.string().min(1),
  pacientes: z.array(patientSchema).min(1),
  comRelatorio: z.boolean().optional().default(false)
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
      where: { id: hospitalId }
    })

    if (!hospital) {
      res.status(404).json({ message: "Hospital nao encontrado" })
      return
    }

    const coordenadas = await findReportCoordinates(hospitalId)

    if (!coordenadas) {
      res.status(400).json({ message: "Hospital sem coordenadas configuradas" })
      return
    }

    const patients = payload.pacientes.map(patient => ({
      ...patient,
      mensagemFinal: patient.mensagemFinal || patient.mensagem || "",
      dataRelatorio: patient.dataRelatorio || patient.data || new Date().toISOString(),
      medicoNome: patient.medicoNome || req.user.nome
    }))

    const pdf = await createBatchReportPdf({ hospital: { ...hospital, coordenadas }, patients, comRelatorio: payload.comRelatorio })

    await completeReports(hospitalId, patients.filter(patient => patient.id))

    sendPdf(res, pdf, `timbramed-${Date.now()}.pdf`)
  } catch (error) {
    next(error)
  }
}

const examPatientSchema = z.object({
  nome: z.string().trim().max(120).default(""),
  endereco: z.string().trim().max(200).default(""),
  identidade: z.string().trim().max(60).default(""),
  motivo: z.string().trim().max(500).default(""),
  exameSolicitado: z.string().trim().max(200).default(""),
  codigo: z.string().trim().max(60).default(""),
  paciente: z.string().trim().max(120).default("")
})

const generateExamPdfSchema = z.object({
  hospitalId: z.string().min(1),
  paciente: examPatientSchema,
  comExame: z.boolean().optional().default(false)
})

export async function generateExamPdf(req, res, next) {
  try {
    const payload = generateExamPdfSchema.parse(req.body)
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
      where: { id: hospitalId }
    })

    if (!hospital) {
      res.status(404).json({ message: "Hospital nao encontrado" })
      return
    }

    let coordenadasExame = null

    try {
      coordenadasExame = await findExamCoordinates(hospitalId)
    } catch (error) {
      if (!["P2021", "P2022"].includes(error?.code)) {
        throw error
      }
    }

    if (!coordenadasExame) {
      res.status(400).json({ message: "Hospital sem coordenadas de exame configuradas" })
      return
    }

    const pdf = await createExamPdf({ hospital: { ...hospital, coordenadasExame }, paciente: payload.paciente, comExame: payload.comExame })

    sendPdf(res, pdf, `exame-${Date.now()}.pdf`)
  } catch (error) {
    next(error)
  }
}
