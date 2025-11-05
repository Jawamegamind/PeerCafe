"""Tests for /api/deliveries/active/{order_id}/navigation endpoint.

Focus on non-trivial edge cases: missing coordinates, route not found, and
happy paths for assigned and picked_up statuses.
"""

import routes.delivery_routes as delivery_routes


class _MockRes:
    def __init__(self, data):
        self.data = data


class _MockSupabase:
    def __init__(self, orders=None, users=None):
        self._orders = orders or []
        self._users = users
        self._table = None
        self._eq = {}

    def from_(self, table):
        self._table = table
        return self

    def select(self, *a, **k):
        return self

    def eq(self, *a, **k):
        # Track but we don't need to use it explicitly in tests
        if len(a) >= 2:
            self._eq[a[0]] = a[1]
        return self

    def is_(self, *a, **k):
        return self

    def execute(self):
        if self._table == "orders":
            return _MockRes(self._orders)
        if self._table == "users":
            return _MockRes(self._users)
        return _MockRes([])


def _make_route_json():
    return {
        "routes": [
            {
                "distance": 1609.34,
                "duration": 300.0,
                "geometry": {"type": "LineString", "coordinates": []},
                "legs": [
                    {
                        "steps": [
                            {"maneuver": {"instruction": "Head north"}},
                            {"maneuver": {"instruction": "Turn right"}},
                        ]
                    }
                ],
            }
        ]
    }


def test_navigation_assigned_success(client, monkeypatch):
    """Test GET /deliveries/active/{order_id}/navigation for assigned order (driver -> restaurant).

    Happy path: When an order is in 'assigned' status, the endpoint should return
    navigation from the driver's current location to the restaurant for pickup.
    Verifies response includes:
    - route_type: 'to_restaurant'
    - origin: driver's current coordinates
    - destination: restaurant coordinates and details
    - route: distance, duration, and turn-by-turn instructions
    """
    orders = [
        {
            "order_id": "o1",
            "user_id": "u1",
            "status": "assigned",
            "restaurant_id": 10,
            "restaurants": {
                "name": "R1",
                "latitude": 12.0,
                "longitude": 77.0,
                "address": "123 R St",
            },
            "latitude": None,
            "longitude": None,
            "delivery_address": {},
        }
    ]
    monkeypatch.setattr(delivery_routes, "supabase", _MockSupabase(orders=orders))
    monkeypatch.setattr(delivery_routes, "MAPBOX_TOKEN", "token")

    # Avoid network: stub route fetcher (must be async)
    async def _mock_fetch(*a, **k):
        return _make_route_json()

    monkeypatch.setattr(delivery_routes, "_fetch_mapbox_route", _mock_fetch)

    resp = client.get(
        "/api/deliveries/active/o1/navigation",
        params={"driver_latitude": 1.1, "driver_longitude": 2.2},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["route_type"] == "to_restaurant"
    assert body["origin"] == {"latitude": 1.1, "longitude": 2.2}
    assert body["destination"]["name"] == "R1"
    assert body["destination"]["latitude"] == 12.0
    assert body["destination"]["longitude"] == 77.0
    assert body["route"]["distance_miles"] == 1.0


def test_navigation_restaurant_coords_missing_returns_400(client, monkeypatch):
    """Test navigation endpoint returns 400 when restaurant coordinates unavailable.

    Edge case: If restaurant latitude/longitude cannot be determined (not in database
    and geocoding fails), the endpoint should return a 400 Bad Request with a clear
    error message indicating restaurant location is not available for navigation.
    """
    orders = [
        {
            "order_id": "o2",
            "user_id": "u1",
            "status": "assigned",
            "restaurant_id": 10,
            "restaurants": {"name": "R2", "address": "Addr"},  # no lat/lng
            "delivery_address": {},
        }
    ]
    monkeypatch.setattr(delivery_routes, "supabase", _MockSupabase(orders=orders))

    # Force helper to return None coords to hit validation (must be async)
    async def _mock_get_rest(*a, **k):
        return (None, None)

    monkeypatch.setattr(delivery_routes, "_get_restaurant_coordinates", _mock_get_rest)

    resp = client.get(
        "/api/deliveries/active/o2/navigation",
        params={"driver_latitude": 0, "driver_longitude": 0},
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Restaurant location not available"


def test_navigation_en_route_missing_customer_coords_400(client, monkeypatch):
    """Test navigation endpoint returns 400 when customer coordinates unavailable for delivery.

    Edge case: For orders in 'en_route' or 'picked_up' status, customer coordinates are
    required for navigation. If customer location cannot be determined (no coordinates in
    order, no delivery address to geocode, and no user profile fallback), the endpoint
    should return 400 with message "Customer location not geocoded".
    """
    orders = [
        {
            "order_id": "o3",
            "user_id": "u9",
            "status": "en_route",
            "restaurant_id": 10,
            "restaurants": {
                "name": "R3",
                "latitude": 1.0,
                "longitude": 1.0,
                "address": "R",
            },
            "delivery_address": {},
        }
    ]
    monkeypatch.setattr(
        delivery_routes, "supabase", _MockSupabase(orders=orders, users=[])
    )

    # Return no customer coordinates to trigger 400 inside _determine_route_endpoints (must be async)
    async def _mock_get_cust(*a, **k):
        return (None, None)

    monkeypatch.setattr(delivery_routes, "_get_customer_coordinates", _mock_get_cust)

    resp = client.get(
        "/api/deliveries/active/o3/navigation",
        params={"driver_latitude": 0, "driver_longitude": 0},
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Customer location not geocoded"


def test_navigation_no_route_found_returns_404(client, monkeypatch):
    """Test navigation endpoint returns 404 when Mapbox finds no valid route.

    Edge case: When Mapbox Directions API returns an empty routes array (can happen
    with unreachable locations, coordinates in different continents, or invalid
    coordinates), the endpoint should return 404 Not Found with message "No route found"
    rather than crashing or returning incomplete data.
    """
    orders = [
        {
            "order_id": "o4",
            "user_id": "u1",
            "status": "assigned",
            "restaurant_id": 10,
            "restaurants": {
                "name": "R4",
                "latitude": 12.0,
                "longitude": 77.0,
                "address": "123 R St",
            },
        }
    ]
    monkeypatch.setattr(delivery_routes, "supabase", _MockSupabase(orders=orders))

    async def _mock_fetch_empty(*a, **k):
        return {"routes": []}

    monkeypatch.setattr(delivery_routes, "_fetch_mapbox_route", _mock_fetch_empty)

    resp = client.get(
        "/api/deliveries/active/o4/navigation",
        params={"driver_latitude": 1.1, "driver_longitude": 2.2},
    )
    assert resp.status_code == 404
    assert resp.json()["detail"] == "No route found"


def test_navigation_picked_up_success_to_customer(client, monkeypatch):
    """Test GET /deliveries/active/{order_id}/navigation for picked_up order (restaurant -> customer).

    Happy path: When an order is in 'picked_up' status, the endpoint should return
    navigation from the restaurant to the customer's delivery location.
    Verifies response includes:
    - route_type: 'to_customer'
    - origin: restaurant coordinates (where driver picked up food)
    - destination: customer coordinates with name 'Customer'
    - route: distance, duration, and turn-by-turn instructions for delivery
    """
    orders = [
        {
            "order_id": "o5",
            "user_id": "u5",
            "status": "picked_up",
            "restaurant_id": 10,
            "restaurants": {
                "name": "R5",
                "latitude": 12.0,
                "longitude": 77.0,
                "address": "123 R St",
            },
            "delivery_address": {"street": "C", "city": "X"},
        }
    ]
    monkeypatch.setattr(delivery_routes, "supabase", _MockSupabase(orders=orders))

    async def _mock_get_cust2(*a, **k):
        return (33.3, 44.4)

    monkeypatch.setattr(delivery_routes, "_get_customer_coordinates", _mock_get_cust2)

    async def _mock_fetch2(*a, **k):
        return _make_route_json()

    monkeypatch.setattr(delivery_routes, "_fetch_mapbox_route", _mock_fetch2)

    resp = client.get(
        "/api/deliveries/active/o5/navigation",
        params={"driver_latitude": 9.9, "driver_longitude": 8.8},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["route_type"] == "to_customer"
    assert body["destination"]["name"] == "Customer"
    assert body["destination"]["latitude"] == 33.3
    assert body["destination"]["longitude"] == 44.4
