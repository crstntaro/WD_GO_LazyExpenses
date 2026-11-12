
import type { CSSProperties } from "react";

export function BrandMark({
  size = 46,
}: {
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Where'd It Go? receipt logo"
    >
      <path
        d="M14 8h27l9 9v33c0 3.3-2.7 6-6 6H14c-3.3 0-6-2.7-6-6V14c0-3.3 2.7-6 6-6Z"
        fill="#E6F4C0"
      />

      <path
        d="M41 8v10h9"
        stroke="#121B22"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      <path
        d="M17 25h21M17 33h14"
        stroke="#121B22"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <circle
        cx="39"
        cy="41"
        r="10"
        fill="#FF805F"
        stroke="#121B22"
        strokeWidth="2"
      />

      <path
        d="m45.5 48.5 8 8"
        stroke="#121B22"
        strokeWidth="4"
        strokeLinecap="round"
      />

      <path
        d="M36 41h6M39 38v6"
        stroke="#121B22"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <circle
        cx="56"
        cy="14"
        r="2"
        fill="#FF805F"
      />

      <circle
        cx="58"
        cy="22"
        r="1.5"
        fill="#A7B4F3"
      />
    </svg>
  );
}

export function MissingPieceArt({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 290 170"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M7 128c42-5 48-50 94-49 26 0 37 34 69 18 21-10 18-38 50-40"
        stroke="#758C83"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="2 9"
      />

      <circle
        cx="19"
        cy="126"
        r="5"
        fill="#FF805F"
      />

      <g transform="translate(170 14) rotate(12 56 57)">
        <circle
          cx="56"
          cy="57"
          r="51"
          fill="#E6F4C0"
        />

        <path
          d="M80 12 106 32 84 48 107 63 83 80 103 96 80 107h42V4H80Z"
          fill="#24313A"
        />

        <circle
          cx="43"
          cy="52"
          r="4"
          fill="#24313A"
        />

        <path
          d="M34 70c7 7 16 7 23 0"
          stroke="#24313A"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </g>

      <path
        d="m114 61 10-12m-5 12-6-10"
        stroke="#A7B4F3"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      <circle
        cx="149"
        cy="120"
        r="4"
        fill="#FF805F"
      />
    </svg>
  );
}

export function SpendingTicks({
  percentage,
}: {
  percentage: number;
}) {
  const safe = Math.max(
    0,
    Math.min(100, percentage)
  );

  return (
    <div
      className="spending-ticks"
      role="progressbar"
      aria-label="Share of starting amount spent"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(safe)}
      style={
        {
          "--filled": `${safe}%`,
        } as CSSProperties
      }
    >
      <div className="spending-ticks__fill" />
    </div>
  );
}
