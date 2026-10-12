import Image from "next/image";

type LogoProps = {
  /** Rendered height in px. */
  size?: number;
  /** "horizontal" for headers; "stacked" is the primary presentation lockup. */
  variant?: "horizontal" | "stacked";
  className?: string;
};

/**
 * Official SidelinePro artwork from the brand identity pack.
 * - horizontal: 403:106 canvas, wordmark sits low on the larger S (light-bg variant).
 * - stacked: SidelinePro_Primary_Stacked_Navy, square 1254 canvas with its own navy ground.
 */
export default function Logo({ size = 40, variant = "horizontal", className }: LogoProps) {
  if (variant === "stacked") {
    return (
      <Image
        src="/logo-stacked-navy.svg"
        alt="SidelinePro"
        width={1254}
        height={1254}
        priority
        className={className}
        style={{ height: size, width: size }}
      />
    );
  }
  return (
    <Image
      src="/logo-horizontal-light.svg"
      alt="SidelinePro"
      width={403}
      height={106}
      priority
      className={className}
      style={{ height: size, width: "auto" }}
    />
  );
}
