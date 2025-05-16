export function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 xl:px-12 md:max-w-screen-xl lg:max-w-6xl xl:max-w-7xl">
      {children}
    </div>
  );
}
