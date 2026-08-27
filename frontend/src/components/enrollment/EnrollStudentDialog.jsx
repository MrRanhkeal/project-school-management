import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import api, { unwrap } from '../../services/api';
import { showSnackbar } from '../../redux/actions';
import { capitalize, cleanParams, currentAcademicYear, fullName, getApiError } from '../../utils/helpers';
import { ENROLLMENT_TERM_OPTIONS, termLabel } from '../../utils/constants';
import { ENDPOINTS } from '../../services/endpoints';
import useOptions from '../../hooks/useOptions';
import Button from '../common/Button';
import Input from '../common/Input';
import Modal from '../common/Modal';

const STATUS_COLORS = {
  pending: 'warning',
  active: 'success',
  completed: 'info',
  dropped: 'default',
};

/**
 * Enroll one student into a course, and review/undo what they are already
 * taking. Backed by POST/DELETE /api/enrollments.
 */
export default function EnrollStudentDialog({ open, onClose, student }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  // Only open courses can take new enrollments (the API returns 409 otherwise).
  const courseOptions = useOptions(ENDPOINTS.courses.list, (c) => `${c.code} — ${c.title}`, {
    page: 1,
    limit: 100,
    status: 'open',
  });

  const [existing, setExisting] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [values, setValues] = useState({
    courseId: '',
    academicYear: currentAcademicYear(),
    term: 'full_year',
  });
  const [errors, setErrors] = useState({});

  const studentId = student?.id;

  const loadExisting = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await api.get(ENDPOINTS.enrollments.list, {
        params: { studentId, limit: 100, page: 1 },
      });
      setExisting(unwrap(res) || []);
    } catch (err) {
      dispatch(showSnackbar({ message: getApiError(err), severity: 'error' }));
    } finally {
      setLoading(false);
    }
  }, [studentId, dispatch]);

  // Reset the form and reload the roster each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setValues({ courseId: '', academicYear: currentAcademicYear(), term: 'full_year' });
    setErrors({});
    loadExisting();
  }, [open, loadExisting]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev));
  };

  const validate = () => {
    const next = {};
    if (!values.courseId) next.courseId = t('common.required', 'This field is required');
    if (!values.academicYear) next.academicYear = t('common.required', 'This field is required');
    else if (!/^\d{4}-\d{4}$/.test(values.academicYear)) {
      next.academicYear = t('enrollment.yearFormat', 'Use the YYYY-YYYY format');
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleEnroll = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await api.post(ENDPOINTS.enrollments.create, cleanParams({ ...values, studentId }));
      dispatch(showSnackbar(t('enrollment.enrolled', 'Student enrolled')));
      setValues((prev) => ({ ...prev, courseId: '' }));
      loadExisting();
    } catch (err) {
      dispatch(showSnackbar({ message: getApiError(err), severity: 'error' }));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (row) => {
    setRemovingId(row.id);
    try {
      await api.delete(ENDPOINTS.enrollments.delete(row.id));
      dispatch(showSnackbar(t('enrollment.removed', 'Enrollment removed')));
      loadExisting();
    } catch (err) {
      dispatch(showSnackbar({ message: getApiError(err), severity: 'error' }));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${t('enrollment.enrollTitle', 'Enroll in a course')} — ${fullName(student || {})}`}
      actions={
        <>
          <Button variant="text" color="inherit" onClick={onClose}>
            {t('common.close', 'Close')}
          </Button>
          <Button loading={saving} onClick={handleEnroll}>
            {t('enrollment.enroll', 'Enroll')}
          </Button>
        </>
      }
    >
      <Box
        sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}
      >
        <Box sx={{ gridColumn: { xs: 'auto', sm: '1 / -1' } }}>
          <Input
            name="courseId"
            type="select"
            allowEmpty
            label={`${t('enrollment.course', 'Course')} *`}
            options={courseOptions}
            value={values.courseId}
            onChange={handleChange}
            error={Boolean(errors.courseId)}
            helperText={
              errors.courseId || t('enrollment.openOnly', 'Only courses with status "open" are listed')
            }
          />
        </Box>
        <Input
          name="academicYear"
          label={`${t('enrollment.academicYear', 'Academic year')} *`}
          value={values.academicYear}
          onChange={handleChange}
          error={Boolean(errors.academicYear)}
          helperText={errors.academicYear || 'e.g. 2025-2026'}
        />
        <Input
          name="term"
          type="select"
          label={t('enrollment.term', 'Term')}
          options={ENROLLMENT_TERM_OPTIONS}
          value={values.term}
          onChange={handleChange}
        />
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {t('enrollment.currentCourses', 'Current courses')}
      </Typography>

      {loading && (
        <Stack alignItems="center" sx={{ py: 3 }}>
          <CircularProgress size={24} />
        </Stack>
      )}

      {!loading && existing.length === 0 && (
        <Typography color="text.secondary" variant="body2">
          {t('enrollment.noneYet', 'Not enrolled in any course yet')}
        </Typography>
      )}

      {!loading && existing.length > 0 && (
        <List dense disablePadding>
          {existing.map((row) => (
            <ListItem
              key={row.id}
              divider
              secondaryAction={
                <Tooltip title={t('enrollment.remove', 'Remove enrollment')}>
                  <span>
                    <IconButton
                      edge="end"
                      size="small"
                      color="error"
                      disabled={removingId === row.id}
                      onClick={() => handleRemove(row)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              }
            >
              <ListItemText
                primary={row.course ? `${row.course.code} — ${row.course.title}` : `#${row.courseId}`}
                secondary={`${row.academicYear} · ${termLabel(row.term)}`}
              />
              <Chip
                size="small"
                sx={{ mr: 5 }}
                label={capitalize(row.status || 'active')}
                color={STATUS_COLORS[row.status] || 'default'}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Modal>
  );
}
