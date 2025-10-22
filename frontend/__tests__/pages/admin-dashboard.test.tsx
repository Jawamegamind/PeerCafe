import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import AdminDashboard from '../../app/(main)/admin/dashboard/page';

// Mock the Navbar component
jest.mock('../../app/_components/navbar', () => {
  return function MockNavbar() {
    return <nav data-testid="navbar">Navbar</nav>;
  };
});

// Mock window.location.href
const mockLocationAssign = jest.fn();
Object.defineProperty(window, 'location', {
  value: {
    href: '',
    assign: mockLocationAssign,
  },
  writable: true,
});

describe('Admin Dashboard Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset window.location.href before each test
    window.location.href = '';
  });

  it('renders navbar component', () => {
    render(<AdminDashboard />);
    
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
  });

  it('renders main dashboard heading and welcome message', () => {
    render(<AdminDashboard />);
    
    // Check for main heading
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/🛠️ admin dashboard/i)).toBeInTheDocument();
    
    // Check for welcome message
    expect(screen.getByText(/welcome to the peercafe administration panel/i)).toBeInTheDocument();
  });

  it('renders all dashboard cards with correct content', () => {
    render(<AdminDashboard />);
    
    // Restaurant Management card
    expect(screen.getByText(/🏪/)).toBeInTheDocument();
    expect(screen.getByText(/restaurant management/i)).toBeInTheDocument();
    expect(screen.getByText(/add, edit, and manage restaurants/i)).toBeInTheDocument();
    
    // User Management card (coming soon)
    expect(screen.getByText(/👥/)).toBeInTheDocument();
    expect(screen.getByText(/user management/i)).toBeInTheDocument();
    expect(screen.getAllByText(/coming soon\.\.\./i)).toHaveLength(2);
    
    // Analytics card (coming soon)
    expect(screen.getByText(/📊/)).toBeInTheDocument();
    expect(screen.getByText(/analytics/i)).toBeInTheDocument();
  });

  it('displays current route information', () => {
    render(<AdminDashboard />);
    
    expect(screen.getByText(/current route:/i)).toBeInTheDocument();
    expect(screen.getByText('/admin/dashboard')).toBeInTheDocument();
  });

  it('navigates to restaurant management when clicked', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard />);
    
    // Find the restaurant management card
    const restaurantCard = screen.getByText(/restaurant management/i).closest('div');
    expect(restaurantCard).toBeInTheDocument();
    
    await user.click(restaurantCard!);
    
    expect(window.location.href).toBe('/admin/restaurants');
  });

  it('restaurant management card has proper interactive styling', () => {
    render(<AdminDashboard />);
    
    const restaurantCard = screen.getByText(/restaurant management/i).closest('div');
    
    // Check initial styles
    expect(restaurantCard).toHaveStyle({
      cursor: 'pointer',
      transition: 'transform 0.2s, box-shadow 0.2s'
    });
  });

  it('user management card is disabled (coming soon)', () => {
    render(<AdminDashboard />);
    
    const userManagementCard = screen.getByText(/user management/i).closest('div');
    
    // Check that it has reduced opacity (disabled style)
    expect(userManagementCard).toHaveStyle({
      opacity: '0.6'
    });
    
    // Check that it doesn't have cursor pointer
    expect(userManagementCard).not.toHaveStyle({
      cursor: 'pointer'
    });
  });

  it('analytics card is disabled (coming soon)', () => {
    render(<AdminDashboard />);
    
    const analyticsCard = screen.getByText(/analytics/i).closest('div');
    
    // Check that it has reduced opacity (disabled style)
    expect(analyticsCard).toHaveStyle({
      opacity: '0.6'
    });
    
    // Check that it doesn't have cursor pointer
    expect(analyticsCard).not.toHaveStyle({
      cursor: 'pointer'
    });
  });

  it('has proper layout structure and styling', () => {
    render(<AdminDashboard />);
    
    // Find the main container
    const mainContainer = screen.getByText(/🛠️ admin dashboard/i).closest('div');
    
    expect(mainContainer).toHaveStyle({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      textAlign: 'center'
    });
  });

  it('has responsive grid layout for cards', () => {
    render(<AdminDashboard />);
    
    // Find the grid container (parent of the cards)
    const restaurantCard = screen.getByText(/restaurant management/i).closest('div');
    const gridContainer = restaurantCard?.parentElement;
    
    expect(gridContainer).toHaveStyle({
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '20px',
      maxWidth: '800px',
      marginBottom: '40px'
    });
  });

  it('handles mouse hover events on restaurant management card', () => {
    render(<AdminDashboard />);
    
    const restaurantCard = screen.getByText(/restaurant management/i).closest('div') as HTMLElement;
    
    // Simulate mouse enter
    fireEvent.mouseEnter(restaurantCard);
    
    expect(restaurantCard).toHaveStyle({
      transform: 'translateY(-4px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    });
    
    // Simulate mouse leave
    fireEvent.mouseLeave(restaurantCard);
    
    expect(restaurantCard).toHaveStyle({
      transform: 'translateY(0)',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    });
  });

  it('displays card icons correctly', () => {
    render(<AdminDashboard />);
    
    // Check that emoji icons are present
    expect(screen.getByText('🏪')).toBeInTheDocument();
    expect(screen.getByText('👥')).toBeInTheDocument();
    expect(screen.getByText('📊')).toBeInTheDocument();
    
    // Check icon styling
    const restaurantIcon = screen.getByText('🏪');
    expect(restaurantIcon).toHaveStyle({
      fontSize: '2.5rem',
      marginBottom: '12px'
    });
  });

  it('has proper color scheme for headings', () => {
    render(<AdminDashboard />);
    
    // Main heading
    const mainHeading = screen.getByText(/🛠️ admin dashboard/i);
    expect(mainHeading).toHaveStyle({
      fontSize: '3rem',
      color: '#2563eb',
      marginBottom: '20px'
    });
    
    // Welcome message
    const welcomeMessage = screen.getByText(/welcome to the peercafe administration panel/i);
    expect(welcomeMessage).toHaveStyle({
      fontSize: '1.5rem',
      color: '#64748b',
      marginBottom: '30px'
    });
  });

  it('has proper styling for card titles', () => {
    render(<AdminDashboard />);
    
    // Restaurant Management title (active card)
    const restaurantTitle = screen.getByText(/restaurant management/i);
    expect(restaurantTitle).toHaveStyle({
      margin: '0 0 8px 0',
      color: '#1976d2'
    });
    
    // User Management title (disabled card)
    const userTitle = screen.getByText(/user management/i);
    expect(userTitle).toHaveStyle({
      margin: '0 0 8px 0',
      color: '#757575'
    });
    
    // Analytics title (disabled card)
    const analyticsTitle = screen.getByText(/analytics/i);
    expect(analyticsTitle).toHaveStyle({
      margin: '0 0 8px 0',
      color: '#757575'
    });
  });

  it('has proper styling for card descriptions', () => {
    render(<AdminDashboard />);
    
    const descriptions = screen.getAllByText(/^(add, edit, and manage restaurants|coming soon\.\.\.)$/i);
    
    descriptions.forEach(desc => {
      expect(desc).toHaveStyle({
        margin: '0',
        color: '#64748b',
        fontSize: '0.9rem'
      });
    });
  });

  it('has proper styling for current route display', () => {
    render(<AdminDashboard />);
    
    const routeContainer = screen.getByText(/current route:/i).closest('div');
    
    expect(routeContainer).toHaveStyle({
      marginTop: '30px',
      padding: '15px',
      backgroundColor: '#f1f5f9',
      borderRadius: '8px',
      border: '2px solid #e2e8f0'
    });
  });

  it('has accessible card structure', () => {
    render(<AdminDashboard />);
    
    // All cards should be properly contained
    const restaurantCard = screen.getByText(/restaurant management/i).closest('div');
    const userCard = screen.getByText(/user management/i).closest('div');
    const analyticsCard = screen.getByText(/analytics/i).closest('div');
    
    expect(restaurantCard).toBeInTheDocument();
    expect(userCard).toBeInTheDocument();
    expect(analyticsCard).toBeInTheDocument();
    
    // Check that clickable card has proper styling
    expect(restaurantCard).toHaveStyle({ cursor: 'pointer' });
    
    // Check that disabled cards don't have cursor pointer
    expect(userCard).not.toHaveStyle({ cursor: 'pointer' });
    expect(analyticsCard).not.toHaveStyle({ cursor: 'pointer' });
  });

  it('maintains consistent card sizing', () => {
    render(<AdminDashboard />);
    
    const restaurantCard = screen.getByText(/restaurant management/i).closest('div');
    const userCard = screen.getByText(/user management/i).closest('div');
    const analyticsCard = screen.getByText(/analytics/i).closest('div');
    
    // All cards should have consistent padding and styling
    [restaurantCard, userCard, analyticsCard].forEach(card => {
      expect(card).toHaveStyle({
        padding: '24px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '2px solid #e2e8f0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        textAlign: 'center'
      });
    });
  });
});