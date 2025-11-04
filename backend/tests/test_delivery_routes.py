"""Tests for delivery routes using TestClient-style requests and project test fixtures
This file follows the project's existing test style: use the `client` fixture from conftest.py
and monkeypatch module-level dependencies on `routes.delivery_routes`.
"""

from unittest.mock import Mock

import pytest

import routes.delivery_routes as delivery_routes
from models.delivery_model import Location


class MockResult:
    def __init__(self, data):
        self.data = data


class MockSupabase:
    def __init__(self, orders_data=None, restaurants_data=None):
        self._orders = orders_data or []
        self._restaurants = restaurants_data or []
        self._table = None
        self._in_vals = None

    def from_(self, table):
        self._table = table
        return self

    def select(self, *args, **kwargs):
        return self

    def eq(self, *args, **kwargs):
        return self

    def is_(self, *args, **kwargs):
        return self

    def in_(self, col, vals):
        self._in_vals = vals
        return self

    def execute(self):
        if self._table == "orders":
            return MockResult(self._orders)
        if self._table == "restaurants":
            if self._in_vals:
                filtered = [
                    r for r in self._restaurants if r.get("id") in self._in_vals
                ]
                return MockResult(filtered)
            return MockResult(self._restaurants)
        return MockResult([])


class DummyResponse:
    def __init__(self, data):
        self._data = data

    def raise_for_status(self):
        return None

    def json(self):
        return self._data


def make_dummy_async_client(responses):
    class DummyClient:
        def __init__(self, *args, **kwargs):
            self._responses = list(responses)

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, url, params=None):
            if not self._responses:
                return DummyResponse({"distances": [], "durations": []})
            data = self._responses.pop(0)
            return DummyResponse(data)

    return DummyClient


def _call_api(client, lat, lng):
    # Call the GET endpoint with query params so FastAPI builds Location from query
    return client.get(
        "/api/deliveries/ready", params={"latitude": lat, "longitude": lng}
    )


def test_no_ready_orders(client, monkeypatch):
    mock_supabase = MockSupabase(orders_data=[])
    monkeypatch.setattr(delivery_routes, "supabase", mock_supabase)
    monkeypatch.setattr(delivery_routes, "MAPBOX_TOKEN", "test-token")

    response = _call_api(client, 0.0, 0.0)
    assert response.status_code == 200
    assert response.json() == []


def test_ready_orders_with_distances_single_chunk(client, monkeypatch):
    orders = [
        {
            "order_id": 1,
            "user_id": "u1",
            "restaurant_id": 10,
            "restaurants": {"name": "R1", "latitude": 12.0, "longitude": 77.0},
        },
        {
            "order_id": 2,
            "user_id": "u2",
            "restaurant_id": 20,
            "restaurants": {"name": "R2", "latitude": 13.0, "longitude": 78.0},
        },
    ]

    mock_supabase = MockSupabase(orders_data=orders)
    monkeypatch.setattr(delivery_routes, "supabase", mock_supabase)
    monkeypatch.setattr(delivery_routes, "MAPBOX_TOKEN", "test-token")

    responses = [{"distances": [[1000.0, 2000.0]], "durations": [[600.0, 1200.0]]}]
    DummyClient = make_dummy_async_client(responses)
    monkeypatch.setattr(delivery_routes.httpx, "AsyncClient", DummyClient)

    response = _call_api(client, 12.5, 77.5)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list) and len(data) == 2

    by_id = {o["order_id"]: o for o in data}
    assert by_id[1]["distance_to_restaurant"] == 1000.0
    assert by_id[1]["duration_to_restaurant"] == 600.0
    assert pytest.approx(by_id[1]["distance_to_restaurant_miles"]) == 0.621
    assert pytest.approx(by_id[1]["duration_to_restaurant_minutes"]) == 10.0


def test_unreachable_destination(client, monkeypatch):
    orders = [
        {
            "order_id": 3,
            "user_id": "u3",
            "restaurant_id": 30,
            "restaurants": {"latitude": 14.0, "longitude": 79.0},
        }
    ]
    mock_supabase = MockSupabase(orders_data=orders)
    monkeypatch.setattr(delivery_routes, "supabase", mock_supabase)
    monkeypatch.setattr(delivery_routes, "MAPBOX_TOKEN", "test-token")

    responses = [{"distances": [[None]], "durations": [[None]]}]
    DummyClient = make_dummy_async_client(responses)
    monkeypatch.setattr(delivery_routes.httpx, "AsyncClient", DummyClient)

    response = _call_api(client, 12.5, 77.5)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    r = data[0]
    assert r["distance_to_restaurant"] is None
    assert r["duration_to_restaurant"] is None
    assert r["restaurant_reachable_by_road"] is False


def test_missing_restaurant_coords_fetch_from_restaurants(client, monkeypatch):
    # If the orders payload does not include restaurant coordinates
    # we should NOT attempt to fetch the restaurant table here
    # (the orders response is expected to include the restaurant coords).
    # Instead, the API should return the order with distance/duration set to None
    # and mark the restaurant as not reachable by road.
    orders = [{"order_id": 4, "user_id": "u4", "restaurant_id": 40, "restaurants": {}}]

    mock_supabase = MockSupabase(orders_data=orders)
    monkeypatch.setattr(delivery_routes, "supabase", mock_supabase)
    monkeypatch.setattr(delivery_routes, "MAPBOX_TOKEN", "test-token")

    # Do not provide any Mapbox responses since no matrix call should be made
    response = _call_api(client, 12.5, 77.5)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    r = data[0]
    # Expect None values because restaurant coordinates were not provided
    assert r.get("distance_to_restaurant") is None
    assert r.get("duration_to_restaurant") is None
    assert r.get("restaurant_reachable_by_road") is False
