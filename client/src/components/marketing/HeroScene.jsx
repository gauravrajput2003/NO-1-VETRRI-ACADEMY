import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import { useMemo, useRef } from 'react';

function AbstractOrbs({ reducedMotion }) {
  const groupRef = useRef();

  const shapes = useMemo(() => {
    const colors = ['#f59e0b', '#14b8a6', '#7c3aed', '#3b82f6'];
    return Array.from({ length: 5 }, (_, index) => ({
      position: [
        (index % 3) * 1.6 - 1.6,
        Math.floor(index / 3) * 1.4 - 1.2,
        (index % 2 === 0 ? 1 : -1) * (0.8 + (index % 4) * 0.2),
      ],
      scale: 0.45 + (index % 4) * 0.18,
      color: colors[index % colors.length],
      rotation: [(index % 2) * 1.35, (index % 3) * 1.1, 0],
    }));
  }, []);

  useFrame((state) => {
    if (!groupRef.current || reducedMotion) return;

    const t = state.clock.getElapsedTime();
    groupRef.current.rotation.y = state.pointer.x * 0.8 + t * 0.15;
    groupRef.current.rotation.x = state.pointer.y * 0.4 - 0.35;
    groupRef.current.position.x = state.pointer.x * 0.35;
    groupRef.current.position.y = state.pointer.y * 0.2;
  });

  return (
    <group ref={groupRef}>
      {shapes.map((shape, index) => (
        <Float
          key={index}
          speed={1 + index * 0.15}
          rotationIntensity={reducedMotion ? 0.2 : 1.2}
          floatIntensity={reducedMotion ? 0.2 : 1.2}
        >
          <mesh position={shape.position} rotation={shape.rotation} scale={shape.scale}>
            {index % 3 === 0 ? (
              <octahedronGeometry args={[1, 0]} />
            ) : index % 3 === 1 ? (
              <torusKnotGeometry args={[0.7, 0.22, 48, 8]} />
            ) : (
              <icosahedronGeometry args={[1, 1]} />
            )}
            <meshStandardMaterial
              color={shape.color}
              emissive={shape.color}
              emissiveIntensity={0.5}
              roughness={0.2}
              metalness={0.45}
              transparent
              opacity={0.9}
            />
          </mesh>
        </Float>
      ))}

      <mesh position={[0, 0, -1.8]} rotation={[0.4, 0.8, 0]}>
        <torusGeometry args={[3.1, 0.08, 12, 72]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.7} />
      </mesh>
    </group>
  );
}

export default function HeroScene({ reducedMotion }) {
  return (
    <div className="absolute inset-0 h-full w-full">
      <Canvas camera={{ position: [0, 0, 6], fov: 42 }} dpr={[1, 1.25]} gl={{ antialias: false, powerPreference: 'low-power' }}>
        <color attach="background" args={['#071b1d']} />
        <ambientLight intensity={1.2} />
        <directionalLight position={[2, 2, 4]} intensity={1.8} color="#fff7d6" />
        <directionalLight position={[-3, -1, 3]} intensity={1.2} color="#0ea5e9" />

        <Sparkles count={reducedMotion ? 12 : 32} scale={[9, 7, 3]} size={reducedMotion ? 1.2 : 2.4} color="#e2e8f0" />
        <AbstractOrbs reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}
