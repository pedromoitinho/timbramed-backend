import PDFDocument from "pdfkit"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { cartesianYToPdfPt, cmToPt, heightFromCartesianRange, widthFromCartesianRange } from "../utils/pdfCoordinates.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const fontsDirectory = path.resolve(__dirname, "../../assets/fonts")
const inkColor = "#111111"
const bodyFontSize = 12.5
const titleFontSize = 13.5
const a5PageCm = { width: 14.8, height: 21 }
const a5PageSize = [cmToPt(a5PageCm.width), cmToPt(a5PageCm.height)]

function resolveFontPath(fontFileName) {
  const safeFontFileName = path.basename(fontFileName || "SourceSerif4.ttf")
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

function dataUrlToBuffer(value) {
  const parts = String(value || "").split(",")

  if (parts.length < 2) {
    return null
  }

  return Buffer.from(parts[1], "base64")
}

function drawPatientReport(doc, hospital, patient) {
  const coordinates = hospital.coordenadas
  const bodyWidth = widthFromCartesianRange(coordinates.corpoXcm, coordinates.corpoMaxXcm)
  const bodyHeight = heightFromCartesianRange(coordinates.corpoYcm, coordinates.corpoLimiteInferiorYcm)
  const dateLabel = formatDate(patient.dataRelatorio || patient.data)
  const closingText = `Atenciosamente,\nFSA ${dateLabel}`
  const stampText = patient.medicoNome || "Dr. FSA"
  const cidText = patient.cid ? `CID: ${patient.cid}` : "CID:"
  const closingWidth = cmToPt(a5PageCm.width - Number(coordinates.encerramentoXcm))
  const stampWidth = cmToPt(a5PageCm.width - Number(coordinates.carimboXcm))
  const stampBuffer = dataUrlToBuffer(hospital.carimboImagem)

  doc.font("hospital-font").fillColor(inkColor)

  doc.fontSize(titleFontSize).text("RELATORIO", cmToPt(coordinates.tituloXcm), cartesianYToPdfPt(coordinates.tituloYcm), {
    lineBreak: false
  })

  doc.fontSize(bodyFontSize).text(buildBodyText(patient), cmToPt(coordinates.corpoXcm), cartesianYToPdfPt(coordinates.corpoYcm), {
    width: bodyWidth,
    height: bodyHeight,
    lineGap: 3
  })

  doc.text(cidText, cmToPt(coordinates.cidXcm), cartesianYToPdfPt(coordinates.cidYcm), {
    lineBreak: false
  })

  doc.text(closingText, cmToPt(coordinates.encerramentoXcm), cartesianYToPdfPt(coordinates.encerramentoYcm), {
    width: closingWidth,
    lineGap: 2
  })

  if (stampBuffer) {
    try {
      doc.image(stampBuffer, cmToPt(coordinates.carimboXcm), cartesianYToPdfPt(coordinates.carimboYcm), {
        fit: [stampWidth, cmToPt(2.4)]
      })
      return
    } catch {
      doc.font("hospital-font").fillColor(inkColor)
    }
  }

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
      reject(new Error("Nenhum paciente recebido para impressao"))
      return
    }

    const fontPath = resolveFontPath(hospital.fonteArquivo)

    if (!fs.existsSync(fontPath)) {
      reject(new Error(`Fonte customizada nao encontrada: ${hospital.fonteArquivo}`))
      return
    }

    const chunks = []
    const doc = new PDFDocument({
      autoFirstPage: false,
      margin: 0,
      size: a5PageSize
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
