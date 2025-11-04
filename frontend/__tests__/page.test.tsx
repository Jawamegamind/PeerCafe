import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '../app/page';

// Mock Next.js Link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => {
    return <a href={href}>{children}</a>;
  },
}));

describe('Home Page', () => {
  // Prevent jsdom triggering navigation from anchor clicks in this file's tests
  const _origAnchorClick = HTMLAnchorElement.prototype.click;
  beforeAll(() => {
    HTMLAnchorElement.prototype.click = function () {};
  });
  afterAll(() => {
    HTMLAnchorElement.prototype.click = _origAnchorClick;
  });
  it('renders without crashing', () => {
    render(<Home />);
    expect(document.body).toBeTruthy();
  });

  it('should display the main heading and welcome content', () => {
    render(<Home />);

    // Check for the main heading
    expect(
      screen.getByRole('heading', { name: /Welcome to PeerCafe/i })
    ).toBeInTheDocument();

    // Check for the subtitle
    expect(
      screen.getByRole('heading', {
        name: /Your Ultimate Restaurant Discovery Platform/i,
      })
    ).toBeInTheDocument();

    // Check for the description text
    expect(
      screen.getByText(/Discover amazing restaurants, read reviews/i)
    ).toBeInTheDocument();
  });

  it('should display all three feature cards', () => {
    render(<Home />);

    // Check for "Discover Restaurants" card
    expect(
      screen.getByRole('heading', { name: /Discover Restaurants/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Explore a wide variety of restaurants/i)
    ).toBeInTheDocument();

    // Check for "User Dashboard" card
    expect(
      screen.getByRole('heading', { name: /User Dashboard/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Manage your profile, save favorite restaurants/i)
    ).toBeInTheDocument();

    // Check for "Admin Portal" card
    expect(
      screen.getByRole('heading', { name: /Admin Portal/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Restaurant owners and administrators can manage listings/i
      )
    ).toBeInTheDocument();
  });

  it('should have navigation buttons to register and login', () => {
    render(<Home />);

    // Check for "Get Started" button (links to register)
    const getStartedButton = screen.getByRole('link', { name: /Get Started/i });
    expect(getStartedButton).toBeInTheDocument();
    expect(getStartedButton).toHaveAttribute('href', '/register');

    // Check for "Sign In" button (links to login)
    const signInButton = screen.getByRole('link', { name: /Sign In/i });
    expect(signInButton).toBeInTheDocument();
    expect(signInButton).toHaveAttribute('href', '/login');
  });
});
