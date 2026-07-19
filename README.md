# NextJourney - Backend API

This is the backend service for **NextJourney**, a full-stack Agentic AI travel application. It provides robust API endpoints for managing travel packages, user authentication, and advanced AI-driven features.

## 🚀 Key Technologies
- **Framework:** Express.js (Node.js)
- **Language:** TypeScript
- **Database:** MongoDB (via MongoClient)
- **AI/LLM:** Groq API (Llama-3.3-70b-versatile)
- **Data Handling:** Multer (File Upload), csvtojson
- **Auth:** Session-based verification

## 🛠 Features
- **Trip Management:** Full CRUD operations for travel packages including search, filtering, and sorting.
- **AI Chat Assistant:** A context-aware conversational agent to help users with travel recommendations.
- **AI Data Analyzer:** An intelligent budget analysis tool that processes CSV files to generate actionable insights and chart data.
- **Secure Routes:** Middleware-based token verification for protected user-specific actions.

## 📋 API Endpoints

| Method | Endpoint | Description | Protected |
| :--- | :--- | :--- | :---: |
| **GET** | `/api/trips` | Retrieve all trips with filtering & sorting | ❌ |
| **GET** | `/api/trips/featured` | Get a curated list of featured travel packages | ❌ |
| **GET** | `/api/trips/:id` | Fetch specific trip details by ID | ❌ |
| **GET** | `/api/trips/user/:userId` | Retrieve all trips added by a specific user | ✅ |
| **POST** | `/api/trips` | Create a new travel package | ✅ |
| **DELETE** | `/api/trips/:id` | Remove a travel package | ✅ |
| **POST** | `/api/chat` | Send messages to the AI assistant | ❌ |
| **POST** | `/api/analyze-budget` | Upload CSV for AI budget analysis | ❌ |
