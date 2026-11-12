import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex bg-togetherly-bg text-togetherly-text">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto pb-24 md:pb-12">
          <Outlet />
        </main>
        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </div>
    </div>
  );
};

