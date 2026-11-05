/** Midland-style red AI sparkles mark. */
export function AiSparkles({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M12 2.5l1.15 4.1L17.5 8l-4.35 1.15L12 13.5l-1.15-4.35L6.5 8l4.35-1.4L12 2.5z"
        fill="#c43b3b"
      />
      <path
        d="M18.2 13.2l.7 2.45 2.5.7-2.5.7-.7 2.45-.7-2.45-2.5-.7 2.5-.7.7-2.45z"
        fill="#a32626"
      />
      <path
        d="M6.2 14.5l.55 1.9 1.95.55-1.95.55-.55 1.9-.55-1.9-1.95-.55 1.95-.55.55-1.9z"
        fill="#d45757"
      />
    </svg>
  );
}
