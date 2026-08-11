import { Text, type TextProps } from 'react-native';
import { colors, typography, type TextRole } from '@/ui/tokens';

type PillyTextProps = Omit<TextProps, 'role'> & { role?: TextRole; muted?: boolean };
export function PillyText({ role = 'body', muted = false, style, ...props }: PillyTextProps) {
  return (
    <Text
      allowFontScaling
      style={[
        typography[role],
        { color: muted ? colors.textSecondary : colors.textPrimary },
        style,
      ]}
      {...props}
    />
  );
}
