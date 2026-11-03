import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Html, MeshDistortMaterial, Sparkles, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { orbitSkills } from '../data'

const scrollProgress = () => {
  const max = document.documentElement.scrollHeight - window.innerHeight
  return max > 0 ? window.scrollY / max : 0
}

function Core() {
  const group = useRef()
  const wire = useRef()

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const p = scrollProgress()
    const g = group.current
    // Follow the pointer a little, and drift aside as the page scrolls
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, state.pointer.x * 0.4 + t * 0.1, 0.05)
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, -state.pointer.y * 0.3, 0.05)
    const wide = state.viewport.aspect > 1
    g.position.x = THREE.MathUtils.lerp(g.position.x, wide ? 2.6 + p * 0.8 : 0, 0.05)
    g.position.y = THREE.MathUtils.lerp(g.position.y, (wide ? 0 : 1.7) - p * 2, 0.05)
    const s = THREE.MathUtils.lerp(g.scale.x, wide ? 0.82 - p * 0.25 : 0.55, 0.05)
    g.scale.setScalar(s)
    wire.current.rotation.z += delta * 0.15
  })

  return (
    <group ref={group}>
      <Float speed={2} rotationIntensity={0.4} floatIntensity={0.8}>
        <mesh>
          <icosahedronGeometry args={[1.15, 32]} />
          <MeshDistortMaterial color="#6d5dfc" emissive="#2a1b8f" roughness={0.15} metalness={0.6} distort={0.4} speed={2} />
        </mesh>
        <mesh ref={wire} scale={1.7}>
          <icosahedronGeometry args={[1, 1]} />
          <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.25} />
        </mesh>
      </Float>
      <SkillOrbit />
    </group>
  )
}

// Render chips inside the canvas layer so they stay behind page content
const chipPortal = { current: document.querySelector('.canvas-wrap') }

function SkillOrbit() {
  const ring = useRef()
  const items = useMemo(
    () =>
      orbitSkills.map((label, i) => {
        const a = (i / orbitSkills.length) * Math.PI * 2
        return { label, pos: [Math.cos(a) * 2.6, Math.sin(a * 2) * 0.4, Math.sin(a) * 2.6] }
      }),
    [],
  )

  useFrame((_, delta) => {
    ring.current.rotation.y += delta * 0.2
  })

  return (
    <group ref={ring} rotation={[0.35, 0, 0.1]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.6, 0.006, 8, 160]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.35} />
      </mesh>
      {items.map(({ label, pos }) => (
        <Html key={label} position={pos} center distanceFactor={7} zIndexRange={[0, 0]} portal={chipPortal}>
          <span className="orbit-chip">{label}</span>
        </Html>
      ))}
    </group>
  )
}

function Background() {
  const ref = useRef()
  useFrame((_, delta) => {
    ref.current.rotation.y += delta * 0.01
    ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, scrollProgress() * 1.2, 0.05)
  })
  return (
    <group ref={ref}>
      <Stars radius={60} depth={40} count={2500} factor={3} fade speed={0.6} />
      <Sparkles count={60} scale={12} size={2} speed={0.3} color="#a78bfa" />
    </group>
  )
}

export default function Scene() {
  return (
    <Canvas
      eventSource={document.getElementById('root')}
      eventPrefix="client"
      camera={{ position: [0, 0, 6], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={60} color="#22d3ee" />
      <pointLight position={[-5, -3, 2]} intensity={40} color="#c026d3" />
      <directionalLight position={[0, 3, 5]} intensity={1} />
      <Background />
      <Core />
    </Canvas>
  )
}
