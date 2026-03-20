import { Canvas, useFrame } from "@react-three/fiber"
import { useGLTF } from "@react-three/drei"
import { Suspense, useEffect, useMemo, useRef } from "react"
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js"
import { AnimationMixer, AnimationClip } from "three"
import type { Group } from "three"
import { CHARACTERS } from "@/lib/characters"

const CHARACTER_MODELS = CHARACTERS.map((c) => c.modelUrl)

const SLOTS: {
  id: string
  modelUrl: string
  startX: number
  z: number
  speed: number
}[] = Array.from({ length: 10 }, (_, i) => ({
  id: `character-slot-${i}`,
  modelUrl: CHARACTER_MODELS[i % CHARACTER_MODELS.length],
  startX: -10 + i * 2,
  z: 0.5 - (i % 10) * 1.5,
  speed: 1.5 + (i % 3) * 0.4,
}))

function Character({
  modelUrl,
  startX,
  z,
  speed,
}: Readonly<{
  modelUrl: string
  startX: number
  z: number
  speed: number
}>) {
  const { scene, animations } = useGLTF(modelUrl)
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene])
  const ref = useRef<Group>(null)
  const mixerRef = useRef<AnimationMixer | null>(null)

  useEffect(() => {
    if (!animations.length) return
    const mixer = new AnimationMixer(clone)
    mixerRef.current = mixer
    const clip = AnimationClip.findByName(animations, "run") ?? animations[0]
    const action = mixer.clipAction(clip)
    action.timeScale = (speed / 1.5) * 0.6
    action.play()
    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(clone)
    }
  }, [clone, animations])

  // Characters further from the camera are visible across a wider x range.
  // tan(horizontal half-fov) ≈ 0.83 for fov=50 at 16:9; camera is at z=8.
  const wrapX = (8 - z) * 0.83 + 2

  useFrame((_, dt) => {
    mixerRef.current?.update(dt)
    if (!ref.current) return
    ref.current.position.x += speed * dt
    if (ref.current.position.x > wrapX) ref.current.position.x = -wrapX
  })

  const primitiveProps = {
    object: clone,
    position: [startX, -1, z] as [number, number, number],
    rotation: [0, Math.PI / 2, 0] as [number, number, number],
    scale: 0.75,
  }

  return <primitive ref={ref} {...primitiveProps} />
}

export function RaceBackground() {
  const ambientProps = { intensity: 1.2 }
  const directionalProps = {
    position: [5, 10, 5] as [number, number, number],
    intensity: 1.5,
  }

  return (
    <Canvas
      camera={{ position: [0, 2, 8], fov: 50 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1,
        pointerEvents: "none",
      }}
    >
      <ambientLight {...ambientProps} />
      <directionalLight {...directionalProps} />
      <Suspense fallback={null}>
        {SLOTS.map((slot) => (
          <Character key={slot.id} {...slot} />
        ))}
      </Suspense>
    </Canvas>
  )
}
