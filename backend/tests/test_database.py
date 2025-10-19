"""
Tests for database connections and utilities
"""
import pytest
from unittest.mock import patch, Mock
import os
from database.supabase_db import create_supabase_client


class TestSupabaseDB:
    """Test cases for Supabase database connection"""

    @patch.dict(os.environ, {
        'PROJECT_URL': 'https://test.supabase.co',
        'API_KEY': 'test_api_key_123'
    })
    @patch('database.supabase_db.create_client')
    def test_create_supabase_client_success(self, mock_create_client):
        """Test successful Supabase client creation"""
        # Mock the Supabase client
        mock_client = Mock()
        mock_create_client.return_value = mock_client
        
        client = create_supabase_client()
        
        # Verify create_client was called with correct parameters
        mock_create_client.assert_called_once_with(
            'https://test.supabase.co',
            'test_api_key_123'
        )
        assert client == mock_client

    @patch('database.supabase_db.load_dotenv')
    @patch('database.supabase_db.os.getenv')
    @patch('database.supabase_db.create_client')
    def test_create_supabase_client_missing_env_vars(self, mock_create_client, mock_getenv, mock_load_dotenv):
        """Test client creation with missing environment variables"""
        # Mock environment variables to return None
        mock_getenv.return_value = None
        
        # Mock the Supabase client
        mock_client = Mock()
        mock_create_client.return_value = mock_client
        
        client = create_supabase_client()
        
        # Should still call create_client, but with None values
        mock_create_client.assert_called_once_with(None, None)
        assert client == mock_client

    @patch.dict(os.environ, {
        'PROJECT_URL': '',
        'API_KEY': ''
    })
    @patch('database.supabase_db.create_client')
    def test_create_supabase_client_empty_env_vars(self, mock_create_client):
        """Test client creation with empty environment variables"""
        # Mock the Supabase client
        mock_client = Mock()
        mock_create_client.return_value = mock_client
        
        client = create_supabase_client()
        
        # Should call create_client with empty strings
        mock_create_client.assert_called_once_with('', '')
        assert client == mock_client

    @patch('database.supabase_db.load_dotenv')
    @patch('database.supabase_db.create_client')
    def test_dotenv_loading(self, mock_create_client, mock_load_dotenv):
        """Test that load_dotenv is called"""
        # Mock the Supabase client
        mock_client = Mock()
        mock_create_client.return_value = mock_client
        
        # Call the function to trigger load_dotenv
        create_supabase_client()
        
        # Verify load_dotenv was called
        mock_load_dotenv.assert_called_once()

    @patch('database.supabase_db.create_client')
    def test_client_creation_exception(self, mock_create_client):
        """Test handling of client creation exceptions"""
        # Mock create_client to raise an exception
        mock_create_client.side_effect = Exception("Connection failed")
        
        with pytest.raises(Exception) as excinfo:
            create_supabase_client()
        
        assert "Connection failed" in str(excinfo.value)

    def test_environment_variable_types(self):
        """Test that environment variables are treated as strings"""
        with patch.dict(os.environ, {
            'PROJECT_URL': 'https://test.supabase.co',
            'API_KEY': 'test_key_123'
        }):
            url = os.getenv("PROJECT_URL")
            key = os.getenv("API_KEY")
            
            assert isinstance(url, str)
            assert isinstance(key, str)
            assert url == 'https://test.supabase.co'
            assert key == 'test_key_123'

    @patch('database.supabase_db.create_client')
    def test_multiple_client_creation(self, mock_create_client):
        """Test creating multiple clients"""
        mock_client = Mock()
        mock_create_client.return_value = mock_client
        
        client1 = create_supabase_client()
        client2 = create_supabase_client()
        
        # Should create separate instances each time
        assert mock_create_client.call_count == 2
        assert client1 == mock_client
        assert client2 == mock_client

    @patch('database.supabase_db.os.getenv')
    def test_getenv_calls(self, mock_getenv):
        """Test that os.getenv is called for required variables"""
        mock_getenv.side_effect = lambda key: {
            "PROJECT_URL": "https://test.supabase.co",
            "API_KEY": "test_key"
        }.get(key)
        
        with patch('database.supabase_db.create_client') as mock_create_client:
            mock_create_client.return_value = Mock()
            create_supabase_client()
        
        # Verify getenv was called for both required variables
        mock_getenv.assert_any_call("PROJECT_URL")
        mock_getenv.assert_any_call("API_KEY")
        assert mock_getenv.call_count >= 2


class TestDatabaseIntegration:
    """Integration tests for database operations"""

    @patch('database.supabase_db.create_client')
    def test_database_operations_mock(self, mock_create_client):
        """Test basic database operations with mocked client"""
        # Setup mock client
        mock_client = Mock()
        mock_create_client.return_value = mock_client
        
        # Setup mock responses
        mock_response = Mock()
        mock_response.data = [{"id": 1, "name": "test"}]
        mock_client.from_.return_value.select.return_value.execute.return_value = mock_response
        
        # Get client and perform operations
        client = create_supabase_client()
        
        # Test select operation
        result = client.from_("test_table").select("*").execute()
        
        assert result.data == [{"id": 1, "name": "test"}]
        mock_client.from_.assert_called_with("test_table")

    def test_client_interface_methods(self):
        """Test that client has expected interface methods"""
        with patch('database.supabase_db.create_client') as mock_create_client:
            mock_client = Mock()
            # Add common Supabase client methods
            mock_client.from_ = Mock()
            mock_client.auth = Mock()
            mock_client.storage = Mock()
            
            mock_create_client.return_value = mock_client
            
            client = create_supabase_client()
            
            # Verify client has expected methods
            assert hasattr(client, 'from_')
            assert hasattr(client, 'auth')
            assert hasattr(client, 'storage')

    @patch('database.supabase_db.create_client')
    def test_error_handling_in_operations(self, mock_create_client):
        """Test error handling in database operations"""
        mock_client = Mock()
        mock_create_client.return_value = mock_client
        
        # Mock operation that raises exception
        mock_client.from_.return_value.select.return_value.execute.side_effect = Exception("Network error")
        
        client = create_supabase_client()
        
        with pytest.raises(Exception) as excinfo:
            client.from_("test_table").select("*").execute()
        
        assert "Network error" in str(excinfo.value)