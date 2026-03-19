import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import type { RefObject } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Html, useGLTF } from "@react-three/drei"
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js"
import {
  AnimationMixer,
  AnimationClip,
  DataTexture,
  RGBAFormat,
  NearestFilter,
  RepeatWrapping,
} from "three"
import type { Group } from "three"
import {
  type RacerSim,
  RACE_LENGTH,
  MAX_SPEED,
  TRACK_DISPLAY,
  LANE_GAP,
  LANE_COLORS,
  zOf,
  rankText,
  rankTextClass,
} from "./race-constants"

// ---- CameraFollow — tracks racer group center each frame ----
function CameraFollow({ simRef }: Readonly<{ simRef: RefObject<RacerSim[]> }>) {
  const { camera } = useThree()

  useFrame(() => {
    const racers = simRef.current
    if (!racers?.length) return

    const avgX =
      racers.reduce(
        (sum, r) => sum + (r.position / RACE_LENGTH) * TRACK_DISPLAY,
        0
      ) / racers.length

    camera.position.x += (avgX - camera.position.x) * 0.05
    camera.lookAt(camera.position.x, 0, 0)
  })

  return null
}

// ---- RacerModel — one animal in the 3D scene ----
function RacerModel({
  modelUrl,
  name,
  index,
  n,
  simRef,
  showModal,
}: Readonly<{
  modelUrl: string
  name: string
  index: number
  n: number
  simRef: RefObject<RacerSim[]>
  showModal: boolean
}>) {
  const { scene, animations } = useGLTF(modelUrl)
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene])
  const groupRef = useRef<Group>(null)
  const mixerRef = useRef<AnimationMixer | null>(null)
  const actionRef = useRef<ReturnType<AnimationMixer["clipAction"]> | null>(
    null
  )
  const stoppedRef = useRef(false)
  const [showTag, setShowTag] = useState(true)
  const [finishRank, setFinishRank] = useState<number | null>(null)

  useEffect(() => {
    if (!animations.length) return
    const mixer = new AnimationMixer(clone)
    mixerRef.current = mixer
    const clip = AnimationClip.findByName(animations, "run") ?? animations[0]
    const action = mixer.clipAction(clip)
    actionRef.current = action
    action.play()
    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(clone)
    }
  }, [clone, animations])

  useFrame((_, dt) => {
    const racer = simRef.current?.[index]
    if (!racer) return

    if (racer.rank !== null) {
      if (!stoppedRef.current) {
        stoppedRef.current = true
        actionRef.current?.stop()
        setShowTag(false)
        setFinishRank(racer.rank)
      }
      return
    }

    if (actionRef.current) {
      actionRef.current.timeScale = racer.speed / MAX_SPEED
    }
    mixerRef.current?.update(dt)

    if (groupRef.current) {
      groupRef.current.position.x =
        (racer.position / RACE_LENGTH) * TRACK_DISPLAY
    }
  })

  const z = zOf(index, n)

  return (
    <group ref={groupRef} position={[0, 0, z] as [number, number, number]}>
      <primitive
        object={clone}
        rotation={[0, Math.PI / 2, 0] as [number, number, number]}
        scale={0.5}
      />
      {showTag && (
        <Html
          position={[0, 0.8, 0] as [number, number, number]}
          center
          distanceFactor={12}
          zIndexRange={[100, 0]}
        >
          <div className="rounded-md bg-background/50 px-4 py-0.5 text-[10px] font-semibold whitespace-nowrap text-foreground/80 shadow backdrop-blur-sm">
            {name}
          </div>
        </Html>
      )}
      {finishRank !== null && !showModal && (
        <Html
          position={[0, 1.3, 0] as [number, number, number]}
          center
          distanceFactor={12}
          zIndexRange={[100, 0]}
        >
          <div
            className={`rounded-full border border-white/20 bg-background/80 px-3 py-0.5 text-[11px] font-extrabold whitespace-nowrap shadow-lg backdrop-blur-sm ${rankTextClass(finishRank)}`}
          >
            {rankText(finishRank)}
          </div>
        </Html>
      )}
    </group>
  )
}

// ---- SimLoop — advances positions, assigns ranks, fires onRaceOver ----
function SimLoop({
  simRef,
  runningRef,
  onRaceOver,
}: Readonly<{
  simRef: RefObject<RacerSim[]>
  runningRef: RefObject<boolean>
  onRaceOver: () => void
}>) {
  const nextRankRef = useRef(1)
  const firedRef = useRef(false)

  useFrame((_, dt) => {
    if (!runningRef.current) return
    const racers = simRef.current
    if (!racers) return
    for (const racer of racers) {
      if (racer.rank !== null) continue
      racer.position = Math.min(racer.position + racer.speed * dt, RACE_LENGTH)
      if (racer.position >= RACE_LENGTH) {
        racer.rank = nextRankRef.current++
      }
    }
    if (!firedRef.current && racers.every((r) => r.rank !== null)) {
      firedRef.current = true
      onRaceOver()
    }
  })

  return null
}

// ---- CheckerboardFinish — flat checkerboard strip at the finish line ----
function CheckerboardFinish({ totalZ }: Readonly<{ totalZ: number }>) {
  const checkerTex = useMemo(() => {
    const size = 4
    const data = new Uint8Array(size * size * 4)
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const isWhite = (row + col) % 2 === 0
        const v = isWhite ? 255 : 0
        const idx = (row * size + col) * 4
        data[idx] = v
        data[idx + 1] = v
        data[idx + 2] = v
        data[idx + 3] = 255
      }
    }
    const tex = new DataTexture(data, size, size, RGBAFormat)
    tex.magFilter = NearestFilter
    tex.minFilter = NearestFilter
    tex.wrapS = RepeatWrapping
    tex.wrapT = RepeatWrapping
    tex.repeat.set(2, totalZ / 2)
    tex.needsUpdate = true
    return tex
  }, [totalZ])

  return (
    <mesh position={[TRACK_DISPLAY, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[4, totalZ]} />
      <meshStandardMaterial map={checkerTex} />
    </mesh>
  )
}

// ---- RaceScene — the full 3D canvas ----
export function RaceScene({
  simRef,
  runningRef,
  onRaceOver,
  showModal,
}: Readonly<{
  simRef: RefObject<RacerSim[]>
  runningRef: RefObject<boolean>
  onRaceOver: () => void
  showModal: boolean
}>) {
  const racers = simRef.current ?? []
  const n = racers.length
  const totalZ = n > 0 ? (n - 1) * LANE_GAP + LANE_GAP : LANE_GAP

  return (
    <Canvas camera={{ position: [0, 10, 15], fov: 35 }} className="size-full">
      <CameraFollow simRef={simRef} />
      <ambientLight intensity={1.2} />
      <directionalLight
        position={[10, 20, 5] as [number, number, number]}
        intensity={1.5}
      />

      {racers.map((racer, i) => (
        <mesh
          key={`lane-${racer.id}`}
          position={
            [TRACK_DISPLAY / 2, -0.01, zOf(i, n)] as [number, number, number]
          }
          rotation={[-Math.PI / 2, 0, 0] as [number, number, number]}
        >
          <planeGeometry args={[TRACK_DISPLAY, LANE_GAP * 0.95]} />
          <meshStandardMaterial
            color={LANE_COLORS[i % LANE_COLORS.length]}
            transparent
            opacity={0.3}
          />
        </mesh>
      ))}

      <mesh position={[0, 0.5, 0] as [number, number, number]}>
        <boxGeometry args={[0.05, 1, totalZ]} />
        <meshStandardMaterial color="white" />
      </mesh>

      <CheckerboardFinish totalZ={totalZ} />

      <Suspense fallback={null}>
        {racers.map((racer, i) => (
          <RacerModel
            key={racer.id}
            modelUrl={racer.modelUrl}
            name={racer.name}
            index={i}
            n={n}
            simRef={simRef}
            showModal={showModal}
          />
        ))}
      </Suspense>

      <SimLoop
        simRef={simRef}
        runningRef={runningRef}
        onRaceOver={onRaceOver}
      />
    </Canvas>
  )
}
