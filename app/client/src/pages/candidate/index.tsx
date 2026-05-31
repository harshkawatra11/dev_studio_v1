import { Outlet } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Bookmark, User } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';

const NAV = [
  { label: 'Dashboard',    to: '/candidate',              icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Applications', to: '/candidate/applications', icon: <Briefcase className="h-4 w-4" /> },
  { label: 'Saved Jobs',   to: '/candidate/saved',        icon: <Bookmark className="h-4 w-4" /> },
];

export function CandidateLayout() {
  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 gap-6">
        <aside className="w-52 shrink-0"><DashboardSidebar items={NAV} /></aside>
        <main className="flex-1 min-w-0"><Outlet /></main>
      </div>
    </div>
  );
}
