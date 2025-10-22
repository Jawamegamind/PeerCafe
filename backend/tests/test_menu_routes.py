"""
Tests for menu routes - Comprehensive coverage for all endpoints
"""
import pytest
from fastapi import status
from unittest.mock import patch, Mock


class TestMenuRoutes:
    """Test cases for menu CRUD operations"""

    @patch('routes.menu_routes.supabase')
    def test_get_menu_items_success(self, mock_supabase, client, sample_menu_item_data):
        """Test successful retrieval of menu items"""
        # Mock successful query
        menu_items = [
            {**sample_menu_item_data, "item_id": 1},
            {**sample_menu_item_data, "item_id": 2, "item_name": "Pasta"}
        ]
        mock_supabase.from_.return_value.select.return_value.eq.return_value.execute.return_value.data = menu_items
        
        response = client.get("/api/restaurants/1/menu")
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.json()) == 2
        assert response.json()[0]["item_id"] == 1
        assert response.json()[1]["item_name"] == "Pasta"

    @patch('routes.menu_routes.supabase')
    def test_get_menu_items_empty(self, mock_supabase, client):
        """Test retrieval when no menu items exist"""
        # Mock empty result
        mock_supabase.from_.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        
        response = client.get("/api/restaurants/1/menu")
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    @patch('routes.menu_routes.supabase')
    def test_get_menu_items_none_data(self, mock_supabase, client):
        """Test retrieval when data is None"""
        # Mock None result
        mock_supabase.from_.return_value.select.return_value.eq.return_value.execute.return_value.data = None
        
        response = client.get("/api/restaurants/1/menu")
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    @patch('routes.menu_routes.supabase')
    def test_get_menu_items_database_error(self, mock_supabase, client):
        """Test retrieval with database error"""
        # Mock database error
        mock_supabase.from_.return_value.select.return_value.eq.return_value.execute.side_effect = Exception("Database error")
        
        response = client.get("/api/restaurants/1/menu")
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    @patch('routes.menu_routes.supabase')
    def test_create_menu_item_success(self, mock_supabase, client, sample_menu_item_data):
        """Test successful menu item creation"""
        # Mock restaurant exists
        mock_supabase.from_.return_value.select.return_value.eq.return_value.execute.return_value.data = [{"restaurant_id": 1}]
        
        # Mock successful insert
        created_item = {**sample_menu_item_data, "item_id": 1, "restaurant_id": 1}
        mock_supabase.from_.return_value.insert.return_value.execute.return_value.data = [created_item]
        
        response = client.post("/api/restaurants/1/menu", json=sample_menu_item_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Menu item created successfully"
        assert "menu_item" in data

    @patch('routes.menu_routes.supabase')
    def test_create_menu_item_restaurant_not_found(self, mock_supabase, client, sample_menu_item_data):
        """Test creation when restaurant doesn't exist"""
        # Mock restaurant not found
        mock_supabase.from_.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        
        response = client.post("/api/restaurants/999/menu", json=sample_menu_item_data)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @patch('routes.menu_routes.supabase')
    def test_create_menu_item_failed_insert(self, mock_supabase, client, sample_menu_item_data):
        """Test creation with failed insert"""
        # Mock restaurant exists
        mock_supabase.from_.return_value.select.return_value.eq.return_value.execute.return_value.data = [{"restaurant_id": 1}]
        
        # Mock failed insert
        mock_supabase.from_.return_value.insert.return_value.execute.return_value.data = None
        
        response = client.post("/api/restaurants/1/menu", json=sample_menu_item_data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_menu_item_invalid_data(self, client):
        """Test creation with invalid data"""
        invalid_data = {"item_name": ""}  # Missing required fields
        
        response = client.post("/api/restaurants/1/menu", json=invalid_data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @patch('routes.menu_routes.supabase')
    def test_create_menu_item_database_error(self, mock_supabase, client, sample_menu_item_data):
        """Test creation with database error"""
        # Mock database error during restaurant check
        mock_supabase.from_.return_value.select.return_value.eq.return_value.execute.side_effect = Exception("Database error")
        
        response = client.post("/api/restaurants/1/menu", json=sample_menu_item_data)
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    @patch('routes.menu_routes.supabase')
    def test_get_menu_item_success(self, mock_supabase, client, sample_menu_item_data):
        """Test successful retrieval of specific menu item"""
        # Mock successful query
        menu_item = {**sample_menu_item_data, "item_id": 1, "restaurant_id": 1}
        mock_supabase.from_.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [menu_item]
        
        response = client.get("/api/restaurants/1/menu/1")
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["item_id"] == 1

    @patch('routes.menu_routes.supabase')
    def test_get_menu_item_not_found(self, mock_supabase, client):
        """Test retrieval of non-existent menu item"""
        # Mock item not found
        mock_supabase.from_.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
        
        response = client.get("/api/restaurants/1/menu/999")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @patch('routes.menu_routes.supabase')
    def test_get_menu_item_database_error(self, mock_supabase, client):
        """Test retrieval with database error"""
        # Mock database error
        mock_supabase.from_.return_value.select.return_value.eq.return_value.eq.return_value.execute.side_effect = Exception("Database error")
        
        response = client.get("/api/restaurants/1/menu/1")
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    @patch('routes.menu_routes.supabase')
    def test_update_menu_item_success(self, mock_supabase, client, sample_menu_item_data):
        """Test successful menu item update"""
        # Mock successful update
        updated_item = {**sample_menu_item_data, "item_id": 1, "restaurant_id": 1}
        mock_supabase.from_.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = [updated_item]
        
        response = client.put("/api/restaurants/1/menu/1", json=sample_menu_item_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Menu item updated successfully"

    @patch('routes.menu_routes.supabase')
    def test_update_menu_item_not_found(self, mock_supabase, client, sample_menu_item_data):
        """Test update of non-existent menu item"""
        # Mock item not found
        mock_supabase.from_.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
        
        response = client.put("/api/restaurants/1/menu/999", json=sample_menu_item_data)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_menu_item_invalid_data(self, client):
        """Test update with invalid data"""
        invalid_data = {"item_name": ""}  # Missing required fields
        
        response = client.put("/api/restaurants/1/menu/1", json=invalid_data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @patch('routes.menu_routes.supabase')
    def test_update_menu_item_database_error(self, mock_supabase, client, sample_menu_item_data):
        """Test update with database error"""
        # Mock database error
        mock_supabase.from_.return_value.update.return_value.eq.return_value.eq.return_value.execute.side_effect = Exception("Database error")
        
        response = client.put("/api/restaurants/1/menu/1", json=sample_menu_item_data)
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    @patch('routes.menu_routes.supabase')
    def test_delete_menu_item_success(self, mock_supabase, client):
        """Test successful menu item deletion"""
        # Mock successful deletion
        deleted_item = {"item_id": 1, "restaurant_id": 1}
        mock_supabase.from_.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value.data = [deleted_item]
        
        response = client.delete("/api/restaurants/1/menu/1")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Menu item deleted successfully"

    @patch('routes.menu_routes.supabase')
    def test_delete_menu_item_not_found(self, mock_supabase, client):
        """Test deletion of non-existent menu item"""
        # Mock item not found
        mock_supabase.from_.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
        
        response = client.delete("/api/restaurants/1/menu/999")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @patch('routes.menu_routes.supabase')
    def test_delete_menu_item_database_error(self, mock_supabase, client):
        """Test deletion with database error"""
        # Mock database error
        mock_supabase.from_.return_value.delete.return_value.eq.return_value.eq.return_value.execute.side_effect = Exception("Database error")
        
        response = client.delete("/api/restaurants/1/menu/1")
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    @patch('routes.menu_routes.supabase')
    def test_toggle_availability_success_to_unavailable(self, mock_supabase, client):
        """Test toggling availability from available to unavailable"""
        # Mock current item is available
        mock_supabase.from_.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [{"is_available": True}]
        
        # Mock successful update
        updated_item = {"item_id": 1, "is_available": False}
        mock_supabase.from_.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = [updated_item]
        
        response = client.patch("/api/restaurants/1/menu/1/availability")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert "unavailable" in data["message"]

    @patch('routes.menu_routes.supabase')
    def test_toggle_availability_success_to_available(self, mock_supabase, client):
        """Test toggling availability from unavailable to available"""
        # Mock current item is unavailable
        mock_supabase.from_.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [{"is_available": False}]
        
        # Mock successful update
        updated_item = {"item_id": 1, "is_available": True}
        mock_supabase.from_.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = [updated_item]
        
        response = client.patch("/api/restaurants/1/menu/1/availability")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert "available" in data["message"]

    @patch('routes.menu_routes.supabase')
    def test_toggle_availability_item_not_found_on_select(self, mock_supabase, client):
        """Test toggling availability when item not found during select"""
        # Mock item not found during select
        mock_supabase.from_.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
        
        response = client.patch("/api/restaurants/1/menu/999/availability")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @patch('routes.menu_routes.supabase')
    def test_toggle_availability_item_not_found_on_update(self, mock_supabase, client):
        """Test toggling availability when item not found during update"""
        # Mock current item exists
        mock_supabase.from_.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [{"is_available": True}]
        
        # Mock update returns no data
        mock_supabase.from_.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
        
        response = client.patch("/api/restaurants/1/menu/1/availability")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @patch('routes.menu_routes.supabase')
    def test_toggle_availability_database_error(self, mock_supabase, client):
        """Test toggling availability with database error"""
        # Mock database error during select
        mock_supabase.from_.return_value.select.return_value.eq.return_value.eq.return_value.execute.side_effect = Exception("Database error")
        
        response = client.patch("/api/restaurants/1/menu/1/availability")
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


class TestMenuRouteValidation:
    """Test request validation for menu routes"""

    def test_invalid_restaurant_id_format(self, client, sample_menu_item_data):
        """Test menu operations with invalid restaurant ID format"""
        response = client.get("/api/restaurants/abc/menu")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
        response = client.post("/api/restaurants/abc/menu", json=sample_menu_item_data)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_invalid_item_id_format(self, client, sample_menu_item_data):
        """Test menu item operations with invalid item ID format"""
        response = client.get("/api/restaurants/1/menu/abc")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
        response = client.put("/api/restaurants/1/menu/abc", json=sample_menu_item_data)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
        response = client.delete("/api/restaurants/1/menu/abc")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
        response = client.patch("/api/restaurants/1/menu/abc/availability")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_menu_item_missing_required_fields(self, client):
        """Test creation with missing required fields"""
        incomplete_data = {
            "description": "Test description"
            # Missing item_name, price, is_available
        }
        
        response = client.post("/api/restaurants/1/menu", json=incomplete_data)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_menu_item_invalid_price(self, client):
        """Test creation with invalid price"""
        invalid_data = {
            "item_name": "Test Item",
            "price": -5.0,  # Negative price
            "is_available": True
        }
        
        response = client.post("/api/restaurants/1/menu", json=invalid_data)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_menu_item_with_quantity_none(self, client):
        """Test creation with quantity as None (should default to 0)"""
        data = {
            "item_name": "Test Item",
            "price": 10.0,
            "is_available": True,
            "quantity": None
        }
        
        # This should be handled by the route (quantity or 0)
        # We need to mock the database calls for this test
        with patch('routes.menu_routes.supabase') as mock_supabase:
            # Mock restaurant exists
            mock_supabase.from_.return_value.select.return_value.eq.return_value.execute.return_value.data = [{"restaurant_id": 1}]
            
            # Mock successful insert
            created_item = {**data, "item_id": 1, "restaurant_id": 1, "quantity": 0}
            mock_supabase.from_.return_value.insert.return_value.execute.return_value.data = [created_item]
            
            response = client.post("/api/restaurants/1/menu", json=data)
            
            # Should succeed and default quantity to 0
            assert response.status_code == status.HTTP_200_OK