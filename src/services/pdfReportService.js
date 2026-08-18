import PDFDocument from "pdfkit"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { cartesianYToPdfPt, cmToPt, heightFromCartesianRange, widthFromCartesianRange } from "../utils/pdfCoordinates.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const fontsDirectory = path.resolve(__dirname, "../../assets/fonts")
const inkColor = "#111111"
const minBodyFontSizePx = 4
const maxBodyFontSizePx = 30
const singleLineFontSize = 12.5
const titleFontSize = 13.5
const stampBoxHeightCm = 2.4
const a5PageCm = { width: 14.8, height: 21 }
const a5PageSize = "A5"
const reportTimeZone = process.env.REPORT_TIMEZONE || "America/Sao_Paulo"
const reportDateCity = "Feira de Santana"
const bodyTextOptions = {
  align: "justify",
  lineGap: 2,
  paragraphGap: 4
}

function resolveFontPath(fontFileName) {
  const safeFontFileName = path.basename(fontFileName || "SourceSerif4.ttf")
  return path.join(fontsDirectory, safeFontFileName)
}

function pxToPt(value) {
  return Number(value) * 0.75
}

function measureBodyTextHeightPx(doc, text, width, fontSizePx) {
  doc.fontSize(pxToPt(fontSizePx))
  return doc.heightOfString(text, {
    width,
    ...bodyTextOptions
  })
}

function resolveBodyFontSizePx(doc, text, width, maxHeight) {
  if (!text || width <= 0 || maxHeight <= 0) {
    return maxBodyFontSizePx
  }

  const safeMaxHeight = maxHeight * 0.96

  for (let size = maxBodyFontSizePx; size >= minBodyFontSizePx; size -= 0.25) {
    if (measureBodyTextHeightPx(doc, text, width, size) <= safeMaxHeight) {
      return size
    }
  }

  return minBodyFontSizePx
}

export function formatReportDate(value) {
  const date = value ? new Date(value) : new Date()
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date

  try {
    return new Intl.DateTimeFormat("pt-BR", { timeZone: reportTimeZone }).format(safeDate)
  } catch {
    return new Intl.DateTimeFormat("pt-BR").format(safeDate)
  }
}

export function buildReportDateText(value) {
  return `${reportDateCity}, ${formatReportDate(value)}`
}

function hasCoordinate(value) {
  return value !== null && value !== undefined && value !== "" && !Number.isNaN(Number(value))
}

function capitalizeName(value) {
  return String(value || "").trim().replace(/\b\w/g, c => c.toUpperCase())
}

function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/ +/g, " ")
    .trim()
}

function normalizeBodyText(value) {
  return normalizeWhitespace(value)
    .replace(/\s+-\s*/g, "\n-")
    .trim()
}

function buildBodyText(patient) {
  const patientName = patient.pacienteNome || patient.nomePaciente
  const message = patient.mensagemFinal || patient.mensagem || ""
  return [`Paciente: ${capitalizeName(patientName)}`, normalizeBodyText(message)].filter(Boolean).join("\n\n")
}

function dataUrlToBuffer(value) {
  const parts = String(value || "").split(",")

  if (parts.length < 2) {
    return null
  }

  return Buffer.from(parts[1], "base64")
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
      width: doc.page.width,
      height: doc.page.height
    })
  } catch {
  }
}

function drawPatientReport(doc, hospital, patient) {
  const coordinates = hospital.coordenadas
  const bodyWidth = widthFromCartesianRange(coordinates.corpoXcm, coordinates.corpoMaxXcm)
  const bodyHeight = heightFromCartesianRange(coordinates.corpoYcm, coordinates.corpoLimiteInferiorYcm)
  const bodyText = buildBodyText(patient)
  const stampText = patient.medicoNome || "Dr. FSA"
  const cidText = patient.cid ? `CID: ${patient.cid}` : "CID:"
  const titleWidth = cmToPt(a5PageCm.width - Number(coordinates.tituloXcm))
  const cidWidth = cmToPt(a5PageCm.width - Number(coordinates.cidXcm))
  const stampWidth = cmToPt(a5PageCm.width - Number(coordinates.carimboXcm))
  const stampHeight = cmToPt(stampBoxHeightCm)
  const stampBuffer = dataUrlToBuffer(hospital.carimboImagem)
  const signatureBuffer = dataUrlToBuffer(hospital.assinaturaImagem)
  const withStamp = patient.comCarimbo !== false
  const withDate = patient.comData !== false && hasCoordinate(coordinates.dataXcm) && hasCoordinate(coordinates.dataYcm)

  doc.font("hospital-font").fillColor(inkColor)
  const bodyFontSizePx = resolveBodyFontSizePx(doc, bodyText, bodyWidth, bodyHeight)
  const bodyFontSizePt = pxToPt(bodyFontSizePx)

  doc.fontSize(titleFontSize).text("RELATÓRIO", cmToPt(coordinates.tituloXcm), cartesianYToPdfPt(coordinates.tituloYcm), {
    width: titleWidth,
    height: cmToPt(0.8),
    lineBreak: false
  })

  doc.fontSize(bodyFontSizePt).text(bodyText, cmToPt(coordinates.corpoXcm), cartesianYToPdfPt(coordinates.corpoYcm), {
    width: bodyWidth,
    height: bodyHeight,
    ...bodyTextOptions
  })

  doc.fontSize(singleLineFontSize).text(cidText, cmToPt(coordinates.cidXcm), cartesianYToPdfPt(coordinates.cidYcm), {
    width: cidWidth,
    height: cmToPt(0.8),
    lineBreak: false
  })

  if (withDate) {
    const dateWidth = cmToPt(a5PageCm.width - Number(coordinates.dataXcm))
    doc.fontSize(singleLineFontSize).text(buildReportDateText(patient.dataRelatorio || patient.data), cmToPt(coordinates.dataXcm), cartesianYToPdfPt(coordinates.dataYcm), {
      width: dateWidth,
      height: cmToPt(0.8),
      lineBreak: false
    })
  }

  if (!withStamp) {
    return
  }

  if (stampBuffer) {
    try {
      doc.image(stampBuffer, cmToPt(coordinates.carimboXcm), cartesianYToPdfPt(coordinates.carimboYcm), {
        fit: [stampWidth, stampHeight]
      })
    } catch {
      doc.font("hospital-font").fillColor(inkColor).fontSize(singleLineFontSize)
      doc.text(stampText, cmToPt(coordinates.carimboXcm), cartesianYToPdfPt(coordinates.carimboYcm), {
        width: stampWidth,
        height: stampHeight,
        align: "center"
      })
    }
  } else {
    doc.fontSize(singleLineFontSize).text(stampText, cmToPt(coordinates.carimboXcm), cartesianYToPdfPt(coordinates.carimboYcm), {
      width: stampWidth,
      height: stampHeight,
      align: "center"
    })
  }

  if (signatureBuffer) {
    try {
      doc.image(signatureBuffer, cmToPt(coordinates.carimboXcm), cartesianYToPdfPt(coordinates.carimboYcm), {
        fit: [stampWidth, stampHeight]
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
      size: a5PageSize,
      layout: "portrait"
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
