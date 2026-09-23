import ExcelJS from 'exceljs';
import { CollectionService } from './collection.service';

function createService(ingestion: 'CREE' | 'MIS_A_JOUR' | 'DOUBLON' = 'CREE') {
  const source = { id: 12, name: 'Import laboratoire', sourceType: 'IMPORT_MANUEL', active: true };
  const connectorRepository = { findOne: vi.fn().mockResolvedValue(null), save: vi.fn() };
  const runRepository = {
    create: vi.fn((value) => value),
    save: vi.fn(async (value) => ({ id: value.id ?? 91, ...value })),
  };
  const sourceRepository = { findOne: vi.fn().mockResolvedValue(source) };
  const normalizationService = { normalize: vi.fn((_source, item) => item) };
  const watchItemsService = { ingest: vi.fn().mockResolvedValue(ingestion) };
  const auditService = { log: vi.fn().mockResolvedValue(undefined) };
  const service = new CollectionService(
    {} as never,
    connectorRepository as never,
    runRepository as never,
    sourceRepository as never,
    {} as never,
    normalizationService as never,
    watchItemsService as never,
    auditService as never,
  );
  return { service, watchItemsService, auditService };
}

describe('CollectionService import manuel', () => {
  it('importe un CSV, normalise les données et journalise le résultat', async () => {
    const { service, watchItemsService, auditService } = createService();
    const result = await service.importManual(12, {
      originalname: 'veille.csv',
      size: 160,
      buffer: Buffer.from('\uFEFFtitre;resume;url;date_publication\r\nPublication test;Résumé;https://example.org/item;22/09/2026'),
    }, 4);

    expect(result).toMatchObject({ received: 1, created: 1, updated: 0, duplicates: 0, errors: 0 });
    expect(watchItemsService.ingest).toHaveBeenCalledOnce();
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({
      userId: 4,
      action: 'IMPORT_MANUAL_ITEMS',
      entity: 'collection_runs',
    }));
  });

  it('importe également un classeur XLSX', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Veille');
    sheet.addRow(['titre', 'resume', 'url', 'date_publication']);
    sheet.addRow(['Publication Excel', 'Résumé Excel', 'https://example.org/excel', '2026-09-22']);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const { service } = createService('DOUBLON');

    const result = await service.importManual(12, {
      originalname: 'veille.xlsx',
      size: buffer.length,
      buffer,
    }, 4);

    expect(result).toMatchObject({ received: 1, created: 0, duplicates: 1, errors: 0 });
  });
});
