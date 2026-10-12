import Image from "next/image";

type LogoProps = {
  size?: number;
  showWordmark?: boolean;
  tagline?: boolean;
};

export default function Logo({ size = 40 }: LogoProps) {
  // `size` is treated as the rendered logo height in px.
  const height = Math.round(size * 1.15);
  return (
    <Image
      src="/logo-horizontal-light.svg"
      alt="Sideline Pro — Complete Club Management"
      width={1250}
      height={400}
      priority
      style={{ height, width: "auto" }}
    />
  );
}
