import { z } from "zod"
import { prisma } from "../lib/prisma.js"

const coordinatesSchema = z.object({
  tituloXcm: z.coerce.number().min(0).max(14.8),
  tituloYcm: z.coerce.number().min(-21).max(0),
  corpoXcm: z.coerce.number().min(0).max(14.8),
  corpoYcm: z.coerce.number().min(-21).max(0),
  corpoMaxXcm: z.coerce.number().min(0).max(14.8),
  corpoLimiteInferiorYcm: z.coerce.number().min(-21).max(0),
  corpoFontePx: z.coerce.number().min(8).max(30).default(17),
  cidXcm: z.coerce.number().min(0).max(14.8),
  cidYcm: z.coerce.number().min(-21).max(0),
  carimboXcm: z.coerce.number().min(0).max(14.8),
  carimboYcm: z.coerce.number().min(-21).max(0),
  dataXcm: z.coerce.number().min(0).max(14.8).nullable().optional(),
  dataYcm: z.coerce.number().min(-21).max(0).nullable().optional()
}).superRefine((value, context) => {
  if (value.corpoMaxXcm <= value.corpoXcm) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["corpoMaxXcm"],
      message: "corpoMaxXcm deve ser maior que corpoXcm"
    })
  }

  if (value.corpoLimiteInferiorYcm >= value.corpoYcm) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["corpoLimiteInferiorYcm"],
      message: "corpoLimiteInferiorYcm deve ficar abaixo de corpoYcm"
    })
  }
})

const stampSchema = z.object({
  carimboImagem: z.string().startsWith("data:image/png;base64,").max(8000000).nullable()
})

const reportImageSchema = z.object({
  relatorioImagem: z.string().startsWith("data:").max(16000000).nullable()
})

const signatureSchema = z.object({
  assinaturaImagem: z.string().startsWith("data:image/png;base64,").max(8000000).nullable()
})

const examImageSchema = z.object({
  exameImagem: z.string().startsWith("data:").max(16000000).nullable()
})

function canAccessHospital(req, hospitalId) {
  return req.user.hospitalAtualId === hospitalId || req.user.role === "ADMIN"
}

function firstResult(rows) {
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}

async function findCoordinates(hospitalId) {
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

export async function listHospitals(req, res, next) {
  try {
    const where = req.user.hospitalAtualId ? { id: req.user.hospitalAtualId } : undefined
    const hospitals = await prisma.hospital.findMany({
      where,
      select: {
        id: true,
        nome: true,
        larguraCm: true,
        alturaCm: true,
        fonteArquivo: true
      },
      orderBy: { nome: "asc" }
    })

    res.json(hospitals)
  } catch (error) {
    next(error)
  }
}

export async function getHospital(req, res, next) {
  try {
    if (!canAccessHospital(req, req.params.id)) {
      res.status(403).json({ message: "Hospital nao permitido para este medico" })
      return
    }

    const hospital = await prisma.hospital.findUnique({
      where: { id: req.params.id }
    })

    if (!hospital) {
      res.status(404).json({ message: "Hospital nao encontrado" })
      return
    }

    const [coordenadas, cids] = await Promise.all([
      findCoordinates(req.params.id),
      prisma.cid.findMany({
        where: { hospitalId: req.params.id },
        orderBy: { codigo: "asc" }
      })
    ])

    let coordenadasExame = null

    try {
      coordenadasExame = await findExamCoordinates(req.params.id)
    } catch (error) {
      if (!["P2021", "P2022"].includes(error?.code)) {
        throw error
      }
    }

    res.json({
      ...hospital,
      coordenadas,
      cids,
      coordenadasExame
    })
  } catch (error) {
    next(error)
  }
}

export async function updateHospitalCoordinates(req, res, next) {
  try {
    if (!canAccessHospital(req, req.params.id)) {
      res.status(403).json({ message: "Hospital nao permitido para este medico" })
      return
    }

    const payload = coordinatesSchema.parse(req.body)
    const coordinates = await prisma.coordenadas.upsert({
      where: { hospitalId: req.params.id },
      create: {
        hospitalId: req.params.id,
        ...payload
      },
      update: payload
    })

    res.json(coordinates)
  } catch (error) {
    next(error)
  }
}

export async function updateHospitalStamp(req, res, next) {
  try {
    if (!canAccessHospital(req, req.params.id)) {
      res.status(403).json({ message: "Hospital nao permitido para este medico" })
      return
    }

    const payload = stampSchema.parse(req.body)
    const hospital = await prisma.hospital.update({
      where: { id: req.params.id },
      data: {
        carimboImagem: payload.carimboImagem
      },
      include: {
        coordenadas: true,
        cids: { orderBy: { codigo: "asc" } }
      }
    })

    res.json(hospital)
  } catch (error) {
    next(error)
  }
}

export async function updateHospitalReport(req, res, next) {
  try {
    if (!canAccessHospital(req, req.params.id)) {
      res.status(403).json({ message: "Hospital nao permitido para este medico" })
      return
    }

    const payload = reportImageSchema.parse(req.body)
    const hospital = await prisma.hospital.update({
      where: { id: req.params.id },
      data: {
        relatorioImagem: payload.relatorioImagem
      },
      include: {
        coordenadas: true,
        cids: { orderBy: { codigo: "asc" } }
      }
    })

    res.json(hospital)
  } catch (error) {
    next(error)
  }
}

export async function updateHospitalSignature(req, res, next) {
  try {
    if (!canAccessHospital(req, req.params.id)) {
      res.status(403).json({ message: "Hospital nao permitido para este medico" })
      return
    }

    const payload = signatureSchema.parse(req.body)
    const hospital = await prisma.hospital.update({
      where: { id: req.params.id },
      data: {
        assinaturaImagem: payload.assinaturaImagem
      },
      include: {
        coordenadas: true,
        cids: { orderBy: { codigo: "asc" } }
      }
    })

    res.json(hospital)
  } catch (error) {
    next(error)
  }
}

export async function updateHospitalExamImage(req, res, next) {
  try {
    if (!canAccessHospital(req, req.params.id)) {
      res.status(403).json({ message: "Hospital nao permitido para este medico" })
      return
    }

    const payload = examImageSchema.parse(req.body)
    const hospital = await prisma.hospital.update({
      where: { id: req.params.id },
      data: {
        exameImagem: payload.exameImagem
      },
      include: {
        coordenadas: true,
        coordenadasExame: true,
        cids: { orderBy: { codigo: "asc" } }
      }
    })

    res.json(hospital)
  } catch (error) {
    next(error)
  }
}

const examCoordinatesSchema = z.object({
  nomeXcm: z.coerce.number().min(0).max(14.8),
  nomeYcm: z.coerce.number().min(-21).max(0),
  enderecoXcm: z.coerce.number().min(0).max(14.8),
  enderecoYcm: z.coerce.number().min(-21).max(0),
  identidadeXcm: z.coerce.number().min(0).max(14.8),
  identidadeYcm: z.coerce.number().min(-21).max(0),
  motivoXcm: z.coerce.number().min(0).max(14.8),
  motivoYcm: z.coerce.number().min(-21).max(0),
  exameSolicitadoXcm: z.coerce.number().min(0).max(14.8),
  exameSolicitadoYcm: z.coerce.number().min(-21).max(0),
  codigoXcm: z.coerce.number().min(0).max(14.8),
  codigoYcm: z.coerce.number().min(-21).max(0),
  pacienteXcm: z.coerce.number().min(0).max(14.8),
  pacienteYcm: z.coerce.number().min(-21).max(0)
})

export async function updateHospitalExamCoordinates(req, res, next) {
  try {
    if (!canAccessHospital(req, req.params.id)) {
      res.status(403).json({ message: "Hospital nao permitido para este medico" })
      return
    }

    const payload = examCoordinatesSchema.parse(req.body)
    const coordinates = await prisma.coordenadasExame.upsert({
      where: { hospitalId: req.params.id },
      create: {
        hospitalId: req.params.id,
        ...payload
      },
      update: payload
    })

    res.json(coordinates)
  } catch (error) {
    next(error)
  }
}
