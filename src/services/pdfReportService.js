import PDFDocument from "pdfkit"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { cartesianYToPdfPt, cmToPt, heightFromCartesianRange, widthFromCartesianRange } from "../utils/pdfCoordinates.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const fontsDirectory = path.resolve(__dirname, "../../assets/fonts")
const inkColor = "#1E1E8C"
const handwritingFontSize = 19

function resolveFontPath(fontFileName) {
  const safeFontFileName = path.basename(fontFileName)
  return path.join(fontsDirectory, safeFontFileName)
}

function formatDate(value) {
  const date = value ? new Date(value) : new Date()
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(date)
}

function buildBodyText(patient) {
  const patientName = patient.pacienteNome || patient.nomePaciente
  const message = patient.mensagemFinal || patient.mensagem || ""
  return [`Paciente: ${patientName}`, "", message].filter(Boolean).join("\n")
}

function drawPatientReport(doc, hospital, patient) {
  const coordinates = hospital.coordenadas
  const bodyWidth = widthFromCartesianRange(coordinates.corpoXcm, coordinates.corpoMaxXcm)
  const bodyHeight = heightFromCartesianRange(coordinates.corpoYcm, coordinates.corpoLimiteInferiorYcm)
  const dateLabel = formatDate(patient.dataRelatorio || patient.data)
  const closingText = `Atenciosamente,\nFSA ${dateLabel}`
  const stampText = patient.medicoNome || "Dr. FSA"
  const cidText = patient.cid ? `CID: ${patient.cid}` : "CID:"
  const closingWidth = cmToPt(Number(hospital.larguraCm) - Number(coordinates.encerramentoXcm))
  const stampWidth = cmToPt(Number(hospital.larguraCm) - Number(coordinates.carimboXcm))

  doc.font("hospital-font").fillColor(inkColor).fontSize(handwritingFontSize)

  doc.text("RELATÓRIO", cmToPt(coordinates.tituloXcm), cartesianYToPdfPt(coordinates.tituloYcm), {
    lineBreak: false
  })

  doc.text(buildBodyText(patient), cmToPt(coordinates.corpoXcm), cartesianYToPdfPt(coordinates.corpoYcm), {
    width: bodyWidth,
    height: bodyHeight,
    lineGap: 2
  })

  doc.text(cidText, cmToPt(coordinates.cidXcm), cartesianYToPdfPt(coordinates.cidYcm), {
    lineBreak: false
  })

  doc.text(closingText, cmToPt(coordinates.encerramentoXcm), cartesianYToPdfPt(coordinates.encerramentoYcm), {
    width: closingWidth,
    lineGap: 1
  })

  doc.text(stampText, cmToPt(coordinates.carimboXcm), cartesianYToPdfPt(coordinates.carimboYcm), {
    width: stampWidth,
    align: "center"
  })
}

export function createBatchReportPdf({ hospital, patients }) {
  return new Promise((resolve, reject) => {
    if (!hospital?.coordenadas) {
      reject(new Error("Hospital sem coordenadas configuradas"))
      return
    }

    if (!Array.isArray(patients) || patients.length === 0) {
      reject(new Error("Nenhum paciente recebido para impressão"))
      return
    }

    const fontPath = resolveFontPath(hospital.fonteArquivo)

    if (!fs.existsSync(fontPath)) {
      reject(new Error(`Fonte customizada não encontrada: ${hospital.fonteArquivo}`))
      return
    }

    const chunks = []
    const doc = new PDFDocument({
      autoFirstPage: false,
      margin: 0,
      size: [cmToPt(hospital.larguraCm), cmToPt(hospital.alturaCm)]
    })

    doc.on("data", chunk => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    doc.registerFont("hospital-font", fontPath)

    patients.forEach((patient, index) => {
      if (index === 0) {
        doc.addPage()
      }

      drawPatientReport(doc, hospital, patient)

      if (index < patients.length - 1) {
        doc.addPage()
      }
    })

    doc.end()
  })
}
