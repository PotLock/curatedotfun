import { cn } from "../lib/utils"

export function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn("mx-auto px-4 w-full md:max-w-screen-xl")}>{children}</div>
  );
}
