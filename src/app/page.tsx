import { Button } from "@/components/ui/button"
import { Loader2Icon } from "lucide-react"

import SheetDemo from "@/demo/sheet"

export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <Button size="sm">
          <Loader2Icon className="animate-spin" />
          Please wait
        </Button>
        <SheetDemo />
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        
      </footer>
    </div>
  );
}
