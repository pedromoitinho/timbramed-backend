import "dotenv/config"
import bcrypt from "bcryptjs"
import { PrismaClient, SubscriptionStatus, UserRole } from "@prisma/client"
import { createPrismaPgAdapter } from "../src/lib/prismaAdapter.js"

const prisma = new PrismaClient({ adapter: createPrismaPgAdapter() })

const coordenadasPadraoA5 = {
  tituloXcm: 5.5,
  tituloYcm: -3.5,
  corpoXcm: 1.5,
  corpoYcm: -4.8,
  corpoMaxXcm: 14.3,
  corpoLimiteInferiorYcm: -14.5,
  corpoFontePx: 17,
  cidXcm: 1.5,
  cidYcm: -16.3,
  carimboXcm: 9.5,
  carimboYcm: -17.5
}

const cidsIniciais = ["R07.4", "R51", "J11"]

async function main() {
  const medicoSenhaHash = await bcrypt.hash("Medico122*", 12)
  const adminSenhaHash = await bcrypt.hash("Bolas122*", 12)

  const hospital = await prisma.hospital.upsert({
    where: { nome: "Clinica TimbraMed" },
    update: {
      larguraCm: 14.8,
      alturaCm: 21,
      fonteArquivo: "SourceSerif4.ttf"
    },
    create: {
      nome: "Clinica TimbraMed",
      larguraCm: 14.8,
      alturaCm: 21,
      fonteArquivo: "SourceSerif4.ttf"
    }
  })

  await prisma.coordenadas.upsert({
    where: { hospitalId: hospital.id },
    update: coordenadasPadraoA5,
    create: {
      hospitalId: hospital.id,
      ...coordenadasPadraoA5
    }
  })

  for (const codigo of cidsIniciais) {
    await prisma.cid.upsert({
      where: {
        hospitalId_codigo: {
          hospitalId: hospital.id,
          codigo
        }
      },
      update: { codigo },
      create: {
        hospitalId: hospital.id,
        codigo
      }
    })
  }

  await prisma.usuario.upsert({
    where: { login: "admin" },
    update: {
      nome: "Medico TimbraMed",
      email: "admin@timbramed.local",
      senhaHash: adminSenhaHash,
      role: UserRole.MEDICO,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      hospitalAtualId: hospital.id
    },
    create: {
      nome: "Medico TimbraMed",
      login: "admin",
      email: "admin@timbramed.local",
      senhaHash: adminSenhaHash,
      role: UserRole.MEDICO,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      hospitalAtualId: hospital.id
    }
  })

  await prisma.usuario.upsert({
    where: { login: "medico@timbramed.local" },
    update: {
      nome: "Dr. FSA",
      email: "medico@timbramed.local",
      senhaHash: medicoSenhaHash,
      role: UserRole.MEDICO,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      hospitalAtualId: hospital.id
    },
    create: {
      nome: "Dr. FSA",
      login: "medico@timbramed.local",
      email: "medico@timbramed.local",
      senhaHash: medicoSenhaHash,
      role: UserRole.MEDICO,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      hospitalAtualId: hospital.id
    }
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async error => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
