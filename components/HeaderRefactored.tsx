'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Bars3Icon } from '@heroicons/react/24/outline';
import NavigationMenu from './header/NavigationMenu';
import UserMenu from './header/UserMenu';
import MobileMenu from './header/MobileMenu';

interface HeaderProps {}

const Header: React.FC<HeaderProps> = React.memo(() => {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navSections = useMemo(
    () => [
      {
        title: 'Identify',
        href: '/issues',
        description: 'Discover problems',
        active: pathname === '/issues',
      },
      {
        title: 'Plan',
        href: '/initiatives',
        description: 'Create solutions',
        active:
          pathname?.startsWith('/initiatives') ||
          pathname === '/prioritize' ||
          pathname === '/ideas',
      },
      {
        title: 'Execute',
        href: '/track',
        description: 'Track progress',
        active: pathname === '/track' || pathname === '/roadmap',
      },
      {
        title: 'Insights',
        href: '/insights',
        description: 'AI Intelligence',
        active: pathname === '/insights' || pathname === '/executive',
      },
    ],
    [pathname]
  );

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuOpen(false);
  };

  const handleUserMenuToggle = () => {
    setUserMenuOpen(!userMenuOpen);
  };

  const handleUserMenuClose = () => {
    setUserMenuOpen(false);
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <img src="/logo-flowvision.svg" alt="FlowVision" className="h-10 w-auto" />
            </Link>

            {/* Desktop Navigation */}
            <NavigationMenu navSections={navSections} />

            {/* Right Side - User Menu & Mobile Button */}
            <div className="flex items-center space-x-4">
              {session?.user && (
                <UserMenu
                  user={session.user}
                  isOpen={userMenuOpen}
                  onToggle={handleUserMenuToggle}
                  onClose={handleUserMenuClose}
                />
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={handleMobileMenuToggle}
                className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Open mobile menu"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={handleMobileMenuClose}
        navSections={navSections}
      />
    </>
  );
});

Header.displayName = 'Header';

export default Header;
