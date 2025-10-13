import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '../app/page';

// Mock the Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // Remove Next.js specific props that don't belong on img elements
    const { priority, ...imgProps } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...imgProps} alt={props.alt} />;
  },
}));

describe('Home Page', () => {
  it('renders without crashing', () => {
    render(<Home />);
    expect(document.body).toBeTruthy();
  });

  it('should display the main content elements', () => {
    render(<Home />);
    
    // Check for the Next.js logo
    expect(screen.getByAltText('Next.js logo')).toBeInTheDocument();
    
    // Check for the main instructional text
    expect(screen.getByText(/Get started by editing/)).toBeInTheDocument();
    expect(screen.getByText('app/page.tsx')).toBeInTheDocument();
    
    // Check for the "Save and see your changes instantly" text
    expect(screen.getByText('Save and see your changes instantly.')).toBeInTheDocument();
  });

  it('should have the expected navigation links', () => {
    render(<Home />);
    
    // Check for the "Deploy now" link
    expect(screen.getByRole('link', { name: /Deploy now/ })).toBeInTheDocument();
    
    // Check for the "Read our docs" link
    expect(screen.getByRole('link', { name: /Read our docs/ })).toBeInTheDocument();
    
    // Check for footer links
    expect(screen.getByRole('link', { name: /Learn/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Examples/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Go to nextjs.org/ })).toBeInTheDocument();
  });
});