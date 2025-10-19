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
        assert user.FirstName == "John"
        assert user.LastName == "Doe"
        assert user.Email == "john.doe@example.com"
        assert user.Phone == "+1234567890"
        assert user.IsAdmin == False
        assert user.IsActive == True
        assert user.Password == "secure_password_123"

    def test_user_missing_required_fields(self):
        """Test user creation with missing required fields"""
        with pytest.raises(ValidationError):
            User(
                FirstName="John",
                LastName="Doe"
                # Missing other required fields
            )

    def test_user_invalid_email_format(self, sample_user_data):
        """Test user creation with invalid email format"""
        sample_user_data["Email"] = "invalid-email-format"
        
        # Note: User model doesn't enforce email validation, but this tests the input
        user = User(**sample_user_data)
        assert user.Email == "invalid-email-format"

    def test_user_empty_strings(self, sample_user_data):
        """Test user creation with empty strings"""
        sample_user_data["FirstName"] = ""
        sample_user_data["LastName"] = ""
        
        user = User(**sample_user_data)
        assert user.FirstName == ""
        assert user.LastName == ""

    def test_user_boolean_fields(self, sample_user_data):
        """Test user boolean field validation"""
        sample_user_data["IsAdmin"] = True
        sample_user_data["IsActive"] = False
        
        user = User(**sample_user_data)
        assert user.IsAdmin == True
        assert user.IsActive == False

    def test_user_model_dict_conversion(self, sample_user_data):
        """Test converting user model to dictionary"""
        user = User(**sample_user_data)
        user_dict = user.model_dump()
        
        assert isinstance(user_dict, dict)
        assert user_dict["FirstName"] == "John"
        assert user_dict["Email"] == "john.doe@example.com"


class TestRestaurantModel:
    """Test cases for Restaurant model"""

    def test_valid_restaurant_creation(self, sample_restaurant_data):
        """Test creating a valid restaurant"""
        restaurant = Restaurant(**sample_restaurant_data)
        
        assert restaurant.Name == "Mario's Pizza"
        assert restaurant.Description == "Authentic Italian pizza"
        assert restaurant.CuisineType == "Italian"
        assert restaurant.IsActive == True  # Default value
        assert restaurant.Rating == 0.0  # Default value

    def test_restaurant_with_optional_fields(self):
        """Test restaurant creation with minimal required fields"""
        minimal_data = {
            "Name": "Test Restaurant",
            "Address": "123 Test St",
            "Phone": "+1234567890",
            "Email": "test@restaurant.com",
            "CuisineType": "American"
        }
        
        restaurant = Restaurant(**minimal_data)
        assert restaurant.Name == "Test Restaurant"
        assert restaurant.Description is None
        assert restaurant.DeliveryFee == 0.0

    def test_restaurant_missing_required_fields(self):
        """Test restaurant creation with missing required fields"""
        with pytest.raises(ValidationError):
            Restaurant(
                Name="Test Restaurant"
                # Missing other required fields
            )

    def test_restaurant_invalid_email(self, sample_restaurant_data):
        """Test restaurant creation with invalid email"""
        sample_restaurant_data["Email"] = "invalid-email"
        
        with pytest.raises(ValidationError):
            Restaurant(**sample_restaurant_data)

    def test_restaurant_negative_values(self, sample_restaurant_data):
        """Test restaurant with negative rating/delivery fee"""
        sample_restaurant_data["Rating"] = -1.0
        sample_restaurant_data["DeliveryFee"] = -5.0
        
        restaurant = Restaurant(**sample_restaurant_data)
        assert restaurant.Rating == -1.0
        assert restaurant.DeliveryFee == -5.0

    def test_restaurant_id_auto_generated(self, sample_restaurant_data):
        """Test that RestaurantId can be None (auto-generated)"""
        restaurant = Restaurant(**sample_restaurant_data)
        assert restaurant.RestaurantId is None
        
        # Test with explicit ID
        sample_restaurant_data["RestaurantId"] = 123
        restaurant_with_id = Restaurant(**sample_restaurant_data)
        assert restaurant_with_id.RestaurantId == 123


class TestRestaurantCreateModel:
    """Test cases for RestaurantCreate model"""

    def test_valid_restaurant_create(self, sample_restaurant_data):
        """Test creating a valid RestaurantCreate instance"""
        # Remove RestaurantId as it shouldn't be in create model
        create_data = {k: v for k, v in sample_restaurant_data.items() if k != "RestaurantId"}
        
        restaurant = RestaurantCreate(**create_data)
        
        assert restaurant.Name == "Mario's Pizza"
        assert restaurant.CuisineType == "Italian"
        assert restaurant.DeliveryFee == 2.99

    def test_restaurant_create_minimal(self):
        """Test RestaurantCreate with minimal fields"""
        minimal_data = {
            "Name": "Test Restaurant",
            "Address": "123 Test St",
            "Phone": "+1234567890",
            "Email": "test@restaurant.com",
            "CuisineType": "American"
        }
        
        restaurant = RestaurantCreate(**minimal_data)
        assert restaurant.DeliveryFee == 0.0  # Default value

    def test_restaurant_create_invalid_email(self):
        """Test RestaurantCreate with invalid email"""
        invalid_data = {
            "Name": "Test Restaurant",
            "Address": "123 Test St",
            "Phone": "+1234567890",
            "Email": "invalid-email",
            "CuisineType": "American"
        }
        
        with pytest.raises(ValidationError):
            RestaurantCreate(**invalid_data)


class TestLoginRequestModel:
    """Test cases for LoginRequest model"""

    def test_valid_login_request(self, sample_login_data):
        """Test creating a valid login request"""
        login = LoginRequestModel(**sample_login_data)
        
        assert login.user_id == "test_user_123"
        assert login.Email == "john.doe@example.com"
        assert login.Password == "secure_password_123"

    def test_login_request_missing_fields(self):
        """Test login request with missing fields"""
        with pytest.raises(ValidationError):
            LoginRequestModel(
                Email="test@example.com"
                # Missing other required fields
            )

    def test_login_request_empty_strings(self):
        """Test login request with empty strings"""
        login_data = {
            "user_id": "",
            "Email": "",
            "Password": ""
        }
        
        login = LoginRequestModel(**login_data)
        assert login.user_id == ""
        assert login.Email == ""
        assert login.Password == ""

    def test_login_request_model_serialization(self, sample_login_data):
        """Test login request model serialization"""
        login = LoginRequestModel(**sample_login_data)
        login_dict = login.model_dump()
        
        assert isinstance(login_dict, dict)
        assert login_dict["Email"] == "john.doe@example.com"
        assert "Password" in login_dict


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
            "FirstName": "John",
            "LastName": "Doe",
            "Email": "john.doe@example.com",
            "Phone": "+1234567890",
            "IsAdmin": "false",  # String instead of boolean
            "IsActive": "true",   # String instead of boolean
            "Password": "secure_password_123"
        }
        
        user = User(**user_data)
        # Should coerce strings to booleans
        assert user.IsAdmin == False
        assert user.IsActive == True