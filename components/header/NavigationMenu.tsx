'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavSection {
  title: string;
  href: string;
  description: string;
  active: boolean;
}

interface NavigationMenuProps {
  navSections: NavSection[];
  isMobile?: boolean;
  onClose?: () => void;
}

export default function NavigationMenu({ navSections, isMobile = false, onClose }: NavigationMenuProps) {
  const pathname = usePathname();

  const handleNavClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  const baseClasses = isMobile 
    ? "block px-3 py-2 text-base font-medium rounded-md transition-colors"
    : "text-sm font-medium transition-colors px-3 py-2 rounded-md";

  return (
    <nav className={isMobile ? "space-y-1 px-2 pb-3 pt-2" : "hidden md:flex md:space-x-1"}>
      {navSections.map((section) => (
        <Link
          key={section.href}
          href={section.href}
          onClick={handleNavClick}
          className={`${baseClasses} ${
            section.active
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <span className="block">{section.title}</span>
          {!isMobile && (
            <span className="block text-xs text-gray-500 mt-1">{section.description}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
