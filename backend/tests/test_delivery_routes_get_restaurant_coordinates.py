from unittest.mock import patch

import pytest

from routes.delivery_routes import _get_restaurant_coordinates


@pytest.mark.asyncio
@patch("routes.delivery_routes.geocode_address")
async def test_coordinates_from_info(mock_geocode):
    """
    Test that coordinates are extracted directly from restaurant_info
    when latitude and longitude are present. Geocoding should not be called.
    """
    restaurant_info = {"latitude": "12.34", "longitude": "56.78"}
    restaurant_address = "Some address"
    lat, lng = await _get_restaurant_coordinates(restaurant_info, restaurant_address)
    assert lat == 12.34
    assert lng == 56.78
    mock_geocode.assert_not_called()


@pytest.mark.asyncio
@patch("routes.delivery_routes.geocode_address")
async def test_coordinates_from_geocode(mock_geocode):
    """
    Test that coordinates are obtained via geocoding when restaurant_info
    does not contain valid latitude/longitude. Geocoding should be called.
    """
    restaurant_info = {"latitude": None, "longitude": None}
    restaurant_address = "Some address"
    mock_geocode.return_value = (98.76, 54.32)
    lat, lng = await _get_restaurant_coordinates(restaurant_info, restaurant_address)
    assert lat == 98.76
    assert lng == 54.32
    mock_geocode.assert_called_once_with(restaurant_address)


@pytest.mark.asyncio
@patch("routes.delivery_routes.geocode_address")
async def test_coordinates_none_if_all_missing(mock_geocode):
    """
    Test that (None, None) is returned when both restaurant_info and
    restaurant_address are missing or invalid, and geocoding is not called.
    """
    restaurant_info = {"latitude": None, "longitude": None}
    restaurant_address = None
    lat, lng = await _get_restaurant_coordinates(restaurant_info, restaurant_address)
    assert lat is None and lng is None
    mock_geocode.assert_not_called()


@pytest.mark.asyncio
@patch("routes.delivery_routes.geocode_address")
async def test_geocode_exception(mock_geocode):
    """
    Test that (None, None) is returned if geocoding raises an exception.
    Ensures graceful error handling when geocoding fails.
    """
    restaurant_info = {"latitude": None, "longitude": None}
    restaurant_address = "Some address"
    mock_geocode.side_effect = Exception("Geocode error")
    lat, lng = await _get_restaurant_coordinates(restaurant_info, restaurant_address)
    assert lat is None and lng is None
    mock_geocode.assert_called_once_with(restaurant_address)
