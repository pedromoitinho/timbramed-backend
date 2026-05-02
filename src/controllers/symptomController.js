import { z } from "zod"
import { prisma } from "../lib/prisma.js"

const symptomSchema = z.object({
  nome: z.string().min(2),
  cid: z.string().optional().nullable(),
  mensagemPredeterminada: z.string().min(5)
})

export async function listSymptomsByHospital(req, res, next) {
  try {
    const symptoms = await prisma.sintoma.findMany({
      where: { hospitalId: req.params.hospitalId },
      orderBy: { nome: "asc" }
    })

    res.json(symptoms)
  } catch (error) {
    next(error)
  }
}

export async function createSymptom(req, res, next) {
  try {
    const payload = symptomSchema.parse(req.body)
    const symptom = await prisma.sintoma.create({
      data: {
        hospitalId: req.params.hospitalId,
        nome: payload.nome,
        cid: payload.cid || null,
        mensagemPredeterminada: payload.mensagemPredeterminada
      }
    })

    res.status(201).json(symptom)
  } catch (error) {
    next(error)
  }
}

export async function updateSymptom(req, res, next) {
  try {
    const payload = symptomSchema.parse(req.body)
    const symptom = await prisma.sintoma.update({
      where: { id: req.params.id },
      data: {
        nome: payload.nome,
        cid: payload.cid || null,
        mensagemPredeterminada: payload.mensagemPredeterminada
      }
    })

    res.json(symptom)
  } catch (error) {
    next(error)
  }
}

export async function deleteSymptom(req, res, next) {
  try {
    await prisma.sintoma.delete({
      where: { id: req.params.id }
    })

    res.status(204).send()
  } catch (error) {
    next(error)
  }
}
