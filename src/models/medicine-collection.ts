import { medicationAppearanceColorName, medicationFormName, type Medication } from './medication';

export type MedicineCollectionView = 'cabinet' | 'list';
export type MedicineCollectionSort = 'name' | 'recent';

export const medicineCollectionSettingKeys = {
  view: 'medicineCollectionView',
  sort: 'medicineCollectionSort',
} as const;

export type MedicineCollectionItemModel = {
  id: string;
  name: string;
  archived: boolean;
  createdAt: string;
  medication: Medication;
  photoUri: string | null;
  accessibilityLabel: string;
};

export function buildMedicineCollectionItems({
  medicines,
  photoUris = {},
  query = '',
  sort = 'name',
  archived,
}: {
  medicines: readonly Medication[] | undefined;
  photoUris?: Readonly<Record<string, string | null | undefined>>;
  query?: string;
  sort?: MedicineCollectionSort;
  archived?: boolean;
}): MedicineCollectionItemModel[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return (medicines ?? [])
    .filter((medicine) => archived === undefined || (medicine.archivedAt !== null) === archived)
    .filter(
      (medicine) =>
        normalizedQuery.length === 0 || medicine.name.toLocaleLowerCase().includes(normalizedQuery),
    )
    .map((medication) => ({
      id: medication.id,
      name: medication.name,
      archived: medication.archivedAt !== null,
      createdAt: medication.createdAt,
      medication,
      photoUri: photoUris[medication.id] ?? null,
      accessibilityLabel: medicineAccessibilityLabel(medication, photoUris[medication.id] != null),
    }))
    .sort((left, right) =>
      sort === 'recent'
        ? right.createdAt.localeCompare(left.createdAt) || compareNames(left.name, right.name)
        : compareNames(left.name, right.name),
    );
}

export function parseMedicineCollectionView(value: string | null): MedicineCollectionView {
  return value === 'list' ? 'list' : 'cabinet';
}

export function parseMedicineCollectionSort(value: string | null): MedicineCollectionSort {
  return value === 'recent' ? 'recent' : 'name';
}

function medicineAccessibilityLabel(medication: Medication, hasPhoto: boolean): string {
  const form = medicationFormName(medication.form).toLocaleLowerCase();
  const archiveState = medication.archivedAt ? 'Archived medicine' : 'Medicine';
  const recognition = hasPhoto
    ? 'Saved medicine photo.'
    : `${medicationAppearanceColorName(medication.appearanceColor)} ${
        medication.form === 'other' ? 'medicine' : `${form} medicine`
      }.`;
  return `${medication.name}. ${archiveState}. ${recognition} Opens medicine details.`;
}

function compareNames(left: string, right: string): number {
  return left.localeCompare(right, undefined, { sensitivity: 'base', numeric: true });
}
