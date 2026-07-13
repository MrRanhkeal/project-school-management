import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Alert,
  Chip,
  Button,
  Stack,
  TextField,
  MenuItem,
  CircularProgress,
  Tooltip,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import useFetch from '../../hooks/useFetch';
import api, { unwrap } from '../../services/api';
import { ENDPOINTS } from '../../services/endpoints';
import { formatDateTime, getApiError } from '../../utils/helpers';

const STATUS_COLORS = { completed: 'success', pending: 'warning', expired: 'error' };
const POLL_MS = 4000;

const EMPTY_FORM = { amount: '', currency: 'USD', description: '' };

export default function Payment() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { data, meta, loading, error, refetch } = useFetch(ENDPOINTS.payments.list, {
    params: { page, limit },
  });

  // Create-payment form
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  // Active QR dialog (freshly created or reopened pending payment)
  const [active, setActive] = useState(null);
  const [pollError, setPollError] = useState('');
  const [now, setNow] = useState(Date.now());

  const openForm = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  };

  const handleCreate = async () => {
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      setFormError('Amount must be a positive number');
      return;
    }
    if (form.currency === 'KHR' && !Number.isInteger(amount)) {
      setFormError('KHR amounts must be whole numbers');
      return;
    }
    setCreating(true);
    setFormError('');
    try {
      const res = await api.post(ENDPOINTS.payments.create, {
        amount,
        currency: form.currency,
        description: form.description || undefined,
      });
      setActive(unwrap(res));
      setPollError('');
      setFormOpen(false);
      refetch();
    } catch (err) {
      setFormError(getApiError(err));
    } finally {
      setCreating(false);
    }
  };

  const checkStatus = useCallback(async (md5) => {
    try {
      const res = await api.get(ENDPOINTS.payments.check(md5));
      const updated = unwrap(res);
      setPollError('');
      setActive((prev) => (prev && prev.md5 === updated.md5 ? updated : prev));
      if (updated.status !== 'pending') refetch();
      return updated;
    } catch (err) {
      setPollError(getApiError(err));
      return null;
    }
  }, [refetch]);

  // While the QR dialog shows a pending payment, poll Bakong for settlement.
  useEffect(() => {
    if (!active || active.status !== 'pending') return undefined;
    const poll = setInterval(() => checkStatus(active.md5), POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [active, checkStatus]);

  const handleForceComplete = async () => {
    if (!active) return;
    try {
      const res = await api.post(ENDPOINTS.payments.forceComplete(active.md5));
      setActive(unwrap(res));
      setPollError('');
      refetch();
    } catch (err) {
      setPollError(getApiError(err));
    }
  };

  const secondsLeft = active?.expire ? Math.max(0, Math.round((Number(active.expire) - now) / 1000)) : null;

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">{t('nav.payments')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openForm}>
          New payment
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <DataTable
        columns={[
          { id: 'id', label: '#' },
          { id: 'payment_id', label: 'Payment ID' },
          {
            id: 'amount',
            label: 'Amount',
            align: 'right',
            render: (r) => `${Number(r.amount).toFixed(2)} ${r.currency || ''}`,
          },
          { id: 'description', label: 'Description', minWidth: 160 },
          {
            id: 'status',
            label: 'Status',
            render: (r) => (
              <Chip size="small" label={r.status} color={STATUS_COLORS[r.status] || 'default'} />
            ),
          },
          {
            id: 'paidAt',
            label: 'Paid at',
            render: (r) => (r.paidAt ? formatDateTime(Number(r.paidAt)) : '—'),
          },
          {
            id: 'actions',
            label: '',
            align: 'right',
            render: (r) =>
              r.status === 'pending' && r.qr ? (
                <Tooltip title="Show KHQR">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setActive(r);
                      setPollError('');
                    }}
                  >
                    <QrCode2Icon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : null,
          },
        ]}
        rows={data || []}
        meta={meta}
        loading={loading}
        onPageChange={setPage}
        onLimitChange={(l) => {
          setLimit(l);
          setPage(1);
        }}
      />

      {/* Create payment */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="New Bakong payment"
        actions={
          <>
            <Button onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleCreate} disabled={creating}>
              {creating ? <CircularProgress size={22} /> : 'Generate KHQR'}
            </Button>
          </>
        }
      >
        <Stack spacing={2} sx={{ mt: 1 }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <Stack direction="row" spacing={2}>
            <TextField
              label="Amount"
              type="number"
              fullWidth
              autoFocus
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
            <TextField
              label="Currency"
              select
              sx={{ minWidth: 120 }}
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
            >
              <MenuItem value="USD">USD</MenuItem>
              <MenuItem value="KHR">KHR</MenuItem>
            </TextField>
          </Stack>
          <TextField
            label="Description"
            fullWidth
            multiline
            minRows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </Stack>
      </Modal>

      {/* KHQR display + live status */}
      <Modal
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title="Scan with Bakong"
        actions={
          <>
            {active?.status === 'pending' && (
              <Button color="warning" onClick={handleForceComplete}>
                Force complete (test)
              </Button>
            )}
            <Button variant="contained" onClick={() => setActive(null)}>
              Close
            </Button>
          </>
        }
      >
        {active && (
          <Stack spacing={2} alignItems="center" sx={{ py: 1 }}>
            <Typography variant="h6">
              {Number(active.amount).toFixed(2)} {active.currency}
            </Typography>

            <Box
              sx={{
                p: 2,
                bgcolor: '#fff',
                borderRadius: 2,
                opacity: active.status === 'expired' ? 0.35 : 1,
              }}
            >
              <QRCodeSVG value={active.qr} size={220} />
            </Box>

            {active.status === 'pending' && (
              <Stack spacing={1} alignItems="center">
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    Waiting for payment…
                    {secondsLeft !== null &&
                      ` expires in ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`}
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Scan the QR with any Bakong-enabled banking app.
                </Typography>
              </Stack>
            )}
            {active.status === 'completed' && (
              <Alert severity="success" sx={{ width: '100%' }}>
                Payment received{active.paidAt ? ` at ${formatDateTime(Number(active.paidAt))}` : ''}.
              </Alert>
            )}
            {active.status === 'expired' && (
              <Alert severity="error" sx={{ width: '100%' }}>
                This QR has expired — create a new payment.
              </Alert>
            )}
            {pollError && (
              <Alert severity="warning" sx={{ width: '100%' }}>
                Status check failed: {pollError}
              </Alert>
            )}
            <Typography variant="caption" color="text.secondary">
              md5: {active.md5}
            </Typography>
          </Stack>
        )}
      </Modal>
    </Box>
  );
}
