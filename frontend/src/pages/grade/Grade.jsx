import React from 'react';
import { useTranslation } from 'react-i18next';
import CrudManager from '../../components/common/CrudManager';
import useOptions, { optionLabel } from '../../hooks/useOptions';
import { ENDPOINTS } from '../../services/endpoints';
import { ROLES } from '../../utils/constants';
import { fullName } from '../../utils/helpers';
import { isNumber } from '../../utils/validators';

export default function Grade() {
  const { t } = useTranslation();
  // Grades live in records_db and reference academic entities by id only
  // (cross-service boundary), so names are resolved client-side.
  const studentOptions = useOptions(
    ENDPOINTS.students.list,
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

  return (
    <CrudManager
      title={t('nav.grades')}
      endpoint={ENDPOINTS.grades}
      searchable={false}
      writeRoles={[ROLES.ADMIN, ROLES.TEACHER]}
      deleteRoles={[ROLES.ADMIN]}
      columns={[
        {
          id: 'studentId',
          label: 'Student',
          minWidth: 160,
          render: (r) => optionLabel(studentOptions, r.studentId),
        },
        {
          id: 'courseId',
          label: 'Course',
          minWidth: 160,
          render: (r) => optionLabel(courseOptions, r.courseId),
        },
        { id: 'term', label: 'Term' },
        { id: 'assessment', label: 'Assessment' },
        {
          id: 'score',
          label: 'Score',
          align: 'right',
          render: (r) => `${r.score}${r.maxScore ? ` / ${r.maxScore}` : ''}`,
        },
        { id: 'letterGrade', label: 'Letter' },
        { id: 'remarks', label: 'Remarks' },
      ]}
      formFields={[
        { name: 'studentId', label: 'Student', type: 'select', options: studentOptions, required: true, half: true },
        { name: 'courseId', label: 'Course', type: 'select', options: courseOptions, required: true, half: true },
        { name: 'classId', label: 'Class', type: 'select', options: classOptions, half: true },
        { name: 'term', label: 'Term', required: true, half: true, helperText: 'e.g. 2026-S1' },
        { name: 'assessment', label: 'Assessment', half: true, helperText: 'e.g. Midterm exam' },
        { name: 'score', label: 'Score', type: 'number', required: true, half: true, validate: isNumber() },
        { name: 'maxScore', label: 'Max score', type: 'number', half: true, validate: isNumber() },
        { name: 'weight', label: 'Weight (%)', type: 'number', half: true, validate: isNumber() },
        { name: 'letterGrade', label: 'Letter grade', half: true },
        { name: 'remarks', label: 'Remarks', half: true },
      ]}
    />
  );
}
