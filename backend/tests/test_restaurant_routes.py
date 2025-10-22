"""
Tests for restaurant routes - Fixed version with proper mocking
"""
import pytest
from fastapi import status
from unittest.mock import patch, Mock


class TestRestaurantRoutes:
    """Test cases for restaurant CRUD operations"""

    @patch('routes.restaurant_routes.supabase')
    def test_create_restaurant_success(self, mock_supabase, client, sample_restaurant_data):
        """Test successful restaurant creation"""
        # Mock successful insert
        mock_supabase.from_.return_value.insert.return_value.execute.return_value.data = [
            {**sample_restaurant_data, "restaurant_id": 1, "is_active": True, "rating": 0.0}
        ]
        
        response = client.post("/api/restaurants", json=sample_restaurant_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Restaurant created successfully"
        assert "restaurant" in data

    def test_create_restaurant_invalid_data(self, client):
        """Test restaurant creation with invalid data"""
        invalid_data = {"name": ""}  # Missing required fields
        
        response = client.post("/api/restaurants", json=invalid_data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @patch('routes.restaurant_routes.supabase')
    def test_create_restaurant_database_error(self, mock_supabase, client, sample_restaurant_data):
        """Test restaurant creation with database error"""
        # Mock database error
        mock_supabase.from_.return_value.insert.return_value.execute.side_effect = Exception("Database error")
        
        response = client.post("/api/restaurants", json=sample_restaurant_data)
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    @patch('routes.restaurant_routes.supabase')
    def test_create_restaurant_failed_insert(self, mock_supabase, client, sample_restaurant_data):
        """Test restaurant creation with failed insert"""
        # Mock failed insert (no data returned)
        mock_supabase.from_.return_value.insert.return_value.execute.return_value.data = None
        
        response = client.post("/api/restaurants", json=sample_restaurant_data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @patch('routes.restaurant_routes.supabase')
    def test_get_all_restaurants_success(self, mock_supabase, client, sample_restaurant_data):
        """Test successful retrieval of all restaurants"""
        # Mock restaurants data
        restaurants_data = [
            {**sample_restaurant_data, "restaurant_id": 1, "is_active": True, "rating": 4.5},
            {**sample_restaurant_data, "restaurant_id": 2, "name": "Joe's Burgers", "is_active": True, "rating": 4.2}
        ]
        mock_supabase.from_.return_value.select.return_value.execute.return_value.data = restaurants_data
        
        response = client.get("/api/restaurants")
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.json()) == 2
        assert response.json()[0]["restaurant_id"] == 1
        assert response.json()[1]["restaurant_id"] == 2

    @patch('routes.restaurant_routes.supabase')
    def test_get_all_restaurants_empty(self, mock_supabase, client):
        """Test retrieval of restaurants when none exist"""
        # Mock empty result
        mock_supabase.from_.return_value.select.return_value.execute.return_value.data = []
        
        response = client.get("/api/restaurants")
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    @patch('routes.restaurant_routes.supabase')
    def test_get_all_restaurants_database_error(self, mock_supabase, client):
        """Test retrieval of restaurants with database error"""
        # Mock database error
        mock_supabase.from_.return_value.select.return_value.execute.side_effect = Exception("Database error")
        
        response = client.get("/api/restaurants")
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    @patch('routes.restaurant_routes.supabase')
    def test_get_restaurant_by_id_success(self, mock_supabase, client, sample_restaurant_data):
        """Test successful retrieval of restaurant by ID"""
        # Mock restaurant data
        restaurant_data = {**sample_restaurant_data, "restaurant_id": 1, "is_active": True, "rating": 4.5}
        mock_supabase.from_.return_value.select.return_value.eq.return_value.execute.return_value.data = [restaurant_data]
        
        response = client.get("/api/restaurants/1")
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["restaurant_id"] == 1

    @patch('routes.restaurant_routes.supabase')
    def test_get_restaurant_by_id_not_found(self, mock_supabase, client):
        """Test retrieval of non-existent restaurant"""
        # Mock restaurant not found
        mock_supabase.from_.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        
        response = client.get("/api/restaurants/999")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @patch('routes.restaurant_routes.supabase')
    def test_get_restaurant_by_id_database_error(self, mock_supabase, client):
        """Test retrieval of restaurant with database error"""
        # Mock database error
        mock_supabase.from_.return_value.select.return_value.eq.return_value.execute.side_effect = Exception("Database error")
        
        response = client.get("/api/restaurants/1")
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    @patch('routes.restaurant_routes.supabase')
    def test_update_restaurant_success(self, mock_supabase, client, sample_restaurant_data):
        """Test successful restaurant update"""
        # Mock successful update
        updated_restaurant = {**sample_restaurant_data, "restaurant_id": 1, "is_active": True}
        mock_supabase.from_.return_value.update.return_value.eq.return_value.execute.return_value.data = [updated_restaurant]
        
        response = client.put("/api/restaurants/1", json=sample_restaurant_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Restaurant updated successfully"

    def test_update_restaurant_invalid_data(self, client):
        """Test restaurant update with invalid data"""
        invalid_data = {"name": ""}  # Missing required fields
        
        response = client.put("/api/restaurants/1", json=invalid_data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @patch('routes.restaurant_routes.supabase')
    def test_update_restaurant_not_found(self, mock_supabase, client, sample_restaurant_data):
        """Test update of non-existent restaurant"""
        # Mock restaurant not found
        mock_supabase.from_.return_value.update.return_value.eq.return_value.execute.return_value.data = []
        
        response = client.put("/api/restaurants/999", json=sample_restaurant_data)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @patch('routes.restaurant_routes.supabase')
    def test_update_restaurant_database_error(self, mock_supabase, client, sample_restaurant_data):
        """Test restaurant update with database error"""
        # Mock database error
        mock_supabase.from_.return_value.update.return_value.eq.return_value.execute.side_effect = Exception("Database error")
        
        response = client.put("/api/restaurants/1", json=sample_restaurant_data)
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    @patch('routes.restaurant_routes.supabase')
    def test_delete_restaurant_success(self, mock_supabase, client):
        """Test successful restaurant deletion (soft delete)"""
        # Mock successful soft delete
        deleted_restaurant = {"restaurant_id": 1, "is_active": False}
        mock_supabase.from_.return_value.update.return_value.eq.return_value.execute.return_value.data = [deleted_restaurant]
        
        response = client.delete("/api/restaurants/1")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Restaurant deleted successfully"

    @patch('routes.restaurant_routes.supabase')
    def test_delete_restaurant_not_found(self, mock_supabase, client):
        """Test deletion of non-existent restaurant"""
        # Mock restaurant not found
        mock_supabase.from_.return_value.update.return_value.eq.return_value.execute.return_value.data = []
        
        response = client.delete("/api/restaurants/999")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @patch('routes.restaurant_routes.supabase')
    def test_delete_restaurant_database_error(self, mock_supabase, client):
        """Test restaurant deletion with database error"""
        # Mock database error
        mock_supabase.from_.return_value.update.return_value.eq.return_value.execute.side_effect = Exception("Database error")
        
        response = client.delete("/api/restaurants/1")
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    @patch('routes.restaurant_routes.supabase')
    def test_restore_restaurant_success(self, mock_supabase, client):
        """Test successful restaurant restoration"""
        # Mock successful restore
        restored_restaurant = {"restaurant_id": 1, "is_active": True}
        mock_supabase.from_.return_value.update.return_value.eq.return_value.execute.return_value.data = [restored_restaurant]
        
        response = client.patch("/api/restaurants/1/restore")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Restaurant restored successfully"

    @patch('routes.restaurant_routes.supabase')
    def test_restore_restaurant_not_found(self, mock_supabase, client):
        """Test restoration of non-existent restaurant"""
        # Mock restaurant not found
        mock_supabase.from_.return_value.update.return_value.eq.return_value.execute.return_value.data = []
        
        response = client.patch("/api/restaurants/999/restore")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @patch('routes.restaurant_routes.supabase')
    def test_restore_restaurant_database_error(self, mock_supabase, client):
        """Test restaurant restoration with database error"""
        # Mock database error
        mock_supabase.from_.return_value.update.return_value.eq.return_value.execute.side_effect = Exception("Database error")
        
        response = client.patch("/api/restaurants/1/restore")
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


class TestRestaurantRouteValidation:
    """Test request validation for restaurant routes"""

    def test_create_restaurant_missing_name(self, client):
        """Test creation with missing name field"""
        data = {
            "description": "Test description",
            "address": "123 Test St",
            "phone": "+1234567890",
            "email": "test@example.com",
            "cuisine_type": "Italian"
        }
        
        response = client.post("/api/restaurants", json=data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_restaurant_invalid_email(self, client):
        """Test creation with invalid email format"""
        data = {
            "name": "Test Restaurant",
            "description": "Test description", 
            "address": "123 Test St",
            "phone": "+1234567890",
            "email": "invalid-email",
            "cuisine_type": "Italian"
        }
        
        response = client.post("/api/restaurants", json=data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_restaurant_negative_delivery_fee(self, client):
        """Test creation with negative delivery fee"""
        data = {
            "name": "Test Restaurant",
            "description": "Test description",
            "address": "123 Test St", 
            "phone": "+1234567890",
            "email": "test@example.com",
            "cuisine_type": "Italian",
            "delivery_fee": -5.0
        }
        
        response = client.post("/api/restaurants", json=data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_get_restaurant_invalid_id_format(self, client):
        """Test get restaurant with invalid ID format"""
        response = client.get("/api/restaurants/abc")
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_update_restaurant_invalid_id_format(self, client, sample_restaurant_data):
        """Test update restaurant with invalid ID format"""
        response = client.put("/api/restaurants/abc", json=sample_restaurant_data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY