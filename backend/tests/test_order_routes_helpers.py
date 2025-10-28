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


def test_compute_and_update_subtotal_helper():
    order = {"order_items": [{"price": "2", "quantity": "2"}], "subtotal": 10}
    changed, old = orr._compute_and_update_subtotal(order)
    assert changed is True
    assert old == 10
    assert order["subtotal"] == pytest.approx(4.0)


def test_compute_and_update_total_helper():
    order = {
        "subtotal": 5,
        "tax_amount": "1",
        "delivery_fee": 0,
        "tip_amount": 0,
        "discount_amount": 0,
        "total_amount": None,
    }
    changed, old_total, new_total = orr._compute_and_update_total(order)
    assert changed is True
    assert old_total is None
    assert new_total == pytest.approx(6.0)
    assert order["total_amount"] == pytest.approx(6.0)


def test_compute_subtotal_skips_malformed_item():
    items = [
        {"price": 5, "quantity": 2},
        {"price": "not-a-number", "quantity": 3},
        {"price": 2.5, "quantity": 1},
    ]

    sub = orr._compute_subtotal(items)

    # First and third items compute to 10 and 2.5; malformed middle item treated as 0
    assert sub == pytest.approx(12.5)


def test_sanitize_order_record_updates_subtotal_for_malformed_items():
    order = {
        "order_id": "mal1",
        "order_items": [{"price": 3, "quantity": 1}, {"price": "x", "quantity": 2}],
        "subtotal": 0,
        "tax_amount": 0,
        "delivery_fee": 0,
        "tip_amount": 0,
        "discount_amount": 0,
    }

    sanitized = orr._sanitize_order_record(order.copy())

    # subtotal should be recomputed from items -> 3.0 (malformed item ignored)
    assert sanitized["subtotal"] == pytest.approx(3.0)
