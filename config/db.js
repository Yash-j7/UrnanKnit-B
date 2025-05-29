import mongoose from "mongoose";

const connectDb = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URL)
        console.log(`connected to database ${conn.connection.host}`);
    } catch (error) {
        console.log(`error occuring ${error}`);
    }
}


export default connectDb