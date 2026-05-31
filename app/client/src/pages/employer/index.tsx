import { Outlet } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Users } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';

const NAV = [
  { label: 'Dashboard', to: '/employer',          icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'My Jobs',   to: '/employer/jobs',     icon: <Briefcase className="h-4 w-4" /> },
  { label: 'Post Job',  to: '/employer/post-job', icon: <Briefcase className="h-4 w-4" /> },
  { label: 'Pipeline',  to: '/employer/pipeline', icon: <Users className="h-4 w-4" /> },
];

export function EmployerLayout() {
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
