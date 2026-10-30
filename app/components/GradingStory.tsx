import { ArrowRight, Check } from "lucide-react"
import styles from "../home.module.css"

/** A readable product explainer using the grading demo's fictional example data. */
export function GradingStory() {
  return <figure className={styles.gradingStory}>
    <div className={styles.assessmentCard}>
      <div className={styles.assessmentTop}><span>THE WHOLE PLAYER PICTURE</span><span>DEMO</span></div>
      <div className={styles.playerSummary}><div className={styles.playerBib}>01</div><div><strong>Zara · U13</strong><p>Playing GS · Prefers GS / GA</p></div><span className={styles.contextBadge}><Check size={13}/> Coach context</span></div>
      <div className={styles.skillSummary}><div><span>COACH COMPETENCIES</span><strong>Eight skills. Shared criteria.</strong></div>{[["Ball handling",4],["Game awareness",4],["Coachability",5]].map(([label,rating])=><div className={styles.skillRow} key={label}><span>{label}</span><span aria-label={`${rating} out of 5`}>{[1,2,3,4,5].map(n=><i key={n} data-filled={n<=Number(rating)}/>)}</span><b>{rating}/5</b></div>)}</div>
      <div className={styles.shootingSummary}><div><span>GA / GS · COUNTED SHOTS</span><strong>8<span>/10</span></strong></div><div><strong>80%</strong><span>Coach estimate kept separate</span></div></div>
      <div className={styles.assessmentFooter}><Check size={14}/> On-court scores + position information + coach context</div>
    </div>
    <div className={styles.evidenceFlow}><span>Coach reports</span><ArrowRight size={16}/><span>Grading</span><ArrowRight size={16}/><strong>Team Builder</strong></div>
    <figcaption>Evidence that carries into team decisions.<small>Product explainer · fictional data from the interactive grading demo</small></figcaption>
  </figure>
}
