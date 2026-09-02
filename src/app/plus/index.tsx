import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useAccountSession } from '@/hooks/use-account-session';
import { usePlus } from '@/hooks/use-plus';
import {
  introductoryOfferLabel,
  plusPurchaseCtaLabel,
  plusPurchaseDisclosure,
  type PlusOffer,
  type PlusPlan,
} from '@/services/plus-offers';
import { PillyBanner } from '@/ui/components/pilly-banner';
import { PillyButton } from '@/ui/components/pilly-button';
import { PillyText } from '@/ui/components/pilly-text';
import { Screen } from '@/ui/components/screen';
import { PillyIcon, type PillyIconName } from '@/ui/icons';
import { PillyPlusCompanion } from '@/ui/illustrations';
import { colors, radii, shadows, spacing } from '@/ui/tokens';

const benefitItems = [
  { icon: 'private', title: 'Private backup', message: 'Medicines, schedules, and history.' },
  { icon: 'refresh', title: 'Easy recovery', message: 'Pick up on another iPhone.' },
  { icon: 'photo', title: 'Medicine photos', message: 'Recognize medicines at a glance.' },
] as const satisfies readonly {
  icon: PillyIconName;
  title: string;
  message: string;
}[];

export default function PlusRoute() {
  const account = useAccountSession();
  const plus = usePlus({ loadAnonymousOffers: true });
  const params = useLocalSearchParams<{
    plan?: string | string[];
    intent?: string | string[];
  }>();
  const requestedPlan = plusPlan(firstParam(params.plan));
  const [selectedPlan, setSelectedPlan] = useState<PlusPlan>(requestedPlan ?? 'annual');
  const [linkError, setLinkError] = useState(false);
  const resumedRestore = useRef(false);
  const preview = plus.state.kind === 'preview';
  const signedIn = account.state.kind === 'signed-in';
  const active = signedIn && plus.state.active;
  const offers = plus.state.kind === 'available' ? plus.state.offers : null;
  const selectedOffer = offers?.[selectedPlan] ?? offers?.annual ?? offers?.monthly ?? null;
  const websiteUrl = secureWebsiteUrl(process.env.EXPO_PUBLIC_WEBSITE_URL);

  useEffect(() => {
    if (
      firstParam(params.intent) !== 'restore' ||
      resumedRestore.current ||
      !signedIn ||
      !plus.state.canRestore ||
      plus.restore.isPending
    ) {
      return;
    }
    resumedRestore.current = true;
    router.setParams({ intent: undefined });
    void plus.restore.mutateAsync().catch(() => undefined);
  }, [params.intent, plus.restore, plus.state.canRestore, signedIn]);

  const continueWithPlan = () => {
    if (!selectedOffer) return;
    if (!signedIn) {
      router.push({
        pathname: '/account',
        params: { returnTo: 'plus', plan: selectedOffer.plan },
      });
      return;
    }
    void plus.purchase.mutateAsync(selectedOffer.plan).catch(() => undefined);
  };
  const restore = () => {
    if (!signedIn) {
      router.push({
        pathname: '/account',
        params: { returnTo: 'plus', plan: selectedPlan, intent: 'restore' },
      });
      return;
    }
    void plus.restore.mutateAsync().catch(() => undefined);
  };
  const openLegalPage = async (path: 'privacy' | 'terms') => {
    if (!websiteUrl) return;
    setLinkError(false);
    try {
      await Linking.openURL(`${websiteUrl}/${path}`);
    } catch {
      setLinkError(true);
    }
  };

  return (
    <Screen
      safeAreaEdges={['bottom']}
      contentInsetAdjustmentBehavior="never"
      contentStyle={styles.screen}
    >
      {active ? (
        <ActivePlus
          preview={preview}
          offline={plus.state.kind === 'active' && plus.state.offline}
          managing={plus.manage.isPending}
          manageError={plus.manage.isError}
          onManage={() => void plus.manage.mutateAsync().catch(() => undefined)}
          onDismissError={plus.manage.reset}
        />
      ) : (
        <>
          <PlusHero preview={preview} />
          <Benefits />

          <View style={styles.decision}>
            {plus.state.kind === 'loading' || account.state.kind === 'loading' ? (
              <LoadingPlans />
            ) : plus.state.kind === 'error' ? (
              <PillyBanner
                kind="error"
                title="Plans are unavailable"
                message="Try again when you’re connected."
                actionLabel="Try again"
                onAction={() => void plus.retry()}
              />
            ) : offers && selectedOffer ? (
              <PurchaseDecision
                offers={offers}
                selectedOffer={selectedOffer}
                signedIn={signedIn}
                purchasing={plus.purchase.isPending}
                restoring={plus.restore.isPending}
                onSelect={setSelectedPlan}
                onContinue={continueWithPlan}
              />
            ) : (
              <UnavailableDecision
                signedIn={signedIn}
                preview={preview}
                onConnect={() =>
                  router.push({
                    pathname: '/account',
                    params: { returnTo: 'plus', plan: selectedPlan },
                  })
                }
              />
            )}

            {plus.purchase.isError || plus.restore.isError ? (
              <PillyBanner
                kind="error"
                title={plus.purchase.isError ? 'Purchase not completed' : 'Restore didn’t finish'}
                message="Your current access is unchanged."
                actionLabel="Dismiss"
                onAction={() => {
                  plus.purchase.reset();
                  plus.restore.reset();
                }}
                compact
              />
            ) : null}
          </View>

          <PlusFooter
            canRestore={plus.state.canRestore}
            restoring={plus.restore.isPending}
            websiteUrl={websiteUrl}
            onRestore={restore}
            onOpenLegal={openLegalPage}
          />
          {linkError ? (
            <PillyBanner kind="error" message="Couldn’t open that page." compact />
          ) : null}
        </>
      )}
    </Screen>
  );
}

function PlusHero({ preview }: { preview: boolean }) {
  return (
    <View style={styles.hero}>
      <PillyPlusCompanion compact />
      {preview ? <PreviewStatus /> : null}
      <PillyText role="large-title" accessibilityRole="header" style={styles.heroTitle}>
        Your routine follows you.
      </PillyText>
      <PillyText muted style={styles.heroCopy}>
        Private backup, recovery, and medicine photos.
      </PillyText>
    </View>
  );
}

function PreviewStatus() {
  return (
    <View style={styles.previewStatus}>
      <PillyIcon name="info" size={15} color={colors.brand} />
      <PillyText role="caption" style={styles.brandText}>
        Preview
      </PillyText>
    </View>
  );
}

function Benefits() {
  return (
    <View style={styles.benefits}>
      {benefitItems.map((benefit, index) => (
        <View key={benefit.title}>
          {index > 0 ? <View style={styles.separator} /> : null}
          <View style={styles.benefit}>
            <View style={styles.benefitIcon}>
              <PillyIcon name={benefit.icon} size={20} color={colors.brand} />
            </View>
            <View style={styles.benefitCopy}>
              <PillyText role="label">{benefit.title}</PillyText>
              <PillyText role="caption" muted>
                {benefit.message}
              </PillyText>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

function PurchaseDecision({
  offers,
  selectedOffer,
  signedIn,
  purchasing,
  restoring,
  onSelect,
  onContinue,
}: {
  offers: Record<PlusPlan, PlusOffer | null>;
  selectedOffer: PlusOffer;
  signedIn: boolean;
  purchasing: boolean;
  restoring: boolean;
  onSelect: (plan: PlusPlan) => void;
  onContinue: () => void;
}) {
  return (
    <>
      <PillyText role="headline" accessibilityRole="header">
        Choose your plan
      </PillyText>
      <View accessibilityRole="radiogroup" style={styles.offerList}>
        {offers.annual ? (
          <PlanOption
            offer={offers.annual}
            selected={selectedOffer.plan === 'annual'}
            onPress={() => onSelect('annual')}
          />
        ) : null}
        {offers.monthly ? (
          <PlanOption
            offer={offers.monthly}
            selected={selectedOffer.plan === 'monthly'}
            onPress={() => onSelect('monthly')}
          />
        ) : null}
      </View>
      <PillyButton
        label={signedIn ? plusPurchaseCtaLabel(selectedOffer) : 'Continue'}
        accessibilityHint={
          signedIn
            ? `Opens Apple purchase confirmation for the ${selectedOffer.plan} plan`
            : 'Connects your Pilly Plus account before purchase'
        }
        onPress={onContinue}
        loading={purchasing}
        disabled={restoring}
        fullWidth
      />
      <PillyText role="caption" muted style={styles.purchaseTerms}>
        {plusPurchaseDisclosure(selectedOffer)}
      </PillyText>
    </>
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
  const interval = offer.plan === 'annual' ? 'per year' : 'per month';
  const monthlyEquivalent =
    offer.plan === 'annual' && offer.localizedPricePerMonth
      ? `${offer.localizedPricePerMonth} per month`
      : null;
  const accessibilityParts = [
    title,
    offer.localizedPrice,
    interval,
    monthlyEquivalent,
    intro,
  ].filter(Boolean);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={accessibilityParts.join(', ')}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.offer,
        selected && styles.selectedOffer,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.offerCopy}>
        <View style={styles.offerTitleRow}>
          <PillyText role="label">{title}</PillyText>
          {intro ? (
            <View style={styles.introBadge}>
              <PillyText role="caption" style={styles.brandText}>
                {intro}
              </PillyText>
            </View>
          ) : null}
        </View>
        {monthlyEquivalent ? (
          <PillyText role="caption" muted>
            {monthlyEquivalent}
          </PillyText>
        ) : null}
      </View>
      <View style={styles.price}>
        <PillyText role="label" style={selected ? styles.brandText : undefined}>
          {offer.localizedPrice}
        </PillyText>
        <PillyText role="caption" muted>
          {interval}
        </PillyText>
      </View>
    </Pressable>
  );
}

function LoadingPlans() {
  return (
    <View accessibilityLabel="Loading Pilly Plus plans" style={styles.loading}>
      <ActivityIndicator color={colors.brand} />
      <PillyText role="caption" muted>
        Loading plans…
      </PillyText>
    </View>
  );
}

function UnavailableDecision({
  signedIn,
  preview,
  onConnect,
}: {
  signedIn: boolean;
  preview: boolean;
  onConnect: () => void;
}) {
  if (!signedIn) {
    return <PillyButton label="Connect account" onPress={onConnect} fullWidth />;
  }
  return (
    <PillyBanner
      kind="info"
      message={
        preview ? 'Subscriptions are unavailable in this preview.' : 'Plans are unavailable.'
      }
      compact
    />
  );
}

function ActivePlus({
  preview,
  offline,
  managing,
  manageError,
  onManage,
  onDismissError,
}: {
  preview: boolean;
  offline: boolean;
  managing: boolean;
  manageError: boolean;
  onManage: () => void;
  onDismissError: () => void;
}) {
  return (
    <>
      <View style={styles.hero}>
        <PillyPlusCompanion compact />
        {preview ? <PreviewStatus /> : null}
        <PillyText role="large-title" accessibilityRole="header" style={styles.heroTitle}>
          Pilly Plus is active.
        </PillyText>
        <PillyText muted style={styles.heroCopy}>
          Your backup and recovery access is ready.
        </PillyText>
      </View>

      {offline ? (
        <PillyBanner kind="info" message="Using saved Plus access while offline." compact />
      ) : null}
      <Benefits />
      <View style={styles.activeActions}>
        {!preview ? (
          <PillyButton
            label="Manage subscription"
            onPress={onManage}
            loading={managing}
            fullWidth
          />
        ) : null}
        <PillyButton
          label="Manage account"
          variant={preview ? 'primary' : 'quiet'}
          size={preview ? 'large' : 'medium'}
          onPress={() => router.push('/account')}
          fullWidth
        />
        {manageError ? (
          <PillyBanner
            kind="error"
            message="Couldn’t open subscription settings."
            actionLabel="Dismiss"
            onAction={onDismissError}
            compact
          />
        ) : null}
      </View>
    </>
  );
}

function PlusFooter({
  canRestore,
  restoring,
  websiteUrl,
  onRestore,
  onOpenLegal,
}: {
  canRestore: boolean;
  restoring: boolean;
  websiteUrl: string | null;
  onRestore: () => void;
  onOpenLegal: (path: 'privacy' | 'terms') => void;
}) {
  return (
    <View style={styles.footer}>
      <View style={styles.footerActions}>
        {canRestore ? (
          <FooterAction
            label={restoring ? 'Restoring…' : 'Restore purchases'}
            onPress={onRestore}
          />
        ) : null}
        {websiteUrl ? (
          <>
            <FooterAction label="Terms" onPress={() => onOpenLegal('terms')} />
            <FooterAction label="Privacy" onPress={() => onOpenLegal('privacy')} />
          </>
        ) : null}
      </View>
      <PillyText role="caption" muted style={styles.freePromise}>
        Pilly’s free tracker stays free.
      </PillyText>
    </View>
  );
}

function FooterAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.footerAction, pressed && styles.pressed]}
    >
      <PillyText role="caption" style={styles.footerActionLabel}>
        {label}
      </PillyText>
    </Pressable>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function plusPlan(value: string | undefined): PlusPlan | null {
  return value === 'annual' || value === 'monthly' ? value : null;
}

function secureWebsiteUrl(value: string | undefined): string | null {
  return value?.startsWith('https://') ? value.replace(/\/$/, '') : null;
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xxxl },
  hero: { alignItems: 'center', gap: spacing.xs },
  heroTitle: { maxWidth: 340, textAlign: 'center', fontWeight: '600' },
  heroCopy: { maxWidth: 330, textAlign: 'center' },
  previewStatus: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.round,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.lavenderSoft,
  },
  brandText: { color: colors.brand },
  benefits: {
    overflow: 'hidden',
    borderRadius: radii.xl,
    backgroundColor: colors.glass,
    ...shadows.soft,
  },
  benefit: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  benefitIcon: { width: 28, alignItems: 'center' },
  benefitCopy: { flex: 1, gap: 2 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 60, backgroundColor: colors.border },
  decision: { gap: spacing.md },
  offerList: { gap: spacing.sm },
  offer: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.glass,
    ...shadows.soft,
  },
  selectedOffer: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  offerCopy: { flex: 1, gap: spacing.xs },
  offerTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  introBadge: {
    borderRadius: radii.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.surface,
  },
  price: { alignItems: 'flex-end' },
  purchaseTerms: { textAlign: 'center', paddingHorizontal: spacing.md },
  loading: {
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  activeActions: { gap: spacing.sm },
  footer: { alignItems: 'center', gap: spacing.sm },
  footerActions: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    columnGap: spacing.sm,
  },
  footerAction: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  footerActionLabel: { color: colors.brand, textDecorationLine: 'underline' },
  freePromise: { textAlign: 'center' },
  pressed: { opacity: 0.72 },
});
