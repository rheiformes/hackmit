"use client"

export function StrawberryAccent({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute pointer-events-none ${className}`}>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-accent opacity-20"
      >
        <path
          d="M12 2C10.5 2 9.5 3 9.5 4.5C9.5 5.5 10 6.5 11 7L12 8L13 7C14 6.5 14.5 5.5 14.5 4.5C14.5 3 13.5 2 12 2Z"
          fill="currentColor"
        />
        <path d="M12 8C8 8 5 11 5 15C5 19 8 22 12 22C16 22 19 19 19 15C19 11 16 8 12 8Z" fill="currentColor" />
        <circle cx="10" cy="12" r="0.5" fill="#ffffff" />
        <circle cx="14" cy="13" r="0.5" fill="#ffffff" />
        <circle cx="11" cy="15" r="0.5" fill="#ffffff" />
        <circle cx="13" cy="16" r="0.5" fill="#ffffff" />
        <circle cx="12" cy="18" r="0.5" fill="#ffffff" />
      </svg>
    </div>
  )
}

export function JamJarAccent({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute pointer-events-none ${className}`}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-accent opacity-15"
      >
        <rect x="8" y="10" width="16" height="18" rx="2" fill="currentColor" />
        <rect x="10" y="8" width="12" height="4" rx="1" fill="currentColor" />
        <rect x="12" y="6" width="8" height="2" rx="1" fill="currentColor" />
        <circle cx="14" cy="16" r="1" fill="#ffffff" opacity="0.3" />
        <circle cx="18" cy="18" r="1" fill="#ffffff" opacity="0.3" />
        <circle cx="16" cy="22" r="1" fill="#ffffff" opacity="0.3" />
      </svg>
    </div>
  )
}
