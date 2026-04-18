import { Suspense, useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Agent, RoomId } from '../types';
import type { AgentActivity } from '../hooks/useOfficeActivity';
import { LowPolyCharacter } from './LowPolyCharacter';

// ══════════════════════════════════════════
// Isometric coordinate mapping
// ══════════════════════════════════════════
// Maps 2D isometric grid positions to 3D world positions
// The 3D scene uses an orthographic camera matching the isometric SVG

const TW = 54, TH = 27;
const OX = 480, OY = 68;
const VW = 1000, VH = 520;

function isoTo2D(gx: number, gy: number) {
  return { x: OX + (gx - gy) * TW / 2, y: OY + (gx + gy) * TH / 2 };
}

// Convert isometric 2D position to 3D world coords for the overlay
function isoToWorld(gx: number, gy: number, containerW: number, containerH: number) {
  const pos2d = isoTo2D(gx, gy);
  // Normalize to -1..1 range based on SVG viewBox
  const nx = (pos2d.x / VW) * 2 - 1;
  const ny = -((pos2d.y / VH) * 2 - 1);
  // Scale to world units (camera frustum size)
  const aspect = containerW / containerH;
  const frustumH = 10;
  return {
    x: nx * frustumH * aspect / 2,
    y: ny * frustumH / 2,
    z: 0,
  };
}

// ══════════════════════════════════════════
// Slot definitions (same as OfficeFloor)
// ══════════════════════════════════════════
const SLOTS: Record<string, { gx: number; gy: number }[]> = {
  'president':   [{ gx:2, gy:1.5 }],
  'executive':   [{ gx:6.5, gy:1 }, { gx:7.8, gy:1.5 }, { gx:6.5, gy:2.2 }],
  'meeting-a':   [{ gx:0.8, gy:4.8 }, { gx:1.5, gy:5.2 }, { gx:2.2, gy:5.6 }],
  'meeting-b':   [{ gx:3.8, gy:4.8 }, { gx:4.5, gy:5.2 }, { gx:5.2, gy:5.6 }],
  'break':       [{ gx:7.2, gy:5 }, { gx:8, gy:5.5 }],
  'open-office': [
    { gx:1, gy:8.3 }, { gx:2.3, gy:8.6 }, { gx:3.6, gy:8.9 },
    { gx:5, gy:8.3 }, { gx:6.3, gy:8.6 }, { gx:7.6, gy:8.9 },
    { gx:1.5, gy:9.6 }, { gx:3, gy:9.9 }, { gx:4.5, gy:9.6 },
    { gx:6, gy:9.9 },
  ],
};

// ══════════════════════════════════════════
// Individual 3D Character with smooth movement
// ══════════════════════════════════════════
function Character3D({ agent, targetGx, targetGy, containerSize, activity, onClick }: {
  agent: Agent;
  targetGx: number;
  targetGy: number;
  containerSize: { w: number; h: number };
  activity?: AgentActivity;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const currentPos = useRef<{ x: number; y: number; z: number } | null>(null);
  const isMovingRef = useRef(false);
  const directionRef = useRef(180);

  const target = useMemo(
    () => isoToWorld(targetGx, targetGy, containerSize.w, containerSize.h),
    [targetGx, targetGy, containerSize.w, containerSize.h]
  );

  // Initialize position
  useEffect(() => {
    if (!currentPos.current) {
      currentPos.current = { ...target };
    }
  }, [target]);

  // Smooth movement (no setState, refs only)
  useFrame(() => {
    if (!meshRef.current || !currentPos.current) return;

    const dx = target.x - currentPos.current.x;
    const dy = target.y - currentPos.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0.01) {
      const speed = 0.03;
      currentPos.current.x += dx * speed;
      currentPos.current.y += dy * speed;
      isMovingRef.current = true;
      directionRef.current = dx > 0 ? 90 : 270;
    } else {
      currentPos.current.x = target.x;
      currentPos.current.y = target.y;
      isMovingRef.current = false;
      directionRef.current = 180;
    }

    meshRef.current.position.set(currentPos.current.x, currentPos.current.y, 0);
  });

  // Animation state from activity (not from moving ref, which is handled in LowPolyCharacter)
  const animState = useMemo(() => {
    if (activity) {
      const actionMap: Record<string, 'idle' | 'walking' | 'working' | 'meeting' | 'celebrating' | 'resting'> = {
        'idle': 'idle', 'working': 'working', 'walking': 'walking',
        'meeting': 'meeting', 'reviewing': 'working', 'celebrating': 'celebrating', 'resting': 'resting',
      };
      return actionMap[activity.action] || 'idle';
    }
    return 'idle';
  }, [activity]);

  return (
    <group ref={meshRef} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <LowPolyCharacter
        visual={agent.visual}
        animState={isMovingRef.current ? 'walking' : animState}
        direction={directionRef.current}
        scale={0.4}
      />
    </group>
  );
}

// ══════════════════════════════════════════
// Camera setup for orthographic projection
// ══════════════════════════════════════════
function CameraSetup() {
  const { camera } = useThree();
  useEffect(() => {
    if (camera instanceof THREE.OrthographicCamera) {
      camera.position.set(0, 0, 10);
      camera.lookAt(0, 0, 0);
    }
  }, [camera]);
  return null;
}

// ══════════════════════════════════════════
// Main Overlay Component
// ══════════════════════════════════════════
interface Props {
  agents: Agent[];
  activities?: Map<string, AgentActivity>;
  isLive?: boolean;
  onAgentClick?: (agent: Agent) => void;
}

export function Character3DOverlay({ agents, activities, isLive, onAgentClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 1000, h: 520 });

  // Track container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setContainerSize({ w: width, h: height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Assign agents to room slots
  const agentSlots = useMemo(() => {
    const byRoom = (id: RoomId) => {
      if (isLive && activities && activities.size > 0) {
        return agents.filter(a => { const act = activities.get(a.id); return act ? act.room === id : a.room === id; });
      }
      return agents.filter(a => a.room === id);
    };

    const result: { agent: Agent; gx: number; gy: number }[] = [];
    const roomIds: RoomId[] = ['president', 'executive', 'meeting-a', 'meeting-b', 'break', 'open-office'];
    for (const roomId of roomIds) {
      const roomAgents = byRoom(roomId);
      const slots = SLOTS[roomId] || [];
      roomAgents.forEach((agent, i) => {
        if (i < slots.length) {
          result.push({ agent, gx: slots[i].gx, gy: slots[i].gy });
        }
      });
    }
    return result;
  }, [agents, isLive, activities]);

  const aspect = containerSize.w / containerSize.h;
  const frustumH = 10;

  return (
    <div ref={containerRef} className="absolute inset-0" style={{ zIndex: 15, pointerEvents: 'none' }}>
      <Canvas
        orthographic
        camera={{
          zoom: 1,
          position: [0, 0, 10],
          left: -frustumH * aspect / 2,
          right: frustumH * aspect / 2,
          top: frustumH / 2,
          bottom: -frustumH / 2,
          near: 0.1,
          far: 100,
        }}
        style={{ pointerEvents: 'auto' }}
        gl={{ alpha: true, antialias: true }}
      >
        <CameraSetup />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={0.8} castShadow />
        <directionalLight position={[-3, 4, -2]} intensity={0.3} color="#8888ff" />

        <Suspense fallback={null}>
          {agentSlots.map(({ agent, gx, gy }) => (
            <Character3D
              key={agent.id}
              agent={agent}
              targetGx={gx}
              targetGy={gy}
              containerSize={containerSize}
              activity={activities?.get(agent.id)}
              onClick={() => onAgentClick?.(agent)}
            />
          ))}
        </Suspense>
      </Canvas>
    </div>
  );
}
