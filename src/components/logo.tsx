import { cn } from "@/lib/utils";
import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <div
      className={cn("flex flex-col items-center leading-none text-foreground", props.className)}
    >
      <span
        style={{
          fontFamily: "Poppins, sans-serif",
          fontSize: "22px",
          fontWeight: "bold",
          letterSpacing: "0.1em",
        }}
        className="text-primary"
      >
        TORINO
      </span>
      <span
        style={{
          fontFamily: "Poppins, sans-serif",
          fontSize: "8px",
          fontWeight: "500",
          letterSpacing: "0.4em",
        }}
        className="text-muted-foreground"
      >
        AMBIENTES
      </span>
    </div>
  );
}
