import React, { useMemo } from 'react';
import { Chip, Tooltip } from '@mui/material';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import LogoutIcon from '@mui/icons-material/ExitToApp';
import CrudManager from '../../components/common/CrudManager';
import useAuth from '../../hooks/useAuth';
import useOptions from '../../hooks/useOptions';
import api from '../../services/api';
import { showSnackbar } from '../../redux/actions';
import { getApiError } from '../../utils/helpers';
import { ENDPOINTS } from '../../services/endpoints';
import {
  ENROLLMENT_STATUSES,
  ENROLLMENT_TERM_OPTIONS,
  ROLES,
  termLabel,
} from '../../utils/constants';
import { capitalize, currentAcademicYear, fullName, formatDate } from '../../utils/helpers';
import { isAcademicYear, isDate, isNumber } from '../../utils/validators';

const STATUS_COLORS = {
  pending: 'warning',
  active: 'success',
  completed: 'info',
  dropped: 'default',
};

/**
 * Enrollments = the student <-> course join (academic-service /api/enrollments).
 * A row is one student taking one course for a given academic year + term.
 */
export default function Enrollment() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { user } = useAuth();

  // A student sees only their own rows: GET /api/enrollments/me scopes the
  // list by the studentId on their token, and the only write they get is
  // dropping one of their own courses.
  const isStudent = user?.role === ROLES.STUDENT;

  const endpoint = useMemo(
    () =>
      isStudent
        ? { ...ENDPOINTS.enrollments, list: ENDPOINTS.enrollments.mine }
        : ENDPOINTS.enrollments,
    [isStudent]
  );

  const studentOptions = useOptions(
    isStudent ? '' : ENDPOINTS.students.list,
    (s) => `${fullName(s)} (${s.studentCode})`
  );
  const courseOptions = useOptions(
    ENDPOINTS.courses.list,
    (c) => `${c.code} — ${c.title}`
  );
  const classOptions = useOptions(
    ENDPOINTS.classes.list,
    (c) => `${c.name} (${c.academicYear})`
  );

  const handleDrop = async (row, { refresh }) => {
    try {
      await api.delete(ENDPOINTS.enrollments.dropMine(row.id));
      dispatch(showSnackbar(t('enrollment.dropped', 'You dropped this course')));
      refresh();
    } catch (err) {
      dispatch(showSnackbar({ message: getApiError(err), severity: 'error' }));
    }
  };

  return (
    <CrudManager
      title={isStudent ? t('enrollment.myCourses', 'My courses') : t('nav.enrollments')}
      endpoint={endpoint}
      writeRoles={[ROLES.ADMIN, ROLES.STAFF]}
      deleteRoles={[ROLES.ADMIN]}
      rowActions={
        isStudent
          ? [
              {
                key: 'drop',
                icon: <LogoutIcon fontSize="small" />,
                title: t('enrollment.drop', 'Drop this course'),
                color: 'error',
                // Nothing to drop once the row is already dropped or finished.
                hidden: (r) => r.status === 'dropped' || r.status === 'completed',
                onClick: handleDrop,
              },
            ]
          : []
      }
      columns={[
        { id: 'index', label: '#', render: (_row, _index, rowNumber) => rowNumber },
        // The student column is redundant on the student's own list.
        ...(isStudent
          ? []
          : [
              {
                id: 'student',
                label: t('enrollment.student', 'Student'),
                minWidth: 170,
                // The backend joins student/course/class, so no client-side lookup.
                render: (r) =>
                  r.student ? `${fullName(r.student)} (${r.student.studentCode})` : '—',
              },
            ]),
        {
          id: 'course',
          label: t('enrollment.course', 'Course'),
          minWidth: 180,
          render: (r) => (r.course ? `${r.course.code} — ${r.course.title}` : '—'),
        },
        {
          id: 'class',
          label: t('enrollment.class', 'Class'),
          render: (r) => r.class?.name || '—',
        },
        { id: 'academicYear', label: t('enrollment.academicYear', 'Academic year') },
        {
          id: 'term',
          label: t('enrollment.term', 'Term'),
          render: (r) => termLabel(r.term),
        },
        {
          id: 'enrolledAt',
          label: t('enrollment.enrolledAt', 'Enrolled on'),
          render: (r) => formatDate(r.enrolledAt),
        },
        {
          id: 'finalGrade',
          label: t('enrollment.finalGrade', 'Final grade'),
          align: 'right',
          render: (r) => (r.finalGrade === null || r.finalGrade === undefined ? '—' : r.finalGrade),
        },
        {
          id: 'status',
          label: t('enrollment.status', 'Status'),
          render: (r) => (
            <Tooltip title={r.remarks || ''}>
              <Chip
                size="small"
                label={capitalize(r.status || 'active')}
                color={STATUS_COLORS[r.status] || 'default'}
              />
            </Tooltip>
          ),
        },
      ]}
      filters={[
        ...(isStudent
          ? []
          : [{ name: 'studentId', label: t('enrollment.student', 'Student'), options: studentOptions }]),
        { name: 'courseId', label: t('enrollment.course', 'Course'), options: courseOptions },
        { name: 'classId', label: t('enrollment.class', 'Class'), options: classOptions },
        { name: 'term', label: t('enrollment.term', 'Term'), options: ENROLLMENT_TERM_OPTIONS },
        { name: 'status', label: t('enrollment.status', 'Status'), options: ENROLLMENT_STATUSES },
      ]}
      formFields={[
        {
          name: 'studentId',
          label: t('enrollment.student', 'Student'),
          type: 'select',
          options: studentOptions,
          required: true,
          half: true,
          // studentId/courseId are the identity of the row; the API ignores
          // them on update, so only offer them when creating.
          createOnly: true,
        },
        {
          name: 'courseId',
          label: t('enrollment.course', 'Course'),
          type: 'select',
          options: courseOptions,
          required: true,
          half: true,
          createOnly: true,
        },
        {
          name: 'academicYear',
          label: t('enrollment.academicYear', 'Academic year'),
          required: true,
          half: true,
          default: currentAcademicYear(),
          helperText: 'e.g. 2025-2026',
          validate: isAcademicYear(),
        },
        {
          name: 'term',
          label: t('enrollment.term', 'Term'),
          type: 'select',
          options: ENROLLMENT_TERM_OPTIONS,
          half: true,
          default: 'full_year',
        },
        {
          name: 'classId',
          label: t('enrollment.class', 'Class'),
          type: 'select',
          options: classOptions,
          half: true,
          helperText: t('enrollment.classHelp', "Defaults to the course's class"),
        },
        {
          name: 'status',
          label: t('enrollment.status', 'Status'),
          type: 'select',
          options: ENROLLMENT_STATUSES,
          half: true,
          default: 'active',
        },
        {
          name: 'enrolledAt',
          label: t('enrollment.enrolledAt', 'Enrolled on'),
          type: 'date',
          half: true,
          validate: isDate(),
        },
        {
          name: 'finalGrade',
          label: t('enrollment.finalGrade', 'Final grade'),
          type: 'number',
          half: true,
          validate: isNumber(),
        },
        { name: 'remarks', label: t('enrollment.remarks', 'Remarks') },
      ]}
    />
  );
}
