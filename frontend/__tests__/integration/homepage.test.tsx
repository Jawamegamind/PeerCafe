import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Home from '../../app/page';

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

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: { src: string; alt: string }) => {
    return <img src={src} alt={alt} {...props} />;
  },
}));

describe('Home Page Integration Tests', () => {
  it('renders complete homepage with all sections', () => {
    render(<Home />);

    // Hero section
    expect(
      screen.getByRole('heading', { name: /welcome to peercafe/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: /your ultimate restaurant discovery platform/i,
      })
    ).toBeInTheDocument();

    // Features section
    expect(
      screen.getByRole('heading', { name: /discover restaurants/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /user dashboard/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /admin portal/i })
    ).toBeInTheDocument();

    // Call-to-action buttons
    expect(
      screen.getByRole('link', { name: /get started/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
  });

  it('has correct navigation links', () => {
    render(<Home />);

    const getStartedLink = screen.getByRole('link', { name: /get started/i });
    const signInLink = screen.getByRole('link', { name: /sign in/i });

    expect(getStartedLink).toHaveAttribute('href', '/register');
    expect(signInLink).toHaveAttribute('href', '/login');
  });

  it('displays feature descriptions correctly', () => {
    render(<Home />);

    // Check for detailed feature descriptions
    expect(
      screen.getByText(/explore a wide variety of restaurants/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/manage your profile, save favorite restaurants/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /restaurant owners and administrators can manage listings/i
      )
    ).toBeInTheDocument();
  });

  it('handles user interactions with navigation elements', async () => {
    const user = userEvent.setup();
    render(<Home />);

    // Test clicking on links (they should be clickable)
    const getStartedButton = screen.getByRole('link', { name: /get started/i });
    const signInButton = screen.getByRole('link', { name: /sign in/i });

    // These should be interactive elements
    expect(getStartedButton).toBeVisible();
    expect(signInButton).toBeVisible();

    // Test focus behavior (elements should be focusable via tab)
    await user.tab();
    expect(getStartedButton).toHaveFocus();
  });

  it('renders with proper semantic HTML structure', () => {
    render(<Home />);

    // Check for proper heading hierarchy
    const headings = screen.getAllByRole('heading');
    expect(headings).toHaveLength(5); // Main title + subtitle + 3 feature cards

    // Check for proper link elements
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2); // Get Started + Sign In
  });

  it('displays responsive design elements', () => {
    render(<Home />);

    // Material-UI components should render
    const containerElement = document.querySelector('.MuiContainer-root');
    expect(containerElement).toBeInTheDocument();

    // Cards should be present
    const cardElements = document.querySelectorAll('.MuiCard-root');
    expect(cardElements).toHaveLength(3); // 3 feature cards
  });

  it('has proper accessibility attributes', () => {
    render(<Home />);

    // Links should be accessible
    const getStartedLink = screen.getByRole('link', { name: /get started/i });
    const signInLink = screen.getByRole('link', { name: /sign in/i });

    expect(getStartedLink).toHaveAttribute('href');
    expect(signInLink).toHaveAttribute('href');
  });

  it('renders without any console errors', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<Home />);

    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
