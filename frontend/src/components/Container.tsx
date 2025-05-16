export function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[400px] md:max-w-screen-xl lg:max-w-6xl xl:max-w-7xl">
      {children}
    </div>
  );
}
