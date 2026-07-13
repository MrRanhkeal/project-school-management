import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Box,
  CircularProgress,
  Typography,
} from '@mui/material';

/**
 * Server-paginated table.
 *
 * columns: [{ id, label, render?(row), align?, minWidth? }]
 * meta:    { page, limit, total } from the backend list envelope
 */
export default function DataTable({
  columns,
  rows = [],
  meta,
  loading = false,
  onPageChange,
  onLimitChange,
  getRowKey = (row) => row.id,
}) {
  const { t } = useTranslation();

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: { xs: 480, md: 640 } }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col.id}
                  align={col.align || 'left'}
                  sx={{ fontWeight: 600, minWidth: col.minWidth, whiteSpace: 'nowrap' }} 
                >
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">{t('common.noData')}</Typography>
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              rows.map((row) => (
                <TableRow hover key={getRowKey(row)}>
                  {columns.map((col) => (
                    <TableCell key={col.id} align={col.align || 'left'}>
                      {col.render ? col.render(row) : (row[col.id] ?? '—')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      {meta && (
        <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
          <TablePagination
            component="div"
            count={meta.total ?? rows.length}
            page={(meta.page || 1) - 1}
            rowsPerPage={meta.limit || rows.length || 10}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage={t('common.rowsPerPage')}
            onPageChange={(_, page) => onPageChange?.(page + 1)}
            onRowsPerPageChange={(e) => onLimitChange?.(parseInt(e.target.value, 10))}
          />
        </Box>
      )}
    </Paper>
  );
}
