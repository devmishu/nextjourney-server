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
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import OpenAI from "openai";
import csv from "csvtojson";
import multer from "multer";

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

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY, 
  baseURL: "https://api.groq.com/openai/v1", 
});

const upload = multer({ storage: multer.memoryStorage() }); 

// MongoDB Connection
client
  .connect()
  .then(() => console.log("Connected to MongoDB successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

interface TripData {
  userId: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  price: number;
  date: string;
  duration: string;
  travelStyle: string;
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
    
    const { search, category, location, travelStyle, sortBy, page, itemsPerPage } = req.query;

    let query: Record<string, any> = {};

    
    if (search && typeof search === "string") {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { shortDescription: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }

    
    if (category && typeof category === "string" && category !== "All Categories") {
      const categoryArray = category.split(",").map(c => new RegExp(`^${c.trim()}$`, "i"));
      query.category = { $in: categoryArray };
    }

    

if (location && typeof location === "string" && location !== "All Locations") {
  
  const mainLocation = location.split(",")[0].trim(); 

  query.location = {
    $regex: mainLocation,
    $options: "i",
  };
}

    
    if (travelStyle && typeof travelStyle === "string") {
      const styleArray = travelStyle.split(",").map(s => new RegExp(`^${s.trim()}$`, "i"));
      query.travelStyle = { $in: styleArray };
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
    const limit = parseInt(itemsPerPage as string) || 6;
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

// get featured trips
app.get("/api/trips/featured", async (req: Request, res: Response) => {
  try {
    const tripsData = await trips.find().limit(8).toArray();

    res.status(200).send({
      success: true,
      message: "Featured trips fetched successfully",
      data: tripsData,
    });
  } catch (error: any) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch featured trips",
      error: error.message,
    });
  }
});

// get trip by id
app.get("/api/trips/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (typeof id !== "string") {
      return res.status(400).send({
        success: false,
        message: "Invalid trip id",
      });
    }

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid ObjectId",
      });
    }

    const query = {
      _id: new ObjectId(id),
    };

    const trip = await trips.findOne(query);

    if (!trip) {
      return res.status(404).send({
        success: false,
        message: "Trip not found",
      });
    }

    return res.status(200).send({
      success: true,
      message: "Trip fetched successfully",
      data: trip,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).send({
        success: false,
        message: "Failed to fetch trip",
        error: error.message,
      });
    }

    return res.status(500).send({
      success: false,
      message: "Unknown error occurred",
    });
  }
});  

// get user trips
app.get("/api/trips/user/:userId",verifyToken,  async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (typeof userId !== "string") {
      return res.status(400).send({
        success: false,
        message: "Invalid user id",
      });
    }

    const query = {
      userId,
    };

    const userTrips = await trips.find(query).toArray();

    return res.status(200).send({
      success: true,
      message: "User trips fetched successfully",
      data: userTrips,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).send({
        success: false,
        message: "Failed to fetch user trips",
        error: error.message,
      });
    }

    return res.status(500).send({
      success: false,
      message: "Unknown error occurred",
    });
  }
});

// delete trip by id
app.delete("/api/trips/:id",verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (typeof id !== "string") {
      return res.status(400).send({
        success: false,
        message: "Invalid trip id",
      });
    }

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid ObjectId",
      });
    }

    const query = {
      _id: new ObjectId(id),
    };

    const result = await trips.deleteOne(query);

    if (result.deletedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Trip not found",
      });
    }

    return res.status(200).send({
      success: true,
      message: "Trip deleted successfully",
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).send({
        success: false,
        message: "Failed to delete trip",
        error: error.message,
      });
    }

    return res.status(500).send({
      success: false,
      message: "Unknown error occurred",
    });
  }
});



// ai chat assiant
app.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message) return res.status(400).json({ error: "Message is required" });


    const websiteContext = `
  You are an AI assistant for "NextJourney", a premium travel website.
  
  Our Scope:
  - We offer custom travel packages globally, focusing on diverse destinations and unique travel styles.
  
  Available Locations:
  Bali (Indonesia), Paris (France), Machu Picchu (Peru), Santorini (Greece), 
  Kyoto (Japan), Safari (Kenya), New York (USA), Sydney (Australia), 
  Cairo (Egypt), and Patagonia (Argentina).
  
  Travel Categories:
  Beach, Mountain, City, Forest, Desert, Island, Historical, Wildlife, Cruise, and Road Trip.

  Guidelines:
  - Prices start from $100.
  - We offer 24/7 customer support.
  - Contact us at support@nextjourney.com.
  - If a user asks for recommendations, try to match their request with our available locations and categories.
  - If the user asks something not related to travel, politely redirect them back to our travel services.
`;

 
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: websiteContext },
        { role: "user", content: message }
      ],
      model: "llama-3.3-70b-versatile",
    });

    const reply = completion.choices[0].message.content;
    res.status(200).json({ reply });
  } catch (error: any) {
    console.error("Groq API Error:", error);
    res.status(500).json({ error: "Failed to process chat" });
  }
});


//analyze-budget
app.post("/api/analyze-budget", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    
    const fileContent = req.file.buffer.toString("utf8");
    const jsonData = await csv().fromString(fileContent);

   
    const prompt = `
      Analyze this travel budget data: ${JSON.stringify(jsonData)}.
      1. Provide a concise insight about the spending habits (max 3 sentences).
      2. Return a JSON object with 'chartData' format: [{name: 'Category', value: number}].
      Return ONLY in this JSON format: { "insight": "string", "chartData": [...] }
    `;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

  
    const result = JSON.parse(completion.choices[0].message.content || "{}");
    
    res.status(200).json(result);
  } catch (error: any) {
    console.error("Budget Analysis Error:", error);
    res.status(500).json({ error: "Failed to analyze budget" });
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