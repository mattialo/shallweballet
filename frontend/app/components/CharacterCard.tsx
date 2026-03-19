import { Canvas, useFrame } from "@react-three/fiber"
import { useGLTF } from "@react-three/drei"
import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js"
import { AnimationMixer, AnimationClip } from "three"
import type { Group } from "three"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { CharacterData } from "@/lib/characters"
import { LANE_COLORS } from "@/components/race/race-constants"

export type { CharacterData } from "@/lib/characters"

export function SpinningCharacter({
  modelUrl,
  animationName,
  frozen,
}: Readonly<{
  modelUrl: string
  animationName: string
  frozen: boolean
}>) {
  const { scene, animations } = useGLTF(modelUrl)
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene])
  const groupRef = useRef<Group>(null)
  const mixerRef = useRef<AnimationMixer | null>(null)
  const currentActionRef = useRef<ReturnType<AnimationMixer["clipAction"]> | null>(null)

  useEffect(() => {
    if (!animations.length) return
    const mixer = new AnimationMixer(clone)
    mixerRef.current = mixer
    const clip = AnimationClip.findByName(animations, "walk") ?? animations[0]
    const action = mixer.clipAction(clip)
    action.timeScale = 0.6
    action.play()
    currentActionRef.current = action
    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(clone)
    }
  }, [clone, animations])

  useEffect(() => {
    const mixer = mixerRef.current
    if (!mixer || !animations.length) return
    const clip = AnimationClip.findByName(animations, animationName) ?? AnimationClip.findByName(animations, "walk") ?? animations[0]
    const next = mixer.clipAction(clip)
    next.timeScale = animationName === "run" ? 0.7 : 0.6
    if (currentActionRef.current && currentActionRef.current !== next) {
      currentActionRef.current.crossFadeTo(next, 0.2, true)
    }
    next.reset().play()
    currentActionRef.current = next
  }, [animationName, animations])

  useFrame((_, dt) => {
    mixerRef.current?.update(dt)
    if (!groupRef.current) return
    if (frozen) {
      // Normalize to [-π, π] so snap-back is at most half a turn
      const r = groupRef.current.rotation.y
      groupRef.current.rotation.y = r - Math.round(r / (Math.PI * 2)) * Math.PI * 2
      groupRef.current.rotation.y *= 0.85
    } else {
      groupRef.current.rotation.y += dt * 0.8
    }
  })

  return (
    <group ref={groupRef}>
      <primitive
        object={clone}
        position={[0, -1, 0]}
        rotation={[0, 0, 0]}
        scale={1.125}
      />
    </group>
  )
}


interface CharacterCardProps {
  character: CharacterData
  selectedNumber: number | null
  onToggle: () => void
  disabled?: boolean
}

export function CharacterCard({
  character,
  selectedNumber,
  onToggle,
  disabled = false,
}: Readonly<CharacterCardProps>) {
  const isSelected = selectedNumber !== null
  const [isHovered, setIsHovered] = useState(false)

  const animationName = isSelected || isHovered ? "run" : "walk"

  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={disabled}
      className={cn(
        "relative flex w-full cursor-pointer flex-col overflow-hidden rounded-xl border bg-background/80 text-left backdrop-blur-sm transition-all hover:bg-background/90",
        isSelected
          ? "border-primary ring-2 ring-primary"
          : "border-border/50 hover:border-border",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {isSelected && (
        <Badge
          className="absolute top-2 right-2 z-10 font-bold"
          style={{ backgroundColor: LANE_COLORS[(selectedNumber - 1) % 10], color: "#fff" }}
        >
          Lane {selectedNumber}
        </Badge>
      )}
      <div style={{ height: 180 }} className="w-full bg-foreground/5">
        <Canvas camera={{ position: [0, 0, 3.5], fov: 55 }}>
          <ambientLight intensity={1.2} />
          <directionalLight position={[5, 10, 5]} intensity={1.5} />
          <Suspense fallback={null}>
            <SpinningCharacter
              modelUrl={character.modelUrl}
              animationName={animationName}
              frozen={isHovered || isSelected}
            />
          </Suspense>
        </Canvas>
      </div>
      <div className="flex flex-col gap-2 p-3">
        <p className="truncate text-sm font-bold leading-tight">
          {character.name}
        </p>
      </div>
    </button>
  )
}
