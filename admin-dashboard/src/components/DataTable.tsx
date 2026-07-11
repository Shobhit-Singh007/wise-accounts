import { useState, useMemo, type ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  TextField,
  Box,
  Paper,
  Typography,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

interface Column<T> {
  id: string;
  label: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'right' | 'center';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  error?: string;
  emptyMessage?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  total?: number;
  page?: number;
  rowsPerPage?: number;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  stickyHeader?: boolean;
  getRowId?: (row: T) => string;
}

export default function DataTable<T>({
  columns,
  rows,
  loading,
  error,
  emptyMessage = 'No data found',
  searchable = false,
  searchPlaceholder = 'Search...',
  onSearch,
  total = 0,
  page = 0,
  rowsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
  stickyHeader = true,
  getRowId,
}: DataTableProps<T>) {
  const [orderBy, setOrderBy] = useState<string>('');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [localSearch, setLocalSearch] = useState('');

  const handleSort = (columnId: string) => {
    const isAsc = orderBy === columnId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(columnId);
  };

  const sortedRows = useMemo(() => {
    if (!orderBy) return rows;
    return [...rows].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[orderBy];
      const bVal = (b as Record<string, unknown>)[orderBy];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [rows, orderBy, order]);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  if (error) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      {searchable && (
        <Box sx={{ p: 2, pb: 0 }}>
          <TextField
            size="small"
            placeholder={searchPlaceholder}
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <SearchIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
              ),
            }}
            sx={{ maxWidth: 360 }}
          />
        </Box>
      )}
      <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
        <Table stickyHeader={stickyHeader}>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col.id}
                  align={col.align || 'left'}
                  sx={{
                    fontWeight: 600,
                    bgcolor: 'grey.50',
                    width: col.width,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col.sortable ? (
                    <TableSortLabel
                      active={orderBy === col.id}
                      direction={orderBy === col.id ? order : 'asc'}
                      onClick={() => handleSort(col.id)}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : (
                    col.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">Loading...</Typography>
                </TableCell>
              </TableRow>
            ) : sortedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">{emptyMessage}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedRows.map((row, idx) => (
                <TableRow
                  key={getRowId ? getRowId(row) : (row as Record<string, unknown>).id as string || idx}
                  hover
                  sx={{ '&:last-child td': { border: 0 } }}
                >
                  {columns.map((col) => (
                    <TableCell key={col.id} align={col.align || 'left'}>
                      {col.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_e, p) => onPageChange?.(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => onRowsPerPageChange?.(parseInt(e.target.value, 10))}
        rowsPerPageOptions={[5, 10, 25, 50]}
      />
    </Paper>
  );
}
