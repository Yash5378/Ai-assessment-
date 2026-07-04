const EMPLOYMENT_TYPE_LABELS = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERNSHIP: 'Internship',
};

export const formatEmploymentType = (type) => EMPLOYMENT_TYPE_LABELS[type] ?? type;

export const formatDate = (isoString) =>
  new Date(isoString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

/**
 * Salary is stored as ₹ lakhs per annum (LPA) integers.
 */
export function formatSalary(min, max) {
  if (min == null && max == null) return 'Salary not disclosed';
  if (min != null && max != null) return `₹${min}–${max} LPA`;
  if (min != null) return `₹${min}+ LPA`;
  return `Up to ₹${max} LPA`;
}

export function formatExperience(min, max) {
  if ((min ?? 0) === 0 && max == null) return 'Any experience';
  if (max != null) return `${min ?? 0}–${max} yrs exp`;
  return `${min}+ yrs exp`;
}

const NOTICE_PERIOD_LABELS = {
  IMMEDIATE: 'Immediate',
  '15_DAYS': '15 days',
  '30_DAYS': '30 days',
  '60_DAYS': '60 days',
  '90_DAYS': '90 days',
};

export const formatNoticePeriod = (value) => NOTICE_PERIOD_LABELS[value] ?? value;

export const formatEmploymentStatus = (value) =>
  value === 'EXPERIENCED' ? 'Experienced' : 'Fresher';

export const NOTICE_PERIOD_OPTIONS = Object.entries(NOTICE_PERIOD_LABELS).map(([value, label]) => ({
  value,
  label,
}));
