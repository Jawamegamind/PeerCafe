import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SignIn from '../../app/(authentication)/register/page';

// Mock the register action
jest.mock('../../app/(authentication)/register/actions', () => ({
  register: jest.fn(),
}));

// Mock Next.js Link component  
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  },
}));

// Get the mock after it's been created
const { register: mockRegister } = require('../../app/(authentication)/register/actions');

describe('Register Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders register form with all required elements', () => {
    render(<SignIn />);
    
    // Check for main elements
    expect(screen.getByRole('heading', { name: /register/i })).toBeInTheDocument();
    expect(screen.getByTestId('LockOutlinedIcon')).toBeInTheDocument();
    
    // Check for form fields
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    
    // Check for submit button
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
    
    // Check for login link
    expect(screen.getByText(/already have an account\? sign in/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /already have an account\? sign in/i })).toHaveAttribute('href', '/login');
  });

  it('displays all form fields with correct attributes', () => {
    render(<SignIn />);
    
    const nameField = screen.getByLabelText(/name/i);
    const emailField = screen.getByLabelText(/email address/i);
    const passwordField = screen.getByLabelText(/password/i);
    
    // Check field attributes
    expect(nameField).toHaveAttribute('name', 'name');
    expect(nameField).toHaveAttribute('id', 'name');
    expect(nameField).toHaveAttribute('autocomplete', 'name');
    expect(nameField).toBeRequired();
    
    expect(emailField).toHaveAttribute('name', 'email');
    expect(emailField).toHaveAttribute('id', 'email');
    expect(emailField).toHaveAttribute('autocomplete', 'email');
    expect(emailField).toBeRequired();
    
    expect(passwordField).toHaveAttribute('name', 'password');
    expect(passwordField).toHaveAttribute('id', 'password');
    expect(passwordField).toHaveAttribute('type', 'password');
    expect(passwordField).toHaveAttribute('autocomplete', 'current-password');
    expect(passwordField).toBeRequired();
  });

  it('allows users to input data in all fields', async () => {
    const user = userEvent.setup();
    render(<SignIn />);
    
    const nameField = screen.getByLabelText(/name/i);
    const emailField = screen.getByLabelText(/email address/i);
    const passwordField = screen.getByLabelText(/password/i);
    
    // Type in the fields
    await user.type(nameField, 'John Doe');
    await user.type(emailField, 'john.doe@example.com');
    await user.type(passwordField, 'password123');
    
    // Check the values
    expect(nameField).toHaveValue('John Doe');
    expect(emailField).toHaveValue('john.doe@example.com');
    expect(passwordField).toHaveValue('password123');
  });

  it('shows error snackbar when required fields are empty', async () => {
    const user = userEvent.setup();
    render(<SignIn />);
    
    const submitButton = screen.getByRole('button', { name: /sign up/i });
    await user.click(submitButton);
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText('All fields are required')).toBeInTheDocument();
    });
    
    // Verify register action was not called
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('shows error snackbar when name is missing', async () => {
    const user = userEvent.setup();
    render(<SignIn />);
    
    const emailField = screen.getByLabelText(/email address/i);
    const passwordField = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign up/i });
    
    await user.type(emailField, 'john.doe@example.com');
    await user.type(passwordField, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('All fields are required')).toBeInTheDocument();
    });
    
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('shows error snackbar when email is missing', async () => {
    const user = userEvent.setup();
    render(<SignIn />);
    
    const nameField = screen.getByLabelText(/name/i);
    const passwordField = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign up/i });
    
    await user.type(nameField, 'John Doe');
    await user.type(passwordField, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('All fields are required')).toBeInTheDocument();
    });
    
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('shows error snackbar when password is missing', async () => {
    const user = userEvent.setup();
    render(<SignIn />);
    
    const nameField = screen.getByLabelText(/name/i);
    const emailField = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /sign up/i });
    
    await user.type(nameField, 'John Doe');
    await user.type(emailField, 'john.doe@example.com');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('All fields are required')).toBeInTheDocument();
    });
    
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('calls register action with form data when all fields are filled', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValue('success');
    
    render(<SignIn />);
    
    const nameField = screen.getByLabelText(/name/i);
    const emailField = screen.getByLabelText(/email address/i);
    const passwordField = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign up/i });
    
    await user.type(nameField, 'John Doe');
    await user.type(emailField, 'john.doe@example.com');
    await user.type(passwordField, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  it('shows error snackbar when user already exists', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValue('User already exists');
    
    render(<SignIn />);
    
    const nameField = screen.getByLabelText(/name/i);
    const emailField = screen.getByLabelText(/email address/i);
    const passwordField = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign up/i });
    
    await user.type(nameField, 'John Doe');
    await user.type(emailField, 'existing@example.com');
    await user.type(passwordField, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('User already exists')).toBeInTheDocument();
    });
  });

  it('shows error snackbar when registration fails', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValue('User registration failed');
    
    render(<SignIn />);
    
    const nameField = screen.getByLabelText(/name/i);
    const emailField = screen.getByLabelText(/email address/i);
    const passwordField = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign up/i });
    
    await user.type(nameField, 'John Doe');
    await user.type(emailField, 'john.doe@example.com');
    await user.type(passwordField, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Registration failed')).toBeInTheDocument();
    });
  });

  it('shows error snackbar when register action throws an error', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockRegister.mockRejectedValue(new Error('Network error'));
    
    render(<SignIn />);
    
    const nameField = screen.getByLabelText(/name/i);
    const emailField = screen.getByLabelText(/email address/i);
    const passwordField = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign up/i });
    
    await user.type(nameField, 'John Doe');
    await user.type(emailField, 'john.doe@example.com');
    await user.type(passwordField, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Registration failed')).toBeInTheDocument();
    });
    
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it('disables submit button during loading', async () => {
    const user = userEvent.setup();
    // Mock a slow register action
    mockRegister.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('success'), 100)));
    
    render(<SignIn />);
    
    const nameField = screen.getByLabelText(/name/i);
    const emailField = screen.getByLabelText(/email address/i);
    const passwordField = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign up/i });
    
    await user.type(nameField, 'John Doe');
    await user.type(emailField, 'john.doe@example.com');
    await user.type(passwordField, 'password123');
    
    // Button should be enabled initially
    expect(submitButton).not.toBeDisabled();
    
    // Click submit
    await user.click(submitButton);
    
    // Button should be disabled during loading
    expect(submitButton).toBeDisabled();
    
    // Wait for the action to complete
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('can close snackbar by clicking close button', async () => {
    const user = userEvent.setup();
    render(<SignIn />);
    
    const submitButton = screen.getByRole('button', { name: /sign up/i });
    await user.click(submitButton);
    
    // Wait for snackbar to appear
    await waitFor(() => {
      expect(screen.getByText('All fields are required')).toBeInTheDocument();
    });
    
    // Find and click the close button
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);
    
    // Snackbar should disappear
    await waitFor(() => {
      expect(screen.queryByText('All fields are required')).not.toBeInTheDocument();
    });
  });

  it('auto-closes snackbar after timeout', async () => {
    const user = userEvent.setup();
    render(<SignIn />);
    
    const submitButton = screen.getByRole('button', { name: /sign up/i });
    await user.click(submitButton);
    
    // Wait for snackbar to appear
    await waitFor(() => {
      expect(screen.getByText('All fields are required')).toBeInTheDocument();
    });
    
    // Wait for auto-close (6 seconds)
    await waitFor(() => {
      expect(screen.queryByText('All fields are required')).not.toBeInTheDocument();
    }, { timeout: 7000 });
  });

  it('prevents snackbar close on clickaway', async () => {
    const user = userEvent.setup();
    render(<SignIn />);
    
    const submitButton = screen.getByRole('button', { name: /sign up/i });
    await user.click(submitButton);
    
    // Wait for snackbar to appear
    await waitFor(() => {
      expect(screen.getByText('All fields are required')).toBeInTheDocument();
    });
    
    // Click outside the snackbar (on the form)
    const nameField = screen.getByLabelText(/name/i);
    await user.click(nameField);
    
    // Snackbar should still be visible
    expect(screen.getByText('All fields are required')).toBeInTheDocument();
  });

  it('has correct form accessibility attributes', () => {
    render(<SignIn />);
    
    // Find form element by tag instead of role
    const formElement = document.querySelector('form');
    expect(formElement).toBeInTheDocument();
    expect(formElement).toHaveAttribute('novalidate');
    
    // Check for proper labeling
    const nameField = screen.getByLabelText(/name/i);
    const emailField = screen.getByLabelText(/email address/i);
    const passwordField = screen.getByLabelText(/password/i);
    
    expect(nameField).toHaveAccessibleName('Name');
    expect(emailField).toHaveAccessibleName('Email Address');
    expect(passwordField).toHaveAccessibleName('Password');
  });

  it('has proper semantic structure', () => {
    render(<SignIn />);
    
    // Check for main container
    expect(screen.getByRole('main')).toBeInTheDocument();
    
    // Check for heading
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    
    // Check for form by tag name since MUI doesn't add role="form"
    const formElement = document.querySelector('form');
    expect(formElement).toBeInTheDocument();
    
    // Check for link
    expect(screen.getByRole('link')).toBeInTheDocument();
  });

  it('logs form data to console on submit', async () => {
    const user = userEvent.setup();
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockRegister.mockResolvedValue('success');
    
    render(<SignIn />);
    
    const nameField = screen.getByLabelText(/name/i);
    const emailField = screen.getByLabelText(/email address/i);
    const passwordField = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign up/i });
    
    await user.type(nameField, 'John Doe');
    await user.type(emailField, 'john.doe@example.com');
    await user.type(passwordField, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'password123'
      });
    });
    
    consoleLogSpy.mockRestore();
  });
});