import { PrismaClient, UserRole } from "@prisma/client"

const prisma = new PrismaClient()

const coordenadasCasaSantana = {
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

const sintomas = [
  {
    nome: "Dor torácica",
    cid: "R07.4",
    mensagemPredeterminada: "Paciente avaliado em consulta clínica, referindo dor torácica inespecífica. Encontra-se orientado, estável e sem sinais de alarme no momento da avaliação. Recomenda-se acompanhamento clínico e retorno em caso de piora dos sintomas."
  },
  {
    nome: "Cefaleia",
    cid: "R51",
    mensagemPredeterminada: "Paciente avaliado por quadro de cefaleia. No momento, apresenta-se em bom estado geral, sem déficits neurológicos focais observados durante o atendimento. Orientado quanto às medidas clínicas e sinais de alerta."
  },
  {
    nome: "Sintomas gripais",
    cid: "J11",
    mensagemPredeterminada: "Paciente avaliado com sintomas respiratórios leves compatíveis com síndrome gripal. Orientado quanto à hidratação, repouso, medidas sintomáticas e retorno se houver febre persistente, falta de ar ou piora clínica."
  }
]

async function main() {
  const hospital = await prisma.hospital.upsert({
    where: { nome: "Casa de Saúde Santana" },
    update: {
      larguraCm: 14.5,
      alturaCm: 20.8,
      fonteArquivo: "Caveat.ttf"
    },
    create: {
      nome: "Casa de Saúde Santana",
      larguraCm: 14.5,
      alturaCm: 20.8,
      fonteArquivo: "Caveat.ttf"
    }
  })

  await prisma.coordenadas.upsert({
    where: { hospitalId: hospital.id },
    update: coordenadasCasaSantana,
    create: {
      hospitalId: hospital.id,
      ...coordenadasCasaSantana
    }
  })

  for (const sintoma of sintomas) {
    await prisma.sintoma.upsert({
      where: {
        hospitalId_nome: {
          hospitalId: hospital.id,
          nome: sintoma.nome
        }
      },
      update: sintoma,
      create: {
        hospitalId: hospital.id,
        ...sintoma
      }
    })
  }

  await prisma.usuario.upsert({
    where: { email: "admin@timbramed.local" },
    update: {
      nome: "Administrador TimbraMed",
      role: UserRole.ADMIN,
      hospitalAtualId: hospital.id
    },
    create: {
      nome: "Administrador TimbraMed",
      email: "admin@timbramed.local",
      senhaHash: "dev-admin",
      role: UserRole.ADMIN,
      hospitalAtualId: hospital.id
    }
  })

  await prisma.usuario.upsert({
    where: { email: "medico@timbramed.local" },
    update: {
      nome: "Dr. FSA",
      role: UserRole.MEDICO,
      hospitalAtualId: hospital.id
    },
    create: {
      nome: "Dr. FSA",
      email: "medico@timbramed.local",
      senhaHash: "dev-medico",
      role: UserRole.MEDICO,
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
