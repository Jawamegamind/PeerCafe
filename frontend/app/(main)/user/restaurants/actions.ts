'use server';

import axios from 'axios';
import { createClient } from '@/utils/supabase/server';

export async function getRestaurants() {
  console.log('Fetch restaurants action');
  const supabase = await createClient();

  // Fetching restaurants from our backend
  try {
    const response = await axios.get('http://localhost:8000/api/restaurants');
    return response.data;
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    return [];
  }
}
