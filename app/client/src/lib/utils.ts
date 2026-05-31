import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ApplicationStatus, JobType } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSalary(min?: number | null, max?: number | null, currency = 'USD'): string {
  if (!min && !max) return 'Salary not disclosed';
  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export const STATUS_STYLES: Record<ApplicationStatus, { bg: string; text: string; dot: string; label: string }> = {
  APPLIED:   { bg: 'bg-indigo-500/20', text: 'text-indigo-300',  dot: 'bg-indigo-400',  label: 'Applied' },
  SCREENING: { bg: 'bg-amber-500/20',  text: 'text-amber-300',   dot: 'bg-amber-400',   label: 'Screening' },
  INTERVIEW: { bg: 'bg-blue-500/20',   text: 'text-blue-300',    dot: 'bg-blue-400',    label: 'Interview' },
  OFFER:     { bg: 'bg-purple-500/20', text: 'text-purple-300',  dot: 'bg-purple-400',  label: 'Offer' },
  HIRED:     { bg: 'bg-emerald-500/20',text: 'text-emerald-300', dot: 'bg-emerald-400', label: 'Hired' },
  REJECTED:  { bg: 'bg-red-500/20',    text: 'text-red-300',     dot: 'bg-red-400',     label: 'Rejected' },
};

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  FULL_TIME:  'Full-time',
  PART_TIME:  'Part-time',
  CONTRACT:   'Contract',
  INTERNSHIP: 'Internship',
  REMOTE:     'Remote',
};

export const JOB_TYPE_COLORS: Record<JobType, string> = {
  FULL_TIME:  'bg-indigo-500/15 text-indigo-300',
  PART_TIME:  'bg-amber-500/15  text-amber-300',
  CONTRACT:   'bg-orange-500/15 text-orange-300',
  INTERNSHIP: 'bg-pink-500/15   text-pink-300',
  REMOTE:     'bg-emerald-500/15 text-emerald-300',
};

export function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}
