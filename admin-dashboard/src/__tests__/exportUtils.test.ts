import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  exportToCsv,
  exportToJson,
  exportToXlsx,
  exportToPdf,
  exportData,
  fetchAllPages,
} from '../utils/exportUtils';

let capturedBlob: Blob | null = null;
let capturedFilename = '';

function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

function readBlobRaw(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

function setupBlobCapture() {
  capturedBlob = null;
  capturedFilename = '';
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    capturedBlob = blob as Blob;
    return 'blob:mock';
  });
  vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined);
  vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
    const el = node as HTMLAnchorElement;
    if (el.tagName === 'A') {
      capturedFilename = el.download;
    }
    return node;
  });
  vi.spyOn(document.body, 'removeChild').mockImplementation((n) => n);
}

// ── exportToCsv ────────────────────────────────────────────────────────────────
describe('exportToCsv', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setupBlobCapture();
  });

  it('exports normal data correctly', async () => {
    exportToCsv(['Name', 'Age'], [['Alice', 30], ['Bob', 25]], 'users');

    expect(capturedBlob).not.toBeNull();
    expect(capturedFilename).toBe('users.csv');
    const text = await readBlobText(capturedBlob!);
    expect(text).toContain('Name,Age');
    expect(text).toContain('Alice,30');
    expect(text).toContain('Bob,25');
  });

  it('escapes commas in cell values', async () => {
    exportToCsv(['Name', 'City'], [['Alice', 'New York, NY']], 'data');
    const text = await readBlobText(capturedBlob!);
    expect(text).toContain('"New York, NY"');
  });

  it('escapes double quotes in cell values', async () => {
    exportToCsv(['Name', 'Bio'], [['Alice', 'She said "hello"']], 'data');
    const text = await readBlobText(capturedBlob!);
    expect(text).toContain('"She said ""hello"""');
  });

  it('escapes newlines in cell values', async () => {
    exportToCsv(['Name', 'Notes'], [['Alice', 'Line1\nLine2']], 'data');
    const text = await readBlobText(capturedBlob!);
    expect(text).toContain('"Line1\nLine2"');
  });

  it('handles empty rows', async () => {
    exportToCsv(['Name'], [['Alice'], [], ['Bob']], 'data');
    const text = await readBlobText(capturedBlob!);
    const lines = text.split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });

  it('handles null/undefined cell values gracefully', async () => {
    exportToCsv(['Name', 'Age'], [['Alice', undefined as unknown as string]], 'data');
    const text = await readBlobText(capturedBlob!);
    expect(text).toContain('Alice,');
  });

  it('includes BOM header for UTF-8', async () => {
    exportToCsv(['Col'], [['val']], 'f');
    const raw = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(capturedBlob!);
    });
    const bytes = new Uint8Array(raw);
    expect(bytes[0]).toBe(0xEF);
    expect(bytes[1]).toBe(0xBB);
    expect(bytes[2]).toBe(0xBF);
  });

  it('handles special unicode characters', async () => {
    exportToCsv(['Name'], [['日本語テスト']], 'unicode');
    const text = await readBlobText(capturedBlob!);
    expect(text).toContain('日本語テスト');
  });

  it('handles emoji in cell values', async () => {
    exportToCsv(['Emoji'], [['🎉🚀']], 'emoji');
    const text = await readBlobText(capturedBlob!);
    expect(text).toContain('🎉🚀');
  });
});

// ── exportToJson ───────────────────────────────────────────────────────────────
describe('exportToJson', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setupBlobCapture();
  });

  it('exports normal data as JSON', async () => {
    exportToJson(['Name', 'Age'], [['Alice', 30]], 'users');
    expect(capturedBlob).not.toBeNull();
    expect(capturedFilename).toBe('users.json');
    const text = await readBlobText(capturedBlob!);
    const parsed = JSON.parse(text);
    expect(parsed).toEqual([{ Name: 'Alice', Age: 30 }]);
  });

  it('exports empty array', async () => {
    exportToJson(['Name'], [], 'empty');
    const text = await readBlobText(capturedBlob!);
    expect(JSON.parse(text)).toEqual([]);
  });

  it('handles nested objects via jsonData param', async () => {
    const nested = [{ name: 'Alice', address: { city: 'NY', zip: '10001' } }];
    exportToJson(['Name'], [], 'nested', nested);
    const text = await readBlobText(capturedBlob!);
    const parsed = JSON.parse(text);
    expect(parsed[0].address.city).toBe('NY');
  });

  it('handles null values in jsonData', async () => {
    const data = [{ name: 'Alice', age: null }];
    exportToJson(['Name'], [], 'nulls', data);
    const text = await readBlobText(capturedBlob!);
    const parsed = JSON.parse(text);
    expect(parsed[0].age).toBeNull();
  });

  it('handles undefined values in rows mapping', async () => {
    exportToJson(['Name', 'Missing'], [['Alice']], 'undef');
    const text = await readBlobText(capturedBlob!);
    const parsed = JSON.parse(text);
    expect(parsed[0].Missing).toBe('');
  });

  it('formats JSON with 2-space indentation', async () => {
    exportToJson(['Name'], [['Alice']], 'pretty');
    const text = await readBlobText(capturedBlob!);
    expect(text).toContain('  "Name": "Alice"');
  });
});

// ── exportToXlsx ───────────────────────────────────────────────────────────────
describe('exportToXlsx', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('exports normal data without throwing', () => {
    expect(() => {
      exportToXlsx(['Name', 'Age'], [['Alice', 30]], 'users');
    }).not.toThrow();
  });

  it('handles empty rows', () => {
    expect(() => {
      exportToXlsx(['Name'], [], 'empty');
    }).not.toThrow();
  });

  it('handles data with empty string values', () => {
    expect(() => {
      exportToXlsx(['A', 'B'], [['', '']], 'blank');
    }).not.toThrow();
  });
});

// ── exportToPdf ────────────────────────────────────────────────────────────────
describe('exportToPdf', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('opens a new window and writes HTML', () => {
    const writeSpy = vi.fn();
    const closeSpy = vi.fn();
    const mockWindow = {
      document: { write: writeSpy, close: closeSpy },
    };
    vi.spyOn(window, 'open').mockReturnValue(mockWindow as unknown as Window);

    exportToPdf('My Report', ['Name', 'Age'], [['Alice', 30]], 'report');

    expect(window.open).toHaveBeenCalledWith('', '_blank');
    expect(writeSpy).toHaveBeenCalledTimes(1);
    const html = writeSpy.mock.calls[0][0] as string;
    expect(html).toContain('<title>My Report</title>');
    expect(html).toContain('<h2>My Report</h2>');
    expect(html).toContain('Name');
    expect(html).toContain('Alice');
    expect(html).toContain('30');
    expect(html).toContain('1 records');
    expect(closeSpy).toHaveBeenCalled();
  });

  it('does nothing if window.open returns null', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    expect(() => {
      exportToPdf('Title', ['Col'], [['val']], 'file');
    }).not.toThrow();
  });
});

// ── exportData (router) ───────────────────────────────────────────────────────
describe('exportData', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setupBlobCapture();
  });

  it('calls exportToCsv for csv format', async () => {
    exportData({ headers: ['Name'], rows: [['Alice']], filename: 'test' }, 'csv');
    expect(capturedBlob).not.toBeNull();
    expect(capturedFilename).toBe('test.csv');
  });

  it('calls exportToJson for json format', async () => {
    exportData({ headers: ['Name'], rows: [['Alice']], filename: 'test' }, 'json');
    expect(capturedBlob).not.toBeNull();
    expect(capturedFilename).toBe('test.json');
  });

  it('uses title fallback to filename for pdf', () => {
    const writeSpy = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({
      document: { write: writeSpy, close: vi.fn() },
    } as unknown as Window);

    exportData({ headers: ['A'], rows: [[1]], filename: 'myFile', title: 'My Title' }, 'pdf');
    const html = writeSpy.mock.calls[0][0] as string;
    expect(html).toContain('My Title');
  });

  it('falls back to filename when title is undefined', () => {
    const writeSpy = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({
      document: { write: writeSpy, close: vi.fn() },
    } as unknown as Window);

    exportData({ headers: ['A'], rows: [[1]], filename: 'Fallback' }, 'pdf');
    const html = writeSpy.mock.calls[0][0] as string;
    expect(html).toContain('Fallback');
  });
});

// ── fetchAllPages ──────────────────────────────────────────────────────────────
describe('fetchAllPages', () => {
  it('returns data from a single page', async () => {
    const listFn = vi.fn().mockResolvedValue({
      data: { data: ['a', 'b'], meta: { total: 2 } },
    });

    const result = await fetchAllPages(listFn);
    expect(result).toEqual(['a', 'b']);
    expect(listFn).toHaveBeenCalledOnce();
    expect(listFn).toHaveBeenCalledWith({ page: 1, limit: 500 });
  });

  it('fetches multiple pages when total exceeds PAGE_SIZE', async () => {
    const page1 = { data: { data: [1, 2], meta: { total: 600 } } };
    const page2 = { data: { data: [3], meta: { total: 600 } } };
    const listFn = vi.fn()
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2);

    const result = await fetchAllPages(listFn);
    expect(result).toEqual([1, 2, 3]);
    expect(listFn).toHaveBeenCalledTimes(2);
    expect(listFn).toHaveBeenNthCalledWith(1, { page: 1, limit: 500 });
    expect(listFn).toHaveBeenNthCalledWith(2, { page: 2, limit: 500 });
  });

  it('returns empty array when API returns empty data', async () => {
    const listFn = vi.fn().mockResolvedValue({
      data: { data: [], meta: { total: 0 } },
    });

    const result = await fetchAllPages(listFn);
    expect(result).toEqual([]);
  });

  it('handles missing meta.total gracefully', async () => {
    const listFn = vi.fn().mockResolvedValue({
      data: { data: ['x'], meta: {} },
    });

    const result = await fetchAllPages(listFn);
    expect(result).toEqual(['x']);
  });

  it('propagates API errors', async () => {
    const listFn = vi.fn().mockRejectedValue(new Error('Network error'));
    await expect(fetchAllPages(listFn)).rejects.toThrow('Network error');
  });

  it('handles error mid-fetch on page 2', async () => {
    const listFn = vi.fn()
      .mockResolvedValueOnce({ data: { data: [1], meta: { total: 600 } } })
      .mockRejectedValueOnce(new Error('Page 2 failed'));

    await expect(fetchAllPages(listFn)).rejects.toThrow('Page 2 failed');
    expect(listFn).toHaveBeenCalledTimes(2);
  });

  it('concatenates results from many pages', async () => {
    const listFn = vi.fn()
      .mockResolvedValueOnce({ data: { data: Array(500).fill('a'), meta: { total: 1500 } } })
      .mockResolvedValueOnce({ data: { data: Array(500).fill('b'), meta: { total: 1500 } } })
      .mockResolvedValueOnce({ data: { data: Array(500).fill('c'), meta: { total: 1500 } } });

    const result = await fetchAllPages(listFn);
    expect(result).toHaveLength(1500);
    expect(listFn).toHaveBeenCalledTimes(3);
  });
});
