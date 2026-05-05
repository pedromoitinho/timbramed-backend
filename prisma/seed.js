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
  cidXcm: 1.5,
  cidYcm: -16.3,
  encerramentoXcm: 9.0,
  encerramentoYcm: -15.5,
  carimboXcm: 9.5,
  carimboYcm: -17.5
}

const catalogo = [
  {
    sintoma: "Dor toracica",
    cid: "R07.4",
    mensagem: "Paciente avaliado em consulta clinica, referindo dor toracica inespecifica. Encontra-se orientado, estavel e sem sinais de alarme no momento da avaliacao. Recomenda-se acompanhamento clinico e retorno em caso de piora dos sintomas."
  },
  {
    sintoma: "Cefaleia",
    cid: "R51",
    mensagem: "Paciente avaliado por quadro de cefaleia. No momento, apresenta-se em bom estado geral, sem deficits neurologicos focais observados durante o atendimento. Orientado quanto as medidas clinicas e sinais de alerta."
  },
  {
    sintoma: "Sintomas gripais",
    cid: "J11",
    mensagem: "Paciente avaliado com sintomas respiratorios leves compativeis com sindrome gripal. Orientado quanto a hidratacao, repouso, medidas sintomaticas e retorno se houver febre persistente, falta de ar ou piora clinica."
  }
]

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

  for (const item of catalogo) {
    const cid = await prisma.cid.upsert({
      where: {
        hospitalId_codigo: {
          hospitalId: hospital.id,
          codigo: item.cid
        }
      },
      update: { codigo: item.cid },
      create: {
        hospitalId: hospital.id,
        codigo: item.cid
      }
    })

    const sintoma = await prisma.sintoma.upsert({
      where: {
        hospitalId_nome: {
          hospitalId: hospital.id,
          nome: item.sintoma
        }
      },
      update: {
        nome: item.sintoma,
        cidId: cid.id,
        cid: null,
        mensagemPredeterminada: null
      },
      create: {
        hospitalId: hospital.id,
        nome: item.sintoma,
        cidId: cid.id,
        cid: null,
        mensagemPredeterminada: null
      }
    })

    await prisma.mensagemPredefinida.upsert({
      where: {
        hospitalId_titulo: {
          hospitalId: hospital.id,
          titulo: item.sintoma
        }
      },
      update: {
        sintomaId: sintoma.id,
        titulo: item.sintoma,
        texto: item.mensagem
      },
      create: {
        hospitalId: hospital.id,
        sintomaId: sintoma.id,
        titulo: item.sintoma,
        texto: item.mensagem
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
