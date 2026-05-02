import { z } from "zod"
import { prisma } from "../lib/prisma.js"

const coordinatesSchema = z.object({
  tituloXcm: z.coerce.number(),
  tituloYcm: z.coerce.number(),
  corpoXcm: z.coerce.number(),
  corpoYcm: z.coerce.number(),
  corpoMaxXcm: z.coerce.number(),
  corpoLimiteInferiorYcm: z.coerce.number(),
  cidXcm: z.coerce.number(),
  cidYcm: z.coerce.number(),
  encerramentoXcm: z.coerce.number(),
  encerramentoYcm: z.coerce.number(),
  carimboXcm: z.coerce.number(),
  carimboYcm: z.coerce.number()
})

const hospitalSchema = z.object({
  nome: z.string().min(2),
  larguraCm: z.coerce.number().positive(),
  alturaCm: z.coerce.number().positive(),
  fonteArquivo: z.string().min(5),
  coordenadas: coordinatesSchema
})

export async function listHospitals(req, res, next) {
  try {
    const hospitals = await prisma.hospital.findMany({
      include: {
        coordenadas: true,
        sintomas: {
          orderBy: { nome: "asc" }
        }
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
    const hospital = await prisma.hospital.findUnique({
      where: { id: req.params.id },
      include: {
        coordenadas: true,
        sintomas: {
          orderBy: { nome: "asc" }
        }
      }
    })

    if (!hospital) {
      res.status(404).json({ message: "Hospital não encontrado" })
      return
    }

    res.json(hospital)
  } catch (error) {
    next(error)
  }
}

export async function createHospital(req, res, next) {
  try {
    const payload = hospitalSchema.parse(req.body)
    const hospital = await prisma.hospital.create({
      data: {
        nome: payload.nome,
        larguraCm: payload.larguraCm,
        alturaCm: payload.alturaCm,
        fonteArquivo: payload.fonteArquivo,
        coordenadas: {
          create: payload.coordenadas
        }
      },
      include: {
        coordenadas: true
      }
    })

    res.status(201).json(hospital)
  } catch (error) {
    next(error)
  }
}

export async function updateHospital(req, res, next) {
  try {
    const payload = hospitalSchema.parse(req.body)
    const hospital = await prisma.hospital.update({
      where: { id: req.params.id },
      data: {
        nome: payload.nome,
        larguraCm: payload.larguraCm,
        alturaCm: payload.alturaCm,
        fonteArquivo: payload.fonteArquivo,
        coordenadas: {
          upsert: {
            create: payload.coordenadas,
            update: payload.coordenadas
          }
        }
      },
      include: {
        coordenadas: true
      }
    })

    res.json(hospital)
  } catch (error) {
    next(error)
  }
}
