import type { TextStyle } from 'react-native';

export type TextRole = 'large-title' | 'title' | 'headline' | 'body' | 'label' | 'caption';

export const typography: Record<TextRole, TextStyle> = {
  'large-title': { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.3 },
  title: { fontSize: 20, lineHeight: 25, fontWeight: '700', letterSpacing: -0.1 },
  headline: { fontSize: 16, lineHeight: 21, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
};

// Controls use the native single-line vertical metrics. Paragraph line heights
// belong to Text, not TextInput.
export const controlTypography: TextStyle = {
  fontSize: 15,
  fontWeight: '400',
};
