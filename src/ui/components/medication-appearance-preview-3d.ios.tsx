/* eslint-disable react/no-unknown-property -- React Three Fiber exposes Three.js properties through JSX. */
import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ErrorInfo,
  type PropsWithChildren,
} from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import type { Vector2 } from 'three';

import type { MedicationAppearancePreview3DProps } from './medication-appearance-preview-3d';
import { MedicationAppearance } from './medication-appearance';
import { colors } from '@/ui/tokens';

const cameraConfig = { position: [0, 0, 6] as [number, number, number], zoom: 62 };
const rendererConfig = { alpha: true, antialias: true };
const capsuleHalfProfiles = createCapsuleHalfProfiles();
const tabletProfile = createTabletProfile();
const initialYaw = -0.18;

export function MedicationAppearancePreview3D(props: MedicationAppearancePreview3DProps) {
  if (!props.active) {
    return <StaticPreview {...props} />;
  }

  return (
    <PreviewErrorBoundary fallback={<StaticPreview {...props} />}>
      <InteractivePreview {...props} />
    </PreviewErrorBoundary>
  );
}

function StaticPreview({ shape, color, secondaryColor }: MedicationAppearancePreview3DProps) {
  return (
    <View style={styles.frame}>
      <MedicationAppearance
        shape={shape}
        size="medium"
        color={color}
        secondaryColor={secondaryColor}
      />
    </View>
  );
}

function InteractivePreview({ shape, color, secondaryColor }: MedicationAppearancePreview3DProps) {
  const [ready, setReady] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    if (ready) return;
    const progressTimer = setTimeout(() => setShowProgress(true), 250);
    return () => clearTimeout(progressTimer);
  }, [ready]);

  const handleReady = useCallback(() => {
    setReady(true);
    setShowProgress(false);
  }, []);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${capitalize(shape)} pill preview`}
      accessibilityState={{ busy: !ready }}
      style={styles.frame}
    >
      <View style={[styles.fallback, ready && styles.hidden]}>
        <MedicationAppearance
          shape={shape}
          size="medium"
          color={color}
          secondaryColor={secondaryColor}
        />
        {showProgress ? (
          <ActivityIndicator
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            color={colors.brand}
            size="small"
            style={styles.progress}
          />
        ) : null}
      </View>
      <Canvas
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        orthographic
        frameloop="demand"
        camera={cameraConfig}
        gl={rendererConfig}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        style={styles.canvas}
      >
        <ambientLight intensity={1.35} />
        <directionalLight position={[-3, 4, 6]} intensity={2.1} />
        <directionalLight position={[4, -2, 3]} intensity={0.55} />
        <MedicationModelScene shape={shape} color={color} secondaryColor={secondaryColor} />
        <FirstFrameReporter onReady={handleReady} />
      </Canvas>
    </View>
  );
}

function MedicationModelScene({
  shape,
  color,
  secondaryColor,
}: Pick<MedicationAppearancePreview3DProps, 'shape' | 'color' | 'secondaryColor'>) {
  return (
    <group rotation={[0.28, initialYaw, 0]}>
      <MedicationModel shape={shape} color={color} secondaryColor={secondaryColor} />
    </group>
  );
}

function MedicationModel({
  shape,
  color,
  secondaryColor,
}: Pick<MedicationAppearancePreview3DProps, 'shape' | 'color' | 'secondaryColor'>) {
  if (shape === 'capsule') {
    return <CapsuleModel color={color} secondaryColor={secondaryColor} />;
  }

  return <TabletModel shape={shape} color={color} />;
}

function CapsuleModel({ color, secondaryColor }: { color: string; secondaryColor: string }) {
  const { left, right } = capsuleHalfProfiles;

  return (
    <group rotation={[0, 0, Math.PI / 2]} scale={0.88}>
      <mesh>
        <latheGeometry args={[left, 28]} />
        <meshStandardMaterial color={color} roughness={0.42} metalness={0.02} />
      </mesh>
      <mesh>
        <latheGeometry args={[right, 28]} />
        <meshStandardMaterial color={secondaryColor} roughness={0.42} metalness={0.02} />
      </mesh>
    </group>
  );
}

function TabletModel({ shape, color }: { shape: 'round' | 'oval'; color: string }) {
  const scale = shape === 'oval' ? ([1.05, 0.78, 0.78] as const) : 1;

  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} scale={scale}>
      <latheGeometry args={[tabletProfile, 36]} />
      <meshStandardMaterial color={color} roughness={0.48} metalness={0.01} />
    </mesh>
  );
}

function FirstFrameReporter({ onReady }: { onReady: () => void }) {
  const reported = useRef(false);
  const readinessFrame = useRef<number | null>(null);

  useFrame(() => {
    if (reported.current) return;
    reported.current = true;
    readinessFrame.current = requestAnimationFrame(onReady);
  });

  useEffect(
    () => () => {
      if (readinessFrame.current !== null) cancelAnimationFrame(readinessFrame.current);
    },
    [],
  );

  return null;
}

function createCapsuleHalfProfiles() {
  const radius = 0.68;
  const halfBody = 0.78;
  const capSegments = 10;
  const left = [lathePoint(radius, 0), lathePoint(radius, halfBody)];
  const right: Vector2[] = [];

  for (let index = 1; index <= capSegments; index += 1) {
    const angle = (index / capSegments) * (Math.PI / 2);
    left.push(lathePoint(radius * Math.cos(angle), halfBody + radius * Math.sin(angle)));
  }

  for (let index = capSegments; index >= 1; index -= 1) {
    const angle = (index / capSegments) * (Math.PI / 2);
    right.push(lathePoint(radius * Math.cos(angle), -halfBody - radius * Math.sin(angle)));
  }
  right.push(lathePoint(radius, -halfBody), lathePoint(radius, 0));

  return { left, right };
}

function createTabletProfile(): Vector2[] {
  const radius = 0.9;
  const halfThickness = 0.28;
  const bevel = 0.16;
  const bevelSegments = 6;
  const edgeRadius = radius - bevel;
  const points = [lathePoint(0, -halfThickness), lathePoint(edgeRadius, -halfThickness)];

  for (let index = 1; index <= bevelSegments; index += 1) {
    const angle = -Math.PI / 2 + (index / bevelSegments) * (Math.PI / 2);
    points.push(
      lathePoint(
        edgeRadius + bevel * Math.cos(angle),
        -halfThickness + bevel + bevel * Math.sin(angle),
      ),
    );
  }

  points.push(lathePoint(radius, halfThickness - bevel));
  for (let index = 1; index <= bevelSegments; index += 1) {
    const angle = (index / bevelSegments) * (Math.PI / 2);
    points.push(
      lathePoint(
        edgeRadius + bevel * Math.cos(angle),
        halfThickness - bevel + bevel * Math.sin(angle),
      ),
    );
  }
  points.push(lathePoint(0, halfThickness));

  return points;
}

function lathePoint(x: number, y: number): Vector2 {
  // LatheGeometry reads x and y only; a plain point avoids loading a second Three.js entry module.
  return { x, y } as Vector2;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

class PreviewErrorBoundary extends Component<
  PropsWithChildren<{ fallback: React.ReactNode }>,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // The native silhouette is the intentional fallback for unavailable GL contexts.
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const styles = StyleSheet.create({
  frame: {
    width: 184,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvas: {
    position: 'absolute',
    inset: 0,
  },
  fallback: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hidden: { opacity: 0 },
  progress: { position: 'absolute', bottom: 0 },
});
