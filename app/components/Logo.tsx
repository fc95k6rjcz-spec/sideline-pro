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
      src="/sideline-pro-logo-light.png"
      alt="Sideline Pro — Complete Club Management"
      width={2073}
      height={758}
      priority
      style={{ height, width: "auto" }}
    />
  );
}
