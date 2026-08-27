import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Alert, Autocomplete, Box, TextField, Typography } from '@mui/material';
import api from '../../services/api';
import { showSnackbar } from '../../redux/actions';
import { cleanParams, currentAcademicYear, fullName, getApiError } from '../../utils/helpers';
import { ENROLLMENT_TERM_OPTIONS, ROLES } from '../../utils/constants';
import { ENDPOINTS } from '../../services/endpoints';
import useAuth from '../../hooks/useAuth';
import useOptions from '../../hooks/useOptions';
import Button from '../common/Button';
import Input from '../common/Input';
import Modal from '../common/Modal';

/**
 * Enroll students into one course.
 *
 * Staff/admin: POST /api/enrollments/bulk, which skips students already
 * enrolled for the same year + term instead of failing the whole batch.
 *
 * Students: the roster picker is hidden and the dialog posts to
 * POST /api/enrollments/join, where the API takes studentId from the access
 * token — a student can only ever join themselves.
 */
export default function BulkEnrollDialog({ open, onClose, course }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { user } = useAuth();

  // Self-service mode: the signed-in user is the student being enrolled.
  const selfMode = user?.role === ROLES.STUDENT;

  const studentOptions = useOptions(
    selfMode ? '' : ENDPOINTS.students.list,
    (s) => `${fullName(s)} (${s.studentCode})`,
    { page: 1, limit: 100, status: 'enrolled' }
  );

  const [selected, setSelected] = useState([]);
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [term, setTerm] = useState('full_year');
  const [yearError, setYearError] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    setAcademicYear(course?.academicYear || currentAcademicYear());
    setTerm('full_year');
    setYearError('');
    setResult(null);
  }, [open, course]);

  const closedCourse = course?.status && course.status !== 'open';

  const handleSubmit = async () => {
    if (!/^\d{4}-\d{4}$/.test(academicYear)) {
      setYearError(t('enrollment.yearFormat', 'Use the YYYY-YYYY format'));
      return;
    }
    if (!selfMode && !selected.length) {
      dispatch(
        showSnackbar({
          message: t('enrollment.pickStudents', 'Select at least one student'),
          severity: 'warning',
        })
      );
      return;
    }

    if (selfMode) {
      setSaving(true);
      try {
        await api.post(
          ENDPOINTS.enrollments.join,
          cleanParams({ courseId: course.id, academicYear, term })
        );
        dispatch(showSnackbar(t('enrollment.joined', 'You joined this course')));
        onClose?.();
      } catch (err) {
        dispatch(showSnackbar({ message: getApiError(err), severity: 'error' }));
      } finally {
        setSaving(false);
      }
      return;
    }
    setSaving(true);
    setResult(null);
    try {
      const res = await api.post(
        ENDPOINTS.enrollments.bulk,
        cleanParams({
          courseId: course.id,
          studentIds: selected.map((s) => s.value),
          academicYear,
          term,
        })
      );
      const meta = res.data?.meta || {};
      setResult(meta);
      setSelected([]);
      dispatch(
        showSnackbar(
          t('enrollment.bulkDone', '{{created}} enrolled, {{skipped}} already enrolled', {
            created: meta.createdCount ?? 0,
            skipped: meta.skippedCount ?? 0,
          })
        )
      );
    } catch (err) {
      dispatch(showSnackbar({ message: getApiError(err), severity: 'error' }));
    } finally {
      setSaving(false);
    }
  };

  const courseLabel = useMemo(
    () => (course ? `${course.code} — ${course.title}` : ''),
    [course]
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${
        selfMode
          ? t('enrollment.joinTitle', 'Join course')
          : t('enrollment.bulkTitle', 'Enroll students')
      } — ${courseLabel}`}
      actions={
        <>
          <Button variant="text" color="inherit" onClick={onClose}>
            {t('common.close', 'Close')}
          </Button>
          <Button loading={saving} disabled={closedCourse} onClick={handleSubmit}>
            {selfMode ? t('enrollment.join', 'Join') : t('enrollment.enroll', 'Enroll')}
          </Button>
        </>
      }
    >
      {closedCourse && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t(
            'enrollment.courseClosed',
            'This course is not open, so it cannot take new enrollments.'
          )}
        </Alert>
      )}

      {selfMode && (
        <Alert severity="info" sx={{ mb: 1 }}>
          {t('enrollment.joinHint', 'You are joining this course yourself.')}
        </Alert>
      )}

      {!selfMode && (
        <Autocomplete
          multiple
          disableCloseOnSelect
          options={studentOptions}
          value={selected}
          onChange={(_e, next) => setSelected(next)}
          getOptionLabel={(opt) => opt.label}
          isOptionEqualToValue={(opt, val) => opt.value === val.value}
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              margin="dense"
              label={t('enrollment.students', 'Students')}
              placeholder={t('enrollment.pickStudents', 'Select at least one student')}
            />
          )}
        />
      )}

      <Box
        sx={{
          display: 'grid',
          gap: 1,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          mt: 1,
        }}
      >
        <Input
          label={`${t('enrollment.academicYear', 'Academic year')} *`}
          value={academicYear}
          onChange={(e) => {
            setAcademicYear(e.target.value);
            setYearError('');
          }}
          error={Boolean(yearError)}
          helperText={yearError || 'e.g. 2025-2026'}
        />
        <Input
          type="select"
          label={t('enrollment.term', 'Term')}
          options={ENROLLMENT_TERM_OPTIONS}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </Box>

      {!selfMode && result && (
        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="body2">
            {t('enrollment.bulkDone', '{{created}} enrolled, {{skipped}} already enrolled', {
              created: result.createdCount ?? 0,
              skipped: result.skippedCount ?? 0,
            })}
          </Typography>
        </Alert>
      )}
    </Modal>
  );
}
