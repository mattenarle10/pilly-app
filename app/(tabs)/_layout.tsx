import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { colors } from '@/design/tokens';

export default function TabsLayout() {
  return (
    <NativeTabs
      tintColor={colors.brand}
      iconColor={{ default: colors.textSecondary, selected: colors.brand }}
      labelStyle={{
        default: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
        selected: { color: colors.brand, fontSize: 11, fontWeight: '600' },
      }}
      blurEffect="systemUltraThinMaterial"
      minimizeBehavior="never"
      shadowColor="transparent"
      disableIndicator
    >
      <NativeTabs.Trigger name="today">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'sun.max', selected: 'sun.max.fill' }}
          md={{ default: 'today', selected: 'today' }}
        />
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="week">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'calendar', selected: 'calendar.circle.fill' }}
          md={{ default: 'calendar_month', selected: 'calendar_month' }}
        />
        <NativeTabs.Trigger.Label>Week</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="medicines">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'cross.case', selected: 'cross.case.fill' }}
          md={{ default: 'medication', selected: 'medication' }}
        />
        <NativeTabs.Trigger.Label>Medicines</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
