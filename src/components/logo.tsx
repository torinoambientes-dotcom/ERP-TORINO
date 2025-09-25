import { cn } from "@/lib/utils";
import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 40" // Increased viewBox width to accommodate the icon
      className={cn("text-sidebar-foreground", props.className)}
      {...props}
    >
      {/* Power Drill Icon */}
      <g transform="translate(10, 5) scale(0.8)">
        <path
          fill="#facc15" // Yellow color for the drill body
          d="M21.5,8.5h-5.8l-1.7-1.7c-0.4-0.4-1-0.4-1.4,0L10.9,8.5H5.5C4.7,8.5,4,9.2,4,10v11c0,0.8,0.7,1.5,1.5,1.5h16c0.8,0,1.5-0.7,1.5-1.5V10C23,9.2,22.3,8.5,21.5,8.5z"
        />
        <path
          fill="#4b5563" // Dark gray for handle and details
          d="M17,13.5H9c-0.6,0-1,0.4-1,1v5c0,0.6,0.4,1,1,1h8c0.6,0,1-0.4,1-1v-5C18,13.9,17.6,13.5,17,13.5z"
        />
        <rect x="13" y="6.5" fill="#a1a1aa" width="2" height="2" />
        <path
          fill="#4b5563"
          d="M12.5,8.5h-3L11,7h2L12.5,8.5z"
        />
        <rect x="5" y="11.5" fill="#a1a1aa" width="2" height="4" rx="1" />
        <rect x="19" y="11.5" fill="#a1a1aa" width="2" height="2" rx="0.5"/>
         <rect x="19" y="14.5" fill="#a1a1aa" width="2" height="2" rx="0.5"/>
      </g>
      
      {/* Text */}
      <text
        x="130" // Adjusted X position
        y="20"
        fontFamily="Poppins, sans-serif"
        fontSize="20"
        fill="currentColor"
        textAnchor="middle"
        fontWeight="400"
      >
        TORINO
      </text>
      <text
        x="130" // Adjusted X position
        y="34"
        fontFamily="Poppins, sans-serif"
        fontSize="8"
        fill="currentColor"
        textAnchor="middle"
        letterSpacing="3"
        opacity="0.7"
      >
        AMBIENTES
      </text>
    </svg>
  );
}
