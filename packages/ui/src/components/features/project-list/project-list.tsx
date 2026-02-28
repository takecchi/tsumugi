import * as React from "react"
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export interface ProjectItem {
  id: string
  name: string
  path?: string
}

export interface ProjectListProps {
  projects: ProjectItem[]
  isLoading?: boolean
  selectedId?: string | null
  onSelect?: (project: ProjectItem) => void
  placeholder?: string
  emptyMessage?: string
  className?: string
}

const colors = [
  "bg-red-500/15 text-red-700 dark:text-red-400",
  "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  "bg-green-500/15 text-green-700 dark:text-green-400",
  "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  "bg-pink-500/15 text-pink-700 dark:text-pink-400",
  "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
]

function getInitialColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}

function ProjectListSkeleton() {
  return (
    <div className="flex flex-col gap-1 p-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <Skeleton className="size-8 rounded-md" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-3 w-[180px]" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ProjectList({
  projects,
  isLoading = false,
  selectedId,
  onSelect,
  placeholder = "プロジェクトの検索",
  emptyMessage = "プロジェクトが見つかりません",
  className,
}: ProjectListProps) {
  return (
    <Command className={cn("h-full flex flex-col", className)}>
      <CommandInput placeholder={placeholder} />
      <div className="flex-1 overflow-hidden">
        <CommandList className="h-full overflow-y-auto" style={{ maxHeight: 'none' }}>
          {isLoading ? (
            <ProjectListSkeleton />
          ) : (
            <>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {projects.map((project) => (
                  <CommandItem
                    key={project.id}
                    value={project.id}
                    keywords={[project.name, ...(project.path ? [project.path] : [])]}
                    onSelect={() => onSelect?.(project)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 cursor-pointer",
                      selectedId === project.id && "bg-accent"
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold",
                        getInitialColor(project.name)
                      )}
                    >
                      {getInitial(project.name)}
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">
                        {project.name}
                      </span>
                      {project.path && (
                        <span className="truncate text-xs text-muted-foreground">
                          {project.path}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </div>
    </Command>
  )
}

