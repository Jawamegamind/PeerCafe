"""
Tests for Pydantic models
"""
import pytest
from pydantic import ValidationError
from models.user_model import User
from models.restaurant_model import Restaurant, RestaurantCreate
from models.login_model import LoginRequestModel


class TestUserModel:
    """Test cases for User model"""

    def test_valid_user_creation(self, sample_user_data):
        """Test creating a valid user"""
        user = User(**sample_user_data)
        
        assert user.user_id == "test_user_123"
        assert user.first_name == "John"
        assert user.last_name == "Doe"
        assert user.email == "john.doe@example.com"
        assert user.phone == "+1234567890"
        assert user.is_admin == False
        assert user.is_active == True
        assert user.password == "secure_password_123"

    def test_user_missing_required_fields(self):
        """Test user creation with missing required fields"""
        with pytest.raises(ValidationError):
            User(
                first_name="John",
                last_name="Doe"
                # Missing other required fields
            )

    def test_user_invalid_email_format(self, sample_user_data):
        """Test user creation with invalid email format"""
        sample_user_data["email"] = "invalid-email-format"
        
        # Note: User model doesn't enforce email validation, but this tests the input
        user = User(**sample_user_data)
        assert user.email == "invalid-email-format"

    def test_user_empty_strings(self, sample_user_data):
        """Test user creation with empty strings"""
        sample_user_data["first_name"] = ""
        sample_user_data["last_name"] = ""
        
        user = User(**sample_user_data)
        assert user.first_name == ""
        assert user.last_name == ""

    def test_user_boolean_fields(self, sample_user_data):
        """Test user boolean field validation"""
        sample_user_data["is_admin"] = True
        sample_user_data["is_active"] = False
        
        user = User(**sample_user_data)
        assert user.is_admin == True
        assert user.is_active == False

    def test_user_model_dict_conversion(self, sample_user_data):
        """Test converting user model to dictionary"""
        user = User(**sample_user_data)
        user_dict = user.model_dump()
        
        assert isinstance(user_dict, dict)
        assert user_dict["first_name"] == "John"
        assert user_dict["email"] == "john.doe@example.com"


class TestRestaurantModel:
    """Test cases for Restaurant model"""

    def test_valid_restaurant_creation(self, sample_restaurant_data):
        """Test creating a valid restaurant"""
        restaurant = Restaurant(**sample_restaurant_data)
        
        assert restaurant.name == "Mario's Pizza"
        assert restaurant.description == "Authentic Italian pizza"
        assert restaurant.cuisine_type == "Italian"
        assert restaurant.is_active == True  # Default value
        assert restaurant.rating == 0.0  # Default value

    def test_restaurant_with_optional_fields(self):
        """Test restaurant creation with minimal required fields"""
        minimal_data = {
            "name": "Test Restaurant",
            "address": "123 Test St",
            "phone": "+1234567890",
            "email": "test@restaurant.com",
            "cuisine_type": "American"
        }
        
        restaurant = Restaurant(**minimal_data)
        assert restaurant.name == "Test Restaurant"
        assert restaurant.description is None
        assert restaurant.delivery_fee == 0.0

    def test_restaurant_missing_required_fields(self):
        """Test restaurant creation with missing required fields"""
        with pytest.raises(ValidationError):
            Restaurant(
                name="Test Restaurant"
                # Missing other required fields
            )

    def test_restaurant_invalid_email(self, sample_restaurant_data):
        """Test restaurant creation with invalid email"""
        sample_restaurant_data["email"] = "invalid-email"
        
        with pytest.raises(ValidationError):
            Restaurant(**sample_restaurant_data)

    def test_restaurant_negative_values(self, sample_restaurant_data):
        """Test restaurant with negative rating/delivery fee"""
        sample_restaurant_data["rating"] = -1.0
        sample_restaurant_data["delivery_fee"] = -5.0
        
        restaurant = Restaurant(**sample_restaurant_data)
        assert restaurant.rating == -1.0
        assert restaurant.delivery_fee == -5.0

    def test_restaurant_id_auto_generated(self, sample_restaurant_data):
        """Test that restaurant_id can be None (auto-generated)"""
        restaurant = Restaurant(**sample_restaurant_data)
        assert restaurant.restaurant_id is None
        
        # Test with explicit ID
        sample_restaurant_data["restaurant_id"] = 123
        restaurant_with_id = Restaurant(**sample_restaurant_data)
        assert restaurant_with_id.restaurant_id == 123


class TestRestaurantCreateModel:
    """Test cases for RestaurantCreate model"""

    def test_valid_restaurant_create(self, sample_restaurant_data):
        """Test creating a valid RestaurantCreate instance"""
        # Remove restaurant_id as it shouldn't be in create model
        create_data = {k: v for k, v in sample_restaurant_data.items() if k != "restaurant_id"}
        
        restaurant = RestaurantCreate(**create_data)
        
        assert restaurant.name == "Mario's Pizza"
        assert restaurant.cuisine_type == "Italian"
        assert restaurant.delivery_fee == 2.99

    def test_restaurant_create_minimal(self):
        """Test RestaurantCreate with minimal fields"""
        minimal_data = {
            "name": "Test Restaurant",
            "address": "123 Test St",
            "phone": "+1234567890",
            "email": "test@restaurant.com",
            "cuisine_type": "American"
        }
        
        restaurant = RestaurantCreate(**minimal_data)
        assert restaurant.delivery_fee == 0.0  # Default value

    def test_restaurant_create_invalid_email(self):
        """Test RestaurantCreate with invalid email"""
        invalid_data = {
            "name": "Test Restaurant",
            "address": "123 Test St",
            "phone": "+1234567890",
            "email": "invalid-email",
            "cuisine_type": "American"
        }
        
        with pytest.raises(ValidationError):
            RestaurantCreate(**invalid_data)


class TestLoginRequestModel:
    """Test cases for LoginRequest model"""

    def test_valid_login_request(self, sample_login_data):
        """Test creating a valid login request"""
        login = LoginRequestModel(**sample_login_data)
        
        assert login.user_id == "test_user_123"
        assert login.email == "john.doe@example.com"
        assert login.password == "secure_password_123"

    def test_login_request_missing_fields(self):
        """Test login request with missing fields"""
        with pytest.raises(ValidationError):
            LoginRequestModel(
                email="test@example.com"
                # Missing other required fields
            )

    def test_login_request_empty_strings(self):
        """Test login request with empty strings"""
        login_data = {
            "user_id": "",
            "email": "",
            "password": ""
        }
        
        login = LoginRequestModel(**login_data)
        assert login.user_id == ""
        assert login.email == ""
        assert login.password == ""

    def test_login_request_model_serialization(self, sample_login_data):
        """Test login request model serialization"""
        login = LoginRequestModel(**sample_login_data)
        login_dict = login.model_dump()
        
        assert isinstance(login_dict, dict)
        assert login_dict["email"] == "john.doe@example.com"
        assert "password" in login_dict


class TestModelValidation:
    """Test edge cases and validation scenarios"""

    def test_model_extra_fields_ignored(self, sample_user_data):
        """Test that extra fields are handled properly"""
        sample_user_data["extra_field"] = "should_be_ignored"
        
        user = User(**sample_user_data)
        # Extra field should not be present
        assert not hasattr(user, "extra_field")

    def test_type_coercion(self):
        """Test automatic type coercion"""
        user_data = {
            "user_id": "test_user_123",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@example.com",
            "phone": "+1234567890",
            "is_admin": "false",  # String instead of boolean
            "is_active": "true",   # String instead of boolean
            "password": "secure_password_123"
        }
        
        user = User(**user_data)
        # Should coerce strings to booleans
        assert user.is_admin == False
        assert user.is_active == True