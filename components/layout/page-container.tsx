import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  scrollable?: boolean;
}

export function PageContainer({ children, className, scrollable = true }: PageContainerProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col gap-6 p-6",
        scrollable && "overflow-y-auto",
        className
      )}
    >
      {children}
    </div>
  );
}
