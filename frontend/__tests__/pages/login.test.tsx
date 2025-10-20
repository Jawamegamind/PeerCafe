import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SignIn from '../../app/(authentication)/login/page';

// Mock the login action
jest.mock('../../app/(authentication)/login/actions', () => ({
  login: jest.fn(),
}));

// Mock Next.js Link component  
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  },
}));

// Get the mock after it's been created
const { login: mockLogin } = require('../../app/(authentication)/login/actions');

describe('SignIn Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form with all required elements', () => {
    render(<SignIn />);
    
    // Check for main elements
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('displays validation error when fields are empty', async () => {
    const user = userEvent.setup();
    render(<SignIn />);
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);
    
    // Check for error snackbar
    await waitFor(() => {
      expect(screen.getByText('All fields are required')).toBeInTheDocument();
    });
  });

  it('displays validation error when email is missing', async () => {
    const user = userEvent.setup();
    render(<SignIn />);
    
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('All fields are required')).toBeInTheDocument();
    });
  });

  it('displays validation error when password is missing', async () => {
    const user = userEvent.setup();
    render(<SignIn />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('All fields are required')).toBeInTheDocument();
    });
  });

  it('submits form with valid credentials', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({});
    
    render(<SignIn />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  it('disables submit button during loading', async () => {
    const user = userEvent.setup();
    // Make login action hang to simulate loading
    mockLogin.mockImplementation(() => new Promise(() => {}));
    
    render(<SignIn />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    // Button should be disabled during loading
    expect(submitButton).toBeDisabled();
  });

  it('handles login action errors gracefully', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockLogin.mockRejectedValue(new Error('Login failed'));
    
    render(<SignIn />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', expect.any(Error));
    });
    
    consoleErrorSpy.mockRestore();
  });

  it('displays navigation links correctly', () => {
    render(<SignIn />);
    
    // Check for forgot password link
    const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i });
    expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
    
    // Check for sign up link
    const signUpLink = screen.getByRole('link', { name: /don't have an account\? sign up/i });
    expect(signUpLink).toHaveAttribute('href', '/register');
  });

  it('closes snackbar when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<SignIn />);
    
    // Trigger error to show snackbar
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('All fields are required')).toBeInTheDocument();
    });
    
    // Click close button on snackbar
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByText('All fields are required')).not.toBeInTheDocument();
    });
  });

  it('has proper form accessibility', () => {
    render(<SignIn />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    // Material-UI TextField defaults to type="text" for email fields unless explicitly set
    expect(emailInput).toHaveAttribute('autoComplete', 'email');
    expect(emailInput).toBeRequired();
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
    expect(passwordInput).toBeRequired();
  });

  it('sends correct form data when submitted', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({});
    
    render(<SignIn />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailInput, 'user@test.com');
    await user.type(passwordInput, 'mypassword');
    await user.click(submitButton);
    
    await waitFor(() => {
      const formDataArg = mockLogin.mock.calls[0][0] as FormData;
      expect(formDataArg.get('email')).toBe('user@test.com');
      expect(formDataArg.get('password')).toBe('mypassword');
    });
  });

  it('renders with proper styling and layout', () => {
    render(<SignIn />);
    
    // Check for Material-UI components
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    
    // Check for lock icon
    const avatar = document.querySelector('.MuiAvatar-root');
    expect(avatar).toBeInTheDocument();
  });
});