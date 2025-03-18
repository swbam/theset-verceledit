import React from 'react';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import UserProfile from '@/components/auth/UserProfile';

const DesktopNav = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex items-center gap-6">
      <nav className="flex items-center gap-6">
        <Link
          to="/"
          className={`text-sm font-medium ${isActive('/') ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
        >
          Home
        </Link>
        <Link
          to="/artists"
          className={`text-sm font-medium ${isActive('/artists') ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
        >
          Artists
        </Link>
        <Link
          to="/shows"
          className={`text-sm font-medium ${isActive('/shows') ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
        >
          Upcoming Shows
        </Link>
        <Link
          to="/how-it-works"
          className={`text-sm font-medium ${isActive('/how-it-works') ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
        >
          How It Works
        </Link>
      </nav>

      <UserProfile />
    </div>
  );
};

export default DesktopNav;
