import { sharePillyExport } from '@/services/export-files';
import type { PillyExport } from '@/models/export';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

let mockWriteError: Error | null = null;

jest.mock('expo-file-system', () => {
  const instances: MockFile[] = [];

  class MockFile {
    uri: string;
    exists = false;
    create = jest.fn(() => {
      this.exists = true;
    });
    write = jest.fn(() => {
      if (mockWriteError) throw mockWriteError;
    });
    delete = jest.fn(() => {
      this.exists = false;
    });

    constructor(...parts: string[]) {
      this.uri = parts.length === 1 ? parts[0]! : `${parts[0]}/${parts.at(-1)}`;
      this.exists = parts.length === 1;
      instances.push(this);
    }
  }

  return { File: MockFile, Paths: { cache: 'file:///cache' }, __instances: instances };
});
jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

type MockFile = {
  uri: string;
  exists: boolean;
  create: jest.Mock;
  write: jest.Mock;
  delete: jest.Mock;
};

const files = () =>
  (jest.requireMock('expo-file-system') as { __instances: MockFile[] }).__instances;
const mockedSharingAvailable = jest.mocked(Sharing.isAvailableAsync);
const mockedShare = jest.mocked(Sharing.shareAsync);
const mockedPrint = jest.mocked(Print.printToFileAsync);

const data: PillyExport = {
  format: 'pilly-export',
  version: 2,
  exportedAt: '2026-08-13T01:00:00.000Z',
  profile: { displayName: '' },
  medicines: [],
  doseRecords: [],
  doseEvents: [],
  supplyEvents: [],
};

describe('export file sharing', () => {
  beforeEach(() => {
    mockWriteError = null;
    files().length = 0;
    mockedSharingAvailable.mockResolvedValue(true);
    mockedShare.mockResolvedValue(undefined);
    mockedPrint.mockResolvedValue({ uri: 'file:///cache/print.pdf', numberOfPages: 1 });
  });

  afterEach(() => jest.clearAllMocks());

  test('deletes the private JSON cache file after sharing', async () => {
    await sharePillyExport(data, 'json');

    const file = files()[0]!;
    expect(file.create).toHaveBeenCalledTimes(1);
    expect(file.write).toHaveBeenCalledWith(expect.stringContaining('"pilly-export"'));
    expect(mockedShare).toHaveBeenCalledWith(
      file.uri,
      expect.objectContaining({ mimeType: 'application/json' }),
    );
    expect(file.delete).toHaveBeenCalledTimes(1);
  });

  test('deletes a partial cache file when sharing fails', async () => {
    mockedShare.mockRejectedValue(new Error('cancelled'));

    await expect(sharePillyExport(data, 'csv')).rejects.toThrow('cancelled');

    expect(files()[0]!.delete).toHaveBeenCalledTimes(1);
  });

  test('deletes a partial cache file when writing fails', async () => {
    mockWriteError = new Error('disk full');

    await expect(sharePillyExport(data, 'json')).rejects.toThrow('disk full');
    expect(files()[0]!.delete).toHaveBeenCalledTimes(1);
  });

  test('deletes the generated PDF after sharing', async () => {
    await sharePillyExport(data, 'pdf');

    expect(mockedPrint).toHaveBeenCalledTimes(1);
    expect(mockedShare).toHaveBeenCalledWith(
      'file:///cache/print.pdf',
      expect.objectContaining({ mimeType: 'application/pdf' }),
    );
    expect(files()[0]!.delete).toHaveBeenCalledTimes(1);
  });

  test('does not create a file when the native share sheet is unavailable', async () => {
    mockedSharingAvailable.mockResolvedValue(false);

    await expect(sharePillyExport(data, 'json')).rejects.toThrow('not available');
    expect(files()).toHaveLength(0);
  });
});
