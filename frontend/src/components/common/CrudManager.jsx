import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Box, Stack, Typography, IconButton, InputAdornment, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import api, { unwrap, unwrapMeta } from '../../services/api';
import { cleanParams, getApiError } from '../../utils/helpers';
import { showSnackbar } from '../../redux/actions';
import { DEFAULT_PAGE_SIZE } from '../../utils/constants';
import useAuth from '../../hooks/useAuth';
import Button from './Button';
import Input from './Input';
import Modal from './Modal';
import DataTable from './DataTable';

/**
 * Config-driven CRUD screen used by the entity pages (students, teachers, …).
 *
 * endpoint:   ENDPOINTS group, e.g. ENDPOINTS.students ({ list, create, update(id), delete(id) })
 * columns:    DataTable columns
 * formFields: [{ name, label, type, options, required, validate?(value), half?, createOnly? }]
 *             createOnly fields are shown (and validated) only when adding a new row.
 * filters:    [{ name, label, type: 'select', options }] rendered above the table
 * writeRoles / deleteRoles: roles allowed to create+edit / delete
 */
export default function CrudManager({
  title,
  endpoint,
  columns,
  formFields = [],
  filters = [],
  searchable = true,
  writeRoles,
  deleteRoles,
  transformSubmit = (v) => v,
}) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { user } = useAuth();

  const canWrite = !writeRoles || writeRoles.includes(user?.role);
  const canDelete = !deleteRoles || deleteRoles.includes(user?.role);

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState({ page: 1, limit: DEFAULT_PAGE_SIZE, search: '' });
  const [searchInput, setSearchInput] = useState('');

  const [editing, setEditing] = useState(null); // null | {} (new) | row (edit)
  const [deleting, setDeleting] = useState(null);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const emptyForm = useMemo(
    () => Object.fromEntries(formFields.map((f) => [f.name, f.default ?? ''])),
    [formFields]
  );

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(endpoint.list, { params: cleanParams(query) });
      setRows(unwrap(res) || []);
      setMeta(unwrapMeta(res) || null);
    } catch (err) {
      dispatch(showSnackbar({ message: getApiError(err), severity: 'error' }));
    } finally {
      setLoading(false);
    }
  }, [endpoint, query, dispatch]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Debounced search box.
  useEffect(() => {
    const id = setTimeout(() => {
      setQuery((q) => (q.search === searchInput ? q : { ...q, search: searchInput, page: 1 }));
    }, 400);
    return () => clearTimeout(id);
  }, [searchInput]);

  const openForm = (row) => {
    setValues(row ? { ...emptyForm, ...pickFields(row, formFields) } : emptyForm);
    setErrors({});
    setEditing(row || {});
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev));
  };

  // Hide createOnly fields (e.g. initial password) when editing an existing row.
  const visibleFields = editing?.id ? formFields.filter((f) => !f.createOnly) : formFields;

  const validateForm = () => {
    const next = {};
    for (const f of visibleFields) {
      const v = values[f.name];
      if (f.required && (v === '' || v === undefined || v === null)) {
        next[f.name] = t('common.required', 'This field is required');
      } else if (f.validate) {
        const err = f.validate(v, values);
        if (err) next[f.name] = err;
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const payload = transformSubmit(cleanParams(values));
      if (editing?.id) {
        await api.put(endpoint.update(editing.id), payload);
      } else {
        await api.post(endpoint.create, payload);
      }
      dispatch(showSnackbar(t('common.saved', 'Saved successfully')));
      setEditing(null);
      fetchList();
    } catch (err) {
      dispatch(showSnackbar({ message: getApiError(err), severity: 'error' }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await api.delete(endpoint.delete(deleting.id));
      dispatch(showSnackbar(t('common.deleted', 'Deleted successfully')));
      setDeleting(null);
      fetchList();
    } catch (err) {
      dispatch(showSnackbar({ message: getApiError(err), severity: 'error' }));
    } finally {
      setSaving(false);
    }
  }; 
  
  const allColumns = useMemo(() => {
    if (!canWrite && !canDelete) return columns;
    return [
      ...columns,
      {
        id: '__actions',
        label: t('common.actions'),
        align: 'right',
        render: (row) => (
          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
            {canWrite && (
              <IconButton size="small" color="primary" onClick={() => openForm(row)}>
                <EditIcon fontSize="small" />
              </IconButton>
            )}
            {canDelete && (
              <IconButton size="small" color="error" onClick={() => setDeleting(row)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
        ),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, canWrite, canDelete, t]);

  return (
    <Box >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography variant="h5">{title}</Typography>
        {canWrite && (
          <Button startIcon={<AddIcon />} onClick={() => openForm(null)}>
            {t('common.add')}
          </Button>
        )}
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        {searchable && (
          <TextField
            size="small"
            placeholder={t('common.search')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            sx={{ minWidth: { md: 260 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        )}
        {filters.map((f) => (
          <Input
            key={f.name}
            type="select"
            allowEmpty
            label={f.label}
            options={f.options}
            value={query[f.name] ?? ''}
            onChange={(e) => setQuery((q) => ({ ...q, [f.name]: e.target.value, page: 1 }))}
            sx={{ minWidth: 160, m: 0 }}
            margin="none"
          />
        ))}
      </Stack>

      <DataTable
        columns={allColumns}
        rows={rows}
        meta={meta}
        loading={loading}
        onPageChange={(page) => setQuery((q) => ({ ...q, page }))}
        onLimitChange={(limit) => setQuery((q) => ({ ...q, limit, page: 1 }))}
      />

      {/* Create / edit dialog */}
      <Modal  
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? `${t('common.edit')} — ${title}` : `${t('common.add')} — ${title}`}
        actions={
          <>
            <Button variant="text" color="inherit" onClick={() => setEditing(null)}>
              {t('common.cancel')}
            </Button>
            <Button loading={saving} onClick={handleSave}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <Box
          sx={{
            display: 'grid',
            gap: 1,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          }}
        >
          {visibleFields.map((f) => (
            <Box key={f.name} sx={{ gridColumn: f.half ? 'auto' : { xs: 'auto', sm: '1 / -1' } }}>
              <Input
                name={f.name}
                label={f.label + (f.required ? ' *' : '')}
                type={f.type || 'text'}
                options={f.options || []}
                allowEmpty={!f.required}
                value={values[f.name] ?? ''}
                onChange={handleFieldChange}
                error={Boolean(errors[f.name])}
                helperText={errors[f.name] || f.helperText || ''}
              />
            </Box>
          ))}
        </Box>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={t('common.delete')}
        maxWidth="xs"
        actions={
          <>
            <Button variant="text" color="inherit" onClick={() => setDeleting(null)}>
              {t('common.cancel')}
            </Button>
            <Button color="error" loading={saving} onClick={handleDelete}>
              {t('common.delete')}
            </Button>
          </>
        }
      >
        <Typography>{t('common.confirmDelete')}</Typography>
      </Modal>
    </Box>
  );
}

function pickFields(row, formFields) {
  const out = {};
  for (const f of formFields) {
    const v = row[f.name];
    out[f.name] = v === null || v === undefined ? '' : v;
  }
  return out;
}
