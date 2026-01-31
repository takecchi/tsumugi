import * as React from "react"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { PanelLeft, BotMessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

const MOBILE_BREAKPOINT = 768

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => setIsMobile(mql.matches)
    onChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}

export interface WorkspaceLayoutProps {
  sidebar: React.ReactNode
  editor: React.ReactNode
  aiPanel: React.ReactNode
  className?: string
  defaultSidebarSize?: number
  defaultAiPanelSize?: number
  minSidebarSize?: number
  minEditorSize?: number
  minAiPanelSize?: number
}

function MobileLayout({
  sidebar,
  editor,
  aiPanel,
  className,
}: Pick<WorkspaceLayoutProps, "sidebar" | "editor" | "aiPanel" | "className">) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [aiPanelOpen, setAiPanelOpen] = React.useState(false)

  return (
    <div className={cn("flex h-dvh w-screen flex-col overflow-hidden", className)}>
      {/* Mobile Header */}
      <div className="flex items-center justify-between border-b bg-sidebar px-2 py-1.5">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setSidebarOpen(true)}
          aria-label="サイドバーを開く"
        >
          <PanelLeft className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setAiPanelOpen(true)}
          aria-label="AIパネルを開く"
        >
          <BotMessageSquare className="size-5" />
        </Button>
      </div>

      {/* Main: Editor */}
      <div className="flex-1 min-h-0">
        {editor}
      </div>

      {/* Sidebar Drawer (left) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[85vw] max-w-[320px] p-0 bg-sidebar"
        >
          {sidebar}
        </SheetContent>
      </Sheet>

      {/* AI Panel Drawer (right) */}
      <Sheet open={aiPanelOpen} onOpenChange={setAiPanelOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-[85vw] max-w-[380px] p-0 bg-sidebar"
        >
          {aiPanel}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function DesktopLayout({
  sidebar,
  editor,
  aiPanel,
  className,
  defaultSidebarSize = 20,
  defaultAiPanelSize = 25,
  minSidebarSize = 15,
  minEditorSize = 30,
  minAiPanelSize = 20,
}: WorkspaceLayoutProps) {
  return (
    <div className={cn("h-screen w-screen overflow-hidden", className)}>
      <ResizablePanelGroup orientation="horizontal" className="h-full">
        {/* Left: Sidebar (File Tree) */}
        <ResizablePanel
          defaultSize={defaultSidebarSize}
          minSize={minSidebarSize}
          className="bg-sidebar"
        >
          {sidebar}
        </ResizablePanel>

        <ResizableHandle />

        {/* Center: Editor */}
        <ResizablePanel defaultSize={100 - defaultSidebarSize - defaultAiPanelSize} minSize={minEditorSize}>
          {editor}
        </ResizablePanel>

        <ResizableHandle />

        {/* Right: AI Panel */}
        <ResizablePanel
          defaultSize={defaultAiPanelSize}
          minSize={minAiPanelSize}
          className="bg-sidebar"
        >
          {aiPanel}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

export function WorkspaceLayout(props: WorkspaceLayoutProps) {
  const isMobile = useIsMobile()

  // SSR / 初回レンダリングではちらつき防止のため何も表示しない
  if (isMobile === undefined) {
    return null
  }

  if (isMobile) {
    return <MobileLayout {...props} />
  }

  return <DesktopLayout {...props} />
}

