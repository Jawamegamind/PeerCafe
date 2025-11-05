"""Tests for delivery routes using TestClient-style requests and project test fixtures
This file follows the project's existing test style: use the `client` fixture from conftest.py
and monkeypatch module-level dependencies on `routes.delivery_routes`.
"""

import pytest
from unittest.mock import Mock

from models.delivery_model import Location

import routes.delivery_routes as delivery_routes


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
    # Use a shared queue of responses so multiple DummyClient instances (one
    # per chunk) consume responses in order instead of each getting a copy.
    shared = list(responses)

    class DummyClient:
        def __init__(self, *args, **kwargs):
            # no per-instance copy; instances share `shared`
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, url, params=None):
            if not shared:
                return DummyResponse({"distances": [], "durations": []})
            data = shared.pop(0)
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


def test_ready_orders_chunking_multiple_matrix_calls(client, monkeypatch):
    # Create 5 orders so that with MAX_DEST_PER_MATRIX=2 we get 3 chunks (2,2,1)
    orders = []
    for i in range(5):
        orders.append(
            {
                "order_id": 100 + i,
                "user_id": f"u{i}",
                "restaurant_id": 200 + i,
                "restaurants": {"name": f"R{i}", "latitude": 10.0 + i, "longitude": 20.0 + i},
            }
        )

    mock_supabase = MockSupabase(orders_data=orders)
    monkeypatch.setattr(delivery_routes, "supabase", mock_supabase)
    monkeypatch.setattr(delivery_routes, "MAPBOX_TOKEN", "test-token")
    # Force small max dests to exercise chunking
    monkeypatch.setattr(delivery_routes, "MAX_DEST_PER_MATRIX", 2)

    # Prepare three responses matching chunk sizes
    responses = [
        {"distances": [[100.0, 200.0]], "durations": [[60.0, 120.0]]},
        {"distances": [[300.0, 400.0]], "durations": [[180.0, 240.0]]},
        {"distances": [[500.0]], "durations": [[300.0]]},
    ]
    DummyClient = make_dummy_async_client(responses)
    monkeypatch.setattr(delivery_routes.httpx, "AsyncClient", DummyClient)

    response = _call_api(client, 0.0, 0.0)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 5

    # Verify distances mapped correctly by restaurant_id
    by_rid = {o["restaurant_id"]: o for o in data}
    assert by_rid[200]["distance_to_restaurant"] == 100.0
    assert by_rid[201]["distance_to_restaurant"] == 200.0
    assert by_rid[202]["distance_to_restaurant"] == 300.0
    assert by_rid[203]["distance_to_restaurant"] == 400.0
    assert by_rid[204]["distance_to_restaurant"] == 500.0


def test_malformed_restaurant_coords_handled_gracefully(client, monkeypatch):
    # Orders include one with malformed coords (strings) which should be treated as missing
    orders = [
        {"order_id": 10, "user_id": "u10", "restaurant_id": 50, "restaurants": {"latitude": "not-a-number", "longitude": 70.0}},
        {"order_id": 11, "user_id": "u11", "restaurant_id": 51, "restaurants": {"latitude": 15.0, "longitude": 75.0}},
    ]

    mock_supabase = MockSupabase(orders_data=orders)
    monkeypatch.setattr(delivery_routes, "supabase", mock_supabase)
    monkeypatch.setattr(delivery_routes, "MAPBOX_TOKEN", "test-token")

    # Only one valid destination -> one distances array of length 1 (for the valid one)
    responses = [{"distances": [[400.0]], "durations": [[240.0]]}]
    DummyClient = make_dummy_async_client(responses)
    monkeypatch.setattr(delivery_routes.httpx, "AsyncClient", DummyClient)

    response = _call_api(client, 0.0, 0.0)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2

    # restaurant 50 had malformed lat so should be None
    by_rid = {o["restaurant_id"]: o for o in data}
    assert by_rid[50]["distance_to_restaurant"] is None
    # restaurant 51 should have the mapped values
    assert by_rid[51]["distance_to_restaurant"] == 400.0
    assert by_rid[51]["duration_to_restaurant"] == 240.0
