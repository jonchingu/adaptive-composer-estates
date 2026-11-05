import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/pages/ErrorBoundary";
import { EstatesPage } from "@/pages/EstatesPage";
import { HomePage } from "@/pages/HomePage";
import { NotFoundPage } from "@/pages/NotFoundPage";

/** Two pages, so a path switch is all the routing we need. The Worker serves index.html for every non-API path. */
const ROUTES: Record<string, () => React.ReactNode> = {
  "/": HomePage,
  "/estates": EstatesPage,
};

export function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const Page = ROUTES[path] ?? NotFoundPage;
  return (
    <TooltipProvider>
      <ErrorBoundary>
        <Page />
      </ErrorBoundary>
      <Toaster />
    </TooltipProvider>
  );
}
