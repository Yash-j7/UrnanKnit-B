import express from "express"
import dotenv from "dotenv"
import connectDb from "./config/db.js"
import morgan from "morgan"
import authRoutes from "./routes/authRoute.js"
import cors from 'cors'
import categoryRoutes from './routes/categoryRoutes.js'
import productRoutes from './routes/productRoute.js'

dotenv.config()
connectDb()

const app = express()

app.use(cors())
app.use(express.json())
app.use(morgan('dev'))



const port = process.env.PORT


app.use("/api/v1/auth",authRoutes)
app.use("/api/v1/category",categoryRoutes)
app.use("/api/v1/product",productRoutes)


app.get('/',(req,res) => {
    res.send(
        "<h1>hey there,Welcome</h1>"
    )
})


app.listen(port,() => {
    console.log(`server running on ${port}`);
})