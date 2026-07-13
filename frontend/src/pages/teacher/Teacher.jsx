import React from 'react';
import { Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import CrudManager from '../../components/common/CrudManager';
import { ENDPOINTS } from '../../services/endpoints';
import { TEACHER_STATUSES, ROLES } from '../../utils/constants';
import { fullName, capitalize, formatDate } from '../../utils/helpers';
import { isDate } from '../../utils/validators';

const STATUS_COLORS = { active: 'success', on_leave: 'warning', retired: 'default' };

export default function Teacher() {
  const { t } = useTranslation();

  return (
    <CrudManager
      title={t('nav.teachers')}
      endpoint={ENDPOINTS.teachers}
      writeRoles={[ROLES.ADMIN, ROLES.STAFF]}
      deleteRoles={[ROLES.ADMIN]}
      columns={[
        { id: 'teacherCode', label: 'Code' },
        { id: 'name', label: 'Name', render: (r) => fullName(r), minWidth: 160 },
        { id: 'department', label: 'Department' },
        { id: 'specialization', label: 'Specialization' },
        { id: 'phone', label: 'Phone' },
        { id: 'hireDate', label: 'Hired', render: (r) => formatDate(r.hireDate) },
        {
          id: 'status',
          label: 'Status',
          render: (r) => (
            <Chip
              size="small"
              label={capitalize(r.status || 'active')}
              color={STATUS_COLORS[r.status] || 'default'}
            />
          ),
        },
      ]}
      filters={[{ name: 'status', label: 'Status', options: TEACHER_STATUSES }]}
      formFields={[
        { name: 'teacherCode', label: 'Teacher code', required: true, half: true },
        { name: 'hireDate', label: 'Hire date', type: 'date', half: true, validate: isDate() },
        { name: 'firstName', label: 'First name', required: true, half: true },
        { name: 'lastName', label: 'Last name', required: true, half: true },
        { name: 'email', label: 'Email', type: 'email', half: true },
        { name: 'phone', label: 'Phone', half: true },
        { name: 'department', label: 'Department', half: true },
        { name: 'specialization', label: 'Specialization', half: true },
        { name: 'status', label: 'Status', type: 'select', options: TEACHER_STATUSES, half: true },
      ]}
    />
  );
}
