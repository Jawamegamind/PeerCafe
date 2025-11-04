'use server';

import axios from 'axios';

export async function getRestaurants() {
  // Fetching restaurants from our backend
  try {
    const response = await axios.get('http://localhost:8000/api/restaurants');
    return response.data;
  } catch {
    return [];
  }
}
