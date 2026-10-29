import Image from "next/image"
import styles from "../home.module.css"

export function PhoneScreenshot() {
  return <div className={styles.productRender}>
    <Image src="/lineup-studio-render.png" alt="Studio render based on the current SidelinePro line-up app on an angled phone, with anonymous demo players" width={1536} height={1152} sizes="(max-width:760px) 90vw, 600px" />
  </div>
}
