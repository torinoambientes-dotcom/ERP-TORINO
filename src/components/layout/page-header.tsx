import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

export function PageHeader({ title, description, className }: PageHeaderProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <h1 className="font-headline text-2xl font-semibold tracking-tight md:text-3xl">
        {title}
      </h1>
      {description && (
        <p className="text-base text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
