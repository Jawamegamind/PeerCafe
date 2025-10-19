import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserProfilePage from '../../app/(main)/user/profile/page';
import AdminProfilePage from '../../app/(main)/admin/profile/page';

// Mock the navbar component
jest.mock('../../app/_components/navbar', () => {
  return function MockNavbar() {
    return <div data-testid="navbar">Mock Navbar</div>;
  };
});

describe('Profile Pages', () => {
  describe('UserProfilePage', () => {
    it('renders user profile page correctly', () => {
      render(<UserProfilePage />);
      
      expect(screen.getByTestId('navbar')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /user profile/i })).toBeInTheDocument();
      expect(screen.getByText(/this is a placeholder for the user profile page/i)).toBeInTheDocument();
    });
  });

  describe('AdminProfilePage', () => {
    it('renders admin profile page correctly', () => {
      render(<AdminProfilePage />);
      
      expect(screen.getByTestId('navbar')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /admin profile/i })).toBeInTheDocument();
      expect(screen.getByText(/this is a placeholder for the admin profile page/i)).toBeInTheDocument();
    });
  });
});