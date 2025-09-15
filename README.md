# NEM405_B48_QuickLegal_LegalServices

## QuickLegal – Legal Services Platform

QuickLegal is a full-stack legal services platform that allows users to connect with advocates, generate legal document templates (PDFs), and manage consultations. The system supports role-based access (Admin, Advocate, User) with features like authentication, authorization, document generation, and database seeding.

## Project Overview

# Users can:

- Register/login
- Search advocates by expertise
- Generate legal document templates (like tenancy agreements)
- Book consultations

# Advocates can:

- Create and manage their profiles (expertise, availability)
- Handle consultation requests

# Admins can:

- Manage users & advocates
- Manage templates

# System Features:

- Authentication (JWT-based)
- Role-based authorization
- Document generation (using pdfkit)
- Email notifications
- Centralized error logging
- Database seeding for quick setup

## Tech Stack

- Backend: Node.js, Express.js
- Database: MongoDB (via Mongoose ODM)
- Containerization: Docker & Docker Compose
- Cache / Queues (optional): Redis
- Authentication: JWT (JSON Web Tokens)
- PDF Generation: pdfkit
- Environment Management: dotenv
- Testing: Jest & Supertest

## Folder Structure

QuickLegal_LegalServices/
│── docker/                  # Docker and docker-compose configuration
│── scripts/                 # Seeder and utility scripts
│── src/
│   ├── config/              # DB, logger, redis configurations
│   ├── controllers/         # Route controllers
│   ├── middlewares/         # Middlewares (auth, errorHandler, rateLimiter, etc.)
│   ├── models/              # Mongoose models (User, Advocate, Template, etc.)
│   ├── routes/              # Express route files
│   ├── services/            # Business logic & helper services
│   ├── utils/               # Utility functions (logger, responseHandler, etc.)
│   ├── app.js               # Express app setup
│   └── server.js            # Server entry point
│── .env                     # Environment variables
│── package.json
│── README.md


## Setup Instructions

1.Clone the Repository:
git clone https://github.com/vinit3200/NEM405_B48_QuickLegal_LegalServices.git

2.Install Dependencies:
npm install

3.Setup Environment Variables:
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/quicklegal_dev

# JWT
JWT_SECRET=supersecretkey
JWT_EXPIRES_IN=1d

# Redis
REDIS_URL=redis://localhost:6379

# File storage
UPLOAD_DIR=uploads

# Email (example if using nodemailer)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_username
SMTP_PASS=your_password

4.Run with Docker:
docker compose -f docker/docker-compose.yml up -d

This will start:

- MongoDB
- Redis
- Any other services defined in docker-compose.yml

5.Seed the Database:
npm run seed

6.Start the Server:
npm run dev   # Nodemon for development
# or
npm start     # Production

## API Endpoints (Sample)

# Auth Routes:

- POST /auth/register → Register new user
- POST /auth/login → Login user and get JWT

# User Routes:

- GET /users/profile → Get user profile (Auth required)

# Advocate Routes:

- GET /advocates → List all advocates
- POST /advocates/profile → Create/update profile

# Template Routes:

- GET /templates → Fetch templates
- POST /templates → Create template (Admin only)