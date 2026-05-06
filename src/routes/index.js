import { Router } from "express"
import { login, me, register } from "../controllers/authController.js"
import { cancelUserSubscription, getBillingStatus, mercadoPagoWebhook, startSubscription, subscribeWithCard } from "../controllers/billingController.js"
import { createCid, deleteCid, listMedicalCatalog, updateCid } from "../controllers/catalogController.js"
import { getHospital, listHospitals, updateHospitalCoordinates, updateHospitalExamCoordinates, updateHospitalExamImage, updateHospitalReport, updateHospitalSignature, updateHospitalStamp } from "../controllers/hospitalController.js"
import { confirmEmailChange, getProfile, updateProfile } from "../controllers/profileController.js"
import { createReport, listReports } from "../controllers/reportController.js"
import { generateExamPdf, generatePdf } from "../controllers/pdfController.js"
import { requireAuth, requireProductAccess } from "../middlewares/authMiddleware.js"
import { createRateLimiter } from "../middlewares/securityMiddleware.js"

export const router = Router()
const authLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 12, message: "Muitas tentativas de autenticação. Tente novamente em 1 minuto." })
const emailConfirmationLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 10, message: "Muitas tentativas de confirmação de e-mail. Aguarde e tente novamente." })
const billingLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 10, message: "Muitas tentativas na area de assinatura. Aguarde alguns segundos." })
const webhookLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 60, message: "Muitas chamadas no webhook." })

router.get("/health", (req, res) => {
  res.json({ status: "ok", service: "timbramed-backend" })
})

router.post("/auth/login", authLimiter, login)
router.post("/auth/register", authLimiter, register)
router.post("/webhooks/mercadopago", webhookLimiter, mercadoPagoWebhook)
router.post("/profile/email/confirm", emailConfirmationLimiter, confirmEmailChange)
router.get("/auth/me", requireAuth, me)
router.get("/profile", requireAuth, getProfile)
router.put("/profile", requireAuth, updateProfile)
router.get("/billing/status", requireAuth, getBillingStatus)
router.post("/billing/subscribe", requireAuth, billingLimiter, startSubscription)
router.post("/billing/subscribe-card", requireAuth, billingLimiter, subscribeWithCard)
router.post("/billing/cancel", requireAuth, billingLimiter, cancelUserSubscription)
router.get("/hospitals", requireAuth, requireProductAccess, listHospitals)
router.get("/hospitals/:id", requireAuth, requireProductAccess, getHospital)
router.put("/hospitals/:id/coordinates", requireAuth, requireProductAccess, updateHospitalCoordinates)
router.put("/hospitals/:id/stamp", requireAuth, requireProductAccess, updateHospitalStamp)
router.put("/hospitals/:id/report", requireAuth, requireProductAccess, updateHospitalReport)
router.put("/hospitals/:id/signature", requireAuth, requireProductAccess, updateHospitalSignature)
router.put("/hospitals/:id/exam", requireAuth, requireProductAccess, updateHospitalExamImage)
router.put("/hospitals/:id/exam-coordinates", requireAuth, requireProductAccess, updateHospitalExamCoordinates)
router.get("/hospitals/:hospitalId/catalog", requireAuth, requireProductAccess, listMedicalCatalog)
router.post("/hospitals/:hospitalId/cids", requireAuth, requireProductAccess, createCid)
router.put("/cids/:id", requireAuth, requireProductAccess, updateCid)
router.delete("/cids/:id", requireAuth, requireProductAccess, deleteCid)
router.get("/reports", requireAuth, requireProductAccess, listReports)
router.post("/reports", requireAuth, requireProductAccess, createReport)
router.post("/generate-pdf", requireAuth, requireProductAccess, generatePdf)
router.post("/generate-exam-pdf", requireAuth, requireProductAccess, generateExamPdf)
