import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { createPrismaPgAdapter } from "./prismaAdapter.js"

export const prisma = new PrismaClient({ adapter: createPrismaPgAdapter() })
