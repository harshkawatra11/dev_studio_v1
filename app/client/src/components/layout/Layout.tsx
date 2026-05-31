import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export function Layout() {
  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export function DashboardLayout({ sidebar }: { sidebar?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 gap-6">
        {sidebar && <aside className="w-56 shrink-0">{sidebar}</aside>}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
