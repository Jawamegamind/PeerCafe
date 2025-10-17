"""
Configuration and fixtures for pytest
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, MagicMock
import os
from main import app

@pytest.fixture
def client():
    """Create a test client for the FastAPI app"""
    return TestClient(app)

@pytest.fixture
def mock_supabase():
    """Mock Supabase client for testing"""
    mock_client = Mock()
    mock_response = Mock()
    mock_response.data = []
    mock_client.from_.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
    mock_client.from_.return_value.select.return_value.execute.return_value = mock_response
    mock_client.from_.return_value.insert.return_value.execute.return_value = mock_response
    mock_client.from_.return_value.update.return_value.eq.return_value.execute.return_value = mock_response
    return mock_client

@pytest.fixture
def sample_user_data():
    """Sample user data for testing"""
    return {
        "user_id": "test_user_123",
        "FirstName": "John",
        "LastName": "Doe",
        "Email": "john.doe@example.com",
        "Phone": "+1234567890",
        "IsAdmin": False,
        "IsActive": True,
        "Password": "secure_password_123"
    }

@pytest.fixture
def sample_restaurant_data():
    """Sample restaurant data for testing"""
    return {
        "Name": "Mario's Pizza",
        "Description": "Authentic Italian pizza",
        "Address": "123 Main St, City, State 12345",
        "Phone": "+1234567890",
        "Email": "info@mariospizza.com",
        "CuisineType": "Italian",
        "DeliveryFee": 2.99
    }

@pytest.fixture
def sample_login_data():
    """Sample login data for testing"""
    return {
        "user_id": "test_user_123",
        "Email": "john.doe@example.com",
        "Password": "secure_password_123"
    }

@pytest.fixture(autouse=True)
def setup_test_env():
    """Setup test environment variables"""
    with patch.dict(os.environ, {
        'PROJECT_URL': 'https://test.supabase.co',
        'API_KEY': 'test_api_key'
    }):
        yield