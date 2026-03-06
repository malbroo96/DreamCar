import mongoose from "mongoose";

export const connectDB = async () => {
  const env = process.env.NODE_ENV || "development";
  const mongoUri =
    process.env.MONGODB_URI ||
    (env === "production" ? process.env.MONGODB_URI_PROD : process.env.MONGODB_URI_LOCAL);

  if (!mongoUri) {
    throw new Error(
      "Mongo URI is not set. Use MONGODB_URI or set MONGODB_URI_LOCAL/MONGODB_URI_PROD based on NODE_ENV."
    );
  }

  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");
};
