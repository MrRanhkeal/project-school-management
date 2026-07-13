import React from 'react';
import { Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import CrudManager from '../../components/common/CrudManager';
import useOptions from '../../hooks/useOptions';
import { ENDPOINTS } from '../../services/endpoints';
import { LEVELS, GENDERS, STUDENT_STATUSES, ROLES } from '../../utils/constants';
import { fullName, capitalize, formatDate } from '../../utils/helpers';
import { isDate, isNumber } from '../../utils/validators';

const STATUS_COLORS = {
  enrolled: 'success',
  graduated: 'info',
  withdrawn: 'default',
  suspended: 'error',
};

export default function Student() {
  const { t } = useTranslation();
  const classOptions = useOptions(
    ENDPOINTS.classes.list,
    (c) => `${c.name} (${c.academicYear})`
  );

  return (
    <CrudManager 
      title={t('nav.students')}
      endpoint={ENDPOINTS.students}
      writeRoles={[ROLES.ADMIN, ROLES.STAFF]}
      deleteRoles={[ROLES.ADMIN]}
      columns={[
        { id: 'studentCode', label: 'Code' },
        { id: 'name', label: 'Name', render: (r) => fullName(r), minWidth: 160 },
        { id: 'level', label: 'Level', render: (r) => capitalize(r.level) },
        { id: 'class', label: 'Class', render: (r) => r.class?.name || '—' },
        { id: 'gradeYear', label: 'Grade' },
        { id: 'enrollmentYear', label: 'Enrolled' },
        { id: 'dateOfBirth', label: 'Date of birth', render: (r) => formatDate(r.dateOfBirth) },
        {
          id: 'status',
          label: 'Status',
          render: (r) => (
            <Chip
              size="small"
              label={capitalize(r.status || 'enrolled')}
              color={STATUS_COLORS[r.status] || 'default'}
            />
          ),
        },
      ]}
      filters={[
        { name: 'level', label: 'Level', options: LEVELS },
        { name: 'classId', label: 'Class', options: classOptions },
        { name: 'status', label: 'Status', options: STUDENT_STATUSES },
      ]}
      formFields={[
        { name: 'studentCode', label: 'Student code', required: true, half: true },
        { name: 'enrollmentYear', label: 'Enrollment year', type: 'number', required: true, half: true, validate: isNumber() },
        { name: 'firstName', label: 'First name', required: true, half: true },
        { name: 'lastName', label: 'Last name', required: true, half: true },
        { name: 'level', label: 'Level', type: 'select', options: LEVELS, required: true, half: true },
        { name: 'gradeYear', label: 'Grade year', type: 'number', half: true, validate: isNumber() },
        { name: 'dateOfBirth', label: 'Date of birth', type: 'date', half: true, validate: isDate() },
        { name: 'gender', label: 'Gender', type: 'select', options: GENDERS, half: true },
        { name: 'classId', label: 'Class', type: 'select', options: classOptions, half: true },
        { name: 'email', label: 'Email', type: 'email', half: true },
        { name: 'guardianName', label: 'Guardian name', half: true },
        { name: 'guardianPhone', label: 'Guardian phone', half: true },
      ]}
    />
  );
}
