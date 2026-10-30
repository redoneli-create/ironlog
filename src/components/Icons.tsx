interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export type IconName =
  | "dumbbell"
  | "timer"
  | "calendar"
  | "chart"
  | "sparkle"
  | "palette"
  | "database"
  | "plus"
  | "search"
  | "user"
  | "trash"
  | "target"
  | "flame";

const PATHS: Record<IconName, string> = {
  dumbbell: "M6.5 7v10M17.5 7v10M3.5 10v4M20.5 10v4M6.5 12h11",
  timer: "M12 8v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z",
  calendar: "M4 6h16v14H4zM8 3v4M16 3v4M4 10h16",
  chart: "M4 20V4M4 20h16M8 16l4-5 3 2 4-6",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z",
  palette: "M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 0-4 2 2 0 0 1 2-2h2a4 4 0 0 0 4-4 8 8 0 0 0-10-8Z",
  database: "M4 7c0-2 3.6-3 8-3s8 1 8 3-3.6 3-8 3-8-1-8-3Zm0 0v10c0 2 3.6 3 8 3s8-1 8-3V7M4 12c0 2 3.6 3 8 3s8-1 8-3",
  plus: "M12 5v14M5 12h14",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5c0-3.9 3.4-6 7.5-6s7.5 2.1 7.5 6",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM12 12h.01",
  flame: "M12 3c3 4 5 6 5 9a5 5 0 0 1-10 0c0-1.5.8-2.8 1.6-4 .9 1 1.6 1.4 2.4 1.4C11 7.6 11.4 5.2 12 3Z",
};

export function Icon({ name, size = 18, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
