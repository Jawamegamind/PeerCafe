[![Frontend CI](https://github.com/Jawamegamind/PeerCafe/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/Jawamegamind/PeerCafe/actions/workflows/frontend-ci.yml)
[![Backend CI](https://github.com/Jawamegamind/PeerCafe/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/Jawamegamind/PeerCafe/actions/workflows/backend-ci.yml)
[![Code Quality](https://github.com/Jawamegamind/PeerCafe/actions/workflows/code-quality.yml/badge.svg)](https://github.com/Jawamegamind/PeerCafe/actions/workflows/code-quality.yml)
[![codecov](https://codecov.io/github/Jawamegamind/PeerCafe/graph/badge.svg?token=C532V373J8)](https://codecov.io/github/Jawamegamind/PeerCafe)
[![Frontend Coverage](https://codecov.io/github/Jawamegamind/PeerCafe/branch/main/graph/badge.svg?flag=frontend&token=C532V373J8)](https://codecov.io/github/Jawamegamind/PeerCafe/tree/main?flags%5B0%5D=frontend)
[![Backend Coverage](https://codecov.io/github/Jawamegamind/PeerCafe/branch/main/graph/badge.svg?flag=backend&token=C532V373J8)](https://codecov.io/github/Jawamegamind/PeerCafe/tree/main?flags%5B0%5D=backend)
[![Issues](https://img.shields.io/github/issues/Jawamegamind/PeerCafe)](https://github.com/Jawamegamind/PeerCafe/issues)
[![DOI](https://zenodo.org/badge/1069984936.svg)](https://doi.org/10.5281/zenodo.17420477)

<!-- Frontend Code Quality Tool Badges -->
[![Code Style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Type Checker: TypeScript](https://img.shields.io/badge/type_checker-typescript-blue)](https://www.typescriptlang.org/)
[![Linting: ESLint](https://img.shields.io/badge/linting-eslint-4b32c3)](https://eslint.org/)
[![Testing: Jest](https://img.shields.io/badge/testing-jest-red)](https://jestjs.io/)

<!-- Backend Code Quality Tool Badges -->
[![Code Style: Black](https://img.shields.io/badge/code_style-black-000000.svg)](https://github.com/psf/black)
[![Import Sorting: isort](https://img.shields.io/badge/import_sorting-isort-ef8336.svg)](https://pycqa.github.io/isort/)
[![Linting: Flake8](https://img.shields.io/badge/linting-flake8-yellowgreen)](https://flake8.pycqa.org/)
[![Security: Bandit](https://img.shields.io/badge/security-bandit-yellow)](https://github.com/PyCQA/bandit)
[![Testing: Pytest](https://img.shields.io/badge/testing-pytest-blue)](https://pytest.org/)
[![Python Version](https://img.shields.io/badge/python-3.10+-blue)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/framework-fastapi-009688)](https://fastapi.tiangolo.com/)

# PeerCafe 🚀

A peer-to-peer delivery system developed as part of CSC 510: Software Engineering offered at NC State University.

## 🎥 Demo Video

Watch our application demo to see PeerCafe in action:

[![PeerCafe Demo Video](https://img.shields.io/badge/▶️_Watch_Demo-Google_Drive-4285F4?style=for-the-badge&logo=googledrive&logoColor=white)](https://drive.google.com/file/d/1UPR52DoR89xgoR_5pQuA8tIa7FZLWx4t/view)

*Click the badge above to watch our comprehensive demo video showcasing the full platform functionality.*

## [➡️ Quick Start: Installation & Setup](./INSTALL.md)

## [➡️ High Level Flow View](./docs/Flow.md)

## [➡️ Testing Overview](./TESTING_OVERVIEW.md)

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

## 📦 Dependencies

### Frontend Dependencies

#### Production Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| next | 15.5.4 | React framework with App Router |
| react | 19.1.0 | UI library |
| react-dom | 19.1.0 | React DOM rendering |
| @mui/material | ^7.3.4 | Material-UI component library |
| @mui/icons-material | ^7.3.4 | Material-UI icons |
| @mui/material-nextjs | ^7.3.3 | Material-UI Next.js integration |
| @emotion/react | ^11.14.0 | CSS-in-JS library (MUI dependency) |
| @emotion/styled | ^11.14.1 | Styled components for Emotion |
| @emotion/cache | ^11.14.0 | Emotion cache for SSR |
| @supabase/supabase-js | ^2.75.0 | Supabase client library |
| @supabase/ssr | ^0.7.0 | Supabase SSR helpers |
| axios | ^1.12.2 | HTTP client |
| mapbox-gl | ^3.15.0 | Mapbox maps integration |

#### Development Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| typescript | ^5 | TypeScript language |
| @types/node | ^20 | Node.js type definitions |
| @types/react | ^19 | React type definitions |
| @types/react-dom | ^19 | React DOM type definitions |
| eslint | ^9.38.0 | JavaScript/TypeScript linter |
| eslint-config-next | ^16.0.0 | Next.js ESLint configuration |
| @typescript-eslint/parser | ^8.46.2 | TypeScript parser for ESLint |
| @typescript-eslint/eslint-plugin | ^8.46.2 | TypeScript ESLint rules |
| prettier | ^3.6.2 | Code formatter |
| jest | ^29.7.0 | Testing framework |
| @testing-library/react | ^16.3.0 | React testing utilities |
| @testing-library/jest-dom | ^6.9.1 | Custom Jest matchers for DOM |
| @testing-library/user-event | ^14.6.1 | User interaction simulation |
| jest-environment-jsdom | ^29.7.0 | Jest DOM environment |
| @types/jest | ^29.5.14 | Jest type definitions |
| identity-obj-proxy | ^3.0.0 | Mock CSS modules in tests |
| ts-node | ^10.9.2 | TypeScript execution for Node.js |

### Backend Dependencies

#### Core Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| python | 3.10 | Python runtime |
| fastapi[all] | latest | Web framework with async support |
| uvicorn[standard] | latest | ASGI server |
| supabase | latest | Supabase Python client |
| bcrypt | latest | Password hashing |
| pydantic | latest | Data validation |
| httpx | latest | Async HTTP client |

#### Testing Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| pytest | latest | Testing framework |
| pytest-cov | latest | Coverage reporting |
| pytest-asyncio | latest | Async test support |

#### Code Quality Tools
| Package | Version | Purpose |
|---------|---------|---------|
| black | >=23.0.0 | Code formatter |
| isort | >=5.0.0 | Import statement sorter |
| flake8 | >=6.0.0 | Style guide enforcement |
| mypy | >=1.0.0 | Static type checker |
| pylint | >=2.17.0 | Code linter |
| bandit | >=1.7.0 | Security vulnerability scanner |

## ✨ Features

- [x] User Authentication (Sign up, Login, Logout)
- [x] User Dashboard
- [x] Restaurant Discovery System
- [x] Core Ordering System (Browse, Select, Cart, Checkout)
- [x] Staff Fulfillment Dashboard (Order Management)
- [x] Student Rider Module (Delivery Interface)
- [x] Secure Handoff Flow (OTP Verification)
- [x] Real-time Order Tracking
- [x] User Profiles and Ratings

## 🗺️ Project Roadmap

### Current Milestones (Delivered)

**Core Ordering System**
- Complete user flow from restaurant discovery to order placement and checkout

**Staff Fulfillment Dashboard**
- Admin interface for viewing orders, managing acceptance, and updating status
- Restaurant and menu item management

**Student Rider Module**
- Delivery rider view with order details and delivery locations
- Orders sorted by nearest first (FIFO)

**Secure Handoff Flow**
- OTP generation for secure order handoff between delivery riders and users

### Proposed Features (Future Development)

**LLM-driven Automated Inventory Management**
- AI-powered backend calls for automatic inventory deduction based on order recipes
- Smart ingredient management for menu items

**Incentive Management for Delivery Drivers**
- Loyalty points system per delivery
- Discount redemption for future orders
- Peer-to-peer delivery ecosystem promotion

**Human-in-the-Loop Allergen Filters**
- AI-powered allergen detection with LLM API calls
- Conversational allergen filtering based on user input

**LLM-driven Restaurant Recommendation**
- Intelligent restaurant suggestion system using AI
- Personalized recommendations based on user preferences

**Sustainability Features**
- "Green Delivery" bundling for nearby customers
- Proximity-based order grouping to reduce carbon footprint

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
