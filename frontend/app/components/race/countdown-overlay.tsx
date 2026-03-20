export function CountdownOverlay({
  value,
}: Readonly<{ value: number | "GO!" }>) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center">
      <span
        key={String(value)}
        className="animate-countdown-pop text-[20vw] leading-none font-bold text-foreground select-none"
      >
        {value}
      </span>
    </div>
  )
}
