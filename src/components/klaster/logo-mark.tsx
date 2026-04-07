import { cn } from "@/lib/utils";

type KlasterLogoMarkProps = {
  className?: string;
};

export function KlasterLogoMark({ className }: KlasterLogoMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={cn("size-8 shrink-0 text-foreground", className)}
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 276 276"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="currentColor" stroke="currentColor" strokeLinecap="round">
        <path d="M115 99L160 99" strokeWidth="11" />
        <path d="M91 140L114 180" strokeWidth="12" />
        <path d="M184 140L161 180" strokeWidth="12" />

        <circle cx="115" cy="99" r="18" />
        <circle cx="160" cy="99" r="18" />
        <circle cx="91" cy="140" r="18" />
        <circle cx="114" cy="180" r="18" />
        <circle cx="184" cy="140" r="18" />
        <circle cx="161" cy="180" r="18" />
      </g>
    </svg>
  );
}
