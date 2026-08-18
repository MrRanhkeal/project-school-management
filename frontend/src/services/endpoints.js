
// helpers
const byId = (base) => (id) => `${base}/${id}`;

export const ENDPOINTS = {
  // Auth
  auth: {
    register: '/api/auth/register',
    login: '/api/auth/login',
    refresh: '/api/auth/refresh',
    logout: '/api/auth/logout',
    me: '/api/auth/me',

    // User CRUD
    list: 'api/auth/list',
    create: '/api/auth/create',
    update: byId('/api/auth/update'),
    delete: byId('/api/auth/delete'),
  },

  // Students
  students: {
    list: '/api/students',
    create: '/api/students',
    detail: byId('/api/students'),
    update: byId('/api/students'),
    delete: byId('/api/students'),
  },

  // Teachers
  teachers: {
    list: '/api/teachers',
    create: '/api/teachers',
    detail: byId('/api/teachers'),
    update: byId('/api/teachers'),
    delete: byId('/api/teachers'),
  },

  // Classes
  classes: {
    list: '/api/classes',
    create: '/api/classes',
    detail: byId('/api/classes'),
    update: byId('/api/classes'),
    delete: byId('/api/classes'),
  },

  // Courses
  courses: {
    list: '/api/courses',
    create: '/api/courses',
    detail: byId('/api/courses'),
    update: byId('/api/courses'),
    delete: byId('/api/courses'),
  },

  // Grades
  grades: {
    list: '/api/grades',
    create: '/api/grades',
    detail: byId('/api/grades'),
    update: byId('/api/grades'),
    delete: byId('/api/grades'),

    // custom
    report: (studentId) => `/api/grades/student/${studentId}/report`,
  },

  // Attendance
  attendance: {
    list: '/api/attendance',
    create: '/api/attendance',
    detail: byId('/api/attendance'),
    update: byId('/api/attendance'),
    delete: byId('/api/attendance'),

    // custom
    mark: '/api/attendance/mark',
    summary: (studentId) => `/api/attendance/student/${studentId}/summary`,
  },

  // Notifications
  notifications: {
    send: '/api/notifications/send',
    recent: '/api/notifications/recent',
  },

  // Payments (Bakong KHQR)
  payments: {
    list: '/api/payments',
    create: '/api/payments',
    detail: byId('/api/payments'),
    check: (md5) => `/api/payments/check/${md5}`,
    forceComplete: (md5) => `/api/payments/force-complete/${md5}`,
  },
};

export default ENDPOINTS;