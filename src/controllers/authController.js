import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { z } from "zod"
import { SubscriptionStatus } from "@prisma/client"
import { prisma } from "../lib/prisma.js"
import { sanitizeUser } from "../utils/auth.js"
import { isValidCpf, isValidCrm, normalizeCpf, normalizeCrm } from "../utils/documents.js"
import { resolveJwtSecret } from "../utils/jwt.js"

const loginSchema = z.object({
  email: z.string().trim().email().max(160),
  senha: z.string().min(1).max(128)
})

const registerSchema = z.object({
  cpf: z.string().trim().max(20).refine(isValidCpf, "CPF invalido"),
  nome: z.string().trim().min(3).max(120),
  endereco: z.string().trim().min(5).max(220),
  email: z.string().trim().email().max(160),
  senha: z.string().min(8).max(128),
  crm: z.string().trim().max(20).refine(isValidCrm, "CRM invalido. Use numero + UF, ex: 123456/BA")
})

const defaultCoordinates = {
  tituloXcm: 5.5,
  tituloYcm: -3.5,
  corpoXcm: 1.5,
  corpoYcm: -4.8,
  corpoMaxXcm: 14.3,
  corpoLimiteInferiorYcm: -14.5,
  cidXcm: 1.5,
  cidYcm: -16.3,
  encerramentoXcm: 9,
  encerramentoYcm: -15.5,
  carimboXcm: 9.5,
  carimboYcm: -17.5
}

function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role
    },
    resolveJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "8h",
      algorithm: "HS256"
    }
  )
}

export async function register(req, res, next) {
  try {
    const payload = registerSchema.parse(req.body)
    const cpf = normalizeCpf(payload.cpf)
    const crm = normalizeCrm(payload.crm)
    const email = payload.email.toLowerCase()
    const existing = await prisma.usuario.findFirst({
      where: {
        OR: [
          { cpf },
          { crm },
          { email }
        ]
      }
    })

    if (existing?.cpf === cpf) {
      res.status(409).json({ message: "CPF ja cadastrado" })
      return
    }

    if (existing?.crm === crm) {
      res.status(409).json({ message: "CRM ja cadastrado" })
      return
    }

    if (existing?.email === email) {
      res.status(409).json({ message: "E-mail ja cadastrado" })
      return
    }

    const senhaHash = await bcrypt.hash(payload.senha, 12)
    const user = await prisma.$transaction(async tx => {
      const hospital = await tx.hospital.create({
        data: {
          nome: `Consultorio ${payload.nome}`,
          larguraCm: 14.8,
          alturaCm: 21,
          fonteArquivo: "SourceSerif4.ttf",
          coordenadas: {
            create: defaultCoordinates
          }
        }
      })

      return tx.usuario.create({
        data: {
          nome: payload.nome,
          login: email,
          cpf,
          endereco: payload.endereco,
          crm,
          email,
          senhaHash,
          subscriptionStatus: SubscriptionStatus.PENDING_PAYMENT,
          hospitalAtualId: hospital.id
        },
        include: {
          hospitalAtual: true
        }
      })
    })

    res.status(201).json({
      token: createToken(user),
      user: sanitizeUser(user)
    })
  } catch (error) {
    next(error)
  }
}

export async function login(req, res, next) {
  try {
    const payload = loginSchema.parse(req.body)
    const user = await prisma.usuario.findFirst({
      where: {
        email: payload.email.toLowerCase()
      },
      include: {
        hospitalAtual: true
      }
    })

    if (!user) {
      res.status(401).json({ message: "Login ou senha invalidos" })
      return
    }

    const validPassword = await bcrypt.compare(payload.senha, user.senhaHash)

    if (!validPassword) {
      res.status(401).json({ message: "Login ou senha invalidos" })
      return
    }

    res.json({
      token: createToken(user),
      user: sanitizeUser(user)
    })
  } catch (error) {
    next(error)
  }
}

export async function me(req, res, next) {
  try {
    const user = await prisma.usuario.findUnique({
      where: { id: req.user.id },
      include: {
        hospitalAtual: true
      }
    })

    if (!user) {
      res.status(404).json({ message: "Usuario nao encontrado" })
      return
    }

    res.json(sanitizeUser(user))
  } catch (error) {
    next(error)
  }
}
