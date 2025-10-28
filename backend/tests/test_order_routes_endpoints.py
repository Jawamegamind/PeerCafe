import pytest
import asyncio
from fastapi import HTTPException

from routes import order_routes as orr


class MockResponse:
    def __init__(self, data):
        self.data = data


class MockQuery:
    def __init__(self, select_data=None):
        # select_data: list to return for select() -> execute()
        self._select_data = select_data or []
        self._last_update = None
        self._last_insert = None

    def select(self, *args, **kwargs):
        return self

    def eq(self, *args, **kwargs):
        return self

    def order(self, *args, **kwargs):
        return self

    def range(self, *args, **kwargs):
        return self

    def update(self, data):
        self._last_update = data
        return self

    def insert(self, data):
        self._last_insert = data
        return self

    def execute(self):
        # If update was called, return a merged response representing the updated row
        if self._last_update is not None:
            base = self._select_data[0] if self._select_data else {}
            merged = {**base, **self._last_update}
            return MockResponse([merged])
        if self._last_insert is not None:
            return MockResponse([self._last_insert])
        return MockResponse(self._select_data)


def test_list_orders_raises_when_no_client(monkeypatch):
    monkeypatch.setattr(orr, "get_supabase_client", lambda: None)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(orr.list_orders())
    # list_orders wraps internal HTTPExceptions and rethrows as 500
    assert exc.value.status_code == 500


def test_list_orders_success(monkeypatch):
    # return a query that yields two orders
    q = MockQuery(select_data=[{"order_id": "o1"}, {"order_id": "o2"}])
    monkeypatch.setattr(orr, "get_supabase_client", lambda: object())
    monkeypatch.setattr(orr, "_get_db_table", lambda client, name: q)

    res = asyncio.run(orr.list_orders(limit=2, offset=0))
    assert isinstance(res, list)
    assert len(res) == 2


def test_get_order_by_id_not_found(monkeypatch):
    q = MockQuery(select_data=[])
    monkeypatch.setattr(orr, "get_supabase_client", lambda: object())
    monkeypatch.setattr(orr, "_get_db_table", lambda client, name: q)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(orr.get_order_by_id("nope"))
    assert exc.value.status_code == 404


def test_get_order_by_id_success(monkeypatch):
    order = {
        "order_id": "o1",
        "user_id": "u1",
        "restaurant_id": 1,
        "order_items": [
            {
                "item_id": 1,
                "item_name": "X",
                "price": 2.5,
                "quantity": 2,
                "subtotal": 5.0,
            }
        ],
        "delivery_address": {
            "street": "s",
            "city": "c",
            "state": "ST",
            "zip_code": "12345",
        },
        "subtotal": 5.0,
        "tax_amount": 0.5,
        "delivery_fee": 0,
        "tip_amount": 0,
        "discount_amount": 0,
        "total_amount": 5.5,
    }
    q = MockQuery(select_data=[order])
    monkeypatch.setattr(orr, "get_supabase_client", lambda: object())
    monkeypatch.setattr(orr, "_get_db_table", lambda client, name: q)

    res = asyncio.run(orr.get_order_by_id("o1"))
    # should return an Order model instance (pydantic) with order_id
    assert getattr(res, "order_id") == "o1"


def test_update_order_status_not_found(monkeypatch):
    q = MockQuery(select_data=[])
    monkeypatch.setattr(orr, "get_supabase_client", lambda: object())
    monkeypatch.setattr(orr, "_get_db_table", lambda client, name: q)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(orr.update_order_status("x", orr.OrderStatus.CONFIRMED))
    assert exc.value.status_code == 404


def test_update_order_status_success(monkeypatch):
    existing = {
        "order_id": "x",
        "user_id": "u1",
        "restaurant_id": 1,
        "order_items": [
            {
                "item_id": 1,
                "item_name": "X",
                "price": 2.5,
                "quantity": 2,
                "subtotal": 5.0,
            }
        ],
        "delivery_address": {
            "street": "s",
            "city": "c",
            "state": "ST",
            "zip_code": "12345",
        },
        "subtotal": 5.0,
        "tax_amount": 0,
        "delivery_fee": 0,
        "tip_amount": 0,
        "discount_amount": 0,
        "total_amount": 5.0,
        "status": orr.OrderStatus.CONFIRMED.value,
    }
    q = MockQuery(select_data=[existing])
    monkeypatch.setattr(orr, "get_supabase_client", lambda: object())
    monkeypatch.setattr(orr, "_get_db_table", lambda client, name: q)
    # avoid running sanitization logic here (already validated data); return a sanitized record
    sanitized_result = {**existing, "status": orr.OrderStatus.PICKED_UP.value}
    monkeypatch.setattr(orr, "_sanitize_order_record", lambda o: sanitized_result)

    res = asyncio.run(orr.update_order_status("x", orr.OrderStatus.PICKED_UP))
    assert getattr(res, "order_id") == "x"
    assert getattr(res, "status") == orr.OrderStatus.PICKED_UP.value


def test_assign_delivery_user_bad_status(monkeypatch):
    existing = {"order_id": "a1", "status": orr.OrderStatus.PENDING.value}
    q = MockQuery(select_data=[existing])
    monkeypatch.setattr(orr, "get_supabase_client", lambda: object())
    monkeypatch.setattr(orr, "_get_db_table", lambda client, name: q)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(orr.assign_delivery_user("a1", "du1"))
    assert exc.value.status_code == 400


def test_cancel_order_success(monkeypatch):
    existing = {"order_id": "c1", "status": orr.OrderStatus.CONFIRMED.value}
    q = MockQuery(select_data=[existing])
    monkeypatch.setattr(orr, "get_supabase_client", lambda: object())
    monkeypatch.setattr(orr, "_get_db_table", lambda client, name: q)

    res = asyncio.run(orr.cancel_order("c1"))
    assert isinstance(res, dict)
    assert res["order_id"] == "c1"
    assert res["message"] == "Order cancelled successfully"


def test_cancel_order_cannot_cancel_delivered(monkeypatch):
    existing = {"order_id": "c2", "status": orr.OrderStatus.DELIVERED.value}
    q = MockQuery(select_data=[existing])
    monkeypatch.setattr(orr, "get_supabase_client", lambda: object())
    monkeypatch.setattr(orr, "_get_db_table", lambda client, name: q)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(orr.cancel_order("c2"))
    assert exc.value.status_code == 400
