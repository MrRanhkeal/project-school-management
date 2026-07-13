import React from 'react';
import { Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import CrudManager from '../../components/common/CrudManager';
import useOptions from '../../hooks/useOptions';
import { ENDPOINTS } from '../../services/endpoints';
import { LEVELS, CLASS_STATUSES, ROLES } from '../../utils/constants';
import { capitalize, fullName } from '../../utils/helpers';
import { isNumber } from '../../utils/validators';

export default function Classroom() {
  const { t } = useTranslation();
  const teacherOptions = useOptions(
    ENDPOINTS.teachers.list,
    (tch) => `${fullName(tch)} (${tch.teacherCode})`
  );

  return (
    <CrudManager
      title={t('nav.classes')}
      endpoint={ENDPOINTS.classes}
      searchable={false}
      writeRoles={[ROLES.ADMIN, ROLES.STAFF]}
      deleteRoles={[ROLES.ADMIN]}
      columns={[
        { id: 'name', label: 'Name', minWidth: 120 },
        { id: 'level', label: 'Level', render: (r) => capitalize(r.level) },
        { id: 'gradeYear', label: 'Grade' },
        { id: 'academicYear', label: 'Academic year' },
        {
          id: 'homeroomTeacher',
          label: 'Homeroom teacher',
          minWidth: 140,
          render: (r) => (r.homeroomTeacher ? fullName(r.homeroomTeacher) : '—'),
        },
        { id: 'roomNumber', label: 'Room' },
        { id: 'capacity', label: 'Capacity', align: 'right' },
        {
          id: 'status',
          label: 'Status',
          render: (r) => (
            <Chip
              size="small"
              label={capitalize(r.status || 'active')}
              color={r.status === 'archived' ? 'default' : 'success'}
            />
          ),
        },
      ]}
      filters={[
        { name: 'level', label: 'Level', options: LEVELS },
        { name: 'status', label: 'Status', options: CLASS_STATUSES },
      ]}
      formFields={[
        { name: 'name', label: 'Class name', required: true, half: true },
        {
          name: 'academicYear',
          label: 'Academic year',
          required: true,
          half: true,
          helperText: 'e.g. 2025-2026',
          validate: (v) => (v && !/^\d{4}-\d{4}$/.test(v) ? 'Use the YYYY-YYYY format' : ''),
        },
        { name: 'level', label: 'Level', type: 'select', options: LEVELS, required: true, half: true },
        { name: 'gradeYear', label: 'Grade year', type: 'number', half: true, validate: isNumber() },
        { name: 'homeroomTeacherId', label: 'Homeroom teacher', type: 'select', options: teacherOptions, half: true },
        { name: 'capacity', label: 'Capacity', type: 'number', half: true, validate: isNumber() },
        { name: 'roomNumber', label: 'Room number', half: true },
        { name: 'status', label: 'Status', type: 'select', options: CLASS_STATUSES, half: true },
      ]}
    />
  );
}
