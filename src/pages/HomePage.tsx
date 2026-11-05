import { Shapeshift } from "@/components/shapeshift/Shapeshift";
import { SiteChrome } from "@/components/shapeshift/SiteChrome";

export function HomePage() {
  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,#5a6d7a_0%,#3d4a55_45%,#2a333b_100%)]" />
        <div className="absolute inset-0 opacity-40 mix-blend-soft-light bg-[radial-gradient(ellipse_at_30%_20%,#c4a574_0%,transparent_50%),radial-gradient(ellipse_at_70%_60%,#6b8f9e_0%,transparent_45%),linear-gradient(180deg,transparent_40%,rgb(20_28_34/0.55)_100%)]" />
        <div className="absolute -top-24 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(circle,rgb(180_210_220/0.35),transparent_70%)] blur-2xl" />
        <div className="absolute bottom-[18%] left-[12%] h-40 w-64 rounded-[40%] bg-[radial-gradient(circle,rgb(90_160_170/0.35),transparent_70%)] blur-xl" />
      </div>
      <Shapeshift />
      <SiteChrome />
    </>
  );
}
