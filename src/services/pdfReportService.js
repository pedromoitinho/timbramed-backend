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

function computeBodyFontSize(doc, text, width, maxHeight) {
  let size = bodyFontSize
  while (size >= 7) {
    doc.fontSize(size)
    const h = doc.heightOfString(text, { width, lineGap: 3 })
    if (h <= maxHeight) return size
    size -= 0.5
  }
  return 7
}

function drawBackgroundIfNeeded(doc, hospital) {
  if (!hospital.relatorioImagem) {
    return
  }

  const buffer = dataUrlToBuffer(hospital.relatorioImagem)

  if (!buffer) {
    return
  }

  try {
    doc.image(buffer, 0, 0, {
      width: a5PageSize[0],
      height: a5PageSize[1]
    })
  } catch {
  }
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
  const signatureBuffer = dataUrlToBuffer(hospital.assinaturaImagem)

  doc.font("hospital-font").fillColor(inkColor)

  doc.fontSize(titleFontSize).text("RELATÓRIO", cmToPt(coordinates.tituloXcm), cartesianYToPdfPt(coordinates.tituloYcm), {
    lineBreak: false
  })

  const bodyText = buildBodyText(patient)
  const bodyFontSizeFinal = computeBodyFontSize(doc, bodyText, bodyWidth, bodyHeight)

  doc.fontSize(bodyFontSizeFinal).text(bodyText, cmToPt(coordinates.corpoXcm), cartesianYToPdfPt(coordinates.corpoYcm), {
    width: bodyWidth,
    height: bodyHeight,
    lineGap: 3
  })

  doc.fontSize(bodyFontSize).text(cidText, cmToPt(coordinates.cidXcm), cartesianYToPdfPt(coordinates.cidYcm), {
    lineBreak: false
  })

  doc.fontSize(bodyFontSize).text(closingText, cmToPt(coordinates.encerramentoXcm), cartesianYToPdfPt(coordinates.encerramentoYcm), {
    width: closingWidth,
    lineGap: 2
  })

  if (stampBuffer) {
    try {
      doc.image(stampBuffer, cmToPt(coordinates.carimboXcm), cartesianYToPdfPt(coordinates.carimboYcm), {
        fit: [stampWidth, cmToPt(2.4)]
      })
    } catch {
      doc.font("hospital-font").fillColor(inkColor)
      doc.text(stampText, cmToPt(coordinates.carimboXcm), cartesianYToPdfPt(coordinates.carimboYcm), {
        width: stampWidth,
        align: "center"
      })
    }
  } else {
    doc.text(stampText, cmToPt(coordinates.carimboXcm), cartesianYToPdfPt(coordinates.carimboYcm), {
      width: stampWidth,
      align: "center"
    })
  }

  if (signatureBuffer) {
    try {
      doc.image(signatureBuffer, cmToPt(coordinates.carimboXcm), cartesianYToPdfPt(coordinates.carimboYcm), {
        fit: [stampWidth, cmToPt(2.4)]
      })
    } catch {
    }
  }
}

export function createBatchReportPdf({ hospital, patients, comRelatorio }) {
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

      if (comRelatorio) {
        drawBackgroundIfNeeded(doc, hospital)
      }

      drawPatientReport(doc, hospital, patient)

      if (index < patients.length - 1) {
        doc.addPage()
      }
    })

    doc.end()
  })
}
