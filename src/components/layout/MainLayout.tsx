import React, { ReactNode } from 'react';
import Footer from './Footer';
import Navbar from './Navbar';

interface MainLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
  hideFooter?: boolean;
  className?: string;
}

/**
 * Main layout component that wraps page content with standard header and footer
 */
const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  hideNav = false,
  hideFooter = false,
  className = '',
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {!hideNav && <Navbar />}
      
      <main className={`flex-grow ${className}`}>
        {children}
      </main>
      
      {!hideFooter && <Footer />}
    </div>
  );
};

export default MainLayout; 