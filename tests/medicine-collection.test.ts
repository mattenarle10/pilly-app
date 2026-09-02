import {
  buildMedicineCollectionItems,
  parseMedicineCollectionSort,
  parseMedicineCollectionView,
} from '@/models/medicine-collection';
import { buildMedication } from './support/builders';

describe('medicine collection presentation', () => {
  const medicines = [
    buildMedication({
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Zinc 10',
      createdAt: '2026-08-01T00:00:00.000Z',
    }),
    buildMedication({
      id: '00000000-0000-4000-8000-000000000002',
      name: 'zinc 2',
      createdAt: '2026-09-01T00:00:00.000Z',
    }),
    buildMedication({
      id: '00000000-0000-4000-8000-000000000003',
      name: 'Archived capsule',
      archivedAt: '2026-09-02T00:00:00.000Z',
    }),
  ];

  test('filters active medicines and sorts names naturally', () => {
    expect(
      buildMedicineCollectionItems({ medicines, archived: false }).map((item) => item.name),
    ).toEqual(['zinc 2', 'Zinc 10']);
  });

  test('searches without case sensitivity and sorts recent records', () => {
    expect(
      buildMedicineCollectionItems({
        medicines,
        archived: false,
        query: 'ZINC',
        sort: 'recent',
      }).map((item) => item.name),
    ).toEqual(['zinc 2', 'Zinc 10']);
  });

  test('keeps photo lookup and accessibility output deterministic', () => {
    const [item] = buildMedicineCollectionItems({
      medicines,
      archived: true,
      photoUris: { '00000000-0000-4000-8000-000000000003': 'file:///photo.jpg' },
    });

    expect(item).toMatchObject({
      name: 'Archived capsule',
      photoUri: 'file:///photo.jpg',
      accessibilityLabel:
        'Archived capsule. Archived medicine. Saved medicine photo. Opens medicine details.',
    });
  });

  test('uses safe preference defaults', () => {
    expect(parseMedicineCollectionView(null)).toBe('cabinet');
    expect(parseMedicineCollectionView('unknown')).toBe('cabinet');
    expect(parseMedicineCollectionView('list')).toBe('list');
    expect(parseMedicineCollectionSort(null)).toBe('name');
    expect(parseMedicineCollectionSort('recent')).toBe('recent');
  });
});
