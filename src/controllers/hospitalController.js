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
  carimboYcm: z.coerce.number().min(-21).max(0)
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
      where: { id: req.params.id },
      include: {
        coordenadas: true,
        coordenadasExame: true,
        cids: { orderBy: { codigo: "asc" } }
      }
    })

    if (!hospital) {
      res.status(404).json({ message: "Hospital nao encontrado" })
      return
    }

    res.json(hospital)
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
