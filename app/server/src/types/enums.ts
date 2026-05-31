export type Role              = 'CANDIDATE' | 'EMPLOYER' | 'ADMIN';
export type JobType           = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'REMOTE';
export type ApplicationStatus = 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED';

export const ROLES: Role[]               = ['CANDIDATE', 'EMPLOYER', 'ADMIN'];
export const JOB_TYPES: JobType[]        = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE'];
export const APP_STATUSES: ApplicationStatus[] = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'];
