export type Role              = 'CANDIDATE' | 'EMPLOYER' | 'ADMIN';
export type JobType           = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'REMOTE';
export type ApplicationStatus = 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED';

export interface User {
  id:        string;
  email:     string;
  name:      string;
  role:      Role;
  avatarUrl: string | null;
  bio:       string | null;
  resumeUrl: string | null;
  isActive:  boolean;
  createdAt: string;
}

export interface Company {
  id:          string;
  name:        string;
  logoUrl:     string | null;
  website:     string | null;
  description: string | null;
  location:    string | null;
  industry:    string | null;
  size:        string | null;
  ownerId:     string;
  createdAt:   string;
  jobs?:       Job[];
  _count?:     { jobs: number };
}

export interface JobTag { id: string; name: string; }

export interface Job {
  id:            string;
  title:         string;
  description:   string;
  location:      string;
  type:          JobType;
  salaryMin:     number | null;
  salaryMax:     number | null;
  currency:      string;
  experienceMin: number | null;
  isActive:      boolean;
  closesAt:      string | null;
  companyId:     string;
  company:       Pick<Company, 'id' | 'name' | 'logoUrl' | 'location' | 'industry'>;
  tags:          JobTag[];
  _count:        { applications: number };
  createdAt:     string;
  updatedAt:     string;
}

export interface Interview {
  id:            string;
  applicationId: string;
  scheduledAt:   string;
  meetLink:      string | null;
  notes:         string | null;
  createdAt:     string;
}

export interface Application {
  id:          string;
  status:      ApplicationStatus;
  coverLetter: string | null;
  resumeUrl:   string;
  note:        string | null;
  candidateId: string;
  jobId:       string;
  candidate:   Pick<User, 'id' | 'name' | 'email' | 'avatarUrl' | 'resumeUrl' | 'bio'>;
  job:         Job;
  interview:   Interview | null;
  createdAt:   string;
  updatedAt:   string;
}

export interface AuthResponse {
  user:         Omit<User, 'passwordHash'>;
  accessToken:  string;
  refreshToken: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data:    T;
  meta?:   PaginationMeta;
  error?:  string;
}

export interface PaginationMeta {
  page:       number;
  limit:      number;
  total:      number;
  totalPages: number;
  hasNext:    boolean;
  hasPrev:    boolean;
}

export interface JobFilters {
  keyword?:   string;
  type?:      JobType | '';
  location?:  string;
  tags?:      string[];
  salaryMin?: number;
  salaryMax?: number;
  page?:      number;
  limit?:     number;
}
