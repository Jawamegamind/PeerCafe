[![Frontend CI](https://github.com/Jawamegamind/PeerCafe/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/Jawamegamind/PeerCafe/actions/workflows/frontend-ci.yml)
[![Backend CI](https://github.com/Jawamegamind/PeerCafe/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/Jawamegamind/PeerCafe/actions/workflows/backend-ci.yml)
[![codecov](https://codecov.io/github/Jawamegamind/PeerCafe/graph/badge.svg?token=C532V373J8)](https://codecov.io/github/Jawamegamind/PeerCafe)
[![Dependabot](https://img.shields.io/github/dependabot/Jawamegamind/PeerCafe?path=frontend&style=flat-square)](https://github.com/Jawamegamind/PeerCafe/security/dependabot)
![Issues](https://img.shields.io/github/issues/Jawamegamind/PeerCafe)

# PeerCafe 🚀

A peer-to-peer delivery system developed as part of CSC 510: Software Engineering offered at NC State University.

## 📋 Table of Contents

- [About the Project](#about-the-project)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)
- [Team](#team)

## 🎯 About the Project

PeerCafe is a modern peer-to-peer delivery platform that connects users who need items delivered with nearby peers willing to make deliveries. Built with a focus on community, convenience, and efficiency.

**Key Objectives:**
- Facilitate quick and reliable peer-to-peer deliveries
- Create a trustworthy community-driven platform
- Provide an intuitive user experience for both requesters and deliverers

## 🛠 Tech Stack

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript + ReactJS
- **UI Components and Styling:** Material-UI (MUI)
- **Authentication:** Supabase Auth

### Backend
- **Framework:** FastAPI (Python)
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth + JWT
- **Password Hashing:** bcrypt
- **API Documentation:** Swagger UI (auto-generated from FastAPI)

### Database & Services
- **Database:** Supabase PostgreSQL
- **Real-time:** Supabase Realtime
- **File Storage:** Supabase Storage

## ✨ Features

- [ ] User Authentication (Sign up, Login, Logout)
- [ ] User Dashboard
- [ ] Delivery Request Creation
- [ ] Delivery Acceptance System
- [ ] Real-time Order Tracking
- [ ] User Profiles and Ratings

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.0 or higher)
- **Python** (v3.10 or higher)
- **npm** or **yarn**
- **conda** (recommended for Python environment management)
- **Git**

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Jawamegamind/PeerCafe.git
cd PeerCafe
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate conda environment with dependencies using the provide requirements file
conda env create -f requirements.yaml
conda activate backend

```

### 3. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install OR npm i
```

### 4. Database Setup (Supabase)

<!-- 1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Settings** → **API** to find your project credentials
3. Create the required tables in your Supabase dashboard:

#### Users Table
```sql
CREATE TABLE "Users" (
  "UserId" SERIAL PRIMARY KEY,
  "FirstName" TEXT NOT NULL,
  "LastName" TEXT NOT NULL,
  "Email" TEXT UNIQUE NOT NULL,
  "Phone" TEXT,
  "IsAdmin" BOOLEAN DEFAULT FALSE,
  "IsActive" BOOLEAN DEFAULT TRUE,
  "Password" TEXT NOT NULL,
  "CreatedAt" TIMESTAMP DEFAULT NOW()
);
```

#### Additional tables as needed... -->
Database access available to only team members

## 🔐 Environment Variables

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Supabase Configuration
PROJECT_URL=https://your-project-id.supabase.co
API_KEY=your-supabase-anon-key
```
Both the variables and their values can be found in the project setting. Navigate to API keys and copy the anon public key as the API_KEY

The PROJECT_URL can be found in the General tab in the Settings. Simply copy the ID and replace with the your-project-id

### Frontend Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Optional: API Base URL (if different from default)
# NEXT_PUBLIC_API_URL=http://localhost:8000
```

Same variables as being used in the backend

## 🏃‍♂️ Running the Application

### Start the Backend Server

```bash
cd backend
conda activate backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload 

# Server will be available at: http://localhost:8000
# API Documentation: http://localhost:8000/docs
```

### Start the Frontend Development Server

```bash
cd frontend
npm run dev

# Application will be available at: http://localhost:3000
```

### Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

## 📚 API Documentation

The FastAPI backend automatically generates interactive API documentation:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Key API Endpoints

```
POST /api/register          # User registration
POST /api/login             # User login
GET  /api/users/me          # Get current user profile
POST /api/deliveries        # Create delivery request
GET  /api/deliveries        # Get all deliveries
PUT  /api/deliveries/{id}   # Update delivery status
```

## 📁 Project Structure

```
PeerCafe/
├── backend/                 # FastAPI Backend
│   ├── database/           # Database connection and models
│   ├── models/             # Pydantic models
│   ├── routes/             # API route handlers
│   ├── main.py             # FastAPI application entry point
│   └── requirements.yaml   # Python dependencies
│
├── frontend/               # Next.js Frontend
│   ├── app/                # App Router pages and layouts
│   │   ├── (authentication)/  # Auth-related pages
│   │   ├── (main)/         # Main application pages
│   │   └── layout.tsx      # Root layout
│   ├── utils/              # Utility functions
│   │   └── supabase/       # Supabase client configuration
│   ├── middleware.ts       # Next.js middleware for auth
│   └── package.json        # Frontend dependencies
│
└── README.md              # Project documentation
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript/Python best practices
- Write meaningful commit messages
- Add comments for complex logic
- Test your changes before submitting with dedicated test cases

<!-- ## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. -->

## 👥 Team

**Course:** CSC 510: Software Engineering  
**Institution:** NC State University

**Team Members:**
- [Jawad Saeed] - [jsaeed@ncsu.edu]
- [Omkar Joshi] - [ojjoshi@ncsu.edu]
- [Mason Cormany] - [mcorman@ncsu.edu]
- [Mulya Sandip Patel] - [mspate22@ncsu.edu]
- [Himanshu Agarwal] - [hagarwa4@ncsu.edu]

## 📞 Support

If you encounter any issues or have questions:

1. Contact the development team at their emails

---

**Made with ❤️ for CSC 510 at NC State University**
