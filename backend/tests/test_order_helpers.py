import types

import pytest

from routes.order_routes import (
    _safe_float,
    _compute_item_subtotal,
    _compute_subtotal,
    _recompute_total,
)


def test_safe_float_with_valid_string():
    assert _safe_float("3.5") == 3.5


def test_safe_float_with_none_and_default():
    assert _safe_float(None) is None
    assert _safe_float(None, 0) == 0


def test_safe_float_with_invalid_and_default():
    assert _safe_float("not-a-number", 1) == 1


def test_compute_item_subtotal_with_subtotal_key():
    item = {"subtotal": "4.2", "price": "1", "quantity": "1"}
    assert _compute_item_subtotal(item) == pytest.approx(4.2)


def test_compute_item_subtotal_with_price_quantity():
    item = {"price": "2.5", "quantity": "3"}
    assert _compute_item_subtotal(item) == pytest.approx(7.5)


def test_compute_item_subtotal_with_object_like():
    class Obj:
        def __init__(self, price, qty):
            self._d = {"price": price, "quantity": qty}

        def get(self, k, d=None):
            return self._d.get(k, d)

    obj = Obj("1.5", "2")
    assert _compute_item_subtotal(obj) == pytest.approx(3.0)


def test_compute_item_subtotal_malformed_returns_zero():
    item = {"price": "bad", "quantity": "bad"}
    assert _compute_item_subtotal(item) == 0.0


def test_compute_subtotal_sums_items():
    items = [
        {"price": "2", "quantity": "2"},
        {"subtotal": "3.5"},
        None,
        {"price": "bad", "quantity": "1"},
    ]
    assert _compute_subtotal(items) == pytest.approx(7.5)


def test_recompute_total_detects_change_and_computes_correctly():
    order = {"subtotal": 10, "tax_amount": "1", "delivery_fee": "2", "tip_amount": 0, "discount_amount": "1"}
    changed, old, new = _recompute_total(order)
    assert changed is True
    assert old is None
    assert new == pytest.approx(12.0)


def test_recompute_total_no_change():
    order = {"subtotal": 10, "tax_amount": 1, "delivery_fee": 2, "tip_amount": 0, "discount_amount": 1, "total_amount": 12}
    changed, old, new = _recompute_total(order)
    assert changed is False
    assert old == pytest.approx(12)
    assert new is None
