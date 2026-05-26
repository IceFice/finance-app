// Lightweight SVG icon set used by AppLayout sidebar.
// All icons inherit currentColor and are 18px by default. Mirrors the
// stroke/fill conventions from Babkoschet/app-v3.jsx so the visual
// language stays consistent across mockup and product.

import { SVGProps } from 'react';

function I({ children, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconHome   = (p: SVGProps<SVGSVGElement>) => <I {...p}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></I>;
export const IconWallet = (p: SVGProps<SVGSVGElement>) => <I {...p}><path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3" /><path d="M3 7v10a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-3" /><path d="M22 11h-5a2 2 0 1 0 0 4h5z" /></I>;
export const IconList   = (p: SVGProps<SVGSVGElement>) => <I {...p}><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></I>;
export const IconTarget = (p: SVGProps<SVGSVGElement>) => <I {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /></I>;
export const IconChart  = (p: SVGProps<SVGSVGElement>) => <I {...p}><path d="M3 20h18" /><path d="M6 16v-4M11 16v-8M16 16v-2M21 16v-6" /></I>;
export const IconBell   = (p: SVGProps<SVGSVGElement>) => <I {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 21a2 2 0 0 0 4 0" /></I>;
export const IconSun    = (p: SVGProps<SVGSVGElement>) => <I {...p}><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" /></I>;
export const IconMoon   = (p: SVGProps<SVGSVGElement>) => <I {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></I>;
export const IconLogout = (p: SVGProps<SVGSVGElement>) => <I {...p}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5" /><path d="M5 12h12" /></I>;
export const IconMenu   = (p: SVGProps<SVGSVGElement>) => <I {...p}><path d="M4 6h16M4 12h16M4 18h16" /></I>;
export const IconChevL  = (p: SVGProps<SVGSVGElement>) => <I {...p}><path d="M15 6l-6 6 6 6" /></I>;
export const IconChevR  = (p: SVGProps<SVGSVGElement>) => <I {...p}><path d="M9 6l6 6-6 6" /></I>;
export const IconPlus   = (p: SVGProps<SVGSVGElement>) => <I {...p}><path d="M12 5v14M5 12h14" /></I>;
export const IconTags   = (p: SVGProps<SVGSVGElement>) => <I {...p}><path d="M20.6 13.4 13 21l-9-9V4h8z" /><circle cx="8" cy="8" r="1.5" fill="currentColor" /></I>;
export const IconGoal   = (p: SVGProps<SVGSVGElement>) => <I {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></I>;
export const IconRepeat = (p: SVGProps<SVGSVGElement>) => <I {...p}><path d="M17 2l4 4-4 4" /><path d="M21 6H7a4 4 0 0 0-4 4" /><path d="M7 22l-4-4 4-4" /><path d="M3 18h14a4 4 0 0 0 4-4" /></I>;
