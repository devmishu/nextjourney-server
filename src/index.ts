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

// get all trips
app.get("/api/trips", async (req: Request, res: Response) => {
  try {
    const { search, category, location, sortBy, page, itemsPerPage } = req.query;

    let query: Record<string, any> = {};

    if (search && typeof search === "string") {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { shortDescription: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    if (
      category &&
      typeof category === "string" &&
      category !== "All Categories"
    ) {
      query.category = {
        $regex: `^${category.trim()}$`,
        $options: "i",
      };
    }

    if (
      location &&
      typeof location === "string" &&
      location !== "All Locations"
    ) {
      query.location = {
        $regex: `^${location.trim()}$`,
        $options: "i",
      };
    }

    let sortOption: Record<string, any> = { _id: -1 };

    if (sortBy === "Newest") {
      sortOption = { date: -1 };
    } else if (sortBy === "Oldest") {
      sortOption = { date: 1 };
    } else if (sortBy === "PriceLowToHigh") {
      sortOption = { price: 1 };
    } else if (sortBy === "PriceHighToLow") {
      sortOption = { price: -1 };
    }

    const total = await trips.countDocuments(query);

    const currentPage = parseInt(page as string) || 1;
    const limit = parseInt(itemsPerPage as string) || 8;
    const skip = (currentPage - 1) * limit;

    const result = await trips
      .find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .toArray();

    res.status(200).send({
      success: true,
      message: "Trips fetched successfully",
      data: {
        total,
        result,
      },
    });
  } catch (error: any) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch trips",
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