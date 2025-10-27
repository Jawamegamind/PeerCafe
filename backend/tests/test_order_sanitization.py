"""Tests for order sanitization helpers"""
from routes.order_routes import _sanitize_order_record, _sanitization_counts, _sanitization_lock


def test_subtotal_and_total_correction():
    order = {
        "order_id": "test-1",
        "order_items": [
            {"price": 10.5, "quantity": 2, "subtotal": 21},
        ],
        "subtotal": 20.0,
        "tax_amount": 2.0,
        "delivery_fee": 4.0,
        "tip_amount": 0.0,
        "discount_amount": 0.0,
        "total_amount": 26.0,
    }

    # snapshot counts
    with _sanitization_lock:
        before = dict(_sanitization_counts)

    sanitized = _sanitize_order_record(order.copy())

    assert sanitized["subtotal"] == 21.0
    # total = subtotal + tax + delivery_fee + tip - discount = 21 + 2 + 4 = 27
    assert abs(sanitized["total_amount"] - 27.0) < 0.001

    with _sanitization_lock:
        after = dict(_sanitization_counts)

    assert after["records_sanitized"] >= before["records_sanitized"] + 1
    assert after["subtotal_corrections"] >= before["subtotal_corrections"] + 1


def test_malformed_items_do_not_raise():
    order = {
        "order_id": "test-2",
        "order_items": [None, {}, {"price": "bad", "quantity": "x"}],
        "subtotal": None,
    }

    sanitized = _sanitize_order_record(order.copy())
    # Should return a dict and not raise; subtotal should be numeric (0.0) or preserved
    assert isinstance(sanitized, dict)
