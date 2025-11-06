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
MAPBOX_TOKEN=your_mapbox_key
```
Both the variables and their values can be found in the project setting. Navigate to API keys and copy the anon public key as the API_KEY

The PROJECT_URL can be found in the General tab in the Settings. Simply copy the ID and replace with the your-project-id

### Frontend Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_MAPBOX_API_KEY=your_mapbox_key
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8000/api/

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
