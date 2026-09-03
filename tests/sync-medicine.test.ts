import { syncMedicineSchema } from '@/models/sync';

const baseMedicine = {
  id: '32ab6747-75c2-4222-ac87-b37a05a66221',
  name: 'Medicine',
  instructions: '',
  supplyCount: null,
  appearanceSize: 'medium',
  appearanceColor: '#F3CCD7',
  appearanceSecondaryColor: '#FBE9DE',
  createdAt: '2026-09-03T00:00:00.000Z',
  updatedAt: '2026-09-03T00:00:00.000Z',
  archivedAt: null,
  timeZoneIdentifier: 'Asia/Manila',
};

describe('sync medicine compatibility', () => {
  test('keeps canonical non-pill forms in the version-one envelope', () => {
    expect(
      syncMedicineSchema.parse({ ...baseMedicine, form: 'liquid', tabletShape: 'round' }),
    ).toMatchObject({ form: 'liquid', tabletShape: 'round', appearanceShape: 'capsule' });
  });

  test('normalizes legacy pill geometry and unknown future forms', () => {
    expect(syncMedicineSchema.parse({ ...baseMedicine, appearanceShape: 'oval' })).toMatchObject({
      form: 'tablet',
      tabletShape: 'oval',
      appearanceShape: 'oval',
    });
    expect(
      syncMedicineSchema.parse({ ...baseMedicine, form: 'patch', tabletShape: 'round' }),
    ).toMatchObject({ form: 'other', tabletShape: 'round', appearanceShape: 'capsule' });
  });
});
