import React from 'react';

export const metadata = {
  title: 'Admin | The Set',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>
      {children}
    </div>
  );
} 