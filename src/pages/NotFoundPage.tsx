export function NotFoundPage() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-[560px] flex-col items-start gap-3 px-4 pt-[22vh]">
      <h1 className="text-[17px] leading-6 font-[550]">This page doesn’t exist</h1>
      <p className="text-ink-2 text-[15px] leading-[22px]">Shapeshift has two pages.</p>
      <a
        href="/"
        className="bg-primary text-primary-foreground focus-visible:outline-ring inline-flex h-8 items-center rounded-full px-4 text-[14px] font-medium transition-[scale] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.96]"
      >
        Go to Shapeshift
      </a>
    </main>
  );
}
