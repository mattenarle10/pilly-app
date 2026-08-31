import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { useAccountSession } from '@/hooks/use-account-session';
import { usePlus } from '@/hooks/use-plus';
import { introductoryOfferLabel, type PlusOffer, type PlusPlan } from '@/services/plus-offers';
import { ConnectedAccountSummary } from '@/ui/components/connected-account-summary';
import { PillyBanner } from '@/ui/components/pilly-banner';
import { PillyButton } from '@/ui/components/pilly-button';
import { PillyText } from '@/ui/components/pilly-text';
import { Screen } from '@/ui/components/screen';
import { PillyIcon, type PillyIconName } from '@/ui/icons';
import { PillyPlusCompanion } from '@/ui/illustrations';
import { colors, radii, shadows, spacing } from '@/ui/tokens';

export default function PlusRoute() {
  const account = useAccountSession();
  const plus = usePlus();
  const [selectedPlan, setSelectedPlan] = useState<PlusPlan>('annual');
  const preview = plus.state.kind === 'preview';
  const signedIn = account.state.kind === 'signed-in';
  const active = signedIn && plus.state.active;
  const offers = plus.state.kind === 'available' ? plus.state.offers : null;
  const selectedOffer = offers?.[selectedPlan] ?? offers?.annual ?? offers?.monthly ?? null;
  const purchaseError = plus.purchase.isError;
  const restoreError = plus.restore.isError;

  const purchase = () => {
    if (!selectedOffer) return;
    void plus.purchase.mutateAsync(selectedOffer.plan).catch(() => undefined);
  };
  const restore = () => {
    void plus.restore.mutateAsync().catch(() => undefined);
  };

  return (
    <Screen
      safeAreaEdges={['bottom']}
      contentInsetAdjustmentBehavior="never"
      contentStyle={styles.screen}
    >
      <View style={styles.hero}>
        <PillyPlusCompanion />
        {preview ? (
          <View style={styles.previewStatus}>
            <PillyIcon name="info" size={16} color={colors.brand} />
            <PillyText role="caption" style={styles.previewStatusLabel}>
              Preview
            </PillyText>
          </View>
        ) : null}
        <PillyText role="large-title" accessibilityRole="header" style={styles.heroTitle}>
          Your medicines, safely backed up.
        </PillyText>
        <PillyText muted style={styles.heroCopy}>
          Private backup, recovery, and photos. Tracking stays local.
        </PillyText>
      </View>

      <View style={styles.actions}>
        {account.state.kind === 'loading' || plus.state.kind === 'loading' ? (
          <View accessibilityLabel="Checking Pilly Plus" style={styles.loading}>
            <ActivityIndicator color={colors.brand} />
            <PillyText role="caption" muted>
              Checking Pilly Plus…
            </PillyText>
          </View>
        ) : account.state.kind !== 'signed-in' ? (
          <PillyButton
            label="Connect account"
            accessibilityHint="Choose Apple or Google on the Account screen"
            onPress={() => router.push('/account')}
            fullWidth
          />
        ) : (
          <View style={styles.connectedSection}>
            <ConnectedAccountSummary
              user={account.state.user}
              active={active}
              onPress={() => router.push('/account')}
            />
            <PillyText role="caption" muted style={styles.centeredCopy}>
              {active && preview
                ? 'Preview access only. Cloud backup remains off.'
                : active
                  ? 'Pilly Plus is active. Cloud backup is available.'
                  : plus.state.kind === 'available'
                    ? 'Choose a plan below. Your free tracker stays unchanged.'
                    : 'Checkout remains off in this build.'}
            </PillyText>
          </View>
        )}

        {plus.state.kind === 'error' ? (
          <PillyBanner
            kind="error"
            title="Couldn’t check Pilly Plus"
            message="Your saved access is unchanged. Try again when you’re connected."
            actionLabel="Try again"
            onAction={() => void plus.retry()}
          />
        ) : null}

        {purchaseError || restoreError ? (
          <PillyBanner
            kind="error"
            title={purchaseError ? 'Purchase not completed' : 'Couldn’t restore purchases'}
            message="Your current access is unchanged. Please try again."
            actionLabel="Dismiss"
            onAction={() => {
              plus.purchase.reset();
              plus.restore.reset();
            }}
          />
        ) : null}
      </View>

      {offers && selectedOffer ? (
        <View style={styles.offerSection}>
          <PillyText role="headline">Choose a plan</PillyText>
          <View style={styles.offerList}>
            {offers.annual ? (
              <PlanOption
                offer={offers.annual}
                selected={selectedOffer.plan === 'annual'}
                onPress={() => setSelectedPlan('annual')}
              />
            ) : null}
            {offers.monthly ? (
              <PlanOption
                offer={offers.monthly}
                selected={selectedOffer.plan === 'monthly'}
                onPress={() => setSelectedPlan('monthly')}
              />
            ) : null}
          </View>
          <PillyButton
            label={`Continue with ${selectedOffer.plan === 'annual' ? 'Annual' : 'Monthly'}`}
            accessibilityHint={`Purchases the ${selectedOffer.plan} Pilly Plus subscription through Apple`}
            onPress={purchase}
            loading={plus.purchase.isPending}
            disabled={plus.restore.isPending}
            fullWidth
          />
          <PillyText role="caption" muted style={styles.purchaseTerms}>
            Renews automatically. Manage or cancel in App Store settings.
          </PillyText>
        </View>
      ) : null}

      {signedIn && !active && plus.state.canRestore ? (
        <PillyButton
          label="Restore purchases"
          variant="quiet"
          size="medium"
          onPress={restore}
          loading={plus.restore.isPending}
          disabled={plus.purchase.isPending}
          tone="brand"
        />
      ) : null}

      <View style={styles.benefitsSection}>
        <PillyText role="headline">With Plus</PillyText>
        <View style={styles.benefits}>
          <Benefit icon="private" title="Private backup" />
          <View style={styles.separator} />
          <Benefit icon="refresh" title="Device recovery" />
          <View style={styles.separator} />
          <Benefit icon="photo" title="Medicine photos" />
        </View>
      </View>

      <View style={styles.freePromise}>
        <PillyText role="label">Core tracking stays free</PillyText>
        <PillyText role="caption" muted>
          Reminders, history, and export stay free.
        </PillyText>
      </View>
    </Screen>
  );
}

function PlanOption({
  offer,
  selected,
  onPress,
}: {
  offer: PlusOffer;
  selected: boolean;
  onPress: () => void;
}) {
  const intro = offer.introductoryOffer ? introductoryOfferLabel(offer.introductoryOffer) : null;
  const title = offer.plan === 'annual' ? 'Annual' : 'Monthly';
  const detail =
    offer.plan === 'annual' && offer.localizedPricePerMonth
      ? `${offer.localizedPricePerMonth} per month`
      : null;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${title}, ${offer.localizedPrice}`}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.offer,
        selected && styles.selectedOffer,
        pressed && styles.pressedOffer,
      ]}
    >
      <View style={styles.offerCopy}>
        <View style={styles.offerTitleRow}>
          <PillyText role="label">{title}</PillyText>
          {intro ? (
            <PillyText role="caption" style={styles.introLabel}>
              {intro}
            </PillyText>
          ) : null}
        </View>
        {detail ? (
          <PillyText role="caption" muted>
            {detail}
          </PillyText>
        ) : null}
      </View>
      <PillyText role="label" style={selected ? styles.selectedPrice : undefined}>
        {offer.localizedPrice}
      </PillyText>
    </Pressable>
  );
}

function Benefit({ icon, title }: { icon: PillyIconName; title: string }) {
  return (
    <View style={styles.benefit}>
      <View style={styles.benefitIcon}>
        <PillyIcon name={icon} size={20} color={colors.brand} />
      </View>
      <PillyText role="label" style={styles.benefitCopy}>
        {title}
      </PillyText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xxl, paddingTop: spacing.sm, paddingBottom: spacing.xxxl },
  hero: { alignItems: 'center', gap: spacing.sm },
  previewStatus: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.round,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.lavenderSoft,
  },
  previewStatusLabel: { color: colors.brand },
  heroTitle: { maxWidth: 340, textAlign: 'center', fontWeight: '600' },
  heroCopy: { maxWidth: 340, textAlign: 'center' },
  benefitsSection: { gap: spacing.md },
  benefits: {
    overflow: 'hidden',
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  benefit: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  benefitIcon: { width: 28, alignItems: 'center' },
  benefitCopy: { flex: 1 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 60, backgroundColor: colors.border },
  freePromise: { gap: spacing.xs, paddingHorizontal: spacing.xs },
  actions: { width: '100%', alignItems: 'center', gap: spacing.sm },
  loading: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  connectedSection: { width: '100%', alignItems: 'center', gap: spacing.sm },
  centeredCopy: { maxWidth: 340, textAlign: 'center' },
  offerSection: { gap: spacing.md },
  offerList: { gap: spacing.sm },
  offer: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  selectedOffer: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  pressedOffer: { opacity: 0.78 },
  offerCopy: { flex: 1, gap: spacing.xs },
  offerTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  introLabel: { color: colors.brand },
  selectedPrice: { color: colors.brand },
  purchaseTerms: { textAlign: 'center', paddingHorizontal: spacing.lg },
});
