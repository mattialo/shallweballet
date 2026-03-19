import { Waitlist } from "@clerk/clerk-react"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"

export default function WaitlistPage() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6">
      <Waitlist />
      <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
        ← Back to home
      </Button>
    </div>
  )
}
