import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout }         from '@/components/layout/Layout';
import { ProtectedRoute } from '@/guards/ProtectedRoute';
import { PageSpinner }    from '@/components/ui/Spinner';

// Route-level code splitting — each group loads as a separate chunk
const Home             = lazy(() => import('@/pages/public/Home').then(m => ({ default: m.Home })));
const JobDetail        = lazy(() => import('@/pages/public/JobDetail').then(m => ({ default: m.JobDetail })));
const Login            = lazy(() => import('@/pages/public/Login').then(m => ({ default: m.Login })));
const Register         = lazy(() => import('@/pages/public/Register').then(m => ({ default: m.Register })));

const CandidateLayout    = lazy(() => import('@/pages/candidate').then(m => ({ default: m.CandidateLayout })));
const CandidateDashboard = lazy(() => import('@/pages/candidate/Dashboard').then(m => ({ default: m.CandidateDashboard })));
const MyApplications     = lazy(() => import('@/pages/candidate/MyApplications').then(m => ({ default: m.MyApplications })));
const SavedJobs          = lazy(() => import('@/pages/candidate/SavedJobs').then(m => ({ default: m.SavedJobs })));

const EmployerLayout    = lazy(() => import('@/pages/employer').then(m => ({ default: m.EmployerLayout })));
const EmployerDashboard = lazy(() => import('@/pages/employer/Dashboard').then(m => ({ default: m.EmployerDashboard })));
const PostJob           = lazy(() => import('@/pages/employer/PostJob').then(m => ({ default: m.PostJob })));
const ManageJobs        = lazy(() => import('@/pages/employer/ManageJobs').then(m => ({ default: m.ManageJobs })));
const EmployerPipeline  = lazy(() => import('@/pages/employer/EmployerPipeline').then(m => ({ default: m.EmployerPipeline })));
const Pipeline          = lazy(() => import('@/pages/employer/Pipeline').then(m => ({ default: m.Pipeline })));

export default function App() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        {/* Public */}
        <Route element={<Layout />}>
          <Route path="/"         element={<Home />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Candidate dashboard */}
        <Route element={<ProtectedRoute roles={['CANDIDATE']} />}>
          <Route element={<CandidateLayout />}>
            <Route path="/candidate"              element={<CandidateDashboard />} />
            <Route path="/candidate/applications" element={<MyApplications />} />
            <Route path="/candidate/saved"        element={<SavedJobs />} />
          </Route>
        </Route>

        {/* Employer dashboard */}
        <Route element={<ProtectedRoute roles={['EMPLOYER', 'ADMIN']} />}>
          <Route element={<EmployerLayout />}>
            <Route path="/employer"                      element={<EmployerDashboard />} />
            <Route path="/employer/jobs"                 element={<ManageJobs />} />
            <Route path="/employer/post-job"             element={<PostJob />} />
            <Route path="/employer/pipeline"             element={<EmployerPipeline />} />
            <Route path="/employer/jobs/:jobId/pipeline" element={<Pipeline />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
