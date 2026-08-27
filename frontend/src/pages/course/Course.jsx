import React, { useState } from 'react';
import { Chip } from '@mui/material';
import GroupAddIcon from '@mui/icons-material/GroupAddOutlined';
import { useTranslation } from 'react-i18next';
import CrudManager from '../../components/common/CrudManager';
import BulkEnrollDialog from '../../components/enrollment/BulkEnrollDialog';
import useAuth from '../../hooks/useAuth';
import useOptions from '../../hooks/useOptions';
import { ENDPOINTS } from '../../services/endpoints';
import { LEVELS, COURSE_STATUSES, ROLES } from '../../utils/constants';
import { capitalize, fullName, formatMoney } from '../../utils/helpers';
import { isAcademicYear, isNumber } from '../../utils/validators';

const STATUS_COLORS = { open: 'success', closed: 'warning', archived: 'default' };

export default function Course() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const teacherOptions = useOptions(
    ENDPOINTS.teachers.list,
    (tch) => `${fullName(tch)} (${tch.teacherCode})`
  );
  const classOptions = useOptions(
    ENDPOINTS.classes.list,
    (c) => `${c.name} (${c.academicYear})`
  );

  const canEnroll = [ROLES.ADMIN, ROLES.STAFF,ROLES.STUDENT].includes(user?.role);
  const [enrolling, setEnrolling] = useState(null);

  return (
    <>
      <CrudManager
        title={t('nav.courses')}
        endpoint={ENDPOINTS.courses}
        writeRoles={[ROLES.ADMIN, ROLES.STAFF]}
        deleteRoles={[ROLES.ADMIN]}
        rowActions={
          canEnroll
            ? [
              {
                key: 'bulkEnroll',
                title: t('enrollment.bulkTitle', 'Enroll students'),
                icon: <GroupAddIcon fontSize="small" />,
                color: 'primary',
                // Closed/archived courses cannot take enrollments.
                hidden: (row) => row.status !== 'open',
                onClick: (row) => setEnrolling(row),
              },
            ]
            : []
        }
        columns={[
          { id: 'index', label: '#', render: (_row, _index, rowNumber) => rowNumber },
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
          // price is a DECIMAL: the API sends it as a string ("120.00"), so it
          // goes through formatMoney rather than being rendered raw.
          {
            id: 'price',
            label: 'Price',
            align: 'right',
            render: (r) => formatMoney(r.price),
          },
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
          {
            name: 'minPrice',
            label: 'Min price',
            type: 'number',
            inputProps: { min: 0, step: '0.01' },
          },
          {
            name: 'maxPrice',
            label: 'Max price',
            type: 'number',
            inputProps: { min: 0, step: '0.01' },
          },
        ]}
        formFields={[
          { name: 'code', label: 'Course code', required: true, half: true },
          { name: 'title', label: 'Title', required: true, half: true },
          { name: 'level', label: 'Level', type: 'select', options: LEVELS, required: true, half: true },
          { name: 'credits', label: 'Credits', type: 'number', half: true, validate: isNumber() },
          {
            name: 'price',
            label: 'Price',
            type: 'number',
            half: true,
            helperText: 'e.g. 120.00 — leave empty for a free course',
            inputProps: { min: 0, step: '0.01' },
            validate: isNumber(),
          },
          { name: 'department', label: 'Department', half: true },
          {
            name: 'academicYear',
            label: 'Academic year',
            half: true,
            helperText: 'e.g. 2025-2026',
            validate: isAcademicYear(),
          },
          { name: 'teacherId', label: 'Teacher', type: 'select', options: teacherOptions, half: true },
          { name: 'classId', label: 'Class', type: 'select', options: classOptions, half: true },
          { name: 'status', label: 'Status', type: 'select', options: COURSE_STATUSES, half: true },
          { name: 'description', label: 'Description' },
        ]}
      />

      <BulkEnrollDialog
        open={Boolean(enrolling)}
        course={enrolling}
        onClose={() => setEnrolling(null)}
      />
    </>
  );
}
