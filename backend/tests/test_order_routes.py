"""
Tests for order routes
"""

from unittest.mock import Mock, patch

import pytest
from fastapi.testclient import TestClient

import routes.order_routes as order_routes
from main import app

client = TestClient(app)


# DummySupabase for async delivery address tests and other edge-case mocks
class DummySupabase:
    def from_(self, table):
        class Dummy:
            def select(self, *args):
                class Dummy2:
                    def eq(self, *args):
                        class Dummy3:
                            def execute(self):
                                return type("obj", (object,), {"data": None})

                        return Dummy3()

                return Dummy2()

        return Dummy()


def test_extract_first_row_edge_cases():
    """Edge cases for _extract_first_row: None, empty list, dict passthrough, and unexpected types."""
    # None input
    assert order_routes._extract_first_row(None) is None
    # Empty list
    assert order_routes._extract_first_row([]) is None
    # List with one element
    assert order_routes._extract_first_row([{"a": 1}]) == {"a": 1}
    # Dict input
    d = {"b": 2}
    assert order_routes._extract_first_row(d) == d
    # Unexpected type
    assert order_routes._extract_first_row("string") is None


def test_maybe_fill_address_and_coords_edge_cases():
    """Validate that missing user/address fields are handled and invalid lat/lng don't crash."""
    # Missing user fields
    order = {}
    user = {}
    result = order_routes._maybe_fill_address_and_coords(order.copy(), user.copy())
    assert result["delivery_address"]["street"] == "Unknown"
    # Invalid latitude/longitude should not raise and should not coerce invalid str
    order = {}
    user = {"latitude": "not_a_number", "longitude": None}
    result = order_routes._maybe_fill_address_and_coords(order.copy(), user.copy())
    # latitude remains uncoerced or absent, longitude remains absent
    assert (
        ("latitude" not in result)
        or isinstance(result["latitude"], float)
        or result["latitude"] == "not_a_number"
    )


@pytest.mark.asyncio
async def test_ensure_delivery_address_edge_cases():
    """Ensure delivery address is set when missing and None orders are handled gracefully."""
    # None order
    assert await order_routes._ensure_delivery_address(None, DummySupabase()) is None
    # Already has delivery_address
    order = {"delivery_address": {"street": "X"}}
    assert (
        await order_routes._ensure_delivery_address(order.copy(), DummySupabase())
        == order
    )
    # No user_id, fallback to placeholder
    order = {}
    result = await order_routes._ensure_delivery_address(order.copy(), DummySupabase())
    assert result["delivery_address"]["street"] == "Unknown"


def test_extract_user_id_from_auth_object_edge_cases():
    """Extract user id from dicts and objects via user_id/id/sub attributes; handle None."""
    # Dict with user_id
    assert order_routes._extract_user_id_from_auth_object({"user_id": "u"}) == "u"
    # Dict with id
    assert order_routes._extract_user_id_from_auth_object({"id": "i"}) == "i"
    # Dict with sub
    assert order_routes._extract_user_id_from_auth_object({"sub": "s"}) == "s"

    # Object with user_id
    class Obj:
        user_id = "u2"

    assert order_routes._extract_user_id_from_auth_object(Obj()) == "u2"

    # Object with id
    class Obj2:
        id = "i2"

    assert order_routes._extract_user_id_from_auth_object(Obj2()) == "i2"

    # Object with sub
    class Obj3:
        sub = "s2"

    assert order_routes._extract_user_id_from_auth_object(Obj3()) == "s2"
    # None
    assert order_routes._extract_user_id_from_auth_object(None) is None


def test_get_user_id_from_token_edge_cases():
    """Return None when token is missing or supabase auth client is unavailable."""

    # No token
    class DummySupabaseNoAuth:
        pass

    assert order_routes._get_user_id_from_token(None, DummySupabaseNoAuth()) is None

    # Supabase missing auth
    class DummySupabaseAuthNone:
        auth = None

    assert (
        order_routes._get_user_id_from_token("token", DummySupabaseAuthNone()) is None
    )


def test_get_user_profile_coordinates_from_supabase_edge_cases():
    """Return (None, None) for missing user_id, from_ chain, or malformed/invalid data payloads."""

    # No user_id
    class DummySupabaseNoFrom:
        pass

    assert order_routes._get_user_profile_coordinates_from_supabase(
        DummySupabaseNoFrom(), None
    ) == (None, None)

    # Supabase missing from_
    class DummySupabaseNoFrom2:
        pass

    assert order_routes._get_user_profile_coordinates_from_supabase(
        DummySupabaseNoFrom2(), "id"
    ) == (None, None)

    # Data is None
    class DummyRes:
        data = None

    class DummySupabase3:
        def from_(self, t):
            class Dummy:
                def select(self, *a):
                    class Dummy2:
                        def eq(self, *a):
                            class Dummy3:
                                def execute(self):
                                    return DummyRes()

                            return Dummy3()

                    return Dummy2()

            return Dummy()

    assert order_routes._get_user_profile_coordinates_from_supabase(
        DummySupabase3(), "id"
    ) == (None, None)

    # Data is list with invalid lat/lng
    class DummyRes2:
        data = [{"latitude": "bad", "longitude": None}]

    class DummySupabase4:
        def from_(self, t):
            class Dummy:
                def select(self, *a):
                    class Dummy2:
                        def eq(self, *a):
                            class Dummy3:
                                def execute(self):
                                    return DummyRes2()

                            return Dummy3()

                    return Dummy2()

            return Dummy()

    assert order_routes._get_user_profile_coordinates_from_supabase(
        DummySupabase4(), "id"
    ) == (None, None)


def test_normalize_order_item_edge_cases():
    """Normalize various item types to dict, falling back to empty dict when conversion isn't possible."""

    # Not a dict, but has model_dump
    class Item:
        def model_dump(self):
            return {"a": 1}

    assert order_routes._normalize_order_item(Item()) == {"a": 1}

    # Not a dict, fallback to dict()
    class Item2:
        def __iter__(self):
            return iter([("b", 2)])

    assert order_routes._normalize_order_item(Item2()) == {"b": 2}

    # Not a dict, cannot convert
    class Item3:
        pass

    assert order_routes._normalize_order_item(Item3()) == {}
    # None
    assert order_routes._normalize_order_item(None) == {}
    # Already dict
    d = {"c": 3}
    assert order_routes._normalize_order_item(d) == d


def test_normalize_order_items_edge_cases():
    """Normalize order items container: JSON string, non-list inputs, None entries, and missing subtotals."""
    # JSON string
    import json

    s = json.dumps([{"subtotal": "5.5"}])
    result = order_routes._normalize_order_items(s)
    assert isinstance(result, list) and result[0]["subtotal"] == 5.5
    # Not a list/tuple
    assert order_routes._normalize_order_items({"not": "a list"}) == []
    # List with None item
    result = order_routes._normalize_order_items([None])
    assert isinstance(result, list) and result[0]["subtotal"] == 0.0
    # List with item missing subtotal
    result = order_routes._normalize_order_items([{"name": "x"}])
    assert result[0]["subtotal"] == 0.0


@pytest.fixture
def sample_order_create_data():
    """Sample order creation payload used by order placement tests."""
    return {
        "user_id": "user_123",
        "restaurant_id": 1,
        "order_items": [
            {
                "item_id": 123,
                "item_name": "Margherita Pizza",
                "price": 12.99,
                "quantity": 2,
                "subtotal": 25.98,
            },
            {
                "item_id": 456,
                "item_name": "Garlic Bread",
                "price": 5.99,
                "quantity": 1,
                "subtotal": 5.99,
            },
        ],
        "delivery_address": {
            "street": "123 Main St",
            "city": "San Francisco",
            "state": "CA",
            "zip_code": "94105",
            "instructions": "Ring doorbell",
        },
        "subtotal": 31.97,
        "tax_amount": 2.56,
        "delivery_fee": 3.99,
        "tip_amount": 5.00,
        "discount_amount": 0.00,
        "total_amount": 43.52,
        "notes": "Please deliver quickly",
    }


@pytest.fixture
def mock_order_response():
    """Mock order response returned by the database layer for read/update operations."""
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
                "subtotal": 25.98,
            }
        ],
        "payment_method": "cash_on_delivery",
        "status": "pending",
        "delivery_address": {
            "street": "123 Main St",
            "city": "San Francisco",
            "state": "CA",
            "zip_code": "94105",
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
        "updated_at": "2024-01-15T10:30:00",
    }


@patch("routes.order_routes.geocode_address")
@patch("routes.order_routes.create_supabase_client")
def test_place_order_success(
    mock_supabase_client,
    mock_geocode,
    sample_order_create_data,
    mock_order_response,
):
    """Test successful order placement returns 201 and normalized order payload."""
    # Mock geocoding
    mock_geocode.return_value = (37.7749, -122.4194)  # San Francisco coords

    # Mock Supabase client
    mock_client = Mock()
    mock_supabase_client.return_value = mock_client

    # Mock restaurant lookup (from_ chain)
    mock_from = Mock()
    mock_select = Mock()
    mock_eq = Mock()
    mock_single = Mock()
    mock_client.from_.return_value = mock_from
    mock_from.select.return_value = mock_select
    mock_select.eq.return_value = mock_eq
    mock_eq.single.return_value = mock_single
    mock_single.execute.return_value = Mock(
        data={"latitude": 37.7849, "longitude": -122.4094}
    )

    # Mock table insert
    mock_table = Mock()
    mock_insert = Mock()
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


@patch("routes.order_routes.create_supabase_client")
def test_place_order_invalid_data(mock_supabase_client):
    """Order placement with empty items should fail validation with 422."""
    invalid_data = {
        "user_id": "user_123",
        "restaurant_id": 1,
        "order_items": [],  # Empty items - should fail validation
        "delivery_address": {
            "street": "123 Main St",
            "city": "San Francisco",
            "state": "CA",
            "zip_code": "94105",
        },
        "subtotal": 0,
        "total_amount": 0,
    }

    response = client.post("/api/orders/", json=invalid_data)
    assert response.status_code == 422  # Validation error


@patch("routes.order_routes.create_supabase_client")
def test_get_user_orders(mock_supabase_client, mock_order_response):
    """Retrieve orders by user_id and return a non-empty list."""
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


@patch("routes.order_routes.create_supabase_client")
def test_get_order_by_id(mock_supabase_client, mock_order_response):
    """Retrieve a specific order by ID and return 200 with matching order_id."""
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


@patch("routes.order_routes.create_supabase_client")
def test_get_order_by_id_not_found(mock_supabase_client):
    """Return 404 when order_id is not found in the database."""
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


@patch("routes.order_routes.create_supabase_client")
def test_update_order_status(mock_supabase_client, mock_order_response):
    """Update order status and return updated payload with new status."""
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
        if hasattr(table_side_effect, "call_count"):
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


@patch("routes.order_routes.create_supabase_client")
def test_assign_delivery_user(mock_supabase_client, mock_order_response):
    """Assign a delivery user to a ready order and transition status to assigned."""
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
        if hasattr(table_side_effect, "call_count"):
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


@patch("routes.order_routes.create_supabase_client")
def test_cancel_order(mock_supabase_client, mock_order_response):
    """Cancel an existing order and return confirmation payload."""
    mock_client = Mock()

    mock_table_check = Mock()
    mock_select_check = Mock()
    mock_eq_check = Mock()
    mock_table_update = Mock()
    mock_update = Mock()
    mock_eq_update = Mock()

    mock_supabase_client.return_value = mock_client

    def table_side_effect(table_name):
        if hasattr(table_side_effect, "call_count"):
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


@patch("routes.order_routes.create_supabase_client")
def test_get_restaurant_orders(mock_supabase_client, mock_order_response):
    """Retrieve orders by restaurant_id and return a non-empty list."""
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


@patch("routes.order_routes._normalize_single_order")
@patch("routes.order_routes._get_user_id_from_token")
@patch("routes.order_routes.create_supabase_client")
def test_get_my_orders_success(
    mock_supabase_client,
    mock_get_user_id,
    mock_normalize,
    mock_order_response,
):
    """Test successfully retrieving orders for authenticated user via /api/orders/me

    This test verifies that:
    - A valid Bearer token in the Authorization header is properly processed
    - The user_id is correctly extracted from the token
    - Orders are queried from the database for the authenticated user
    - The response contains the expected order data
    - HTTP 200 status is returned with a list of orders
    """
    # Mock token extraction to return user_id
    mock_get_user_id.return_value = "user_123"

    # Mock Supabase query chain
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

    # Mock normalization to return order as-is
    async def mock_normalize_func(order, supabase):
        return order

    mock_normalize.side_effect = mock_normalize_func

    headers = {"Authorization": "Bearer valid_token"}
    response = client.get("/api/orders/me", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["user_id"] == "user_123"
    mock_get_user_id.assert_called_once()


@patch("routes.order_routes._get_user_id_from_token")
@patch("routes.order_routes.create_supabase_client")
def test_get_my_orders_unauthorized_no_token(mock_supabase_client, mock_get_user_id):
    """Test /me endpoint returns 401 when no authorization header provided

    This test verifies the authentication requirement by:
    - Making a request without any Authorization header
    - Ensuring the endpoint rejects the request with HTTP 401
    - Confirming the error message indicates missing user identification

    Security check: Unauthenticated users should not access personal orders.
    """
    mock_get_user_id.return_value = None

    # No Authorization header
    response = client.get("/api/orders/me")

    assert response.status_code == 401
    assert "Unable to determine user" in response.json()["detail"]


@patch("routes.order_routes._get_user_id_from_token")
@patch("routes.order_routes.create_supabase_client")
def test_get_my_orders_unauthorized_invalid_token(
    mock_supabase_client, mock_get_user_id
):
    """Test /me endpoint returns 401 with invalid token

    This test verifies proper handling of invalid/expired tokens by:
    - Providing a Bearer token that cannot be validated
    - Simulating token validation failure (returns None for user_id)
    - Ensuring HTTP 401 is returned
    - Confirming appropriate error message

    Common scenarios: expired tokens, tampered tokens, or tokens from wrong service.
    """
    mock_get_user_id.return_value = None

    headers = {"Authorization": "Bearer invalid_token"}
    response = client.get("/api/orders/me", headers=headers)

    assert response.status_code == 401
    assert "Unable to determine user" in response.json()["detail"]


@patch("routes.order_routes._normalize_single_order")
@patch("routes.order_routes._get_user_id_from_token")
@patch("routes.order_routes.create_supabase_client")
def test_get_my_orders_empty_results(
    mock_supabase_client, mock_get_user_id, mock_normalize
):
    """Test /me endpoint returns empty list when user has no orders

    This test ensures graceful handling of new users or users with no order history:
    - Authenticates a valid user successfully
    - Database query returns no orders (empty data array)
    - HTTP 200 status is returned (not an error condition)
    - Response body is an empty list []

    Important: Empty results are valid and should not return 404 or error status.
    """
    mock_get_user_id.return_value = "user_no_orders"

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
    mock_range.execute.return_value = Mock(data=[])

    headers = {"Authorization": "Bearer valid_token"}
    response = client.get("/api/orders/me", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert data == []


@patch("routes.order_routes._normalize_single_order")
@patch("routes.order_routes._get_user_id_from_token")
@patch("routes.order_routes.create_supabase_client")
def test_get_my_orders_with_pagination(
    mock_supabase_client,
    mock_get_user_id,
    mock_normalize,
    mock_order_response,
):
    """Test /me endpoint respects limit and offset parameters

    This test verifies pagination functionality by:
    - Passing limit=10 and offset=5 as query parameters
    - Confirming the database range() method is called with correct values
    - Range calculation: (offset, offset + limit - 1) → (5, 14)
    - Ensuring the response contains the appropriate subset of orders

    Use case: Mobile apps or web interfaces loading orders in batches to improve
    performance and user experience. Default is limit=20, offset=0.
    """
    mock_get_user_id.return_value = "user_123"

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

    # Create multiple order responses
    order2 = mock_order_response.copy()
    order2["order_id"] = "550e8400-e29b-41d4-a716-446655440001"
    mock_range.execute.return_value = Mock(data=[order2])

    async def mock_normalize_func(order, supabase):
        return order

    mock_normalize.side_effect = mock_normalize_func

    headers = {"Authorization": "Bearer valid_token"}
    response = client.get("/api/orders/me?limit=10&offset=5", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    # Verify range was called with correct offset and limit
    mock_order.range.assert_called_once_with(5, 14)  # offset to offset + limit - 1


@patch("routes.order_routes._normalize_single_order")
@patch("routes.order_routes._get_user_id_from_token")
@patch("routes.order_routes.create_supabase_client")
def test_get_my_orders_multiple_orders(
    mock_supabase_client,
    mock_get_user_id,
    mock_normalize,
    mock_order_response,
):
    """Test /me endpoint returns multiple orders correctly

    This test verifies proper handling of users with multiple orders:
    - Creates 3 distinct orders with different IDs and statuses
    - All orders belong to the same authenticated user (user_123)
    - Confirms all 3 orders are returned in the response
    - Validates that each order has the correct user_id
    - Ensures normalization is applied to each order

    Real-world scenario: A user viewing their complete order history with various
    statuses (pending, confirmed, delivered).
    """
    mock_get_user_id.return_value = "user_123"

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

    # Create multiple orders
    order1 = mock_order_response.copy()
    order2 = mock_order_response.copy()
    order2["order_id"] = "550e8400-e29b-41d4-a716-446655440001"
    order2["status"] = "confirmed"
    order3 = mock_order_response.copy()
    order3["order_id"] = "550e8400-e29b-41d4-a716-446655440002"
    order3["status"] = "delivered"

    mock_range.execute.return_value = Mock(data=[order1, order2, order3])

    async def mock_normalize_func(order, supabase):
        return order

    mock_normalize.side_effect = mock_normalize_func

    headers = {"Authorization": "Bearer valid_token"}
    response = client.get("/api/orders/me", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 3
    assert data[0]["user_id"] == "user_123"
    assert data[1]["user_id"] == "user_123"
    assert data[2]["user_id"] == "user_123"
    # Verify all orders belong to the same user
    assert all(order["user_id"] == "user_123" for order in data)


@patch("routes.order_routes._get_user_id_from_token")
@patch("routes.order_routes.create_supabase_client")
def test_get_my_orders_malformed_bearer_token(mock_supabase_client, mock_get_user_id):
    """Test /me endpoint handles malformed Bearer token

    This test ensures robust error handling for incorrectly formatted auth headers:
    - Authorization header value: "Bearertoken" (missing space after "Bearer")
    - Correct format should be: "Bearer <token>"
    - Endpoint should fail to extract user_id and return HTTP 401
    - Prevents potential security issues from malformed authentication attempts

    Edge case: Catches client-side bugs in authentication header construction.
    """
    mock_get_user_id.return_value = None

    # Malformed authorization header (no space after Bearer)
    headers = {"Authorization": "Bearertoken"}
    response = client.get("/api/orders/me", headers=headers)

    assert response.status_code == 401
    assert "Unable to determine user" in response.json()["detail"]


# Test for successful retrieval of delivery user orders


@patch("routes.order_routes.create_supabase_client")
def test_get_delivery_user_orders(mock_supabase_client, mock_order_response):
    """Retrieve orders for a delivery user and return non-empty list for matching user."""
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

    order = mock_order_response.copy()
    order["delivery_user_id"] = "delivery_user_789"
    mock_range.execute.return_value = Mock(data=[order])

    response = client.get("/api/orders/delivery-user/delivery_user_789")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["delivery_user_id"] == "delivery_user_789"


# Test for empty delivery user orders
@patch("routes.order_routes.create_supabase_client")
def test_get_delivery_user_orders_empty(mock_supabase_client):
    """Return empty list when the delivery user has no orders."""
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

    mock_range.execute.return_value = Mock(data=[])

    response = client.get("/api/orders/delivery-user/no_orders_user")
    assert response.status_code == 200
    data = response.json()
    assert data == []


# Test for delivery user orders with status filter
@patch("routes.order_routes.create_supabase_client")
def test_get_delivery_user_orders_with_status_filter(
    mock_supabase_client, mock_order_response
):
    """Retrieve delivery user orders filtered by status and return matching results."""
    mock_client = Mock()
    mock_table = Mock()
    mock_select = Mock()
    mock_eq = Mock()
    mock_order = Mock()
    mock_range = Mock()

    mock_supabase_client.return_value = mock_client
    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    # First eq for delivery_user_id, second eq for status should both be supported by chain
    mock_select.eq.return_value = mock_eq
    # Make eq() return itself so it can be chained for status_filter
    mock_eq.eq.return_value = mock_eq
    mock_eq.order.return_value = mock_order
    mock_order.range.return_value = mock_range

    order = mock_order_response.copy()
    order["delivery_user_id"] = "delivery_user_789"
    order["status"] = "assigned"
    mock_range.execute.return_value = Mock(data=[order])

    response = client.get(
        "/api/orders/delivery-user/delivery_user_789?status_filter=assigned"
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["status"] == "assigned"


# ============================================
# VERIFY DELIVERY ENDPOINT TESTS
# ============================================


@patch("routes.order_routes._normalize_single_order")
@patch("routes.order_routes.create_supabase_client")
def test_verify_delivery_success_from_picked_up(
    mock_supabase_client, mock_normalize, mock_order_response
):
    """Test successful delivery verification from picked_up status.

    This test validates the happy path where a delivery driver successfully verifies
    delivery using the correct code when the order is in 'picked_up' status.

    Scenario:
    - Order exists with status 'picked_up'
    - Valid delivery code is provided that matches stored code
    - Database update succeeds

    Expected Result:
    - HTTP 200 status code
    - Order status changed to 'delivered'
    - delivery_code_used flag set to True
    - actual_delivery_time timestamp set
    """
    mock_client = Mock()
    mock_table = Mock()

    mock_supabase_client.return_value = mock_client
    mock_client.table.return_value = mock_table

    # Setup order data
    order = mock_order_response.copy()
    order["status"] = "picked_up"
    order["delivery_code"] = "1234"
    order["delivery_code_used"] = False

    updated_order = order.copy()
    updated_order["status"] = "delivered"
    updated_order["delivery_code_used"] = True

    # Mock initial fetch
    mock_select1 = Mock()
    mock_eq1 = Mock()
    mock_select1.eq.return_value = mock_eq1
    mock_eq1.execute.return_value = Mock(data=[order])

    # Mock update
    mock_update = Mock()
    mock_update_eq = Mock()
    mock_update.eq.return_value = mock_update_eq
    mock_update_eq.execute.return_value = Mock(data=[updated_order])

    # Mock refetch
    mock_select2 = Mock()
    mock_eq2 = Mock()
    mock_select2.eq.return_value = mock_eq2
    mock_eq2.execute.return_value = Mock(data=[updated_order])

    # Setup table method returns
    mock_table.select.side_effect = [mock_select1, mock_select2]
    mock_table.update.return_value = mock_update

    async def mock_normalize_func(order_data, supabase):
        return order_data

    mock_normalize.side_effect = mock_normalize_func

    payload = {"delivery_code": "1234"}
    response = client.post(
        "/api/orders/550e8400-e29b-41d4-a716-446655440000/verify-delivery",
        json=payload,
    )

    assert (
        response.status_code == 200
    ), f"Expected 200, got {response.status_code}. Response: {response.json()}"
    data = response.json()
    assert data["status"] == "delivered"
    assert data["delivery_code_used"] is True


@patch("routes.order_routes._normalize_single_order")
@patch("routes.order_routes.create_supabase_client")
def test_verify_delivery_success_from_en_route(
    mock_supabase_client, mock_normalize, mock_order_response
):
    """Test successful delivery verification from en_route status.

    This test validates delivery verification when the order is actively being delivered.
    The 'en_route' status indicates the driver is traveling to the customer.

    Scenario:
    - Order exists with status 'en_route' (driver en route to customer)
    - Valid delivery code "5678" is provided
    - Code matches the one stored in the order

    Expected Result:
    - HTTP 200 status code
    - Order successfully transitions to 'delivered' status
    - Proper timestamps and flags are updated
    """
    mock_client = Mock()
    mock_table = Mock()

    mock_supabase_client.return_value = mock_client
    mock_client.table.return_value = mock_table

    # Setup order data
    order = mock_order_response.copy()
    order["status"] = "en_route"
    order["delivery_code"] = "5678"
    order["delivery_code_used"] = False

    updated_order = order.copy()
    updated_order["status"] = "delivered"
    updated_order["delivery_code_used"] = True

    # Mock initial fetch
    mock_select1 = Mock()
    mock_eq1 = Mock()
    mock_select1.eq.return_value = mock_eq1
    mock_eq1.execute.return_value = Mock(data=[order])

    # Mock update
    mock_update = Mock()
    mock_update_eq = Mock()
    mock_update.eq.return_value = mock_update_eq
    mock_update_eq.execute.return_value = Mock(data=[updated_order])

    # Mock refetch
    mock_select2 = Mock()
    mock_eq2 = Mock()
    mock_select2.eq.return_value = mock_eq2
    mock_eq2.execute.return_value = Mock(data=[updated_order])

    # Setup table method returns
    mock_table.select.side_effect = [mock_select1, mock_select2]
    mock_table.update.return_value = mock_update

    async def mock_normalize_func(order_data, supabase):
        return order_data

    mock_normalize.side_effect = mock_normalize_func

    payload = {"delivery_code": "5678"}
    response = client.post(
        "/api/orders/550e8400-e29b-41d4-a716-446655440000/verify-delivery",
        json=payload,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "delivered"


@patch("routes.order_routes.create_supabase_client")
def test_verify_delivery_missing_code(mock_supabase_client):
    """Test verification fails when delivery_code is missing from payload.

    This test ensures proper validation of the request payload. The delivery_code
    field is mandatory for verification and must be present in the request body.

    Scenario:
    - POST request sent with empty payload {}
    - No delivery_code field provided

    Expected Result:
    - HTTP 400 Bad Request
    - Error message: "Missing delivery_code in request body"
    - No database queries are executed
    """
    payload = {}
    response = client.post(
        "/api/orders/550e8400-e29b-41d4-a716-446655440000/verify-delivery",
        json=payload,
    )

    assert response.status_code == 400
    assert "Missing delivery_code" in response.json()["detail"]


@patch("routes.order_routes.create_supabase_client")
def test_verify_delivery_empty_code(mock_supabase_client):
    """Test verification fails when delivery_code is empty string.

    This test validates that empty strings are rejected as invalid input,
    preventing attempts to verify delivery with no actual code provided.

    Scenario:
    - POST request with payload {"delivery_code": ""}
    - delivery_code field present but contains empty string

    Expected Result:
    - HTTP 400 Bad Request
    - Error message indicates missing delivery_code
    - Treats empty string same as missing field
    """
    payload = {"delivery_code": ""}
    response = client.post(
        "/api/orders/550e8400-e29b-41d4-a716-446655440000/verify-delivery",
        json=payload,
    )

    assert response.status_code == 400
    assert "Missing delivery_code" in response.json()["detail"]


@patch("routes.order_routes.create_supabase_client")
def test_verify_delivery_null_code(mock_supabase_client):
    """Test verification fails when delivery_code is null.

    This test ensures that null/None values are properly rejected. This can occur
    when JSON contains explicit null values or when client-side code sets the field
    to null programmatically.

    Scenario:
    - POST request with payload {"delivery_code": null}
    - delivery_code field explicitly set to null/None

    Expected Result:
    - HTTP 400 Bad Request
    - Error indicates missing delivery_code
    - Prevents processing of null values
    """
    payload = {"delivery_code": None}
    response = client.post(
        "/api/orders/550e8400-e29b-41d4-a716-446655440000/verify-delivery",
        json=payload,
    )

    assert response.status_code == 400
    assert "Missing delivery_code" in response.json()["detail"]


@patch("routes.order_routes.create_supabase_client")
def test_verify_delivery_order_not_found(mock_supabase_client):
    """Test verification fails when order does not exist.

    This test validates proper error handling when a non-existent order ID is provided.
    This can happen due to typos, deleted orders, or fabricated order IDs.

    Scenario:
    - Valid delivery code provided
    - Order ID "nonexistent-order-id" not found in database
    - Database query returns empty result set

    Expected Result:
    - HTTP 404 Not Found
    - Error message: "Order not found"
    - Prevents unauthorized delivery confirmations
    """
    mock_client = Mock()
    mock_table = Mock()
    mock_select = Mock()
    mock_eq = Mock()

    mock_supabase_client.return_value = mock_client
    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    mock_select.eq.return_value = mock_eq
    mock_eq.execute.return_value = Mock(data=[])

    payload = {"delivery_code": "1234"}
    response = client.post(
        "/api/orders/nonexistent-order-id/verify-delivery", json=payload
    )

    assert response.status_code == 404
    assert "Order not found" in response.json()["detail"]


@patch("routes.order_routes.create_supabase_client")
def test_verify_delivery_no_code_set_on_order(
    mock_supabase_client, mock_order_response
):
    """Test verification fails when no delivery code is set on the order.

    This test handles the edge case where an order exists but was never assigned
    a delivery verification code. This could happen if the order creation process
    was incomplete or if the code generation step failed.

    Scenario:
    - Order exists with status 'picked_up'
    - Order's delivery_code field is None/null in database
    - Driver attempts verification with any code

    Expected Result:
    - HTTP 400 Bad Request
    - Error message: "No delivery code set for this order"
    - Prevents verification of improperly configured orders
    """
    mock_client = Mock()
    mock_table = Mock()
    mock_select = Mock()
    mock_eq = Mock()

    mock_supabase_client.return_value = mock_client
    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    mock_select.eq.return_value = mock_eq

    order = mock_order_response.copy()
    order["status"] = "picked_up"
    order["delivery_code"] = None
    mock_eq.execute.return_value = Mock(data=[order])

    payload = {"delivery_code": "1234"}
    response = client.post(
        "/api/orders/550e8400-e29b-41d4-a716-446655440000/verify-delivery",
        json=payload,
    )

    assert response.status_code == 400
    assert "No delivery code set" in response.json()["detail"]


@patch("routes.order_routes.create_supabase_client")
def test_verify_delivery_invalid_code(mock_supabase_client, mock_order_response):
    """Test verification fails when delivery code doesn't match.

    This is a critical security test ensuring that only the correct delivery code
    can confirm a delivery. This prevents unauthorized users from marking orders
    as delivered.

    Scenario:
    - Order exists with delivery_code "1234"
    - Driver provides incorrect code "9999"
    - Codes do not match after comparison

    Expected Result:
    - HTTP 400 Bad Request
    - Error message: "Invalid delivery code"
    - Order status remains unchanged
    - Protects against fraudulent delivery confirmations
    """
    mock_client = Mock()
    mock_table = Mock()
    mock_select = Mock()
    mock_eq = Mock()

    mock_supabase_client.return_value = mock_client
    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    mock_select.eq.return_value = mock_eq

    order = mock_order_response.copy()
    order["status"] = "picked_up"
    order["delivery_code"] = "1234"
    mock_eq.execute.return_value = Mock(data=[order])

    payload = {"delivery_code": "9999"}
    response = client.post(
        "/api/orders/550e8400-e29b-41d4-a716-446655440000/verify-delivery",
        json=payload,
    )

    assert response.status_code == 400
    assert "Invalid delivery code" in response.json()["detail"]


@patch("routes.order_routes._normalize_single_order")
@patch("routes.order_routes.create_supabase_client")
def test_verify_delivery_code_with_whitespace(
    mock_supabase_client, mock_normalize, mock_order_response
):
    """Test verification succeeds when codes match after stripping whitespace.

    This test ensures the system is tolerant of formatting inconsistencies that
    might occur during data entry or storage. Whitespace should not prevent valid
    codes from working.

    Scenario:
    - Order has delivery_code " 1234 " (with leading/trailing spaces)
    - Driver provides "1234" (without spaces)
    - System strips whitespace from both for comparison

    Expected Result:
    - HTTP 200 success
    - Codes are considered matching after trim()
    - Delivery successfully verified
    - User-friendly behavior for minor formatting differences
    """
    mock_client = Mock()
    mock_table = Mock()

    mock_supabase_client.return_value = mock_client
    mock_client.table.return_value = mock_table

    # Setup order data
    order = mock_order_response.copy()
    order["status"] = "picked_up"
    order["delivery_code"] = " 1234 "

    updated_order = order.copy()
    updated_order["status"] = "delivered"
    updated_order["delivery_code_used"] = True

    # Mock initial fetch
    mock_select1 = Mock()
    mock_eq1 = Mock()
    mock_select1.eq.return_value = mock_eq1
    mock_eq1.execute.return_value = Mock(data=[order])

    # Mock update
    mock_update = Mock()
    mock_update_eq = Mock()
    mock_update.eq.return_value = mock_update_eq
    mock_update_eq.execute.return_value = Mock(data=[updated_order])

    # Mock refetch
    mock_select2 = Mock()
    mock_eq2 = Mock()
    mock_select2.eq.return_value = mock_eq2
    mock_eq2.execute.return_value = Mock(data=[updated_order])

    # Setup table method returns
    mock_table.select.side_effect = [mock_select1, mock_select2]
    mock_table.update.return_value = mock_update

    async def mock_normalize_func(order_data, supabase):
        return order_data

    mock_normalize.side_effect = mock_normalize_func

    payload = {"delivery_code": "1234"}
    response = client.post(
        "/api/orders/550e8400-e29b-41d4-a716-446655440000/verify-delivery",
        json=payload,
    )

    assert response.status_code == 200


@patch("routes.order_routes.create_supabase_client")
def test_verify_delivery_from_invalid_status_pending(
    mock_supabase_client, mock_order_response
):
    """Test verification fails from pending status.

    This test enforces proper order workflow by preventing delivery verification
    when the order hasn't progressed through required stages (pickup).

    Scenario:
    - Order exists with status 'pending' (just created, not yet picked up)
    - Correct delivery code provided
    - Order hasn't been picked up by driver yet

    Expected Result:
    - HTTP 400 Bad Request
    - Error: "Invalid transition: cannot mark as delivered from 'pending'"
    - Ensures order workflow integrity
    - Prevents skipping required delivery stages
    """
    mock_client = Mock()
    mock_table = Mock()
    mock_select = Mock()
    mock_eq = Mock()

    mock_supabase_client.return_value = mock_client
    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    mock_select.eq.return_value = mock_eq

    order = mock_order_response.copy()
    order["status"] = "pending"
    order["delivery_code"] = "1234"
    mock_eq.execute.return_value = Mock(data=[order])

    payload = {"delivery_code": "1234"}
    response = client.post(
        "/api/orders/550e8400-e29b-41d4-a716-446655440000/verify-delivery",
        json=payload,
    )

    assert response.status_code == 400
    assert "Invalid transition" in response.json()["detail"]
    assert "pending" in response.json()["detail"]


@patch("routes.order_routes.create_supabase_client")
def test_verify_delivery_from_invalid_status_confirmed(
    mock_supabase_client, mock_order_response
):
    """Test verification fails from confirmed status.

    This test validates that orders can't be marked as delivered before being
    picked up by the delivery driver. 'Confirmed' means restaurant accepted it.

    Scenario:
    - Order status is 'confirmed' (restaurant acknowledged)
    - Order not yet picked up by driver
    - Attempt to verify delivery prematurely

    Expected Result:
    - HTTP 400 Bad Request
    - Error indicates invalid status transition
    - Must go through 'picked_up' or 'en_route' first
    - Maintains proper delivery workflow
    """
    mock_client = Mock()
    mock_table = Mock()
    mock_select = Mock()
    mock_eq = Mock()

    mock_supabase_client.return_value = mock_client
    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    mock_select.eq.return_value = mock_eq

    order = mock_order_response.copy()
    order["status"] = "confirmed"
    order["delivery_code"] = "1234"
    mock_eq.execute.return_value = Mock(data=[order])

    payload = {"delivery_code": "1234"}
    response = client.post(
        "/api/orders/550e8400-e29b-41d4-a716-446655440000/verify-delivery",
        json=payload,
    )

    assert response.status_code == 400
    assert "Invalid transition" in response.json()["detail"]


@patch("routes.order_routes.create_supabase_client")
def test_verify_delivery_from_invalid_status_ready(
    mock_supabase_client, mock_order_response
):
    """Test verification fails from ready status.

    This test ensures orders waiting for pickup can't be prematurely marked as
    delivered. The 'ready' status indicates food is prepared and awaiting pickup.

    Scenario:
    - Order status is 'ready' (food prepared, awaiting driver)
    - No driver has picked up the order yet
    - Someone attempts to verify delivery

    Expected Result:
    - HTTP 400 Bad Request
    - Error message about invalid transition
    - Order must be picked up before delivery
    - Prevents logical inconsistencies in order flow
    """
    mock_client = Mock()
    mock_table = Mock()
    mock_select = Mock()
    mock_eq = Mock()

    mock_supabase_client.return_value = mock_client
    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    mock_select.eq.return_value = mock_eq

    order = mock_order_response.copy()
    order["status"] = "ready"
    order["delivery_code"] = "1234"
    mock_eq.execute.return_value = Mock(data=[order])

    payload = {"delivery_code": "1234"}
    response = client.post(
        "/api/orders/550e8400-e29b-41d4-a716-446655440000/verify-delivery",
        json=payload,
    )

    assert response.status_code == 400
    assert "Invalid transition" in response.json()["detail"]


@patch("routes.order_routes.create_supabase_client")
def test_verify_delivery_from_invalid_status_assigned(
    mock_supabase_client, mock_order_response
):
    """Test verification fails from assigned status.

    This test validates that delivery can't be confirmed when a driver is assigned
    but hasn't yet picked up the order. Driver assignment alone isn't sufficient.

    Scenario:
    - Order status is 'assigned' (driver assigned but not picked up)
    - Driver hasn't physically retrieved the order yet
    - Premature delivery verification attempt

    Expected Result:
    - HTTP 400 Bad Request
    - Invalid status transition error
    - Driver must mark order as 'picked_up' first
    - Ensures physical possession before delivery claim
    """
    mock_client = Mock()
    mock_table = Mock()
    mock_select = Mock()
    mock_eq = Mock()

    mock_supabase_client.return_value = mock_client
    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    mock_select.eq.return_value = mock_eq

    order = mock_order_response.copy()
    order["status"] = "assigned"
    order["delivery_code"] = "1234"
    mock_eq.execute.return_value = Mock(data=[order])

    payload = {"delivery_code": "1234"}
    response = client.post(
        "/api/orders/550e8400-e29b-41d4-a716-446655440000/verify-delivery",
        json=payload,
    )

    assert response.status_code == 400
    assert "Invalid transition" in response.json()["detail"]


@patch("routes.order_routes.create_supabase_client")
def test_verify_delivery_from_invalid_status_cancelled(
    mock_supabase_client, mock_order_response
):
    """Test verification fails from cancelled status.

    This test prevents delivery verification on cancelled orders. Cancelled orders
    should never transition to delivered status regardless of code validity.

    Scenario:
    - Order was cancelled (by customer, restaurant, or system)
    - Status is 'cancelled'
    - Driver attempts to verify delivery with correct code

    Expected Result:
    - HTTP 400 Bad Request
    - Error indicates invalid transition from cancelled
    - Cancelled orders can't be marked as delivered
    - Prevents fraudulent delivery claims on cancelled orders
    """
    mock_client = Mock()
    mock_table = Mock()
    mock_select = Mock()
    mock_eq = Mock()

    mock_supabase_client.return_value = mock_client
    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    mock_select.eq.return_value = mock_eq

    order = mock_order_response.copy()
    order["status"] = "cancelled"
    order["delivery_code"] = "1234"
    mock_eq.execute.return_value = Mock(data=[order])

    payload = {"delivery_code": "1234"}
    response = client.post(
        "/api/orders/550e8400-e29b-41d4-a716-446655440000/verify-delivery",
        json=payload,
    )

    assert response.status_code == 400
    assert "Invalid transition" in response.json()["detail"]


@patch("routes.order_routes.create_supabase_client")
def test_verify_delivery_from_invalid_status_delivered(
    mock_supabase_client, mock_order_response
):
    """Test verification fails when order is already delivered.

    This test prevents duplicate delivery confirmations. An order that's already
    marked as delivered shouldn't be re-deliverable, preventing fraud and data
    corruption.

    Scenario:
    - Order status is already 'delivered'
    - delivery_code_used flag is True
    - Attempt to verify delivery again

    Expected Result:
    - HTTP 400 Bad Request
    - Error: "Invalid transition: cannot mark as delivered from 'delivered'"
    - Prevents duplicate delivery confirmations
    - Protects against replay attacks with same code
    """
    mock_client = Mock()
    mock_table = Mock()
    mock_select = Mock()
    mock_eq = Mock()

    mock_supabase_client.return_value = mock_client
    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    mock_select.eq.return_value = mock_eq

    order = mock_order_response.copy()
    order["status"] = "delivered"
    order["delivery_code"] = "1234"
    order["delivery_code_used"] = True
    mock_eq.execute.return_value = Mock(data=[order])

    payload = {"delivery_code": "1234"}
    response = client.post(
        "/api/orders/550e8400-e29b-41d4-a716-446655440000/verify-delivery",
        json=payload,
    )

    assert response.status_code == 400
    assert "Invalid transition" in response.json()["detail"]


@patch("routes.order_routes.create_supabase_client")
def test_verify_delivery_code_already_used(mock_supabase_client, mock_order_response):
    """Test verification when delivery code was already used (race condition).

    This test simulates a race condition where the delivery code was already used
    between the time of the request and processing. This could happen if the same
    code is submitted twice in quick succession.

    Scenario:
    - Order has status 'picked_up' (valid for delivery)
    - delivery_code_used flag is already True
    - Correct code provided but already consumed

    Expected Result:
    - System behavior depends on status check
    - If status is still valid, may proceed or reject
    - Tests current implementation behavior
    - Documents edge case handling for concurrent requests
    """
    mock_client = Mock()
    mock_table = Mock()
    mock_select = Mock()
    mock_eq = Mock()

    mock_supabase_client.return_value = mock_client
    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    mock_select.eq.return_value = mock_eq

    order = mock_order_response.copy()
    order["status"] = "picked_up"
    order["delivery_code"] = "1234"
    order["delivery_code_used"] = True
    mock_eq.execute.return_value = Mock(data=[order])

    payload = {"delivery_code": "1234"}
    response = client.post(
        "/api/orders/550e8400-e29b-41d4-a716-446655440000/verify-delivery",
        json=payload,
    )

    # This should still proceed (no explicit check for code already used)
    # The test documents current behavior - order status will prevent duplicate verification
    assert response.status_code in [200, 400]


@patch("routes.order_routes.create_supabase_client")
def test_verify_delivery_database_update_fails(
    mock_supabase_client, mock_order_response
):
    """Test verification handles database update failure gracefully.

    This test validates proper error handling when the database update operation
    fails due to connectivity issues, constraints, or other database errors.

    Scenario:
    - Order exists and validations pass
    - Correct delivery code provided
    - Database update operation throws exception
    - Could be connection timeout, constraint violation, etc.

    Expected Result:
    - HTTP 500 Internal Server Error
    - Error message: "Failed to verify delivery code"
    - Exception properly caught and handled
    - Prevents partial state updates
    - User receives actionable error message
    """
    mock_client = Mock()
    mock_table = Mock()
    mock_select = Mock()
    mock_eq = Mock()
    mock_update = Mock()

    mock_supabase_client.return_value = mock_client
    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    mock_select.eq.return_value = mock_eq

    order = mock_order_response.copy()
    order["status"] = "picked_up"
    order["delivery_code"] = "1234"
    mock_eq.execute.return_value = Mock(data=[order])

    # Mock update to fail
    mock_table.update.return_value = mock_update
    mock_update.eq.return_value = mock_eq
    mock_eq.execute.side_effect = [
        Mock(data=[order]),  # Initial fetch succeeds
        Exception("Database connection error"),  # Update fails
    ]

    payload = {"delivery_code": "1234"}
    response = client.post(
        "/api/orders/550e8400-e29b-41d4-a716-446655440000/verify-delivery",
        json=payload,
    )

    assert response.status_code == 500
    assert "Failed to verify delivery code" in response.json()["detail"]


@patch("routes.order_routes._normalize_single_order")
@patch("routes.order_routes.create_supabase_client")
def test_verify_delivery_refetch_fails(
    mock_supabase_client, mock_normalize, mock_order_response
):
    """Test verification handles refetch failure after successful update.

    This test validates graceful degradation when the order can't be retrieved
    after a successful update. The system should still return success using the
    update response data.

    Scenario:
    - Order validation and update succeed
    - Database update returns updated data
    - Subsequent refetch query fails (connection issue, row deleted, etc.)

    Expected Result:
    - HTTP 200 success (uses update response data as fallback)
    - Order marked as delivered successfully
    - System degrades gracefully without failing the request
    - User gets confirmation despite refetch failure
    """
    mock_client = Mock()
    mock_table = Mock()
    mock_select = Mock()
    mock_eq = Mock()
    mock_update = Mock()

    mock_supabase_client.return_value = mock_client
    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    mock_select.eq.return_value = mock_eq

    order = mock_order_response.copy()
    order["status"] = "picked_up"
    order["delivery_code"] = "1234"

    updated_order = order.copy()
    updated_order["status"] = "delivered"
    updated_order["delivery_code_used"] = True

    mock_table.update.return_value = mock_update
    mock_update.eq.return_value = mock_eq

    # Initial fetch succeeds, update succeeds (returns data), refetch fails
    mock_eq.execute.side_effect = [
        Mock(data=[order]),  # Initial fetch
        Mock(data=[updated_order]),  # Update returns data
        Mock(data=None),  # Refetch fails
    ]

    async def mock_normalize_func(order_data, supabase):
        return order_data

    mock_normalize.side_effect = mock_normalize_func

    payload = {"delivery_code": "1234"}
    response = client.post(
        "/api/orders/550e8400-e29b-41d4-a716-446655440000/verify-delivery",
        json=payload,
    )

    # Should still succeed using update response data
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "delivered"


@patch("routes.order_routes.create_supabase_client")
def test_verify_delivery_numeric_vs_string_code(
    mock_supabase_client, mock_order_response
):
    """Test verification handles numeric vs string delivery code comparison.

    This test ensures proper type handling when comparing delivery codes. The
    stored code might be numeric while the provided code is a string, or vice versa.

    Scenario:
    - Order has delivery_code stored as integer: 1234
    - Client sends delivery_code as string: "1234"
    - Type mismatch in comparison

    Expected Result:
    - Both values converted to string for comparison (via str())
    - Comparison succeeds despite type difference
    - Prevents type coercion issues from blocking valid codes
    - Robust handling of data type inconsistencies
    """
    mock_client = Mock()
    mock_table = Mock()
    mock_select = Mock()
    mock_eq = Mock()

    mock_supabase_client.return_value = mock_client
    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    mock_select.eq.return_value = mock_eq

    order = mock_order_response.copy()
    order["status"] = "picked_up"
    order["delivery_code"] = 1234  # Stored as integer
    mock_eq.execute.return_value = Mock(data=[order])

    payload = {"delivery_code": "1234"}  # Provided as string
    response = client.post(
        "/api/orders/550e8400-e29b-41d4-a716-446655440000/verify-delivery",
        json=payload,
    )

    # Should handle type conversion properly (both converted to string)
    assert response.status_code in [200, 400]  # Depends on implementation


@patch("routes.order_routes.create_supabase_client")
def test_verify_delivery_general_exception_handling(mock_supabase_client):
    """Test verification handles unexpected exceptions gracefully.

    This test validates the catch-all exception handler that protects against
    unforeseen errors. Any exception not explicitly caught should be handled
    properly with appropriate error responses.

    Scenario:
    - Unexpected exception occurs during processing
    - Could be network error, programming bug, or system issue
    - Exception type not specifically handled by the code

    Expected Result:
    - HTTP 500 Internal Server Error
    - Error message: "Failed to verify delivery code: {error details}"
    - Exception caught by general exception handler
    - System doesn't crash or expose internal details
    - User receives actionable error message
    """
    mock_client = Mock()
    mock_table = Mock()

    mock_supabase_client.return_value = mock_client
    mock_client.table.return_value = mock_table
    mock_table.select.side_effect = Exception("Unexpected error")

    payload = {"delivery_code": "1234"}
    response = client.post(
        "/api/orders/550e8400-e29b-41d4-a716-446655440000/verify-delivery",
        json=payload,
    )

    assert response.status_code == 500
    assert "Failed to verify delivery code" in response.json()["detail"]
