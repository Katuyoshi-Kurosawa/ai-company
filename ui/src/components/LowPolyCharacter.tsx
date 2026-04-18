import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AgentVisual } from '../types';

// ══════════════════════════════════════════
// FF7-style Low-poly Chibi Character
// ══════════════════════════════════════════
// Procedurally generated from AgentVisual config
// Body proportions: big head, small body (2:1 ratio)

type AnimState = 'idle' | 'walking' | 'working' | 'meeting' | 'celebrating' | 'resting';

interface Props {
  visual: AgentVisual;
  animState?: AnimState;
  direction?: number; // 0-360 facing direction
  scale?: number;
}

// Color mapping from visual config to Three.js colors
const SUIT_COLORS: Record<string, string> = {
  navy: '#1e3a5f',
  black: '#1a1a2e',
  gray: '#4a4a5a',
  charcoal: '#2d2d3d',
  darkblue: '#1a2744',
  brown: '#5a3a2a',
  wine: '#5a2030',
  white: '#e8e8f0',
  beige: '#c8b898',
  pink: '#d4a0a0',
  purple: '#4a2868',
  red: '#8a2020',
  green: '#2a5a3a',
  blue: '#2a4a8a',
};

const HAIR_COLORS: Record<string, string> = {
  black: '#1a1a28',
  brown: '#5a3828',
  darkbrown: '#3a2818',
  blonde: '#d4b060',
  silver: '#a8a8b8',
  red: '#8a3030',
  blue: '#2a3a7a',
  purple: '#5a2868',
  pink: '#c87898',
  green: '#2a6a3a',
  white: '#d8d8e0',
  orange: '#c87830',
};

const SKIN_TONE = '#f0c8a8';
const SKIN_TONE_SHADOW = '#d8a888';

export function LowPolyCharacter({ visual, animState = 'idle', direction = 180, scale = 1 }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);

  const suitColor = useMemo(() => SUIT_COLORS[visual.suitColor] || visual.suitColor || '#1e3a5f', [visual.suitColor]);
  const hairColor = useMemo(() => HAIR_COLORS[visual.hairColor] || visual.hairColor || '#1a1a28', [visual.hairColor]);
  const isFemale = visual.gender === 'female';

  // Animation
  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (!groupRef.current) return;

    // Breathing / idle bob
    if (animState === 'idle' || animState === 'resting') {
      groupRef.current.position.y = Math.sin(t * 1.5) * 0.02;
      if (headRef.current) headRef.current.rotation.z = Math.sin(t * 0.8) * 0.02;
    }

    // Walking animation
    if (animState === 'walking') {
      const walkSpeed = 6;
      if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(t * walkSpeed) * 0.5;
      if (rightLegRef.current) rightLegRef.current.rotation.x = Math.sin(t * walkSpeed + Math.PI) * 0.5;
      if (leftArmRef.current) leftArmRef.current.rotation.x = Math.sin(t * walkSpeed + Math.PI) * 0.4;
      if (rightArmRef.current) rightArmRef.current.rotation.x = Math.sin(t * walkSpeed) * 0.4;
      groupRef.current.position.y = Math.abs(Math.sin(t * walkSpeed)) * 0.04;
    }

    // Working animation (typing)
    if (animState === 'working') {
      if (leftArmRef.current) leftArmRef.current.rotation.x = -0.8 + Math.sin(t * 8) * 0.1;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -0.8 + Math.sin(t * 8 + 1) * 0.1;
      if (headRef.current) headRef.current.rotation.x = -0.1 + Math.sin(t * 2) * 0.03;
    }

    // Meeting animation (gesturing)
    if (animState === 'meeting') {
      if (rightArmRef.current) rightArmRef.current.rotation.x = -0.5 + Math.sin(t * 3) * 0.3;
      if (rightArmRef.current) rightArmRef.current.rotation.z = Math.sin(t * 2) * 0.2;
      if (headRef.current) headRef.current.rotation.y = Math.sin(t * 1.5) * 0.15;
    }

    // Celebrating animation (jumping + arms up)
    if (animState === 'celebrating') {
      groupRef.current.position.y = Math.abs(Math.sin(t * 4)) * 0.15;
      if (leftArmRef.current) leftArmRef.current.rotation.z = -0.5 + Math.sin(t * 3) * 0.3;
      if (rightArmRef.current) rightArmRef.current.rotation.z = 0.5 + Math.sin(t * 3 + 0.5) * 0.3;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -2.5;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -2.5;
    }

    // Resting (slouched)
    if (animState === 'resting') {
      if (headRef.current) headRef.current.rotation.x = 0.2;
      groupRef.current.position.y = -0.03 + Math.sin(t * 0.8) * 0.01;
    }

    // Reset non-active limbs
    if (animState === 'idle') {
      if (leftArmRef.current) { leftArmRef.current.rotation.x *= 0.9; leftArmRef.current.rotation.z = 0.15; }
      if (rightArmRef.current) { rightArmRef.current.rotation.x *= 0.9; rightArmRef.current.rotation.z = -0.15; }
      if (leftLegRef.current) leftLegRef.current.rotation.x *= 0.9;
      if (rightLegRef.current) rightLegRef.current.rotation.x *= 0.9;
    }
  });

  const rotY = (direction * Math.PI) / 180;

  return (
    <group ref={groupRef} scale={scale} rotation={[0, rotY, 0]}>
      {/* ── Legs ── */}
      <mesh ref={leftLegRef} position={[-0.08, 0.12, 0]}>
        <boxGeometry args={[0.09, 0.24, 0.09]} />
        <meshStandardMaterial color={suitColor} />
      </mesh>
      <mesh ref={rightLegRef} position={[0.08, 0.12, 0]}>
        <boxGeometry args={[0.09, 0.24, 0.09]} />
        <meshStandardMaterial color={suitColor} />
      </mesh>

      {/* Shoes */}
      <mesh position={[-0.08, 0.02, 0.02]}>
        <boxGeometry args={[0.1, 0.04, 0.14]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.08, 0.02, 0.02]}>
        <boxGeometry args={[0.1, 0.04, 0.14]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* ── Body / Torso ── */}
      <mesh position={[0, 0.38, 0]}>
        <boxGeometry args={[isFemale ? 0.26 : 0.28, 0.28, 0.16]} />
        <meshStandardMaterial color={suitColor} />
      </mesh>

      {/* Collar / Shirt */}
      <mesh position={[0, 0.48, 0.05]}>
        <boxGeometry args={[0.12, 0.06, 0.08]} />
        <meshStandardMaterial color="#e8e8f0" />
      </mesh>

      {/* ── Arms ── */}
      <mesh ref={leftArmRef} position={[isFemale ? -0.17 : -0.19, 0.36, 0]} rotation={[0, 0, 0.15]}>
        <boxGeometry args={[0.07, 0.26, 0.07]} />
        <meshStandardMaterial color={suitColor} />
      </mesh>
      <mesh ref={rightArmRef} position={[isFemale ? 0.17 : 0.19, 0.36, 0]} rotation={[0, 0, -0.15]}>
        <boxGeometry args={[0.07, 0.26, 0.07]} />
        <meshStandardMaterial color={suitColor} />
      </mesh>

      {/* Hands */}
      <mesh position={[-0.19, 0.22, 0]}>
        <boxGeometry args={[0.06, 0.06, 0.06]} />
        <meshStandardMaterial color={SKIN_TONE} />
      </mesh>
      <mesh position={[0.19, 0.22, 0]}>
        <boxGeometry args={[0.06, 0.06, 0.06]} />
        <meshStandardMaterial color={SKIN_TONE} />
      </mesh>

      {/* ── Head ── */}
      <group ref={headRef} position={[0, 0.62, 0]}>
        {/* Head base */}
        <mesh position={[0, 0.12, 0]}>
          <boxGeometry args={[0.3, 0.3, 0.28]} />
          <meshStandardMaterial color={SKIN_TONE} />
        </mesh>

        {/* Face shadow (front) */}
        <mesh position={[0, 0.08, 0.141]}>
          <boxGeometry args={[0.28, 0.16, 0.01]} />
          <meshStandardMaterial color={SKIN_TONE_SHADOW} />
        </mesh>

        {/* Eyes */}
        <mesh position={[-0.07, 0.14, 0.145]}>
          <boxGeometry args={[0.06, 0.04, 0.01]} />
          <meshStandardMaterial color="#1a1a2e" />
        </mesh>
        <mesh position={[0.07, 0.14, 0.145]}>
          <boxGeometry args={[0.06, 0.04, 0.01]} />
          <meshStandardMaterial color="#1a1a2e" />
        </mesh>

        {/* Eye highlights */}
        <mesh position={[-0.06, 0.15, 0.15]}>
          <boxGeometry args={[0.02, 0.02, 0.01]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.08, 0.15, 0.15]}>
          <boxGeometry args={[0.02, 0.02, 0.01]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>

        {/* Mouth */}
        <mesh position={[0, 0.06, 0.145]}>
          <boxGeometry args={[0.06, 0.02, 0.01]} />
          <meshStandardMaterial color="#c08080" />
        </mesh>

        {/* ── Hair ── */}
        <Hair style={visual.hairStyle} color={hairColor} isFemale={isFemale} />

        {/* ── Accessory ── */}
        <Accessory type={visual.accessory} />
      </group>
    </group>
  );
}

// ══════════════════════════════════════════
// Hair Styles
// ══════════════════════════════════════════
function Hair({ style, color, isFemale }: { style: string; color: string; isFemale: boolean }) {
  switch (style) {
    case 'short':
      return (
        <group>
          <mesh position={[0, 0.2, -0.02]}>
            <boxGeometry args={[0.32, 0.16, 0.32]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0, 0.28, 0]}>
            <boxGeometry args={[0.33, 0.06, 0.3]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      );
    case 'long':
      return (
        <group>
          <mesh position={[0, 0.2, -0.02]}>
            <boxGeometry args={[0.33, 0.16, 0.33]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0, 0.28, 0]}>
            <boxGeometry args={[0.34, 0.06, 0.3]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* Long hair back */}
          <mesh position={[0, -0.05, -0.12]}>
            <boxGeometry args={[0.3, 0.4, 0.08]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {isFemale && (
            <mesh position={[0, -0.15, -0.1]}>
              <boxGeometry args={[0.26, 0.2, 0.06]} />
              <meshStandardMaterial color={color} />
            </mesh>
          )}
        </group>
      );
    case 'ponytail':
      return (
        <group>
          <mesh position={[0, 0.2, -0.02]}>
            <boxGeometry args={[0.32, 0.16, 0.32]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0, 0.28, 0]}>
            <boxGeometry args={[0.33, 0.06, 0.3]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* Ponytail */}
          <mesh position={[0, 0.1, -0.2]}>
            <boxGeometry args={[0.1, 0.3, 0.06]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      );
    case 'bob':
      return (
        <group>
          <mesh position={[0, 0.18, -0.01]}>
            <boxGeometry args={[0.34, 0.2, 0.33]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0, 0.28, 0]}>
            <boxGeometry args={[0.35, 0.06, 0.3]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* Bob sides */}
          <mesh position={[-0.15, 0.05, 0.04]}>
            <boxGeometry args={[0.06, 0.2, 0.2]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0.15, 0.05, 0.04]}>
            <boxGeometry args={[0.06, 0.2, 0.2]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      );
    case 'spiky':
      return (
        <group>
          <mesh position={[0, 0.22, -0.02]}>
            <boxGeometry args={[0.32, 0.18, 0.32]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* Spikes */}
          <mesh position={[0, 0.34, 0]} rotation={[0, 0, 0.2]}>
            <boxGeometry args={[0.08, 0.12, 0.08]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[-0.1, 0.32, -0.05]} rotation={[0, 0, -0.3]}>
            <boxGeometry args={[0.06, 0.1, 0.06]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0.1, 0.33, -0.03]} rotation={[0, 0, 0.4]}>
            <boxGeometry args={[0.06, 0.1, 0.06]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      );
    case 'twin':
      return (
        <group>
          <mesh position={[0, 0.2, -0.02]}>
            <boxGeometry args={[0.33, 0.16, 0.32]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0, 0.28, 0]}>
            <boxGeometry args={[0.34, 0.06, 0.3]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* Twin tails */}
          <mesh position={[-0.16, 0.05, -0.1]}>
            <boxGeometry args={[0.08, 0.25, 0.06]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0.16, 0.05, -0.1]}>
            <boxGeometry args={[0.08, 0.25, 0.06]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      );
    default: // 'swept', 'slick', etc.
      return (
        <group>
          <mesh position={[0, 0.2, -0.02]}>
            <boxGeometry args={[0.32, 0.16, 0.32]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0, 0.28, 0]}>
            <boxGeometry args={[0.33, 0.06, 0.3]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* Side part */}
          <mesh position={[-0.12, 0.24, 0.1]}>
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      );
  }
}

// ══════════════════════════════════════════
// Accessories
// ══════════════════════════════════════════
function Accessory({ type }: { type: string }) {
  switch (type) {
    case 'glasses':
      return (
        <group position={[0, 0.14, 0.15]}>
          {/* Frames */}
          <mesh position={[-0.07, 0, 0]}>
            <boxGeometry args={[0.08, 0.05, 0.01]} />
            <meshStandardMaterial color="#333" metalness={0.8} />
          </mesh>
          <mesh position={[0.07, 0, 0]}>
            <boxGeometry args={[0.08, 0.05, 0.01]} />
            <meshStandardMaterial color="#333" metalness={0.8} />
          </mesh>
          {/* Bridge */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.04, 0.015, 0.01]} />
            <meshStandardMaterial color="#333" metalness={0.8} />
          </mesh>
          {/* Lenses */}
          <mesh position={[-0.07, 0, 0.005]}>
            <boxGeometry args={[0.06, 0.035, 0.005]} />
            <meshStandardMaterial color="#88bbff" transparent opacity={0.3} />
          </mesh>
          <mesh position={[0.07, 0, 0.005]}>
            <boxGeometry args={[0.06, 0.035, 0.005]} />
            <meshStandardMaterial color="#88bbff" transparent opacity={0.3} />
          </mesh>
        </group>
      );
    case 'ribbon':
      return (
        <mesh position={[0.12, 0.24, 0.06]}>
          <boxGeometry args={[0.1, 0.06, 0.04]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
      );
    case 'earring':
      return (
        <group>
          <mesh position={[-0.16, 0.1, 0.05]}>
            <sphereGeometry args={[0.015, 6, 6]} />
            <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh position={[0.16, 0.1, 0.05]}>
            <sphereGeometry args={[0.015, 6, 6]} />
            <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.1} />
          </mesh>
        </group>
      );
    case 'headband':
      return (
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[0.34, 0.03, 0.34]} />
          <meshStandardMaterial color="#4a4a8a" />
        </mesh>
      );
    default:
      return null;
  }
}
