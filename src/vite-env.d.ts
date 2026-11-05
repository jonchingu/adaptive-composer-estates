/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" skips /api/intent and classifies in the browser with the offline model. */
  readonly VITE_USE_MOCK?: string;
}
