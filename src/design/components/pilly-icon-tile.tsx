import { StyleSheet, View } from 'react-native';

import { PillyIcon, type PillyIconName } from '@/design/icons';
import { colors, radii } from '@/design/tokens';

type Props = {
  icon: PillyIconName;
  tone?: 'brand' | 'peach' | 'lavender';
  size?: 'medium' | 'large';
};
export function PillyIconTile({ icon, tone = 'brand', size = 'medium' }: Props) {
  return (
    <View style={[styles.base, sizes[size], tones[tone]]}>
      <PillyIcon name={icon} size={size === 'large' ? 26 : 21} color={colors.brand} />
    </View>
  );
}
const styles = StyleSheet.create({
  base: { flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
});
const sizes = StyleSheet.create({
  medium: { width: 40, height: 40, borderRadius: radii.md },
  large: { width: 52, height: 52, borderRadius: radii.md },
});
const tones = StyleSheet.create({
  brand: { backgroundColor: colors.brandSoft },
  peach: { backgroundColor: colors.peachSoft },
  lavender: { backgroundColor: colors.lavenderSoft },
});
