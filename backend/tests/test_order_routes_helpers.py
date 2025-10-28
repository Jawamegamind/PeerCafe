import pytest

from routes import order_routes as orr


def test_recompute_total_within_tolerance_no_change():
    order = {
        "subtotal": 10,
        "tax_amount": 1,
        "delivery_fee": 1,
        "tip_amount": 0,
        "discount_amount": 0,
        # stored total is slightly different but within the 0.01 tolerance
        "total_amount": 12.005,
    }
    changed, old, new = orr._recompute_total(order)
    assert changed is False
    assert old == pytest.approx(12.005)
    assert new is None


def test_recompute_total_with_none_stored_total():
    order = {
        "subtotal": 5,
        "tax_amount": 0,
        "delivery_fee": 0,
        "tip_amount": 0,
        "discount_amount": 0,
        "total_amount": None,
    }
    changed, old, new = orr._recompute_total(order)
    assert changed is True
    assert old is None
    assert new == pytest.approx(5.0)


def test_sanitize_order_record_subtotal_and_total_changed():
    order = {
        "order_id": "o1",
        "order_items": [{"price": "2", "quantity": "2"}, {"subtotal": "3.5"}],
        "subtotal": 10,  # incorrect stored value
        "tax_amount": "1",
        "delivery_fee": "0",
        "tip_amount": 0,
        "discount_amount": "0",
    }

    sanitized = orr._sanitize_order_record(order.copy())

    # subtotal should be recomputed from items -> 7.5
    assert sanitized["subtotal"] == pytest.approx(7.5)

    # total should be recomputed from components (7.5 + 1)
    assert sanitized.get("total_amount") == pytest.approx(8.5)


def test_sanitize_order_record_recompute_raises(monkeypatch):
    # Force _recompute_total to raise so the sanitization code hits the exception path
    def bad(o):
        raise RuntimeError("boom")

    monkeypatch.setattr(orr, "_recompute_total", bad)

    order = {
        "order_id": "o2",
        "order_items": [],
        "subtotal": None,
        # keep total_amount present so we can assert it is left alone when recompute fails
        "total_amount": 123.45,
    }

    sanitized = orr._sanitize_order_record(order.copy())

    # subtotal should be set to computed (0.0) even if total recompute fails
    assert sanitized.get("subtotal") == pytest.approx(0.0)
    # total_amount should remain unchanged because recompute raised
    assert sanitized.get("total_amount") == 123.45


def test__get_db_table_uses_table_then_from_():
    class C1:
        def table(self, name):
            return f"table:{name}"

    class C2:
        def from_(self, name):
            return f"from:{name}"

    assert orr._get_db_table(C1(), "orders") == "table:orders"
    assert orr._get_db_table(C2(), "orders") == "from:orders"
