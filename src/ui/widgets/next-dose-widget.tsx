import { Divider, HStack, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityHidden,
  accessibilityLabel,
  animation,
  Animation,
  background,
  containerBackground,
  contentTransition,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  mask,
  minimumScaleFactor,
  monospacedDigit,
  shapes,
  strokeBorder,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { NextDoseWidgetProps } from '@/models/next-dose-widget';

const NextDoseWidget = (props: NextDoseWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const compact = environment.widgetFamily === 'systemSmall';
  const fullColor =
    environment.widgetRenderingMode == null || environment.widgetRenderingMode === 'fullColor';
  const dark = environment.colorScheme === 'dark';
  const reducedLuminance = environment.isLuminanceReduced === true;
  const stateKey =
    props.state === 'empty' ? 0 : props.state === 'upcoming' ? 1 : props.state === 'ready' ? 2 : 3;
  const updateKey = environment.date.getTime() + stateKey;
  const stateLabel =
    props.state === 'empty'
      ? compact
        ? 'GET STARTED'
        : 'NEXT REMINDER'
      : props.state === 'upcoming'
        ? compact
          ? 'NEXT'
          : props.secondary
            ? 'UP NEXT'
            : 'NEXT REMINDER'
        : props.state === 'ready'
          ? compact
            ? 'READY'
            : 'DUE NOW'
          : 'ALL CLEAR';
  const title = !compact && props.state === 'empty' ? 'No reminders set' : props.title;
  const detail =
    !compact && props.state === 'empty' ? 'Your next dose will appear here' : props.detail;
  const destination = props.state === 'empty' ? 'pilly-app://medicine/new' : 'pilly-app://today';

  const widgetBackground = fullColor ? (dark ? '#21191E' : '#FFF9F7') : 'clear';
  const primary = fullColor ? (dark ? '#FFF9F7' : '#2B2327') : 'primary';
  const secondary = fullColor ? (dark ? '#D5C9CF' : '#746A6F') : 'secondary';
  const accent = fullColor ? (dark ? '#D991AA' : '#8C405C') : 'primary';
  const firstHalf = fullColor ? (dark ? '#6E354B' : '#F3CCD7') : 'clear';
  const secondHalf = fullColor ? (dark ? '#7A574C' : '#FBE9DE') : 'clear';
  const pillWidth = compact ? 44 : 52;
  const pillHeight = compact ? 18 : 22;
  const pillHalf = pillWidth / 2;

  const pill = (
    <ZStack modifiers={[frame({ width: pillWidth, height: pillHeight }), accessibilityHidden()]}>
      {!reducedLuminance && fullColor ? (
        <HStack spacing={0} modifiers={[mask('capsule')]}>
          <Text
            modifiers={[
              frame({ width: pillHalf, height: pillHeight }),
              background(firstHalf, shapes.rectangle()),
            ]}
          >
            {' '}
          </Text>
          <Text
            modifiers={[
              frame({ width: pillHalf, height: pillHeight }),
              background(secondHalf, shapes.rectangle()),
            ]}
          >
            {' '}
          </Text>
        </HStack>
      ) : null}
      <Text
        modifiers={[
          frame({ width: pillWidth, height: pillHeight }),
          strokeBorder({
            color: accent,
            style: { lineWidth: compact ? 1.75 : 2.25 },
            shape: 'capsule',
          }),
        ]}
      >
        {' '}
      </Text>
      <Text
        modifiers={[
          frame({ width: compact ? 1.5 : 2, height: pillHeight - 3 }),
          background(accent, shapes.rectangle()),
        ]}
      >
        {' '}
      </Text>
    </ZStack>
  );

  const stateText = (
    <Text
      modifiers={[
        font({ size: compact ? 9.5 : 11, weight: 'semibold' }),
        foregroundStyle(accent),
        lineLimit(1),
        minimumScaleFactor(0.88),
      ]}
    >
      {stateLabel}
    </Text>
  );

  const titleText = (
    <Text
      modifiers={[
        font({
          size: compact ? (props.state === 'upcoming' ? 29 : 20) : 27,
          weight: 'bold',
          design: 'rounded',
        }),
        foregroundStyle(primary),
        ...(props.state === 'upcoming' ? [monospacedDigit()] : []),
        contentTransition(props.state === 'upcoming' ? 'numericText' : 'opacity'),
        animation(Animation.easeOut({ duration: 0.22 }), updateKey),
        lineLimit(compact && props.state !== 'upcoming' ? 2 : 1),
        minimumScaleFactor(0.76),
      ]}
    >
      {title}
    </Text>
  );

  const detailText = (
    <Text
      modifiers={[
        font({ size: compact ? 11 : 12, weight: 'medium' }),
        foregroundStyle(secondary),
        lineLimit(compact ? 2 : 1),
        minimumScaleFactor(0.82),
      ]}
    >
      {detail}
    </Text>
  );

  const afterBlock = props.secondary ? (
    <VStack
      alignment="leading"
      spacing={5}
      modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}
    >
      <Text
        modifiers={[font({ size: 10, weight: 'semibold' }), foregroundStyle(accent), lineLimit(1)]}
      >
        AFTER
      </Text>
      <Text
        modifiers={[
          font({ size: 20, weight: 'bold', design: 'rounded' }),
          foregroundStyle(primary),
          monospacedDigit(),
          lineLimit(1),
          minimumScaleFactor(0.75),
        ]}
      >
        {props.secondary.title}
      </Text>
      <Text
        modifiers={[
          font({ size: 11, weight: 'medium' }),
          foregroundStyle(secondary),
          lineLimit(1),
          minimumScaleFactor(0.8),
        ]}
      >
        {props.secondary.detail}
      </Text>
    </VStack>
  ) : null;

  return (
    <ZStack
      alignment="leading"
      modifiers={[
        containerBackground(widgetBackground, 'widget'),
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'leading' }),
        widgetURL(destination),
        accessibilityElement('ignore'),
        accessibilityLabel(`${stateLabel}. ${title}. ${detail}`),
      ]}
    >
      {compact ? (
        <VStack
          alignment="leading"
          spacing={3}
          modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'leading' })]}
        >
          <HStack alignment="center" spacing={6}>
            {stateText}
            <Spacer />
            {pill}
          </HStack>
          <Spacer />
          {titleText}
          {detailText}
        </VStack>
      ) : (
        <HStack
          alignment="center"
          spacing={16}
          modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'leading' })]}
        >
          <VStack
            alignment="leading"
            spacing={5}
            modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}
          >
            <HStack alignment="center" spacing={8}>
              {stateText}
              <Spacer />
              {pill}
            </HStack>
            {titleText}
            {detailText}
          </VStack>
          {afterBlock ? <Divider /> : null}
          {afterBlock}
        </HStack>
      )}
    </ZStack>
  );
};

export default createWidget('NextDoseWidget', NextDoseWidget);
