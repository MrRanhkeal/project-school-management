export const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  TEACHER: 'teacher',
  STUDENT: 'student',
};

export const ALL_ROLES = Object.values(ROLES);

// Mirrors the zod enums used by the backend validators.
export const LEVELS = ['primary', 'secondary', 'high_school', 'college'];
export const GENDERS = ['male', 'female', 'other'];
export const STUDENT_STATUSES = ['enrolled', 'graduated', 'withdrawn', 'suspended'];
export const TEACHER_STATUSES = ['active', 'on_leave', 'retired'];
export const CLASS_STATUSES = ['active', 'archived'];
export const COURSE_STATUSES = ['open', 'closed', 'archived'];
export const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused'];
export const ENROLLMENT_STATUSES = ['pending', 'active', 'completed', 'dropped'];
export const ENROLLMENT_TERMS = [
  'term1',
  'term2',
  'term3',
  'semester1',
  'semester2',
  'full_year',
];

// Same values, with readable labels for selects and table cells.
export const ENROLLMENT_TERM_OPTIONS = [
  { value: 'term1', label: 'Term 1' },
  { value: 'term2', label: 'Term 2' },
  { value: 'term3', label: 'Term 3' },
  { value: 'semester1', label: 'Semester 1' },
  { value: 'semester2', label: 'Semester 2' },
  { value: 'full_year', label: 'Full year' },
];

export const termLabel = (value) =>
  ENROLLMENT_TERM_OPTIONS.find((o) => o.value === value)?.label || value || '—';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'sf_access_token',
  REFRESH_TOKEN: 'sf_refresh_token',
  USER: 'sf_user',
  LANG: 'sf_lang',
  THEME: 'sf_theme',
};

export const DRAWER_WIDTH = 240;

export const DEFAULT_PAGE_SIZE = 10;

// Used by the dashboard weather + map widgets.
// export const SCHOOL_LOCATION = {
//   name: 'Phnom Penh',
//   lat: 11.5564,
//   lon: 104.9282,
// };

export const SCHOOL_LOCATION = {
  name: 'Phnom Penh',
  lat: 11.5564,
  lng: 104.9282,
};

export const GEOFENCE_RADIUS = 200; // meters
