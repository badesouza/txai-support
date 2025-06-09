import express from "express";
import cors from "cors";
import userRoutes from "./routes/user.routes";
import callRoutes from "./routes/call.routes";
import { prisma } from "./lib/prisma";

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/users", userRoutes);
app.use("/api/calls", callRoutes);

// Initialize database and start server
const PORT = process.env.PORT || 3001;

// Test database connection and start server
prisma.$connect()
  .then(() => {
    console.log('Connection to database has been established successfully.');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  }); 