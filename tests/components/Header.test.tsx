import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import '@testing-library/jest-dom';
import HeaderRefactored from '../../components/HeaderRefactored';

// Mock Next.js hooks
jest.mock('next-auth/react');
jest.mock('next/navigation');

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

describe('Header Component', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/');
    mockUseSession.mockReturnValue({
      data: {
        user: {
          email: 'test@example.com',
          name: 'Test User',
          role: 'LEADER',
        },
      },
      status: 'authenticated',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders navigation sections correctly', () => {
    render(<HeaderRefactored />);
    
    expect(screen.getByText('Identify')).toBeInTheDocument();
    expect(screen.getByText('Plan')).toBeInTheDocument();
    expect(screen.getByText('Execute')).toBeInTheDocument();
    expect(screen.getByText('Insights')).toBeInTheDocument();
  });

  it('shows active state for current path', () => {
    mockUsePathname.mockReturnValue('/issues');
    render(<HeaderRefactored />);
    
    const identifyLink = screen.getByText('Identify').closest('a');
    expect(identifyLink).toHaveClass('bg-blue-50');
  });

  it('renders user menu when authenticated', () => {
    render(<HeaderRefactored />);
    
    const userButton = screen.getByRole('button', { name: /open user menu/i });
    expect(userButton).toBeInTheDocument();
  });

  it('opens and closes user menu on click', async () => {
    render(<HeaderRefactored />);
    
    const userButton = screen.getByRole('button', { name: /open user menu/i });
    fireEvent.click(userButton);
    
    await waitFor(() => {
      expect(screen.getByText('Your Profile')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Sign out')).toBeInTheDocument();
    });
    
    // Click outside to close
    fireEvent.mouseDown(document.body);
    
    await waitFor(() => {
      expect(screen.queryByText('Your Profile')).not.toBeInTheDocument();
    });
  });

  it('opens mobile menu on mobile button click', async () => {
    render(<HeaderRefactored />);
    
    const mobileButton = screen.getByRole('button', { name: /open mobile menu/i });
    fireEvent.click(mobileButton);
    
    await waitFor(() => {
      // Mobile menu should be visible
      expect(screen.getByLabelText(/close menu/i)).toBeInTheDocument();
    });
  });

  it('displays user initials in avatar', () => {
    render(<HeaderRefactored />);
    
    const avatar = screen.getByText('T'); // First letter of "Test User"
    expect(avatar).toBeInTheDocument();
  });

  it('handles unauthenticated state', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });
    
    render(<HeaderRefactored />);
    
    expect(screen.queryByRole('button', { name: /open user menu/i })).not.toBeInTheDocument();
  });

  it('shows correct navigation descriptions', () => {
    render(<HeaderRefactored />);
    
    expect(screen.getByText('Discover problems')).toBeInTheDocument();
    expect(screen.getByText('Create solutions')).toBeInTheDocument();
    expect(screen.getByText('Track progress')).toBeInTheDocument();
    expect(screen.getByText('AI Intelligence')).toBeInTheDocument();
  });
});
