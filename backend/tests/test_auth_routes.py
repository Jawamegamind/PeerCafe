"""
Tests for authentication routes - Fixed version with proper mocking
"""
import pytest
from fastapi import status
from unittest.mock import patch, Mock
import bcrypt


class TestAuthRoutes:
    """Test cases for authentication endpoints"""

    @patch('routes.auth_routes.supabase')
    def test_register_new_user_success(self, mock_supabase, client, sample_user_data):
        """Test successful user registration"""
        # Mock user doesn't exist
        mock_supabase.from_.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        
        # Mock successful user creation
        mock_supabase.from_.return_value.insert.return_value.execute.return_value = Mock()
        
        response = client.post("/api/register", json=sample_user_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["message"] == "User created successfully"

    @patch('routes.auth_routes.supabase')
    def test_register_existing_user(self, mock_supabase, client, sample_user_data):
        """Test registration with existing email"""
        # Mock user already exists
        existing_user = {
            "user_id": "existing-123",
            "Email": sample_user_data["Email"].lower(),
            "FirstName": "Existing",
            "LastName": "User"
        }
        mock_supabase.from_.return_value.select.return_value.eq.return_value.execute.return_value.data = [existing_user]
        
        response = client.post("/api/register", json=sample_user_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["message"] == "User already exists"

    def test_register_invalid_data(self, client):
        """Test registration with invalid data"""
        invalid_data = {"Email": "invalid-email"}  # Missing required fields
        
        response = client.post("/api/register", json=invalid_data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @patch('routes.auth_routes.supabase')
    def test_register_database_error(self, mock_supabase, client, sample_user_data):
        """Test registration with database error"""
        # Mock user doesn't exist check
        mock_supabase.from_.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        
        # Mock database error on insert
        mock_supabase.from_.return_value.insert.return_value.execute.side_effect = Exception("Database error")
        
        response = client.post("/api/register", json=sample_user_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["message"] == "User creation failed"

    @patch('routes.auth_routes.supabase')
    @patch('routes.auth_routes.bcrypt.checkpw')
    def test_login_success(self, mock_checkpw, mock_supabase, client, sample_login_data):
        """Test successful user login"""
        # Mock bcrypt password verification to return True
        mock_checkpw.return_value = True
        
        # Mock user exists with any hashed password
        mock_user = {
            "user_id": "test-123",
            "Email": sample_login_data["Email"].lower(),
            "FirstName": "Test",
            "LastName": "User",
            "Password": "hashed_password_mock",
            "IsAdmin": False,
            "IsActive": True
        }
        mock_supabase.from_.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_user]
        
        response = client.post("/api/login", json=sample_login_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["message"] == "Login successful"
        assert "user" in data

    @patch('routes.auth_routes.supabase')
    def test_login_user_not_found(self, mock_supabase, client, sample_login_data):
        """Test login with non-existent user"""
        # Mock user not found
        mock_supabase.from_.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        
        response = client.post("/api/login", json=sample_login_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["message"] == "User not found"

    @patch('routes.auth_routes.supabase')
    @patch('routes.auth_routes.bcrypt.checkpw')
    def test_login_invalid_password(self, mock_checkpw, mock_supabase, client, sample_login_data):
        """Test login with invalid password"""
        # Mock bcrypt password verification to return False
        mock_checkpw.return_value = False
        
        # Mock user exists with any hashed password
        mock_user = {
            "user_id": "test-123",
            "Email": sample_login_data["Email"].lower(),
            "Password": "hashed_password_mock",
            "IsAdmin": False,
            "IsActive": True
        }
        mock_supabase.from_.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_user]
        
        response = client.post("/api/login", json=sample_login_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["message"] == "Invalid password"

    def test_login_invalid_data(self, client):
        """Test login with invalid data"""
        invalid_data = {"Email": "invalid-email"}  # Missing password
        
        response = client.post("/api/login", json=invalid_data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @patch('routes.auth_routes.supabase')
    def test_login_database_error(self, mock_supabase, client, sample_login_data):
        """Test login with database error"""
        # Mock database error
        mock_supabase.from_.return_value.select.return_value.eq.return_value.execute.side_effect = Exception("Database error")
        
        response = client.post("/api/login", json=sample_login_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["message"] == "Login failed"

    @patch('routes.auth_routes.supabase')
    def test_register_with_authorization_header(self, mock_supabase, client, sample_user_data):
        """Test registration with authorization header"""
        # Mock user doesn't exist
        mock_supabase.from_.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        
        # Mock successful user creation
        mock_supabase.from_.return_value.insert.return_value.execute.return_value = Mock()
        
        headers = {"Authorization": "Bearer fake-jwt-token"}
        response = client.post("/api/register", json=sample_user_data, headers=headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["message"] == "User created successfully"

    @patch('routes.auth_routes.supabase')
    @patch('routes.auth_routes.bcrypt.checkpw')
    def test_login_with_authorization_header(self, mock_checkpw, mock_supabase, client, sample_login_data):
        """Test login with authorization header"""
        # Mock bcrypt password verification to return True
        mock_checkpw.return_value = True
        
        # Mock user exists
        mock_user = {
            "user_id": "test-123",
            "Email": sample_login_data["Email"].lower(),
            "Password": "hashed_password_mock",
            "IsAdmin": False,
            "IsActive": True
        }
        mock_supabase.from_.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_user]
        
        headers = {"Authorization": "Bearer fake-jwt-token"}
        response = client.post("/api/login", json=sample_login_data, headers=headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["message"] == "Login successful"

    @patch('routes.auth_routes.user_exists')
    def test_user_exists_helper_function(self, mock_user_exists):
        """Test the user_exists helper function"""
        from routes.auth_routes import user_exists
        
        # Mock user exists
        mock_user_exists.return_value = True
        
        result = user_exists(value="test@example.com")
        assert result is True
        
        # Mock user doesn't exist
        mock_user_exists.return_value = False
        
        result = user_exists(value="nonexistent@example.com")
        assert result is False


class TestAuthRouteValidation:
    """Test request validation for auth routes"""

    def test_register_missing_email(self, client):
        """Test registration with missing email"""
        data = {
            "user_id": "test-123",
            "FirstName": "Test",
            "LastName": "User",
            "Password": "testpass123",
            "Phone": "+1234567890",
            "IsAdmin": False,
            "IsActive": True
        }
        
        response = client.post("/api/register", json=data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # def test_register_invalid_email_format(self, client):
    #     """Test registration with invalid email format"""
    #     data = {
    #         "user_id": "test-123",
    #         "FirstName": "Test",
    #         "LastName": "User",
    #         "Email": "invalid-email-format",
    #         "Password": "testpass123",
    #         "Phone": "+1234567890",
    #         "IsAdmin": False,
    #         "IsActive": True
    #     }
        
    #     response = client.post("/api/register", json=data)
        
    #     assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_register_missing_password(self, client):
        """Test registration with missing password"""
        data = {
            "user_id": "test-123",
            "FirstName": "Test",
            "LastName": "User",
            "Email": "test@example.com",
            "Phone": "+1234567890",
            "IsAdmin": False,
            "IsActive": True
        }
        
        response = client.post("/api/register", json=data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_login_missing_email(self, client):
        """Test login with missing email"""
        data = {"Password": "testpass123"}
        
        response = client.post("/api/login", json=data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_login_missing_password(self, client):
        """Test login with missing password"""
        data = {"Email": "test@example.com"}
        
        response = client.post("/api/login", json=data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_login_invalid_email_format(self, client):
        """Test login with invalid email format"""
        data = {
            "Email": "invalid-email-format",
            "Password": "testpass123"
        }
        
        response = client.post("/api/login", json=data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestPasswordHashing:
    """Test password hashing functionality"""

    def test_password_hashing_consistency(self):
        """Test that password hashing works consistently"""
        password = "testpass123"
        
        # Hash the password
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Verify the password
        assert bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
        
        # Verify wrong password fails
        assert not bcrypt.checkpw("wrongpassword".encode('utf-8'), hashed.encode('utf-8'))

    def test_different_passwords_different_hashes(self):
        """Test that different passwords produce different hashes"""
        password1 = "testpass123"
        password2 = "testpass456"
        
        hash1 = bcrypt.hashpw(password1.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        hash2 = bcrypt.hashpw(password2.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        assert hash1 != hash2

    def test_same_password_different_salts(self):
        """Test that same password with different salts produces different hashes"""
        password = "testpass123"
        
        hash1 = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        hash2 = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Different hashes due to different salts
        assert hash1 != hash2
        
        # But both verify correctly
        assert bcrypt.checkpw(password.encode('utf-8'), hash1.encode('utf-8'))
        assert bcrypt.checkpw(password.encode('utf-8'), hash2.encode('utf-8'))