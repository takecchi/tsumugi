import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

interface LoadingPageProps {
  message?: string;
  className?: string;
}

export function LoadingPage({ 
  message = "読み込み中...", 
  className 
}: LoadingPageProps) {
  return (
    <div className={cn(
      "flex min-h-screen items-center justify-center bg-background",
      className
    )}>
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
