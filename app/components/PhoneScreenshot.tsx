import Image from "next/image"
import styles from "../home.module.css"

/** Phone hardware is presentation only; the image contains anonymised demo data. */
export function PhoneScreenshot() {
  return <div className={styles.phoneFrame}>
    <Image src="/lineup-demo-anonymised.png" alt="Current light-themed coach line-up interface with anonymous Player 01 to Player 08 demo labels" width={867} height={1815} sizes="(max-width: 760px) 60vw, 280px" />
  </div>
}
