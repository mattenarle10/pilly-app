export const queryKeys = {
  medication: (id: string) => ['medication', id] as const,
  medications: {
    root: ['medications'] as const,
    all: ['medications', 'all'] as const,
    active: ['medications', 'active'] as const,
  },
  scheduledDoses: {
    root: ['scheduled-doses'] as const,
    date: (localDate: string) => ['scheduled-doses', localDate] as const,
  },
  organizerWeek: {
    root: ['organizer-week'] as const,
    range: (localDates: readonly string[]) => ['organizer-week', ...localDates] as const,
  },
  doseHistory: (medicationId: string) => ['dose-history', medicationId] as const,
  setting: (key: string) => ['settings', key] as const,
  plus: {
    root: ['plus'] as const,
    store: ['plus', 'store'] as const,
  },
  exportData: ['export-data'] as const,
} as const;
