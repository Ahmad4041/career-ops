import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_COLUMN_VISIBILITY,
  listVisibleOptionalColumns,
  loadTableColumns,
  saveTableColumns,
  tableColumnCount,
  toggleColumn,
} from '@/lib/table-columns';

const STORAGE_KEY = 'careerOpsTableColumns';

describe('table-columns', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
      clear() {
        this.store = {};
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns defaults when localStorage is empty', () => {
    expect(loadTableColumns()).toEqual(DEFAULT_COLUMN_VISIBILITY);
  });

  it('persists and merges saved visibility', () => {
    saveTableColumns({ ...DEFAULT_COLUMN_VISIBILITY, report: true, date: false });
    expect(loadTableColumns()).toEqual({
      ...DEFAULT_COLUMN_VISIBILITY,
      report: true,
      date: false,
    });
  });

  it('ignores invalid localStorage JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadTableColumns()).toEqual(DEFAULT_COLUMN_VISIBILITY);
  });

  it('toggleColumn flips one optional column', () => {
    const next = toggleColumn(DEFAULT_COLUMN_VISIBILITY, 'pdf');
    expect(next.pdf).toBe(true);
    expect(next.date).toBe(true);
  });

  it('listVisibleOptionalColumns respects defaults', () => {
    expect(listVisibleOptionalColumns(DEFAULT_COLUMN_VISIBILITY)).toEqual([
      'date',
      'location',
      'pay',
    ]);
  });

  it('tableColumnCount is fixed plus visible optional', () => {
    expect(tableColumnCount(DEFAULT_COLUMN_VISIBILITY)).toBe(10);
    expect(tableColumnCount({ ...DEFAULT_COLUMN_VISIBILITY, report: true, pdf: true })).toBe(12);
  });
});
