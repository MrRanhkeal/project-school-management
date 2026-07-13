import React from 'react';
import { Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import CrudManager from '../../components/common/CrudManager';
import useOptions from '../../hooks/useOptions';
import { ENDPOINTS } from '../../services/endpoints';
import { LEVELS, COURSE_STATUSES, ROLES } from '../../utils/constants';
import { capitalize, fullName } from '../../utils/helpers';
import { isNumber } from '../../utils/validators';

const STATUS_COLORS = { open: 'success', closed: 'warning', archived: 'default' };

export default function Course() {
  const { t } = useTranslation();
  const teacherOptions = useOptions(
    ENDPOINTS.teachers.list,
    (tch) => `${fullName(tch)} (${tch.teacherCode})`
  );
  const classOptions = useOptions(
    ENDPOINTS.classes.list,
    (c) => `${c.name} (${c.academicYear})`
  );

  return (
    <CrudManager
      title={t('nav.courses')}
      endpoint={ENDPOINTS.courses}
      writeRoles={[ROLES.ADMIN, ROLES.STAFF]}
      deleteRoles={[ROLES.ADMIN]}
      columns={[
        { id: 'code', label: 'Code' },
        { id: 'title', label: 'Title', minWidth: 180 },
        { id: 'level', label: 'Level', render: (r) => capitalize(r.level) },
        {
          id: 'teacher',
          label: 'Teacher',
          minWidth: 140,
          render: (r) => (r.teacher ? fullName(r.teacher) : '—'),
        },
        { id: 'class', label: 'Class', render: (r) => r.class?.name || '—' },
        { id: 'department', label: 'Department' },
        { id: 'credits', label: 'Credits', align: 'right' },
        { id: 'academicYear', label: 'Academic year' },
        {
          id: 'status',
          label: 'Status',
          render: (r) => (
            <Chip
              size="small"
              label={capitalize(r.status || 'open')}
              color={STATUS_COLORS[r.status] || 'default'}
            />
          ),
        },
      ]}
      filters={[
        { name: 'level', label: 'Level', options: LEVELS },
        { name: 'teacherId', label: 'Teacher', options: teacherOptions },
        { name: 'classId', label: 'Class', options: classOptions },
        { name: 'status', label: 'Status', options: COURSE_STATUSES },
      ]}
      formFields={[
        { name: 'code', label: 'Course code', required: true, half: true },
        { name: 'title', label: 'Title', required: true, half: true },
        { name: 'level', label: 'Level', type: 'select', options: LEVELS, required: true, half: true },
        { name: 'credits', label: 'Credits', type: 'number', half: true, validate: isNumber() },
        { name: 'department', label: 'Department', half: true },
        {
          name: 'academicYear',
          label: 'Academic year',
          half: true,
          helperText: 'e.g. 2025-2026',
          validate: (v) => (v && !/^\d{4}-\d{4}$/.test(v) ? 'Use the YYYY-YYYY format' : ''),
        },
        { name: 'teacherId', label: 'Teacher', type: 'select', options: teacherOptions, half: true },
        { name: 'classId', label: 'Class', type: 'select', options: classOptions, half: true },
        { name: 'status', label: 'Status', type: 'select', options: COURSE_STATUSES, half: true },
        { name: 'description', label: 'Description' },
      ]}
    />
  );
}
