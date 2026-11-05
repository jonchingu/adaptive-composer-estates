import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main id="main" className="mx-auto flex w-full max-w-[560px] flex-col items-start gap-3 px-4 pt-[22vh]">
        <h1 className="text-[17px] leading-6 font-[550]">Unable to load Shapeshift</h1>
        <p className="text-ink-2 text-[15px] leading-[22px]">Something broke while rendering. Your saved items are safe in this browser.</p>
        <Button size="sm" onClick={() => this.setState({ error: null })} className="px-4">
          Try again
        </Button>
      </main>
    );
  }
}
