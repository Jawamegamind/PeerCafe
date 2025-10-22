[![Frontend CI](https://github.com/Jawamegamind/PeerCafe/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/Jawamegamind/PeerCafe/actions/workflows/frontend-ci.yml)
[![Backend CI](https://github.com/Jawamegamind/PeerCafe/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/Jawamegamind/PeerCafe/actions/workflows/backend-ci.yml)
[![codecov](https://codecov.io/github/Jawamegamind/PeerCafe/graph/badge.svg?token=C532V373J8)](https://codecov.io/github/Jawamegamind/PeerCafe)
[![Frontend Coverage](https://codecov.io/github/Jawamegamind/PeerCafe/branch/main/graph/badge.svg?flag=frontend&token=C532V373J8)](https://codecov.io/github/Jawamegamind/PeerCafe/tree/main?flags%5B0%5D=frontend)
[![Backend Coverage](https://codecov.io/github/Jawamegamind/PeerCafe/branch/main/graph/badge.svg?flag=backend&token=C532V373J8)](https://codecov.io/github/Jawamegamind/PeerCafe/tree/main?flags%5B0%5D=backend)
[![Issues](https://img.shields.io/github/issues/Jawamegamind/PeerCafe)](https://github.com/Jawamegamind/PeerCafe/issues)
[![DOI](https://zenodo.org/badge/1069984936.svg)](https://doi.org/10.5281/zenodo.17420477)

# PeerCafe 🚀

A peer-to-peer delivery system developed as part of CSC 510: Software Engineering offered at NC State University.

## [➡️ Quick Start: Installation & Setup](./INSTALL.md)

## 📋 Table of Contents

- [About the Project](#about-the-project)
- [Tech Stack](#tech-stack)
- [Features](#features)
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
