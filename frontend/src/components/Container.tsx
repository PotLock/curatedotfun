export function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto px-4 w-full md:max-w-screen-2xl">{children}</div>
  );
}
