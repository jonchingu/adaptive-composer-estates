import { ROW } from "./ResultList";

/** Server-rendered stand-in while the first ranking streams in. Mirrors the real layout so nothing jumps. */
export function EstatesSkeleton() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-[linear-gradient(180deg,rgb(98,103,106)_0%,rgb(58,64,69)_45%,rgb(30,35,40)_100%)] px-4 pt-7 pb-20">
      <div className="h-6 w-48 animate-pulse rounded bg-white/15" />
      <div className="mt-3.5 h-[38px] w-[330px] animate-pulse rounded-full bg-white/8" />
      <div className="mt-3.5 h-[420px] w-full max-w-[568px] animate-pulse rounded-[26px] bg-white/90" />
      <div className="mt-12 w-full max-w-[560px] rounded-[22px] bg-white px-2 pt-10 pb-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3.5 px-3" style={{ height: ROW }}>
            <div className="h-12 w-[62px] animate-pulse rounded-xl bg-[rgb(244,244,242)]" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-2/5 animate-pulse rounded bg-[rgb(240,240,238)]" />
              <div className="h-3 w-3/5 animate-pulse rounded bg-[rgb(244,244,242)]" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
