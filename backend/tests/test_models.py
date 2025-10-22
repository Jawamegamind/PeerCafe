"""
Tests for Pydantic models
"""
import pytest
from pydantic import ValidationError
from datetime import datetime
from models.user_model import User
from models.restaurant_model import Restaurant, RestaurantCreate
from models.login_model import LoginRequestModel
from models.order_model import (
    OrderItem, DeliveryAddress, OrderCreate, Order, OrderUpdate,
    OrderStatus
)


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


class TestOrderItemModel:
    """Test cases for OrderItem model"""

    @pytest.fixture
    def sample_order_item_data(self):
        """Sample order item data for testing"""
        return {
            "item_id": 123,
            "item_name": "Margherita Pizza",
            "price": 12.99,
            "quantity": 2,
            "subtotal": 25.98,
            "special_instructions": "Extra cheese"
        }

    def test_valid_order_item_creation(self, sample_order_item_data):
        """Test creating a valid order item"""
        item = OrderItem(**sample_order_item_data)
        
        assert item.item_id == 123
        assert item.item_name == "Margherita Pizza"
        assert item.price == 12.99
        assert item.quantity == 2
        assert item.subtotal == 25.98
        assert item.special_instructions == "Extra cheese"

    def test_order_item_without_instructions(self, sample_order_item_data):
        """Test order item creation without special instructions"""
        del sample_order_item_data["special_instructions"]
        
        item = OrderItem(**sample_order_item_data)
        assert item.special_instructions is None

    def test_order_item_subtotal_validation(self, sample_order_item_data):
        """Test subtotal validation"""
        sample_order_item_data["subtotal"] = 30.00  # Incorrect subtotal
        
        with pytest.raises(ValidationError) as exc_info:
            OrderItem(**sample_order_item_data)
        
        assert "Subtotal" in str(exc_info.value)

    def test_order_item_negative_values(self, sample_order_item_data):
        """Test order item with negative values"""
        sample_order_item_data["price"] = -5.0
        
        with pytest.raises(ValidationError):
            OrderItem(**sample_order_item_data)
        
        sample_order_item_data["price"] = 12.99
        sample_order_item_data["quantity"] = -1
        
        with pytest.raises(ValidationError):
            OrderItem(**sample_order_item_data)

    def test_order_item_zero_quantity(self, sample_order_item_data):
        """Test order item with zero quantity"""
        sample_order_item_data["quantity"] = 0
        sample_order_item_data["subtotal"] = 0
        
        with pytest.raises(ValidationError):
            OrderItem(**sample_order_item_data)


class TestDeliveryAddressModel:
    """Test cases for DeliveryAddress model"""

    @pytest.fixture
    def sample_address_data(self):
        """Sample address data for testing"""
        return {
            "street": "123 Main St, Apt 4B",
            "city": "San Francisco",
            "state": "CA",
            "zip_code": "94105",
            "instructions": "Ring doorbell twice"
        }

    def test_valid_address_creation(self, sample_address_data):
        """Test creating a valid delivery address"""
        address = DeliveryAddress(**sample_address_data)
        
        assert address.street == "123 Main St, Apt 4B"
        assert address.city == "San Francisco"
        assert address.state == "CA"
        assert address.zip_code == "94105"
        assert address.instructions == "Ring doorbell twice"

    def test_address_without_instructions(self, sample_address_data):
        """Test address creation without instructions"""
        del sample_address_data["instructions"]
        
        address = DeliveryAddress(**sample_address_data)
        assert address.instructions is None

    def test_address_missing_required_fields(self):
        """Test address creation with missing required fields"""
        with pytest.raises(ValidationError):
            DeliveryAddress(
                street="123 Main St",
                city="San Francisco"
                # Missing state and zip_code
            )


class TestOrderCreateModel:
    """Test cases for OrderCreate model (delivery-only)"""

    @pytest.fixture
    def sample_order_data(self):
        """Sample order data for testing"""
        return {
            "user_id": "user_123",
            "restaurant_id": 1,
            "order_items": [
                {
                    "item_id": 123,
                    "item_name": "Margherita Pizza",
                    "price": 12.99,
                    "quantity": 2,
                    "subtotal": 25.98
                },
                {
                    "item_id": 456,
                    "item_name": "Garlic Bread", 
                    "price": 5.99,
                    "quantity": 1,
                    "subtotal": 5.99
                }
            ],
            "delivery_address": {
                "street": "123 Main St",
                "city": "San Francisco",
                "state": "CA",
                "zip_code": "94105"
            },
            "subtotal": 31.97,
            "tax_amount": 2.56,
            "delivery_fee": 3.99,
            "tip_amount": 5.00,
            "discount_amount": 0.00,
            "total_amount": 43.52
        }

    def test_valid_order_creation(self, sample_order_data):
        """Test creating a valid delivery order"""
        order = OrderCreate(**sample_order_data)
        
        assert order.user_id == "user_123"
        assert order.restaurant_id == 1
        assert len(order.order_items) == 2
        assert order.subtotal == 31.97
        assert order.total_amount == 43.52

    def test_order_subtotal_validation(self, sample_order_data):
        """Test subtotal validation against item subtotals"""
        sample_order_data["subtotal"] = 50.00  # Incorrect subtotal
        
        with pytest.raises(ValidationError) as exc_info:
            OrderCreate(**sample_order_data)
        
        assert "does not match sum of item subtotals" in str(exc_info.value)

    def test_order_total_validation(self, sample_order_data):
        """Test total amount validation"""
        sample_order_data["total_amount"] = 100.00  # Incorrect total
        
        with pytest.raises(ValidationError) as exc_info:
            OrderCreate(**sample_order_data)
        
        assert "does not match calculated total" in str(exc_info.value)

    def test_order_empty_items(self, sample_order_data):
        """Test order with empty items list"""
        sample_order_data["order_items"] = []
        
        with pytest.raises(ValidationError):
            OrderCreate(**sample_order_data)

    def test_order_with_discount(self, sample_order_data):
        """Test order with discount applied"""
        sample_order_data["discount_amount"] = 5.00
        sample_order_data["total_amount"] = 38.52  # Adjusted for discount
        
        order = OrderCreate(**sample_order_data)
        assert order.discount_amount == 5.00
        assert order.total_amount == 38.52


class TestOrderModel:
    """Test cases for Order model"""

    @pytest.fixture
    def sample_complete_order_data(self):
        """Sample complete order data for testing"""
        return {
            "order_id": "550e8400-e29b-41d4-a716-446655440000",
            "user_id": "user_123",
            "delivery_user_id": "delivery_user_456",
            "restaurant_id": 1,
            "order_items": [
                {
                    "item_id": 123,
                    "item_name": "Margherita Pizza",
                    "price": 12.99,
                    "quantity": 2,
                    "subtotal": 25.98
                }
            ],
            "status": "delivered",
            "delivery_address": {
                "street": "123 Main St",
                "city": "San Francisco", 
                "state": "CA",
                "zip_code": "94105"
            },
            "subtotal": 25.98,
            "tax_amount": 2.08,
            "delivery_fee": 3.99,
            "tip_amount": 5.00,
            "discount_amount": 0.00,
            "total_amount": 37.05,
            "estimated_pickup_time": "2024-01-15T11:00:00Z",
            "estimated_delivery_time": "2024-01-15T11:30:00Z",
            "actual_pickup_time": "2024-01-15T11:05:00Z",
            "actual_delivery_time": "2024-01-15T11:25:00Z",
            "notes": "Customer requested contactless delivery",
            "created_at": "2024-01-15T10:30:00Z",
            "updated_at": "2024-01-15T11:25:00Z"
        }

    def test_complete_order_creation(self, sample_complete_order_data):
        """Test creating a complete order with all fields"""
        order = Order(**sample_complete_order_data)
        
        assert order.order_id == "550e8400-e29b-41d4-a716-446655440000"
        assert order.delivery_user_id == "delivery_user_456"
        assert order.status == OrderStatus.DELIVERED
        assert order.notes == "Customer requested contactless delivery"

    def test_order_minimal_creation(self):
        """Test creating order with minimal required fields"""
        minimal_data = {
            "order_id": "test_order_123",
            "user_id": "user_123",
            "restaurant_id": 1,
            "order_items": [
                {
                    "item_id": 123,
                    "item_name": "Test Item",
                    "price": 10.00,
                    "quantity": 1,
                    "subtotal": 10.00
                }
            ],
            "delivery_address": {
                "street": "123 Main St",
                "city": "Test City",
                "state": "CA", 
                "zip_code": "12345"
            },
            "subtotal": 10.00,
            "tax_amount": 0.80,
            "delivery_fee": 2.00,
            "tip_amount": 0.00,
            "discount_amount": 0.00,
            "total_amount": 12.80
        }
        
        order = Order(**minimal_data)
        assert order.delivery_user_id is None
        assert order.status == OrderStatus.PENDING


class TestOrderUpdateModel:
    """Test cases for OrderUpdate model"""

    def test_order_update_creation(self):
        """Test creating an order update"""
        update_data = {
            "status": "preparing",
            "delivery_user_id": "new_delivery_user",
            "estimated_pickup_time": "2024-01-15T12:00:00Z",
            "notes": "Updated preparation time"
        }
        
        update = OrderUpdate(**update_data)
        assert update.status == OrderStatus.PREPARING
        assert update.delivery_user_id == "new_delivery_user"
        assert update.notes == "Updated preparation time"

    def test_order_update_partial(self):
        """Test partial order update"""
        update = OrderUpdate(status="ready")
        
        assert update.status == OrderStatus.READY
        assert update.delivery_user_id is None
        assert update.notes is None


class TestOrderEnums:
    """Test cases for order-related enums"""

    def test_order_status_enum(self):
        """Test OrderStatus enum values"""
        assert OrderStatus.PENDING == "pending"
        assert OrderStatus.CONFIRMED == "confirmed"
        assert OrderStatus.PREPARING == "preparing"
        assert OrderStatus.READY == "ready"
        assert OrderStatus.ASSIGNED == "assigned"
        assert OrderStatus.PICKED_UP == "picked_up"
        assert OrderStatus.EN_ROUTE == "en_route"
        assert OrderStatus.DELIVERED == "delivered"
        assert OrderStatus.CANCELLED == "cancelled"