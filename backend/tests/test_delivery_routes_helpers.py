"""Edge-case tests for internal helper functions in routes.delivery_routes.

Covers:
- _parse_coordinates
- _geocode_customer_address
- _get_user_profile_coordinates
- _get_customer_coordinates
- _determine_route_endpoints
- _fetch_mapbox_route
"""

from types import SimpleNamespace
from unittest.mock import patch

import httpx
import pytest

import routes.delivery_routes as delivery_routes


def test_parse_coordinates_various_inputs():
    """Test _parse_coordinates handles valid and invalid input formats.

    Edge cases covered:
    - Valid numeric strings that should convert to floats
    - Valid numeric values that should pass through
    - Empty strings should return (None, None)
    - None values should return (None, None)
    - Non-numeric strings should return (None, None)
    - Partial validity (one valid, one invalid) should return (None, None)
    """
    # Valid numeric strings
    assert delivery_routes._parse_coordinates("12.34", "-56.78") == (12.34, -56.78)
    # Valid numbers
    assert delivery_routes._parse_coordinates(10.0, 20.0) == (10.0, 20.0)
    # One missing or empty -> both None
    assert delivery_routes._parse_coordinates("", "77") == (None, None)
    assert delivery_routes._parse_coordinates(None, "77") == (None, None)
    assert delivery_routes._parse_coordinates("40", None) == (None, None)
    # Non-numeric
    assert delivery_routes._parse_coordinates("abc", "xyz") == (None, None)


@pytest.mark.asyncio
@patch("routes.delivery_routes.geocode_address")
async def test_geocode_customer_address_success(mock_geocode):
    """Test _geocode_customer_address successfully geocodes a valid address.

    Verifies that when provided a valid address string, the function:
    - Calls the geocode_address utility with the correct address
    - Returns the latitude and longitude tuple from geocoding service
    """
    mock_geocode.return_value = (35.0, -120.0)
    lat, lng = await delivery_routes._geocode_customer_address("123 Main St")
    assert (lat, lng) == (35.0, -120.0)
    mock_geocode.assert_called_once_with("123 Main St")


@pytest.mark.asyncio
@patch("routes.delivery_routes.geocode_address")
async def test_geocode_customer_address_none_or_exception(mock_geocode):
    """Test _geocode_customer_address handles missing addresses and exceptions gracefully.

    Edge cases covered:
    - Empty string address should skip geocoding and return (None, None)
    - Non-string addresses (dict, etc.) should be converted to string and attempted
    - Geocoding exceptions should be caught and return (None, None) without crashing
    """
    # Falsy address -> no geocoding
    lat, lng = await delivery_routes._geocode_customer_address("")
    assert (lat, lng) == (None, None)
    mock_geocode.assert_not_called()

    # Exception during geocoding -> graceful None
    mock_geocode.side_effect = Exception("boom")
    lat, lng = await delivery_routes._geocode_customer_address({})
    assert (lat, lng) == (None, None)


def _make_supabase_with_user_data(data):
    class _MockRes:
        def __init__(self, d):
            self.data = d

    class _MockSupabase:
        def __init__(self, d):
            self._d = d

        def from_(self, table):
            self._table = table
            return self

        def select(self, *a, **k):
            return self

        def eq(self, *a, **k):
            return self

        def execute(self):
            if getattr(self, "_table", "") == "users":
                return _MockRes(self._d)
            return _MockRes([])

    return _MockSupabase(data)


def test_get_user_profile_coordinates_variants(monkeypatch):
    """Test _get_user_profile_coordinates handles different Supabase response formats.

    Edge cases covered:
    - List response with one row containing string coordinates (should parse)
    - Dict response (single row) with numeric coordinates (should pass through)
    - Empty list response when user not found (should return (None, None))
    - Invalid/non-numeric coordinates in database (should return (None, None))

    This ensures the function is resilient to different response shapes from Supabase.
    """
    # List with one row (strings)
    supa = _make_supabase_with_user_data([{"latitude": "12.3", "longitude": "-45.6"}])
    monkeypatch.setattr(delivery_routes, "supabase", supa)
    assert delivery_routes._get_user_profile_coordinates("u1") == (12.3, -45.6)

    # Dict single row
    supa = _make_supabase_with_user_data({"latitude": 1.5, "longitude": 2.5})
    monkeypatch.setattr(delivery_routes, "supabase", supa)
    assert delivery_routes._get_user_profile_coordinates("u2") == (1.5, 2.5)

    # Empty list -> None
    supa = _make_supabase_with_user_data([])
    monkeypatch.setattr(delivery_routes, "supabase", supa)
    assert delivery_routes._get_user_profile_coordinates("u3") == (None, None)

    # Invalid values -> None
    supa = _make_supabase_with_user_data([{"latitude": "abc", "longitude": "xyz"}])
    monkeypatch.setattr(delivery_routes, "supabase", supa)
    assert delivery_routes._get_user_profile_coordinates("u4") == (None, None)


@pytest.mark.asyncio
@patch("routes.delivery_routes.geocode_address")
async def test_get_customer_coordinates_priority(mock_geocode, monkeypatch):
    """Test _get_customer_coordinates follows correct fallback priority chain.

    The function implements a 3-tier fallback strategy for finding customer location:
    1. Order's latitude/longitude fields (highest priority)
    2. Geocode the delivery address (if order coords missing)
    3. User profile coordinates (if both order coords and address missing)

    Edge cases covered:
    - Order coordinates present -> use them, ignore address and user profile
    - Order coords missing + address present -> geocode address, ignore user profile
    - Order coords missing + no address -> fall back to user profile coordinates
    - Order coords missing + address present but geocoding fails -> return (None, None),
      do NOT fall back to user profile (address takes precedence over profile)
    """
    # 1) Use order coordinates if present
    order = {"user_id": "u1", "latitude": "11.0", "longitude": "22.0"}
    lat, lng = await delivery_routes._get_customer_coordinates(
        order, customer_address="ignored"
    )
    assert (lat, lng) == (11.0, 22.0)
    mock_geocode.assert_not_called()

    # 2) Fall back to geocoding if order coords missing and address provided
    order2 = {"user_id": "u2", "latitude": None, "longitude": None}
    mock_geocode.reset_mock()
    mock_geocode.return_value = (33.0, 44.0)
    lat, lng = await delivery_routes._get_customer_coordinates(
        order2, customer_address="Some Address"
    )
    assert (lat, lng) == (33.0, 44.0)
    mock_geocode.assert_called_once()

    # 3) If address missing and order coords missing -> fall back to user profile
    supa = _make_supabase_with_user_data([{"latitude": 55.0, "longitude": 66.0}])
    monkeypatch.setattr(delivery_routes, "supabase", supa)
    lat, lng = await delivery_routes._get_customer_coordinates(
        order2, customer_address=None
    )
    assert (lat, lng) == (55.0, 66.0)

    # 4) Non-trivial edge: address present but geocode returns None -> do NOT fall back to user profile
    # because customer_address is truthy; result should remain (None, None)
    mock_geocode.reset_mock()
    mock_geocode.return_value = (None, None)
    # Also make user profile valid, but should be ignored due to address being provided
    supa2 = _make_supabase_with_user_data([{"latitude": 1.0, "longitude": 2.0}])
    monkeypatch.setattr(delivery_routes, "supabase", supa2)
    lat, lng = await delivery_routes._get_customer_coordinates(
        order2, customer_address="Has Address"
    )
    assert (lat, lng) == (None, None)


def test_determine_route_endpoints_behaviors():
    """Test _determine_route_endpoints returns correct navigation routes by order status.

    The function determines navigation start/end points based on delivery workflow:
    - 'assigned' status: driver -> restaurant (pickup phase)
    - 'picked_up' or 'en_route' status: restaurant -> customer (delivery phase)
    - Other statuses: should raise 400 error (no navigation needed)

    Edge cases covered:
    - 'assigned' status with valid coordinates returns to_restaurant route
    - 'picked_up' status without customer coordinates raises 400 error
    - 'en_route' status with customer coordinates returns to_customer route
    - Invalid statuses like 'delivered' raise 400 error with descriptive message
    """
    # assigned -> to_restaurant from driver to restaurant
    info = delivery_routes._determine_route_endpoints(
        "assigned", 1.0, 2.0, 10.0, 20.0, "R", "Addr", None, None, None
    )
    assert info["route_type"] == "to_restaurant"
    assert info["start_lat"], info["start_lng"] == (1.0, 2.0)
    assert info["end_lat"], info["end_lng"] == (10.0, 20.0)

    # picked_up requires customer coords
    with pytest.raises(delivery_routes.HTTPException) as ei:
        delivery_routes._determine_route_endpoints(
            "picked_up", 1, 2, 10, 20, "R", "Addr", None, None, "CAddr"
        )
    assert ei.value.status_code == 400

    # en_route happy path to customer
    info2 = delivery_routes._determine_route_endpoints(
        "en_route", 1.0, 2.0, 10.0, 20.0, "R", "Addr", 30.0, 40.0, "CAddr"
    )
    assert info2["route_type"] == "to_customer"
    assert info2["end_lat"], info2["end_lng"] == (30.0, 40.0)

    # other statuses -> 400
    with pytest.raises(delivery_routes.HTTPException) as ei2:
        delivery_routes._determine_route_endpoints(
            "delivered", 0, 0, 0, 0, "R", "Addr", 0, 0, "C"
        )
    assert ei2.value.status_code == 400


class _DummyResponse:
    def __init__(self, data=None, raise_err=None):
        self._data = data
        self._raise = raise_err

    def raise_for_status(self):
        if self._raise:
            raise self._raise

    def json(self):
        return self._data


def _make_async_client_for_fetch_route(response_data=None, should_error=False):
    class _DummyClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, url, params=None):
            if should_error:
                # Emulate HTTP error on raise_for_status
                request = SimpleNamespace(method="GET", url=url)
                err = httpx.HTTPStatusError(
                    "Bad Request", request=request, response=None
                )
                return _DummyResponse(raise_err=err)
            return _DummyResponse(data=response_data or {"routes": []})

    return _DummyClient


@pytest.mark.asyncio
async def test_fetch_mapbox_route_success(monkeypatch):
    """Test _fetch_mapbox_route successfully retrieves routing data from Mapbox API.

    Verifies that when given valid coordinates, the function:
    - Constructs proper Mapbox Directions API request
    - Returns the JSON response containing route information
    - Handles the async HTTP client correctly
    """
    Dummy = _make_async_client_for_fetch_route({"routes": [{"distance": 100}]})
    monkeypatch.setattr(delivery_routes.httpx, "AsyncClient", Dummy)
    result = await delivery_routes._fetch_mapbox_route(-122.4, 37.78, -122.3, 37.8)
    assert result == {"routes": [{"distance": 100}]}


@pytest.mark.asyncio
async def test_fetch_mapbox_route_http_error_bubbles(monkeypatch):
    """Test _fetch_mapbox_route propagates HTTP errors from Mapbox API.

    Edge case: When Mapbox API returns an HTTP error (rate limit, invalid token, etc.),
    the function should raise an HTTPStatusError rather than suppressing it, allowing
    the caller to handle API failures appropriately.
    """
    Dummy = _make_async_client_for_fetch_route(should_error=True)
    monkeypatch.setattr(delivery_routes.httpx, "AsyncClient", Dummy)
    with pytest.raises(httpx.HTTPStatusError):
        await delivery_routes._fetch_mapbox_route(0, 0, 1, 1)
