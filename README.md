TimbraMed Backend

API Node.js com Express, PostgreSQL, Prisma ORM, JWT, bcrypt e PDFKit.

Comandos

npm install
copy .env.example .env
npx prisma migrate deploy
npm run seed
npm run dev

Login inicial

Usuario: admin
Senha: Bolas122*

Medico de teste: medico@timbramed.local
Senha: Medico122*

Endpoints principais

POST /auth/login
GET /auth/me
GET /hospitals
GET /hospitals/:id
PUT /hospitals/:id/coordinates
GET /hospitals/:hospitalId/catalog
POST /hospitals/:hospitalId/symptoms
POST /hospitals/:hospitalId/cids
POST /hospitals/:hospitalId/messages
GET /reports
POST /reports
POST /generate-pdf