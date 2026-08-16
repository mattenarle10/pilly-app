import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { nativeTabIcons } from '@/ui/icons';
import { colors } from '@/ui/tokens';

export default function TabsLayout() {
  return (
    <NativeTabs
      tintColor={colors.brand}
      iconColor={{ default: colors.textSecondary, selected: colors.brand }}
      labelStyle={{
        default: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
        selected: { color: colors.brand, fontSize: 11, fontWeight: '600' },
      }}
      minimizeBehavior="onScrollDown"
      disableIndicator
    >
      <NativeTabs.Trigger name="today">
        <NativeTabs.Trigger.Icon sf={nativeTabIcons.today.sf} md={nativeTabIcons.today.md} />
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="week">
        <NativeTabs.Trigger.Icon sf={nativeTabIcons.week.sf} md={nativeTabIcons.week.md} />
        <NativeTabs.Trigger.Label>Week</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="medicines">
        <NativeTabs.Trigger.Icon
          sf={nativeTabIcons.medicines.sf}
          md={nativeTabIcons.medicines.md}
        />
        <NativeTabs.Trigger.Label>Medicines</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
