"""Helper-level unit tests for routes.delivery_routes helpers.
This file intentionally duplicates some test logic from test_delivery_routes.py
but keeps the helpers isolated so they are easy to find in the test tree.
"""

import asyncio
import pytest

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
                filtered = [r for r in self._restaurants if r.get("id") in self._in_vals]
                return MockResult(filtered)
            return MockResult(self._restaurants)
        return MockResult([])


def make_dummy_async_client(responses):
    shared = list(responses)

    class DummyClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, url, params=None):
            if not shared:
                return type("R", (), {"raise_for_status": lambda self: None, "json": lambda self: {"distances": [], "durations": []}})()
            data = shared.pop(0)
            return type("R", (), {"raise_for_status": lambda self: None, "json": lambda self, d=data: d})()

    return DummyClient


# -------------------------
# Unit tests for helper functions in delivery_routes.py
# Each test below verifies a single helper in isolation using mocks
# to avoid external HTTP or DB calls.
# -------------------------


def test_extract_and_prepare_destinations():
    """Test _extract_restaurant_coords and _prepare_destinations with
    valid, missing and malformed restaurant coordinates."""
    orders = [
        {"order_id": 1, "restaurant_id": 10, "restaurants": {"latitude": 12.0, "longitude": 77.0}},
        {"order_id": 2, "restaurant_id": 20, "restaurants": {"latitude": None, "longitude": None}},
        {"order_id": 3, "restaurant_id": 30, "restaurants": {"latitude": "not-a-number", "longitude": 78.0}},
    ]

    rids, coords_by_id = delivery_routes._extract_restaurant_coords(orders)
    assert set(rids) == {10, 20, 30}

    assert 10 in coords_by_id and isinstance(coords_by_id[10][0], float)
    assert 20 not in coords_by_id
    assert 30 not in coords_by_id

    dests = delivery_routes._prepare_destinations(rids, coords_by_id)
    assert isinstance(dests, list)
    assert len(dests) == 1
    assert dests[0]["restaurant_id"] == 10


def test_enrich_order_with_distance_rounding_and_flags():
    """Test _enrich_order_with_distance computes miles and minutes and sets flags."""
    order = {"order_id": 1, "restaurant_id": 10}
    distance_by_restaurant = {10: 1609.34}  # exactly 1 mile in meters
    duration_by_restaurant = {10: 600.0}  # 10 minutes

    enriched = delivery_routes._enrich_order_with_distance(order, distance_by_restaurant, duration_by_restaurant)
    assert enriched["distance_to_restaurant"] == 1609.34
    assert enriched["duration_to_restaurant"] == 600.0
    assert enriched["distance_to_restaurant_miles"] == pytest.approx(1.0, rel=1e-3)
    assert enriched["restaurant_reachable_by_road"] is True
    assert enriched["duration_to_restaurant_minutes"] == pytest.approx(10.0, rel=1e-3)


def test_parse_coordinates_various_inputs():
    """Test _parse_coordinates handles strings, numbers, empty and malformed inputs."""
    lat, lng = delivery_routes._parse_coordinates("12.34", "56.78")
    assert isinstance(lat, float) and isinstance(lng, float)

    lat2, lng2 = delivery_routes._parse_coordinates(12.34, 56.78)
    assert lat2 == pytest.approx(12.34)

    lat3, lng3 = delivery_routes._parse_coordinates("", "")
    assert lat3 is None and lng3 is None

    lat4, lng4 = delivery_routes._parse_coordinates("abc", 12)
    assert lat4 is None and lng4 is None


def test_get_restaurant_coordinates_with_geocode_fallback(monkeypatch):
    async def _inner():
        restaurant_info = {"latitude": 10.0, "longitude": 20.0}
        lat, lng = await delivery_routes._get_restaurant_coordinates(restaurant_info, "Some Address")
        assert lat == pytest.approx(10.0) and lng == pytest.approx(20.0)

        calls = {"count": 0}

        async def fake_geocode(addr):
            calls["count"] += 1
            return 33.3, 44.4

        monkeypatch.setattr(delivery_routes, "geocode_address", fake_geocode)
        restaurant_info2 = {}
        lat2, lng2 = await delivery_routes._get_restaurant_coordinates(restaurant_info2, "Fallback Addr")
        assert calls["count"] == 1
        assert lat2 == pytest.approx(33.3) and lng2 == pytest.approx(44.4)

    asyncio.run(_inner())


def test_geocode_customer_address_and_profile_fallback(monkeypatch):
    async def _inner():
        async def fake_geocode(addr):
            return 1.1, 2.2

        monkeypatch.setattr(delivery_routes, "geocode_address", fake_geocode)

        lat, lng = await delivery_routes._geocode_customer_address("Some Addr")
        assert lat == pytest.approx(1.1) and lng == pytest.approx(2.2)

        async def none_geocode(addr):
            return None, None

        monkeypatch.setattr(delivery_routes, "geocode_address", none_geocode)

        class SimpleUserSupabase:
            def from_(self, table):
                self._table = table
                return self

            def select(self, *args, **kwargs):
                return self

            def eq(self, *a, **k):
                return self

            def execute(self):
                if self._table == "users":
                    return MockResult([{"latitude": "9.9", "longitude": "8.8"}])
                return MockResult([])

        monkeypatch.setattr(delivery_routes, "supabase", SimpleUserSupabase())

        order_with_coords = {"latitude": 7.7, "longitude": 6.6, "user_id": "u1"}
        lat_a, lng_a = await delivery_routes._get_customer_coordinates(order_with_coords, None)
        assert lat_a == pytest.approx(7.7) and lng_a == pytest.approx(6.6)

        order_no_coords = {"user_id": "u1"}
        lat_b, lng_b = await delivery_routes._get_customer_coordinates(order_no_coords, None)
        assert lat_b == pytest.approx(9.9) and lng_b == pytest.approx(8.8)

    asyncio.run(_inner())


def test_get_user_profile_coordinates_returns_none_if_missing(monkeypatch):
    class EmptySupabase:
        def from_(self, table):
            return self

        def select(self, *a, **k):
            return self

        def eq(self, *a, **k):
            return self

        def execute(self):
            return MockResult([])

    monkeypatch.setattr(delivery_routes, "supabase", EmptySupabase())
    lat, lng = delivery_routes._get_user_profile_coordinates("no-user")
    assert lat is None and lng is None


def test_determine_route_endpoints_variants():
    res = delivery_routes._determine_route_endpoints(
        "assigned", 1.0, 2.0, 3.0, 4.0, "R", "Addr", None, None, None
    )
    assert res["route_type"] == "to_restaurant"
    assert res["start_lat"] == 1.0 and res["end_lat"] == 3.0

    with pytest.raises(Exception):
        delivery_routes._determine_route_endpoints(
            "picked_up", 1.0, 2.0, 3.0, 4.0, "R", "Addr", None, None, None
        )

    res2 = delivery_routes._determine_route_endpoints(
        "picked_up", 1.0, 2.0, 3.0, 4.0, "R", "Addr", 5.0, 6.0, "Cust Addr"
    )
    assert res2["route_type"] == "to_customer"
    assert res2["start_lat"] == 3.0 and res2["end_lat"] == 5.0


def test_compute_distances_and_durations_uses_chunking(monkeypatch):
    def _run():
        async def _inner():
            monkeypatch.setattr(delivery_routes, "MAX_DEST_PER_MATRIX", 2)

            dests = [
                {"restaurant_id": 1, "lat": 10.0, "lng": 20.0},
                {"restaurant_id": 2, "lat": 11.0, "lng": 21.0},
                {"restaurant_id": 3, "lat": 12.0, "lng": 22.0},
            ]

            async def fake_fetch(src_lng, src_lat, chunk):
                # Return values based on restaurant_id so chunked calls map back
                # to the global restaurant ids deterministically.
                distances = [[100.0 * item["restaurant_id"] for item in chunk]]
                durations = [[60.0 * item["restaurant_id"] for item in chunk]]
                return {"distances": distances, "durations": durations}

            monkeypatch.setattr(delivery_routes, "_fetch_matrix_for_chunk", fake_fetch)

            distances, durations = await delivery_routes._compute_distances_and_durations(0.0, 0.0, dests)
            assert distances[1] == pytest.approx(100.0)
            assert distances[2] == pytest.approx(200.0)
            assert distances[3] == pytest.approx(300.0)
            assert durations[1] == pytest.approx(60.0)
            assert durations[2] == pytest.approx(120.0)
            assert durations[3] == pytest.approx(180.0)

        return asyncio.run(_inner())

    return _run()
