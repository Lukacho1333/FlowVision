'use client';

import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import NavigationMenu from './NavigationMenu';

interface NavSection {
  title: string;
  href: string;
  description: string;
  active: boolean;
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navSections: NavSection[];
}

export default function MobileMenu({ isOpen, onClose, navSections }: MobileMenuProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 z-20 bg-black bg-opacity-25 md:hidden" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Mobile menu panel */}
      <div className="fixed inset-y-0 left-0 z-30 w-full max-w-sm bg-white shadow-xl md:hidden">
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
          <div className="flex items-center">
            <span className="text-xl font-bold text-gray-900">FlowVision</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close menu"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="mt-6">
          <NavigationMenu 
            navSections={navSections} 
            isMobile={true} 
            onClose={onClose} 
          />
        </div>
      </div>
    </>
  );
}
