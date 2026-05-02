import { Router } from "express"
import { createHospital, getHospital, listHospitals, updateHospital } from "../controllers/hospitalController.js"
import { createSymptom, deleteSymptom, listSymptomsByHospital, updateSymptom } from "../controllers/symptomController.js"
import { createReport, listReports } from "../controllers/reportController.js"
import { generatePdf } from "../controllers/pdfController.js"

export const router = Router()

router.get("/health", (req, res) => {
  res.json({ status: "ok", service: "timbramed-backend" })
})

router.get("/hospitals", listHospitals)
router.post("/hospitals", createHospital)
router.get("/hospitals/:id", getHospital)
router.put("/hospitals/:id", updateHospital)
router.get("/hospitals/:hospitalId/symptoms", listSymptomsByHospital)
router.post("/hospitals/:hospitalId/symptoms", createSymptom)
router.put("/symptoms/:id", updateSymptom)
router.delete("/symptoms/:id", deleteSymptom)
router.get("/reports", listReports)
router.post("/reports", createReport)
router.post("/generate-pdf", generatePdf)
