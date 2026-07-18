import { useState, useRef, useEffect } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Download as DownloadIcon,
  TableChart as CsvIcon,
  DataObject as JsonIcon,
  Description as XlsxIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { exportData, type ExportFormat } from '../utils/exportUtils';

interface ExportData {
  rows: (string | number)[][];
  jsonData: Record<string, unknown>[];
}

interface ExportMenuProps {
  headers: string[];
  rows: (string | number)[][];
  filename: string;
  title?: string;
  jsonData?: Record<string, unknown>[];
  fetchAllData?: (signal?: AbortSignal) => Promise<ExportData>;
}

const formatOptions: { format: ExportFormat; label: string; icon: React.ReactNode }[] = [
  { format: 'csv', label: 'CSV', icon: <CsvIcon fontSize="small" /> },
  { format: 'json', label: 'JSON', icon: <JsonIcon fontSize="small" /> },
  { format: 'xlsx', label: 'Excel (XLSX)', icon: <XlsxIcon fontSize="small" /> },
  { format: 'pdf', label: 'PDF', icon: <PdfIcon fontSize="small" /> },
];

export default function ExportMenu({ headers, rows, filename, title, jsonData, fetchAllData }: ExportMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleExport = async (format: ExportFormat) => {
    setAnchorEl(null);
    if (loading) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      let exportRows = rows;
      let exportJsonData = jsonData;

      if (fetchAllData) {
        const result = await fetchAllData(controller.signal);
        exportRows = result.rows;
        exportJsonData = result.jsonData;
      }

      if (!controller.signal.aborted) {
        exportData({ headers, rows: exportRows, filename, title, jsonData: exportJsonData }, format);
        setSnackbar({ open: true, message: `Exported as ${format.toUpperCase()} successfully`, severity: 'success' });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setSnackbar({ open: true, message: 'Export failed. Please try again.', severity: 'error' });
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={loading ? <CircularProgress size={16} /> : <DownloadIcon />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        disabled={loading}
        aria-label="Export data"
      >
        Export
      </Button>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {formatOptions.map((opt) => (
          <MenuItem key={opt.format} onClick={() => handleExport(opt.format)}>
            <ListItemIcon>{opt.icon}</ListItemIcon>
            <ListItemText>{opt.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
