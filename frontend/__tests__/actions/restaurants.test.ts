import axios from 'axios';
import { getRestaurants } from '../../app/(main)/user/restaurants/actions';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock Supabase client
jest.mock('../../utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve({})),
}));

describe('Restaurant Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset console.log and console.error mocks
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getRestaurants', () => {
    it('returns restaurant data on successful API call', async () => {
      const mockRestaurants = [
        { 
          id: 1, 
          Name: 'Test Restaurant 1', 
          CuisineType: 'Italian',
          Rating: 4.5 
        },
        { 
          id: 2, 
          Name: 'Test Restaurant 2', 
          CuisineType: 'Mexican',
          Rating: 4.2 
        },
      ];

      mockedAxios.get.mockResolvedValue({
        data: mockRestaurants,
        status: 200,
      });

      const result = await getRestaurants();

      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:8000/api/restaurants');
      expect(result).toEqual(mockRestaurants);
      expect(console.log).toHaveBeenCalledWith('Fetch restaurants action');
    });

    it('returns empty array on API error', async () => {
      const mockError = new Error('Network error');
      mockedAxios.get.mockRejectedValue(mockError);

      const result = await getRestaurants();

      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:8000/api/restaurants');
      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('Error fetching restaurants:', mockError);
    });

    it('handles axios error with response', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { message: 'Not found' },
        },
      };
      mockedAxios.get.mockRejectedValue(mockError);

      const result = await getRestaurants();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('Error fetching restaurants:', mockError);
    });

    it('handles timeout error', async () => {
      const mockError = new Error('timeout of 5000ms exceeded');
      mockError.name = 'ECONNABORTED';
      mockedAxios.get.mockRejectedValue(mockError);

      const result = await getRestaurants();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('Error fetching restaurants:', mockError);
    });

    it('makes correct API call to backend', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });

      await getRestaurants();

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:8000/api/restaurants');
    });
  });
});