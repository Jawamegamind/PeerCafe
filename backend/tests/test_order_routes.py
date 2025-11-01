"""
Tests for order routes
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
import json
from datetime import datetime
from main import app
from models.order_model import OrderStatus

client = TestClient(app)

class TestOrderRoutes:
    """Test cases for order management routes"""

    @pytest.fixture
    def sample_order_create_data(self):
        """Sample order creation data for testing"""
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
                "zip_code": "94105",
                "instructions": "Ring doorbell"
            },
            "subtotal": 31.97,
            "tax_amount": 2.56,
            "delivery_fee": 3.99,
            "tip_amount": 5.00,
            "discount_amount": 0.00,
            "total_amount": 43.52,
            "notes": "Please deliver quickly"
        }

    @pytest.fixture
    def mock_order_response(self):
        """Mock order response from database"""
        return {
            "order_id": "550e8400-e29b-41d4-a716-446655440000",
            "user_id": "user_123",
            "delivery_user_id": None,
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
            "payment_method": "cash_on_delivery",
            "status": "pending",
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
            "estimated_pickup_time": "2024-01-15T11:00:00",
            "estimated_delivery_time": "2024-01-15T11:30:00",
            "actual_pickup_time": None,
            "actual_delivery_time": None,
            "notes": "Test order",
            "created_at": "2024-01-15T10:30:00",
            "updated_at": "2024-01-15T10:30:00"
        }

    @patch('routes.order_routes.create_supabase_client')
    def test_place_order_success(self, mock_supabase_client, sample_order_create_data, mock_order_response):
        """Test successful order placement"""
        # Mock Supabase client
        mock_client = Mock()
        mock_table = Mock()
        mock_insert = Mock()
        
        mock_supabase_client.return_value = mock_client
        mock_client.table.return_value = mock_table
        mock_table.insert.return_value = mock_insert
        mock_insert.execute.return_value = Mock(data=[mock_order_response])
        
        # Make request
        response = client.post("/api/orders/", json=sample_order_create_data)
        
        # Assertions
        assert response.status_code == 201
        data = response.json()
        assert data["user_id"] == "user_123"
        assert data["restaurant_id"] == 1
        assert data["status"] == "pending"

    @patch('routes.order_routes.create_supabase_client')
    def test_place_order_invalid_data(self, mock_supabase_client):
        """Test order placement with invalid data"""
        invalid_data = {
            "user_id": "user_123",
            "restaurant_id": 1,
            "order_items": [],  # Empty items - should fail validation
            "delivery_address": {
                "street": "123 Main St",
                "city": "San Francisco",
                "state": "CA",
                "zip_code": "94105"
            },
            "subtotal": 0,
            "total_amount": 0
        }
        
        response = client.post("/api/orders/", json=invalid_data)
        assert response.status_code == 422  # Validation error

    @patch('routes.order_routes.create_supabase_client')
    def test_get_user_orders(self, mock_supabase_client, mock_order_response):
        """Test retrieving user orders"""
        mock_client = Mock()
        mock_table = Mock()
        mock_select = Mock()
        mock_eq = Mock()
        mock_order = Mock()
        mock_range = Mock()
        
        mock_supabase_client.return_value = mock_client
        mock_client.table.return_value = mock_table
        mock_table.select.return_value = mock_select
        mock_select.eq.return_value = mock_eq
        mock_eq.order.return_value = mock_order
        mock_order.range.return_value = mock_range
        mock_range.execute.return_value = Mock(data=[mock_order_response])
        
        response = client.get("/api/orders/user/user_123")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["user_id"] == "user_123"

    @patch('routes.order_routes.create_supabase_client')
    def test_get_order_by_id(self, mock_supabase_client, mock_order_response):
        """Test retrieving specific order by ID"""
        mock_client = Mock()
        mock_table = Mock()
        mock_select = Mock()
        mock_eq = Mock()
        
        mock_supabase_client.return_value = mock_client
        mock_client.table.return_value = mock_table
        mock_table.select.return_value = mock_select
        mock_select.eq.return_value = mock_eq
        mock_eq.execute.return_value = Mock(data=[mock_order_response])
        
        order_id = "550e8400-e29b-41d4-a716-446655440000"
        response = client.get(f"/api/orders/{order_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["order_id"] == order_id

    @patch('routes.order_routes.create_supabase_client')
    def test_get_order_by_id_not_found(self, mock_supabase_client):
        """Test retrieving non-existent order"""
        mock_client = Mock()
        mock_table = Mock()
        mock_select = Mock()
        mock_eq = Mock()
        
        mock_supabase_client.return_value = mock_client
        mock_client.table.return_value = mock_table
        mock_table.select.return_value = mock_select
        mock_select.eq.return_value = mock_eq
        mock_eq.execute.return_value = Mock(data=[])
        
        response = client.get("/api/orders/nonexistent_id")
        
        assert response.status_code == 404
        assert "Order not found" in response.json()["detail"]

    @patch('routes.order_routes.create_supabase_client')
    def test_update_order_status(self, mock_supabase_client, mock_order_response):
        """Test updating order status"""
        # Setup mocks for checking existing order and updating
        mock_client = Mock()
        
        # Mock for checking existing order
        mock_table_check = Mock()
        mock_select_check = Mock()
        mock_eq_check = Mock()
        
        # Mock for updating order
        mock_table_update = Mock()
        mock_update = Mock()
        mock_eq_update = Mock()
        
        mock_supabase_client.return_value = mock_client
        
        # Setup the mock chain for checking existing order
        mock_client.table.return_value = mock_table_check
        mock_table_check.select.return_value = mock_select_check
        mock_select_check.eq.return_value = mock_eq_check
        mock_eq_check.execute.return_value = Mock(data=[mock_order_response])
        
        # Setup the mock chain for updating order (second call to table())
        def table_side_effect(table_name):
            if hasattr(table_side_effect, 'call_count'):
                table_side_effect.call_count += 1
            else:
                table_side_effect.call_count = 1
            
            if table_side_effect.call_count == 1:
                return mock_table_check
            else:
                return mock_table_update
        
        mock_client.table.side_effect = table_side_effect
        mock_table_update.update.return_value = mock_update
        mock_update.eq.return_value = mock_eq_update
        
        updated_order = mock_order_response.copy()
        updated_order["status"] = "confirmed"
        mock_eq_update.execute.return_value = Mock(data=[updated_order])
        
        order_id = "550e8400-e29b-41d4-a716-446655440000"
        response = client.patch(f"/api/orders/{order_id}/status?new_status=confirmed")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "confirmed"

    @patch('routes.order_routes.create_supabase_client')
    def test_assign_delivery_user(self, mock_supabase_client, mock_order_response):
        """Test assigning delivery user to order"""
        mock_client = Mock()
        
        # Mock existing order (ready status)
        ready_order = mock_order_response.copy()
        ready_order["status"] = "ready"
        
        mock_table_check = Mock()
        mock_select_check = Mock()
        mock_eq_check = Mock()
        mock_table_update = Mock()
        mock_update = Mock()
        mock_eq_update = Mock()
        
        mock_supabase_client.return_value = mock_client
        
        def table_side_effect(table_name):
            if hasattr(table_side_effect, 'call_count'):
                table_side_effect.call_count += 1
            else:
                table_side_effect.call_count = 1
            
            if table_side_effect.call_count == 1:
                return mock_table_check
            else:
                return mock_table_update
        
        mock_client.table.side_effect = table_side_effect
        mock_table_check.select.return_value = mock_select_check
        mock_select_check.eq.return_value = mock_eq_check
        mock_eq_check.execute.return_value = Mock(data=[ready_order])
        
        mock_table_update.update.return_value = mock_update
        mock_update.eq.return_value = mock_eq_update
        
        assigned_order = ready_order.copy()
        assigned_order["delivery_user_id"] = "delivery_user_456"
        assigned_order["status"] = "assigned"
        mock_eq_update.execute.return_value = Mock(data=[assigned_order])
        
        order_id = "550e8400-e29b-41d4-a716-446655440000"
        response = client.patch(
            f"/api/orders/{order_id}/assign-delivery?delivery_user_id=delivery_user_456"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["delivery_user_id"] == "delivery_user_456"
        assert data["status"] == "assigned"

    @patch('routes.order_routes.create_supabase_client')
    def test_cancel_order(self, mock_supabase_client, mock_order_response):
        """Test cancelling an order"""
        mock_client = Mock()
        
        mock_table_check = Mock()
        mock_select_check = Mock()
        mock_eq_check = Mock()
        mock_table_update = Mock()
        mock_update = Mock()
        mock_eq_update = Mock()
        
        mock_supabase_client.return_value = mock_client
        
        def table_side_effect(table_name):
            if hasattr(table_side_effect, 'call_count'):
                table_side_effect.call_count += 1
            else:
                table_side_effect.call_count = 1
            
            if table_side_effect.call_count == 1:
                return mock_table_check
            else:
                return mock_table_update
        
        mock_client.table.side_effect = table_side_effect
        mock_table_check.select.return_value = mock_select_check
        mock_select_check.eq.return_value = mock_eq_check
        mock_eq_check.execute.return_value = Mock(data=[mock_order_response])
        
        mock_table_update.update.return_value = mock_update
        mock_update.eq.return_value = mock_eq_update
        
        cancelled_order = mock_order_response.copy()
        cancelled_order["status"] = "cancelled"
        mock_eq_update.execute.return_value = Mock(data=[cancelled_order])
        
        order_id = "550e8400-e29b-41d4-a716-446655440000"
        response = client.delete(f"/api/orders/{order_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Order cancelled successfully"
        assert data["order_id"] == order_id

    @patch('routes.order_routes.create_supabase_client')
    def test_get_restaurant_orders(self, mock_supabase_client, mock_order_response):
        """Test retrieving orders for a restaurant"""
        mock_client = Mock()
        mock_table = Mock()
        mock_select = Mock()
        mock_eq = Mock()
        mock_order = Mock()
        mock_range = Mock()
        
        mock_supabase_client.return_value = mock_client
        mock_client.table.return_value = mock_table
        mock_table.select.return_value = mock_select
        mock_select.eq.return_value = mock_eq
        mock_eq.order.return_value = mock_order
        mock_order.range.return_value = mock_range
        mock_range.execute.return_value = Mock(data=[mock_order_response])
        
        response = client.get("/api/orders/restaurant/1")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["restaurant_id"] == 1

    @patch('routes.order_routes.create_supabase_client')
    def test_get_my_orders(self, mock_supabase_client, mock_order_response):
        """Test retrieving orders for the authenticated user via /api/orders/me"""
        mock_client = Mock()
        mock_table = Mock()
        mock_select = Mock()
        mock_eq = Mock()
        mock_order = Mock()
        mock_range = Mock()

        # Mock auth.get_user to return user with user_id
        mock_client.auth = Mock()
        mock_client.auth.get_user.return_value = {"data": {"user": {"user_id": "user_123"}}}

        mock_supabase_client.return_value = mock_client
        mock_client.table.return_value = mock_table
        mock_table.select.return_value = mock_select
        mock_select.eq.return_value = mock_eq
        mock_eq.order.return_value = mock_order
        mock_order.range.return_value = mock_range
        mock_range.execute.return_value = Mock(data=[mock_order_response])

        headers = {"Authorization": "Bearer faketoken"}
        response = client.get("/api/orders/me", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["user_id"] == "user_123"

