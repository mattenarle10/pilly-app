import { Text, type TextProps, type TextStyle } from 'react-native';
import { colors } from '@/design/tokens';

type TextRole = 'large-title' | 'title' | 'headline' | 'body' | 'label' | 'caption';
const roleStyles: Record<TextRole, TextStyle> = {
  'large-title': { fontSize: 34, lineHeight: 41, fontWeight: '700' },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 24, fontWeight: '400' },
  label: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  caption: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
};

type PillyTextProps = Omit<TextProps, 'role'> & { role?: TextRole; muted?: boolean };
export function PillyText({ role = 'body', muted = false, style, ...props }: PillyTextProps) {
  return (
    <Text
      allowFontScaling
      style={[
        roleStyles[role],
        { color: muted ? colors.textSecondary : colors.textPrimary },
        style,
      ]}
      {...props}
    />
  );
}
