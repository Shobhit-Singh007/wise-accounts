import { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Button,
  LinearProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  MenuItem,
  TextField,
  Stepper,
  Step,
  StepLabel,
  Chip,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  People as PeopleIcon,
  Inventory as InventoryIcon,
  Receipt as ReceiptIcon,
  CloudUpload as UploadIcon,
  ArrowBack as BackIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useBusiness } from '../context/BusinessContext';
import { importApi } from '../api/import';

type ImportType = 'customers' | 'products' | 'invoices';

interface ImportTypeOption {
  type: ImportType;
  label: string;
  source: string;
  description: string;
  icon: React.ReactNode;
}

const importTypes: ImportTypeOption[] = [
  {
    type: 'customers',
    label: 'Customers',
    source: 'Khatabook',
    description: 'Import customer ledgers and contact details from Khatabook',
    icon: <PeopleIcon sx={{ fontSize: 48 }} />,
  },
  {
    type: 'products',
    label: 'Products',
    source: 'Khatabook/GoGST',
    description: 'Import product catalog with HSN codes and pricing',
    icon: <InventoryIcon sx={{ fontSize: 48 }} />,
  },
  {
    type: 'invoices',
    label: 'Invoices',
    source: 'GoGST',
    description: 'Import sales invoices from GoGST GSTR-1 data',
    icon: <ReceiptIcon sx={{ fontSize: 48 }} />,
  },
];

const columnMappings: Record<ImportType, string[]> = {
  customers: ['Name', 'Phone', 'Email', 'GSTIN', 'Address', 'City', 'State', 'Pincode', 'Opening Balance', 'Credit Limit', 'Date', 'Details', 'Debit', 'Credit'],
  products: ['Name', 'Product Name', 'SKU', 'Barcode', 'Barcode no',
    'HSN Code', 'HSN/SAC Code', 'Unit', 'Unit of Measurement',
    'Selling Price', 'Sell Price', 'Purchase Price', 'MRP',
    'Tax Rate', 'CGST %', 'SGST %', 'IGST %', 'CESS %',
    'Stock', 'Stock Available', 'Low Stock Alert',
    'Is Service', 'Is Service Product ?', 'Barcode',
    'Product Note', 'Product Type', 'Product Group', 'Model No.',
  ],
  invoices: [
    'Invoice No', 'Invoice Id', 'Date', 'Invoice Date', 'Due Date',
    'Customer Name', 'Company Name', 'Customer Phone', 'Phone No',
    'Customer GSTIN', 'GST NO', 'Customer Address', 'Address', 'Customer State', 'State',
    'Place of Supply', 'Reverse Charge', 'Reverse Tax',
    'PO No', 'Challan No', 'Challan Date', 'LR No', 'Payment Type',
    'Subtotal', 'Taxable Value', 'Taxble Value Total', 'Discount',
    'Total Quantity', 'Quantity Total',
    'CGST', 'CGST Total', 'SGST', 'SGST Total', 'IGST', 'IGST Total',
    'CGST Rate', 'CGST %', 'SGST Rate', 'SGST %', 'IGST Rate', 'IGST %',
    'CESS Total', 'CESS Rate', 'CESS %', 'CESS Amount',
    'Tax Amount', 'Tax Total', 'Grand Total',
    'Total in Words', 'Notes', 'Document Note',
    'EWay No', 'EWay Bill No', 'EWay Bill Date',
    'Transport Id', 'Transporter ID', 'Transport Name', 'Transporter Name',
    'Vehicle No', 'Distance Km',
    'IRN', 'IRN No', 'IRN Date', 'ACK No', 'ACK Date',
    'Shipping Name', 'Shipping Address', 'Shipping Phone No', 'Shipping Email',
  ],
};

const steps = ['Select Type', 'Upload & Map', 'Import Results'];

export default function ImportPage() {
  const { currentBusinessId } = useBusiness();
  const [activeStep, setActiveStep] = useState(0);
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);
  const [allRawRows, setAllRawRows] = useState<Record<string, string>[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const handleSelectType = (type: ImportType) => {
    setImportType(type);
    setActiveStep(1);
  };

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected || !currentBusinessId || !importType) return;

    setFile(selected);
    setError('');
    setParsing(true);
    setHeaders([]);
    setPreviewRows([]);
    setColumnMap({});

    try {
      const { data } = await importApi.parseCsv(currentBusinessId, selected);
      const parsed = data as { headers: string[]; rows: any[][]; totalRows: number };
      setHeaders(parsed.headers || []);
      // Backend returns rows as string[][] arrays — convert to objects for mapping
      const headers = parsed.headers || [];
      const objectRows = (parsed.rows || []).map((row: any[]) => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => obj[h] = String(row[i] ?? ''));
        return obj;
      });
      setAllRows(objectRows);
      setAllRawRows(objectRows);
      setPreviewRows(objectRows.slice(0, 10));

      const autoMap: Record<string, string> = {};
      const targets = columnMappings[importType];
      for (const target of targets) {
        const targetNorm = target.toLowerCase().replace(/[\s_\/-]/g, '');
        const match = parsed.headers.find((h: string) => {
          const headerNorm = h.toLowerCase().replace(/[\s_\/-]/g, '');
          return headerNorm === targetNorm || headerNorm.includes(targetNorm) || targetNorm.includes(headerNorm);
        });
        if (match) autoMap[target] = match;
      }
      setColumnMap(autoMap);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to parse file. Please check the file format.',
      );
    } finally {
      setParsing(false);
    }
  }, [currentBusinessId, importType]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      const input = document.getElementById('file-upload') as HTMLInputElement;
      if (input) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(dropped);
        input.files = dataTransfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }, []);

  const handleImport = async () => {
    if (!currentBusinessId || !importType || !file) return;

    setImporting(true);
    setImportProgress(0);
    setError('');

    const progressInterval = setInterval(() => {
      setImportProgress((prev) => Math.min(prev + 10, 90));
    }, 300);

    try {
      let response;
      // For XLSX files, import directly via file upload to preserve format
      if (importType === 'invoices' && file.name.match(/\.(xlsx|xls)$/i)) {
        response = await importApi.importInvoicesFromFile(currentBusinessId, file);
      } else if (importType === 'products' && file.name.match(/\.(xlsx|xls)$/i)) {
        response = await importApi.importProductsFromFile(currentBusinessId, file);
      } else {
        const recordsToSend = allRows.map((row) => {
          const mapped: Record<string, string> = { ...row };
          for (const [target, source] of Object.entries(columnMap)) {
            if (source) mapped[target] = row[source] || '';
          }
          return mapped;
        });

        switch (importType) {
          case 'customers':
            response = await importApi.importCustomers(currentBusinessId, recordsToSend);
            break;
          case 'products':
            response = await importApi.importProducts(currentBusinessId, recordsToSend);
            break;
          case 'invoices':
            response = await importApi.importInvoices(currentBusinessId, recordsToSend);
            break;
        }
      }

      clearInterval(progressInterval);
      setImportProgress(100);

      const res = response?.data as { imported?: number; skipped?: number; errors?: string[] };
      setResult({
        imported: res?.imported ?? 0,
        skipped: res?.skipped ?? 0,
        errors: res?.errors ?? [],
      });
      setActiveStep(2);
    } catch (err: unknown) {
      clearInterval(progressInterval);
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Import failed. Please try again.',
      );
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setImportType(null);
    setFile(null);
    setHeaders([]);
    setAllRows([]);
    setAllRawRows([]);
    setPreviewRows([]);
    setColumnMap({});
    setResult(null);
    setError('');
    setImportProgress(0);
  };

  const selectedOption = importTypes.find((t) => t.type === importType);
  const targets = importType ? columnMappings[importType] : [];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Data Import</Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {activeStep === 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {importTypes.map((option) => (
            <Card
              key={option.type}
              variant="outlined"
              sx={{
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                  boxShadow: '0 4px 20px rgba(25, 118, 210, 0.12)',
                },
              }}
            >
              <CardActionArea onClick={() => handleSelectType(option.type)} sx={{ p: 1 }}>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Box sx={{ color: 'primary.main', mb: 2 }}>{option.icon}</Box>
                  <Typography variant="h5" gutterBottom>{option.label}</Typography>
                  <Chip label={option.source} size="small" color="primary" variant="outlined" sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">{option.description}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}

      {activeStep === 1 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
            <IconButton onClick={() => { setActiveStep(0); setFile(null); setHeaders([]); setAllRows([]); setAllRawRows([]); setPreviewRows([]); setColumnMap({}); }}>
              <BackIcon />
            </IconButton>
            <Typography variant="h5">
              Import {selectedOption?.label}
            </Typography>
            <Chip label={selectedOption?.source} size="small" color="primary" variant="outlined" />
          </Box>

          {!file && (
            <Box
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              sx={{
                border: '2px dashed',
                borderColor: 'grey.400',
                borderRadius: 3,
                p: 6,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input
                id="file-upload"
                type="file"
                accept=".csv,.xlsx,.xls,.json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <UploadIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" gutterBottom>Drop your file here</Typography>
              <Typography variant="body2" color="text.secondary">
                or click to browse. Supports CSV, Excel, and JSON files.
              </Typography>
            </Box>
          )}

          {parsing && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 3 }}>
              <CircularProgress size={24} />
              <Typography>Parsing file...</Typography>
            </Box>
          )}

          {file && !parsing && headers.length > 0 && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Chip label={file.name} onDelete={() => { setFile(null); setHeaders([]); setPreviewRows([]); setColumnMap({}); }} />
                <Typography variant="body2" color="text.secondary">
                  {previewRows.length} rows preview
                </Typography>
              </Box>

              <Typography variant="h6" sx={{ mb: 2 }}>Column Mapping</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
                {targets.map((target) => (
                  <TextField
                    key={target}
                    label={target}
                    select
                    size="small"
                    value={columnMap[target] || ''}
                    onChange={(e) => setColumnMap({ ...columnMap, [target]: e.target.value })}
                  >
                    <MenuItem value=""><em>None</em></MenuItem>
                    {headers.map((h) => (
                      <MenuItem key={h} value={h}>{h}</MenuItem>
                    ))}
                  </TextField>
                ))}
              </Box>

              <Typography variant="h6" sx={{ mb: 1 }}>Preview (first 10 rows)</Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {targets.map((t) => (
                        <TableCell key={t} sx={{ fontWeight: 600 }}>{t}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewRows.map((row, i) => (
                      <TableRow key={i}>
                        {targets.map((t) => (
                          <TableCell key={t}>{columnMap[t] ? row[columnMap[t]] || '-' : '-'}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {importing && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>Importing... {importProgress}%</Typography>
                  <LinearProgress variant="determinate" value={importProgress} />
                </Box>
              )}

              <Button
                variant="contained"
                onClick={handleImport}
                disabled={importing || !Object.values(columnMap).some(Boolean)}
                size="large"
              >
                {importing ? <CircularProgress size={20} /> : `Import ${previewRows.length} records`}
              </Button>
            </>
          )}
        </Box>
      )}

      {activeStep === 2 && result && (
        <Box sx={{ maxWidth: 600 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <CheckIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>Import Complete</Typography>
          </Box>

          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <Box>
                <Typography variant="h4" color="success.main">{result.imported}</Typography>
                <Typography variant="body2" color="text.secondary">Imported</Typography>
              </Box>
              <Box>
                <Typography variant="h4" color="warning.main">{result.skipped}</Typography>
                <Typography variant="body2" color="text.secondary">Skipped</Typography>
              </Box>
              <Box>
                <Typography variant="h4" color="error.main">{result.errors.length}</Typography>
                <Typography variant="body2" color="text.secondary">Errors</Typography>
              </Box>
            </Box>
          </Paper>

          {result.errors.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ErrorIcon color="error" /> Errors
              </Typography>
              {result.errors.map((err, i) => (
                <Alert key={i} severity="error" sx={{ mb: 1 }}>{err}</Alert>
              ))}
            </Box>
          )}

          <Button variant="contained" onClick={handleReset}>Import More Data</Button>
        </Box>
      )}
    </Box>
  );
}
