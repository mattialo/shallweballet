export function CountdownOverlay({ value }: Readonly<{ value: number | "GO!" }>) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center">
      <span
        key={String(value)}
        className="animate-countdown-pop select-none text-[20vw] font-bold leading-none text-foreground"
      >
        {value}
      </span>
    </div>
  )
}
