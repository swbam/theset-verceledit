'use client'

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import UserProfile from '@/components/auth/UserProfile';

const DesktopNav = () => {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  return (
    <div className="flex items-center gap-6">
      <nav className="flex items-center gap-6">
        <Link
          href="/"
          className={`text-sm font-medium ${isActive('/') ? 'text-primary' : 'text-foreground/80 hover:text-foreground'}`}
        >
          Home
        </Link>
        <Link
          href="/artists"
          className={`text-sm font-medium ${isActive('/artists') ? 'text-primary' : 'text-foreground/80 hover:text-foreground'}`}
        >
          Artists
        </Link>
        <Link
          href="/shows"
          className={`text-sm font-medium ${isActive('/shows') ? 'text-primary' : 'text-foreground/80 hover:text-foreground'}`}
        >
          Upcoming Shows
        </Link>
        <Link
          href="/how-it-works"
          className={`text-sm font-medium ${isActive('/how-it-works') ? 'text-primary' : 'text-foreground/80 hover:text-foreground'}`}
        >
          How It Works
        </Link>
      </nav>

      <UserProfile />
    </div>
  );
};

export default DesktopNav;
