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
  | "flame"
  | "play"
  | "heart"
  | "book"
  | "settings"
  | "chevron"
  | "list";

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
  play: "M8 5.5v13l11-6.5-11-6.5Z",
  heart: "M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9Z",
  book: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15ZM4 20.5A2.5 2.5 0 0 0 6.5 23H20",
  settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8-3.5-2.1-.6a6 6 0 0 0-.5-1.3l1.1-1.9-1.7-1.7-1.9 1.1a6 6 0 0 0-1.3-.5L13 5h-2l-.6 2.1a6 6 0 0 0-1.3.5L7.2 6.5 5.5 8.2l1.1 1.9a6 6 0 0 0-.5 1.3L4 12v2l2.1.6c.1.5.3.9.5 1.3l-1.1 1.9 1.7 1.7 1.9-1.1c.4.2.8.4 1.3.5L11 21h2l.6-2.1c.5-.1.9-.3 1.3-.5l1.9 1.1 1.7-1.7-1.1-1.9c.2-.4.4-.8.5-1.3L20 14v-2Z",
  chevron: "M9 6l6 6-6 6",
  list: "M8.5 6.5h12M8.5 12h12M8.5 17.5h12M4 6.5h.01M4 12h.01M4 17.5h.01",
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
