# Support Ticket System

A modern web application for managing support tickets with user authentication and file upload capabilities.

## Features

- User Management
  - Login/Logout
  - Password Recovery
  - User Profile Management
- Support Ticket Management
  - Create, Read, Update, Delete tickets
  - Multiple image uploads per ticket
  - Ticket status tracking
- Secure Authentication
- File Storage System

## Tech Stack

- Frontend: React with TypeScript
- Backend: Node.js with Express
- Database: PostgreSQL
- Authentication: JWT
- File Storage: Local file system

## Project Structure

```
.
├── frontend/           # React frontend application
├── backend/           # Node.js backend application
└── uploads/          # Directory for storing uploaded images
```

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file with the following variables:

   ```
   PORT=3001
   DATABASE_URL=postgresql://username:password@localhost:5432/support_db
   JWT_SECRET=your_jwt_secret
   ```

4. Run database migrations:

   ```bash
   npm run migrate
   ```

5. Start the server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file:

   ```
   REACT_APP_API_URL=http://localhost:3001
   ```

4. Start the development server:
   ```bash
   npm start
   ```

## API Documentation

The API documentation will be available at `http://localhost:3001/api-docs` when the backend server is running.
