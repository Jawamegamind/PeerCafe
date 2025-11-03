# Contributing to PeerCafe

Welcome to PeerCafe! 🍕 We're excited that you want to contribute to our food delivery platform. This guide will help you get started and ensure your contributions align with our project standards.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Architecture Guidelines](#architecture-guidelines)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Security Guidelines](#security-guidelines)
- [Performance Considerations](#performance-considerations)

## Getting Started

### Prerequisites

Before you start contributing, make sure you have:

- **Node.js** 18+ and **npm**
- **Python** 3.10+ and **conda** or **pip**
- **Git** for version control
- **VS Code** (recommended) with relevant extensions
- A **Supabase** account for database access

### First-Time Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/PeerCafe.git
   cd PeerCafe
   ```
3. **Set up the backend**:
   ```bash
   cd backend
   conda create -n peercafe-backend python=3.10
   conda activate peercafe-backend
   pip install -r requirements.yaml
   ```
4. **Set up the frontend**:
   ```bash
   cd ../frontend
   npm install
   ```
5. **Configure environment variables** (see INSTALL.md)

## Development Setup

### Backend Development

**Project Structure:**
```
backend/
├── main.py              # FastAPI app entry point
├── routes/              # API route handlers
│   ├── auth_routes.py   # Authentication endpoints
│   └── restaurant_routes.py  # Restaurant CRUD operations
├── models/              # Pydantic data models
├── database/            # Database connection utilities
└── tests/               # Test suite (98% coverage!)
```

**Running the Backend:**
```bash
cd backend
conda activate peercafe-backend
uvicorn main:app --reload --port 8000
```

**Environment Variables Required:**
```bash
PROJECT_URL=your_supabase_project_url
API_KEY=your_supabase_api_key
```

### Frontend Development

**Project Structure:**
```
frontend/
├── app/                 # Next.js 14+ App Router
│   ├── admin/          # Admin dashboard
│   │   └── restaurants/[restaurantId]/  # Dynamic routes
│   ├── components/     # Reusable UI components
│   └── globals.css     # Global styles
├── public/             # Static assets
└── next.config.js      # Next.js configuration
```

**Running the Frontend:**
```bash
cd frontend
npm run dev  # Runs on http://localhost:3000
```

## Coding Standards

### Backend (Python/FastAPI)

#### Code Style
- **Follow PEP 8** with 88-character line limit
- **Use type hints** for all function parameters and return values
- **Use async/await** for database operations
- **Follow FastAPI conventions** for route definitions

#### Example Route Structure:
```python
from fastapi import APIRouter, HTTPException, Depends
from models.restaurant_model import Restaurant, RestaurantCreate
from typing import List

restaurant_router = APIRouter()

@restaurant_router.post("/restaurants", response_model=dict)
async def create_restaurant(restaurant: RestaurantCreate):
    """Create a new restaurant (Admin only)"""
    try:
        # Validate input
        restaurant_data = {
            "Name": restaurant.Name,
            "Description": restaurant.Description,
            # ... other fields
        }
        
        # Database operation
        result = supabase.from_("Restaurants").insert(restaurant_data).execute()
        
        if result.data:
            return {
                "success": True,
                "message": "Restaurant created successfully",
                "restaurant": result.data[0]
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to create restaurant")
            
    except HTTPException:
        raise  # Re-raise HTTPException with original status code
    except Exception as e:
        print(f"Error creating restaurant: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
```

#### Error Handling Standards:
```python
# ✅ GOOD: Preserve original HTTP status codes
try:
    # ... database operation
    if not result.data:
        raise HTTPException(status_code=404, detail="Resource not found")
except HTTPException:
    raise  # Re-raise with original status code
except Exception as e:
    raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

# ❌ BAD: Don't catch and re-raise as 500
try:
    # ... operation
except Exception as e:
    raise HTTPException(status_code=500, detail="Something went wrong")
```

#### Database Operations:
```python
# ✅ GOOD: Clear, readable Supabase operations
def create_restaurant(data: RestaurantCreate):
    restaurant_data = {
        "Name": data.Name,
        "Description": data.Description,
        "IsActive": True,
        "Rating": 0.0
    }
    
    result = supabase.from_("Restaurants").insert(restaurant_data).execute()
    return result.data[0] if result.data else None

# ❌ BAD: Complex inline operations
def create_restaurant(data):
    return supabase.from_("Restaurants").insert({k:v for k,v in data.dict().items() if v is not None}).execute().data[0]
```

### Frontend (TypeScript/React/Next.js)

#### Code Style
- **Use TypeScript** for all new components
- **Follow Next.js 14+ App Router** conventions
- **Use Material-UI components** consistently
- **Implement proper error handling**

#### Component Structure:
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableRow,
    Button,
    Alert 
} from '@mui/material';

interface Restaurant {
    RestaurantId: number;
    Name: string;
    Description: string;
    // ... other fields
}

export default function RestaurantMenuPage() {
    const params = useParams();
    const router = useRouter();
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const restaurantId = params.restaurantId as string;

    useEffect(() => {
        fetchRestaurants();
    }, []);

    const fetchRestaurants = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/restaurants/${restaurantId}`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.status}`);
            }
            
            const data = await response.json();
            setRestaurants(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <Alert severity="error">{error}</Alert>;

    return (
        <div>
            {/* Component JSX */}
        </div>
    );
}
```

#### Dynamic Routing Standards:
```
✅ GOOD: Use Next.js conventions
app/admin/restaurants/[restaurantId]/page.tsx  # Dynamic route
app/admin/restaurants/[restaurantId]/menu/page.tsx  # Nested route

❌ BAD: Don't use query parameters for routes
app/admin/restaurants/page.tsx?id=123  # Wrong approach
```

## Architecture Guidelines

### Backend Architecture

#### Route Organization:
```python
# ✅ GOOD: Separate routers by domain
routes/
├── auth_routes.py       # /api/register, /api/login
├── restaurant_routes.py # /api/restaurants/*
├── menu_routes.py       # /api/restaurants/{id}/menu/*
└── user_routes.py       # /api/users/*

# Main app registration:
app.include_router(auth_router, prefix="/api", tags=["auth"])
app.include_router(restaurant_router, prefix="/api", tags=["restaurants"])
```

#### Model Design:
```python
# ✅ GOOD: Clear, validated models
from pydantic import BaseModel, EmailStr
from typing import Optional

class RestaurantCreate(BaseModel):
    Name: str
    Description: str
    Address: str
    Phone: str
    Email: EmailStr
    CuisineType: str
    DeliveryFee: Optional[float] = 0.0

class Restaurant(RestaurantCreate):
    RestaurantId: int
    IsActive: bool
    Rating: float
    CreatedAt: datetime
```

### Frontend Architecture

#### Component Hierarchy:
```
✅ GOOD: Organized component structure
components/
├── common/           # Reusable UI components
│   ├── Header.tsx
│   ├── Navigation.tsx
│   └── LoadingSpinner.tsx
├── admin/           # Admin-specific components  
│   ├── RestaurantTable.tsx
│   ├── MenuItemForm.tsx
│   └── Dashboard.tsx
└── customer/        # Customer-facing components
    ├── RestaurantCard.tsx
    └── OrderHistory.tsx
```

#### State Management:
```typescript
// ✅ GOOD: Use React hooks for local state
const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// For global state (when needed), consider:
// - React Context for auth state
// - SWR/TanStack Query for server state
// - Zustand for complex client state
```

## Testing Requirements

### Backend Testing (Required for all PRs)

**We maintain at least 78% test coverage** - your contributions must maintain this standard.

#### Writing Tests:
```python
# ✅ GOOD: Comprehensive test structure
import pytest
from fastapi import status
from unittest.mock import patch

class TestRestaurantRoutes:
    @patch('routes.restaurant_routes.supabase')
    def test_create_restaurant_success(self, mock_supabase, client, sample_restaurant_data):
        """Test successful restaurant creation"""
        # Setup mock
        mock_supabase.from_.return_value.insert.return_value.execute.return_value.data = [
            {**sample_restaurant_data, "RestaurantId": 1, "IsActive": True}
        ]
        
        # Make request
        response = client.post("/api/restaurants", json=sample_restaurant_data)
        
        # Assertions
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert "restaurant" in data

    @patch('routes.restaurant_routes.supabase')
    def test_create_restaurant_database_error(self, mock_supabase, client, sample_restaurant_data):
        """Test restaurant creation with database error"""
        # Setup mock to raise exception
        mock_supabase.from_.return_value.insert.return_value.execute.side_effect = Exception("Database error")
        
        # Make request
        response = client.post("/api/restaurants", json=sample_restaurant_data)
        
        # Assertions
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    def test_create_restaurant_invalid_data(self, client):
        """Test restaurant creation with invalid data"""
        invalid_data = {"Name": ""}  # Missing required fields
        
        response = client.post("/api/restaurants", json=invalid_data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
```

#### Running Tests:
```bash
# Run all tests with coverage
python -m pytest tests/ --cov=. --cov-report=term-missing --cov-report=html

# Run specific test file
python -m pytest tests/test_restaurant_routes.py -v

# Run tests matching pattern
python -m pytest -k "restaurant" -v

# Run with coverage for specific module
python -m pytest tests/test_restaurant_routes.py --cov=routes.restaurant_routes
```

#### Test Organization:
```python
# ✅ GOOD: Organized test classes
class TestRestaurantRoutes:
    """Test CRUD operations"""
    def test_create_restaurant_success(self): pass
    def test_get_restaurant_success(self): pass
    def test_update_restaurant_success(self): pass
    def test_delete_restaurant_success(self): pass

class TestRestaurantValidation:
    """Test input validation"""
    def test_invalid_email_format(self): pass
    def test_missing_required_fields(self): pass
    def test_negative_delivery_fee(self): pass
```

### Frontend Testing (Recommended)

```typescript
// ✅ GOOD: Component testing with Jest/RTL
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RestaurantTable from '../components/admin/RestaurantTable';

describe('RestaurantTable', () => {
    it('renders restaurant data correctly', async () => {
        const mockRestaurants = [
            { RestaurantId: 1, Name: 'Test Restaurant', CuisineType: 'Italian' }
        ];

        render(<RestaurantTable restaurants={mockRestaurants} />);
        
        expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
        expect(screen.getByText('Italian')).toBeInTheDocument();
    });

    it('handles delete restaurant action', async () => {
        const mockOnDelete = jest.fn();
        
        render(<RestaurantTable restaurants={[]} onDelete={mockOnDelete} />);
        
        const deleteButton = screen.getByRole('button', { name: /delete/i });
        fireEvent.click(deleteButton);
        
        await waitFor(() => {
            expect(mockOnDelete).toHaveBeenCalled();
        });
    });
});
```

## Pull Request Process

### Before Submitting

1. **Run all tests** and ensure they pass:
   ```bash
   cd backend && python -m pytest tests/ --cov=. --cov-report=term-missing
   ```

2. **Check code formatting**:
   ```bash
   # Python (use black or similar)
   black backend/ --line-length 88
   
   # TypeScript (use prettier)
   cd frontend && npm run format
   ```

3. **Verify no breaking changes** to existing APIs

4. **Update documentation** if needed

### PR Template

When creating a pull request, include:

```markdown
## Description
Brief description of changes and why they're needed.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update

## Testing
- [ ] Backend tests pass (98%+ coverage maintained)
- [ ] Frontend components tested (if applicable)
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No breaking changes to existing APIs

## Screenshots (if applicable)
[Add screenshots of UI changes]

## Related Issues
Closes #[issue number]
```

### Review Process

1. **Automated checks** must pass (tests, linting)
2. **Code review** by at least one maintainer
3. **Manual testing** of new features
4. **Documentation review** if applicable
5. **Merge** after approval

## Security Guidelines

### API Security
- **Never commit secrets** to version control
- **Use environment variables** for sensitive configuration
- **Validate all input** using Pydantic models
- **Implement proper error handling** (don't leak sensitive info)

```python
# ✅ GOOD: Secure error handling
try:
    # Database operation
    result = supabase.from_("Users").select("*").eq("email", email).execute()
except Exception as e:
    # Log the full error for debugging
    print(f"Database error: {e}")
    # Return generic error to user
    raise HTTPException(status_code=500, detail="Internal server error")

# ❌ BAD: Leaking sensitive information
try:
    result = supabase.auth.sign_in_with_password({"email": email, "password": password})
except Exception as e:
    # Don't expose database details to users
    raise HTTPException(status_code=500, detail=str(e))
```

### Database Security
- **Use parameterized queries** (Supabase handles this)
- **Implement proper authentication** before database access
- **Follow principle of least privilege** for database permissions

### Frontend Security
- **Sanitize user input** before displaying
- **Use HTTPS** in production
- **Implement proper authentication** state management
- **Don't store sensitive data** in localStorage

## Performance Considerations

### Backend Performance
- **Use async/await** for I/O operations
- **Implement pagination** for large datasets
- **Add database indexes** for frequently queried fields
- **Cache frequently accessed data** when appropriate

```python
# ✅ GOOD: Paginated endpoint
@restaurant_router.get("/restaurants")
async def get_restaurants(
    page: int = 1, 
    limit: int = 20,
    search: Optional[str] = None
):
    offset = (page - 1) * limit
    
    query = supabase.from_("Restaurants").select("*")
    
    if search:
        query = query.ilike("Name", f"%{search}%")
    
    result = query.range(offset, offset + limit - 1).execute()
    return result.data
```

### Frontend Performance
- **Use React.memo** for expensive components
- **Implement lazy loading** for routes and components
- **Optimize images** and use Next.js Image component
- **Minimize bundle size** by tree-shaking unused code

```typescript
// ✅ GOOD: Lazy loading and memoization
import dynamic from 'next/dynamic';
import { memo } from 'react';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
    loading: () => <p>Loading...</p>,
});

const OptimizedTable = memo(({ data }: { data: Restaurant[] }) => {
    return (
        <Table>
            {data.map(restaurant => (
                <TableRow key={restaurant.RestaurantId}>
                    {/* Table content */}
                </TableRow>
            ))}
        </Table>
    );
});
```

## Common Patterns and Best Practices

### Error Handling Patterns

```python
# ✅ GOOD: Consistent error responses
from fastapi import HTTPException

def create_error_response(status_code: int, message: str, details: str = None):
    return HTTPException(
        status_code=status_code,
        detail={
            "message": message,
            "details": details,
            "timestamp": datetime.utcnow().isoformat()
        }
    )

# Usage:
if not restaurant_data:
    raise create_error_response(404, "Restaurant not found", f"ID: {restaurant_id}")
```

### API Response Patterns

```python
# ✅ GOOD: Consistent response format
def create_success_response(data, message: str = "Success"):
    return {
        "success": True,
        "message": message,
        "data": data,
        "timestamp": datetime.utcnow().isoformat()
    }

def create_error_response(message: str, details=None):
    return {
        "success": False,
        "message": message,
        "details": details,
        "timestamp": datetime.utcnow().isoformat()
    }
```

### Database Query Patterns

```python
# ✅ GOOD: Reusable database functions
async def get_restaurant_by_id(restaurant_id: int) -> Optional[dict]:
    """Get restaurant by ID with error handling"""
    try:
        result = supabase.from_("Restaurants")\
            .select("*")\
            .eq("RestaurantId", restaurant_id)\
            .execute()
        
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error fetching restaurant {restaurant_id}: {e}")
        return None

async def update_restaurant_status(restaurant_id: int, is_active: bool) -> bool:
    """Update restaurant active status"""
    try:
        result = supabase.from_("Restaurants")\
            .update({"IsActive": is_active})\
            .eq("RestaurantId", restaurant_id)\
            .execute()
        
        return bool(result.data)
    except Exception as e:
        print(f"Error updating restaurant {restaurant_id}: {e}")
        return False
```

## Getting Help

### Resources
- **Project Documentation**: Check README.md and INSTALL.md
- **API Documentation**: Available at `/docs` when backend is running
- **Test Examples**: Look at existing tests in `backend/tests/`
- **Code Examples**: Check existing route handlers and components

### Communication Channels
- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Pull Request Comments**: For code-specific discussions

### Contact Maintainers
- **GitHub**: @Jawamegamind
- **Email**: [Your preferred contact email]

---

Thank you for contributing to PeerCafe! Your efforts help make this platform better for everyone. 🍕✨

## Quick Reference

### Useful Commands
```bash
# Backend
cd backend
conda activate peercafe-backend
uvicorn main:app --reload                    # Start backend
python -m pytest tests/ --cov=. -v          # Run tests
python -m pytest -k "restaurant" -v         # Run specific tests

# Frontend  
cd frontend
npm run dev                                  # Start frontend
npm run build                                # Build for production
npm run lint                                 # Check code style

# Both
git checkout -b feature/your-feature-name    # Create feature branch
git add . && git commit -m "descriptive message"  # Commit changes
git push origin feature/your-feature-name    # Push for PR
```

### File Locations
- **Backend Routes**: `backend/routes/`
- **Backend Models**: `backend/models/`  
- **Backend Tests**: `backend/tests/`
- **Frontend Pages**: `frontend/app/`
- **Frontend Components**: `frontend/app/components/`
- **Configuration**: `backend/.env`, `frontend/.env.local`
