/*
 * Title: NextJourney
 * Description: Main server file for the NextJourney application
 * Author: Mishu Debnath
 * Date: 17/07/2026
 */

import dns from "node:dns/promises";
import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { MongoClient, ServerApiVersion } from "mongodb";

// DNS
dns.setServers(["1.1.1.1", "8.8.8.8"]);

// Config
dotenv.config();

const PORT = process.env.PORT || 4000;
const uri = process.env.MONGODB_URI!;

// App
const app = express();

app.use(cors());
app.use(express.json());

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// MongoDB Connection
client
  .connect()
  .then(() => console.log("Connected to MongoDB successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

interface TripData {
  title: string;
  shortDescription: string;
  fullDescription: string;
  price: number;
  date: string;
  priority: string;
  imageUrl: string;
  category: string;
  location: string;
}

const db = client.db("nextJourney");
const trips = db.collection("trips");
const sessions = db.collection("session");
const users = db.collection("user");

interface CustomRequest extends Request {
  user?: any;
}

const verifyToken = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).send({
      message: "Unauthorized access",
    });
  }

  const token = header.split(" ")[1];

  if (!token) {
    return res.status(401).send({
      message: "Unauthorized access",
    });
  }

  const query = { token: token };
  const session = await sessions.findOne(query);

  const userId = session?.userId;

  if (!userId) {
    return res.status(401).send({
      message: "Unauthorized access",
    });
  }

  const userQuery = {
    _id: userId,
  };
  const user = await users.findOne(userQuery);

  if (!user) {
    return res.status(401).send({
      message: "Unauthorized access",
    });
  }

  req.user = user;
  next();
};

// post one events
app.post("/api/trips",verifyToken, async (req: Request, res: Response) => {
  try {
    const tripData: TripData = req.body;
    const result = await trips.insertOne(tripData);

    res.status(201).send({
      success: true,
      message: "Trip added successfully",
      insertedId: result.insertedId,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Failed to add Trip",
      error: error.message,
    });
  }
});


// Routes
app.get("/", (req: Request, res: Response) => {
  return res.status(200).send({
      success: true,
      message: "NextJourney Server",
    });
});

// Server Listen
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;