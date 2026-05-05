import "dotenv/config"
import { app } from "./app.js"

const port = 3333

app.listen(port, () => {
  console.log(`TimbraMed API running on port ${port}`)
})
