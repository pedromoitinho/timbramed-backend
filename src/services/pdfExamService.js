import PDFDocument from "pdfkit"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { cartesianYToPdfPt, cmToPt } from "../utils/pdfCoordinates.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const fontsDirectory = path.resolve(__dirname, "../../assets/fonts")
const inkColor = "#111111"
const bodyFontSize = 11
const a5PageCm = { width: 14.8, height: 21 }
const a5PageSize = [cmToPt(a5PageCm.width), cmToPt(a5PageCm.height)]

function resolveFontPath(fontFileName) {
  const safeFontFileName = path.basename(fontFileName || "SourceSerif4.ttf")
  return path.join(fontsDirectory, safeFontFileName)
}

function dataUrlToBuffer(value) {
  const parts = String(value || "").split(",")
  if (parts.length < 2) return null
  return Buffer.from(parts[1], "base64")
}

function drawBackgroundIfNeeded(doc, hospital) {
  if (!hospital.exameImagem) return
  const buffer = dataUrlToBuffer(hospital.exameImagem)
  if (!buffer) return
  try {
    doc.image(buffer, 0, 0, { width: a5PageSize[0], height: a5PageSize[1] })
  } catch {}
}

function drawExamFields(doc, hospital, paciente) {
  const coords = hospital.coordenadasExame
  if (!coords) return

  doc.font("hospital-font").fillColor(inkColor)

  const fields = [
    { key: "nome", label: "Nome" },
    { key: "endereco", label: "Endereco" },
    { key: "identidade", label: "Identidade" },
    { key: "motivo", label: "Motivo" },
    { key: "exameSolicitado", label: "Exame solicitado" },
    { key: "codigo", label: "Codigo" },
    { key: "paciente", label: "Paciente" }
  ]

  fields.forEach(field => {
    const xKey = `${field.key}Xcm`
    const yKey = `${field.key}Ycm`
    const x = Number(coords[xKey])
    const y = Number(coords[yKey])
    if (!x && x !== 0) return
    if (!y && y !== 0) return

    const text = String(paciente[field.key] || "")
    const maxWidth = cmToPt(12)

    doc.fontSize(bodyFontSize).text(text, cmToPt(x), cartesianYToPdfPt(y), {
      width: maxWidth,
      height: cmToPt(0.8),
      lineBreak: false
    })
  })
}

export function createExamPdf({ hospital, paciente, comExame }) {
  return new Promise((resolve, reject) => {
    if (!hospital?.coordenadasExame) {
      reject(new Error("Hospital sem coordenadas de exame configuradas"))
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
    doc.addPage()

    if (comExame) {
      drawBackgroundIfNeeded(doc, hospital)
    }

    drawExamFields(doc, hospital, paciente)

    doc.end()
  })
}
