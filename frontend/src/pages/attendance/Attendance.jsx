import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { Box, Stack, Typography, Chip, IconButton, Divider } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import api, { unwrap, unwrapMeta } from '../../services/api';
import { ENDPOINTS } from '../../services/endpoints';
import { showSnackbar } from '../../redux/actions';
import { cleanParams, getApiError, formatDate, capitalize, fullName } from '../../utils/helpers';
import { ATTENDANCE_STATUSES, DEFAULT_PAGE_SIZE, ROLES } from '../../utils/constants';
import useAuth from '../../hooks/useAuth';
import useOptions, { optionLabel } from '../../hooks/useOptions';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import DataTable from '../../components/common/DataTable';

const STATUS_COLORS = { present: 'success', absent: 'error', late: 'warning', excused: 'info' };
const EMPTY_RECORD = { studentId: '', status: 'present', note: '' };

export default function Attendance() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const canMark = [ROLES.ADMIN, ROLES.STAFF, ROLES.TEACHER].includes(user?.role);

  // Attendance stores academic ids only (cross-service boundary) — resolve names client-side.
  const studentOptions = useOptions(
    ENDPOINTS.students.list,
    (s) => `${fullName(s)} (${s.studentCode})`
  );
  const classOptions = useOptions(
    ENDPOINTS.classes.list,
    (c) => `${c.name} (${c.academicYear})`
  );
  const courseOptions = useOptions(
    ENDPOINTS.courses.list,
    (c) => `${c.code} — ${c.title}`
  );

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    status: '',
    studentId: '',
    classId: '',
    dateFrom: '',
    dateTo: '',
  });

  // Bulk-mark dialog state (POST /api/attendance/mark).
  const [markOpen, setMarkOpen] = useState(false);
  const [markDate, setMarkDate] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [markClassId, setMarkClassId] = useState('');
  const [records, setRecords] = useState([{ ...EMPTY_RECORD }]);
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(ENDPOINTS.attendance.list, { params: cleanParams(query) });
      setRows(unwrap(res) || []);
      setMeta(unwrapMeta(res) || null);
    } catch (err) {
      dispatch(showSnackbar({ message: getApiError(err), severity: 'error' }));
    } finally {
      setLoading(false);
    }
  }, [query, dispatch]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const setFilter = (name) => (e) =>
    setQuery((q) => ({ ...q, [name]: e.target.value, page: 1 }));

  const updateRecord = (index, name, value) => {
    setRecords((prev) => prev.map((r, i) => (i === index ? { ...r, [name]: value } : r)));
  };

  const submitMark = async () => {
    const valid = records.filter((r) => r.studentId !== '');
    if (!valid.length) {
      dispatch(showSnackbar({ message: 'Add at least one student record', severity: 'warning' }));
      return;
    }
    setSaving(true);
    try {
      await api.post(ENDPOINTS.attendance.mark, {
        date: markDate,
        records: valid.map((r) =>
          cleanParams({
            studentId: Number(r.studentId),
            classId: markClassId ? Number(markClassId) : undefined,
            status: r.status,
            note: r.note,
          })
        ),
      });
      dispatch(showSnackbar(`Attendance marked for ${valid.length} student(s)`));
      setMarkOpen(false);
      setRecords([{ ...EMPTY_RECORD }]);
      fetchList();
    } catch (err) {
      dispatch(showSnackbar({ message: getApiError(err), severity: 'error' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography variant="h5">{t('nav.attendance')}</Typography>
        {canMark && (
          <Button startIcon={<PlaylistAddIcon />} onClick={() => setMarkOpen(true)}>
            Mark attendance
          </Button>
        )}
      </Stack>

      {/* Filters */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <Input
          type="select"
          allowEmpty
          label="Status"
          options={ATTENDANCE_STATUSES}
          value={query.status}
          onChange={setFilter('status')}
          sx={{ minWidth: 150, m: 0 }}
          margin="none"
        />
        <Input
          type="select"
          allowEmpty
          label="Student"
          options={studentOptions}
          value={query.studentId}
          onChange={setFilter('studentId')}
          sx={{ minWidth: { md: 180 }, m: 0 }}
          margin="none"
        />
        <Input
          type="select"
          allowEmpty
          label="Class"
          options={classOptions}
          value={query.classId}
          onChange={setFilter('classId')}
          sx={{ minWidth: { md: 160 }, m: 0 }}
          margin="none"
        />
        <Input
          type="date"
          label="From"
          value={query.dateFrom}
          onChange={setFilter('dateFrom')}
          sx={{ maxWidth: { md: 170 }, m: 0 }}
          margin="none"
        />
        <Input
          type="date"
          label="To"
          value={query.dateTo}
          onChange={setFilter('dateTo')}
          sx={{ maxWidth: { md: 170 }, m: 0 }}
          margin="none"
        />
      </Stack>

      <DataTable
        columns={[
          { id: 'date', label: 'Date', render: (r) => formatDate(r.date) },
          {
            id: 'studentId',
            label: 'Student',
            minWidth: 160,
            render: (r) => optionLabel(studentOptions, r.studentId),
          },
          {
            id: 'classId',
            label: 'Class',
            render: (r) => optionLabel(classOptions, r.classId),
          },
          {
            id: 'courseId',
            label: 'Course',
            render: (r) => optionLabel(courseOptions, r.courseId),
          },
          {
            id: 'status',
            label: 'Status',
            render: (r) => (
              <Chip
                size="small"
                label={capitalize(r.status)}
                color={STATUS_COLORS[r.status] || 'default'}
              />
            ),
          },
          { id: 'note', label: 'Note' },
        ]}
        rows={rows}
        meta={meta}
        loading={loading}
        onPageChange={(page) => setQuery((q) => ({ ...q, page }))}
        onLimitChange={(limit) => setQuery((q) => ({ ...q, limit, page: 1 }))}
      />

      {/* Bulk mark dialog */}
      <Modal
        open={markOpen}
        onClose={() => setMarkOpen(false)}
        title="Mark attendance"
        maxWidth="md"
        actions={
          <>
            <Button variant="text" color="inherit" onClick={() => setMarkOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button loading={saving} onClick={submitMark}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 1 }}>
          <Input
            type="date"
            label="Date"
            value={markDate}
            onChange={(e) => setMarkDate(e.target.value)}
          />
          <Input
            type="select"
            allowEmpty
            label="Class (optional)"
            options={classOptions}
            value={markClassId}
            onChange={(e) => setMarkClassId(e.target.value)}
          />
        </Stack>
        <Divider sx={{ my: 1 }} />

        {records.map((record, i) => (
          <Stack
            key={i}
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ sm: 'center' }}
            sx={{ mb: 1 }}
          >
            <Input
              type="select"
              label="Student"
              options={studentOptions}
              value={record.studentId}
              onChange={(e) => updateRecord(i, 'studentId', e.target.value)}
            />
            <Input
              type="select"
              label="Status"
              options={ATTENDANCE_STATUSES}
              value={record.status}
              onChange={(e) => updateRecord(i, 'status', e.target.value)}
            />
            <Input
              label="Note"
              value={record.note}
              onChange={(e) => updateRecord(i, 'note', e.target.value)}
            />
            <IconButton
              color="error"
              disabled={records.length === 1}
              onClick={() => setRecords((prev) => prev.filter((_, j) => j !== i))}
            >
              <DeleteIcon />
            </IconButton>
          </Stack>
        ))}

        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setRecords((prev) => [...prev, { ...EMPTY_RECORD }])}
        >
          Add student
        </Button>
      </Modal>
    </Box>
  );
}
