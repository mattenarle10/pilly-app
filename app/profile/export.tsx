import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';

import { exportSummary } from '@/models/export';
import { sharePillyExport, type ExportFileKind } from '@/services/export-files';
import { isPlusPurchasesSupported } from '@/services/purchases';
import { useExportData, usePlus } from '@/hooks';
import { PillyBanner, PillyCard, PillyIconButton, PillyText, Screen } from '@/ui/components';
import { PillyIcon, type PillyIconName } from '@/ui/icons';
import { colors, spacing } from '@/ui/tokens';

export default function ExportDataRoute() {
  const data = useExportData();
  const plus = usePlus();
  const [sharing, setSharing] = useState<ExportFileKind | null>(null);
  const sharingRef = useRef(false);
  const [shareError, setShareError] = useState(false);
  const summary = data.data ? exportSummary(data.data) : null;
  const isPlus = plus.state.active;
  const plusSupported = isPlusPurchasesSupported();

  const leave = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/profile');
  };

  const share = async (kind: ExportFileKind) => {
    if (!data.data || sharingRef.current) return;
    if (kind !== 'json' && !plusSupported) return;
    if (kind !== 'json' && !isPlus) {
      router.push('/plus');
      return;
    }
    sharingRef.current = true;
    setSharing(kind);
    setShareError(false);
    try {
      await sharePillyExport(data.data, kind);
    } catch {
      setShareError(true);
    } finally {
      sharingRef.current = false;
      setSharing(null);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackVisible: false,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTitleAlign: 'center',
          headerTitleStyle: { color: colors.textPrimary, fontWeight: '600' },
          headerLeft: () => <PillyIconButton icon="back" label="Back" onPress={leave} />,
          title: 'Export data',
        }}
      />
      <Screen
        safeAreaEdges={['bottom']}
        contentInsetAdjustmentBehavior="never"
        contentStyle={styles.screen}
      >
        <View style={styles.intro}>
          <PillyText role="title" accessibilityRole="header">
            Your data, ready to take with you.
          </PillyText>
          <PillyText muted>
            Files are created on this device and shared only when you choose where to send them.
          </PillyText>
        </View>

        {data.isLoading ? (
          <View accessibilityLabel="Preparing export" style={styles.loading}>
            <ActivityIndicator color={colors.brand} />
            <PillyText role="caption" muted>
              Preparing your records…
            </PillyText>
          </View>
        ) : data.isError ? (
          <PillyBanner
            kind="error"
            title="Couldn’t prepare your export"
            message="Your saved data is unchanged."
            actionLabel="Try again"
            onAction={() => void data.refetch()}
          />
        ) : summary ? (
          <>
            <PillyCard tone="lavender" padding="medium" style={styles.summary}>
              <SummaryValue value={summary.medicines} label="Medicines" />
              <SummaryValue value={summary.schedules} label="Schedules" />
              <SummaryValue value={summary.records} label="Records" />
            </PillyCard>

            <View style={styles.options}>
              <ExportOption
                icon="document"
                title="Pilly data"
                message="A complete readable JSON copy. Always free."
                loading={sharing === 'json'}
                onPress={() => void share('json')}
              />
              <View style={styles.separator} />
              <ExportOption
                icon="calendar"
                title="Dose history spreadsheet"
                message={
                  !plusSupported
                    ? 'Currently available on iPhone.'
                    : isPlus
                      ? 'CSV for sorting and analysis.'
                      : 'CSV · Included with Plus'
                }
                locked={!isPlus}
                disabled={!plusSupported}
                loading={sharing === 'csv'}
                onPress={() => void share('csv')}
              />
              <View style={styles.separator} />
              <ExportOption
                icon="print"
                title="Medicine plan PDF"
                message={
                  !plusSupported
                    ? 'Currently available on iPhone.'
                    : isPlus
                      ? 'Print or share a clean medicine plan.'
                      : 'Print-ready · Included with Plus'
                }
                locked={!isPlus}
                disabled={!plusSupported}
                loading={sharing === 'pdf'}
                onPress={() => void share('pdf')}
              />
            </View>
          </>
        ) : null}

        {shareError ? (
          <PillyBanner kind="error" message="That file couldn’t be shared. Try again." compact />
        ) : null}

        <View style={styles.privacy}>
          <PillyIcon name="private" size={18} color={colors.brand} />
          <PillyText role="caption" muted style={styles.privacyCopy}>
            Exports can contain sensitive medicine information. Choose a private destination.
          </PillyText>
        </View>
      </Screen>
    </>
  );
}

function SummaryValue({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.summaryValue}>
      <PillyText role="title">{value}</PillyText>
      <PillyText role="caption" muted>
        {label}
      </PillyText>
    </View>
  );
}

function ExportOption({
  icon,
  title,
  message,
  locked = false,
  disabled = false,
  loading = false,
  onPress,
}: {
  icon: PillyIconName;
  title: string;
  message: string;
  locked?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={disabled ? message : locked ? 'Opens Pilly Plus' : message}
      accessibilityState={{ busy: loading, disabled }}
      disabled={loading || disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {({ pressed }) => (
        <>
          <View style={styles.optionIcon}>
            {loading ? (
              <ActivityIndicator color={colors.brand} />
            ) : (
              <PillyIcon name={icon} size={21} color={colors.brand} active={pressed} />
            )}
          </View>
          <View style={styles.optionCopy}>
            <PillyText role="label">{title}</PillyText>
            <PillyText role="caption" muted>
              {message}
            </PillyText>
          </View>
          <PillyIcon name={locked ? 'unlock' : 'next'} size={18} color={colors.textSecondary} />
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  intro: { gap: spacing.sm, paddingHorizontal: spacing.xs },
  loading: {
    minHeight: 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  summary: { flexDirection: 'row', justifyContent: 'space-around', gap: spacing.sm },
  summaryValue: { flex: 1, alignItems: 'center', gap: spacing.xs },
  options: { overflow: 'hidden', borderRadius: 20, backgroundColor: colors.glass },
  option: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  optionIcon: { width: 32, alignItems: 'center' },
  optionCopy: { flex: 1, gap: spacing.xs },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 64, backgroundColor: colors.border },
  pressed: { backgroundColor: colors.surfaceSubtle },
  disabled: { opacity: 0.5 },
  privacy: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  privacyCopy: { flex: 1 },
});
