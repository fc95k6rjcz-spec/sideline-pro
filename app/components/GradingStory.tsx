"use client"

import { useState } from "react"
import { ArrowRight, Check, ChevronDown } from "lucide-react"
import { MWNA_COMPETENCIES, type MwnaCompetencyId } from "@/lib/mwna-competencies"
import { NNSW_COMPETENCY_LEVELS } from "@/lib/nnsw-grading-descriptors"
import styles from "../home.module.css"

const coach = [4,4,4,3,4,4,5,3]
// The six courtside fields map to six competencies; unobserved skills remain unscored.
const court: (number|null)[] = [4,4,5,3,4,null,5,null]
const games = [
  {round:"Round 7",opponent:"Bayside U13",position:"GS / GA",wentWell:"Strong leads into the circle and clean catches under pressure.",turnovers:"A rushed pass into a crowded circle lost possession. Reset and look for the second option.",focus:"Passing / decisions",skill:"passing_decision_making" as MwnaCompetencyId,next:"Practise scanning before the catch and using a give-and-go to create space."},
  {round:"Round 6",opponent:"Harbour U13",position:"GS",wentWell:"Held circle position and communicated clearly with the feeder.",turnovers:"Coach noted a dropped catch under close defence. Work on securing the ball before turning.",focus:"Ball handling",skill:"ball_handling" as MwnaCompetencyId,next:"Practise high and low catches with controlled defensive pressure."},
  {round:"Round 5",opponent:"Waves U13",position:"GA / GS",wentWell:"Timed leads well and offered a second passing option.",turnovers:"No turnover observation recorded in this example report. This does not mean zero turnovers.",focus:"Game awareness",skill:"game_awareness" as MwnaCompetencyId,next:"Keep building the connection between the feeder and the circle."},
]
const tabs = [{id:"matrix",label:"Skills matrix"},{id:"reports",label:"Game reports"},{id:"compare",label:"Compare evidence"}] as const
type Tab = typeof tabs[number]["id"]

export function GradingStory() {
  const [tab,setTab] = useState<Tab>("matrix")
  const [selectedSkill,setSelectedSkill] = useState<MwnaCompetencyId|null>(null)
  const [gameIndex,setGameIndex] = useState(0)
  const [turnoversOnly,setTurnoversOnly] = useState(false)
  const skillIndex = MWNA_COMPETENCIES.findIndex(s=>s.id===selectedSkill)
  const game=games[gameIndex]
  function openSkill(id:MwnaCompetencyId){setSelectedSkill(id);setTab("matrix")}
  return <figure className={styles.gradingStory}>
    <div className={styles.assessmentCard}>
      <div className={styles.assessmentTop}><span>THE WHOLE PLAYER PICTURE</span><span>INTERACTIVE EXAMPLE</span></div>
      <div className={styles.playerSummary}><div className={styles.playerBib}>01</div><div><strong>Zara · U13</strong><p>Playing GS · Prefers GS / GA</p></div><span className={styles.contextBadge}><Check size={13}/> Coach context</span></div>
      <div className={styles.evidenceTabs} role="tablist" aria-label="Explore player evidence">{tabs.map(t=><button key={t.id} role="tab" id={`evidence-tab-${t.id}`} aria-selected={tab===t.id} aria-controls={`evidence-panel-${t.id}`} onClick={()=>setTab(t.id)} onKeyDown={e=>{if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();const next=tabs[(tabs.findIndex(x=>x.id===tab)+(e.key==="ArrowRight"?1:2))%3].id;setTab(next);document.getElementById(`evidence-tab-${next}`)?.focus()}}} tabIndex={tab===t.id?0:-1}>{t.label}</button>)}</div>
      <div className={styles.evidencePanel} role="tabpanel" id={`evidence-panel-${tab}`} aria-labelledby={`evidence-tab-${tab}`} tabIndex={0}>
        {tab==="matrix"&&<><p className={styles.panelIntro}>Eight coach competencies. Select a skill to see what each rating means.</p><div className={styles.matrixRows}>{MWNA_COMPETENCIES.map((s,i)=><button key={s.id} className={styles.matrixRow} aria-expanded={selectedSkill===s.id} aria-controls="skill-descriptors" onClick={()=>setSelectedSkill(selectedSkill===s.id?null:s.id)}><span>{s.shortLabel}</span><span className={styles.ratingDots} aria-hidden="true">{[1,2,3,4,5].map(n=><i key={n} data-filled={n<=coach[i]}/>)}</span><b>{coach[i]}/5</b><ChevronDown size={12}/></button>)}</div>{selectedSkill&&<div className={styles.skillDescriptors} id="skill-descriptors"><strong>{MWNA_COMPETENCIES[skillIndex].label}</strong><p>Relative to this player’s grade. The same descriptions support coach and grading conversations.</p><ol>{([1,2,3,4,5] as const).map(n=><li key={n} data-selected={coach[skillIndex]===n}><b>{n} · {NNSW_COMPETENCY_LEVELS[selectedSkill][n].label}</b><span>{NNSW_COMPETENCY_LEVELS[selectedSkill][n].description}</span></li>)}</ol></div>}<div className={styles.shootingSummary}><div><span>GA / GS · COUNTED SHOTS</span><strong>8<span>/10</span></strong></div><div><strong>80%</strong><span>Coach estimate kept separate</span></div></div><button className={styles.evidenceAction} onClick={()=>setTab("reports")}>See the game reports behind the context <ArrowRight size={13}/></button></>}
        {tab==="reports"&&<><div className={styles.reportToolbar}><label>Game<select value={gameIndex} onChange={e=>setGameIndex(Number(e.target.value))}>{games.map((g,i)=><option key={g.round} value={i}>{g.round} · {g.opponent}</option>)}</select></label><button aria-pressed={turnoversOnly} onClick={()=>setTurnoversOnly(!turnoversOnly)}>Turnover notes</button></div><div className={styles.gameReport}><div className={styles.reportTitle}><strong>{game.round} · {game.opponent}</strong><span>{game.position}</span></div>{!turnoversOnly&&<div><h5>What went well</h5><p>{game.wentWell}</p></div>}<div><h5>Turnover observations</h5><p>{game.turnovers}</p><small>Coach’s qualitative notes · not an event count</small></div>{!turnoversOnly&&<div><h5>Next training focus</h5><p>{game.next}</p></div>}<button className={styles.evidenceAction} onClick={()=>openSkill(game.skill)}>Compare with {game.focus.toLowerCase()} guidance <ArrowRight size={13}/></button></div><p className={styles.evidenceCaveat}>Fictional reports showing the supported strengths, improvement notes and competency links. No automatic match-stat tracking is implied.</p></>}
        {tab==="compare"&&<><p className={styles.panelIntro}>Season context beside grading-day observations. These are separate assessments, not an automatic combined score.</p><div className={styles.comparisonTable}><table><caption>Coach and courtside ratings · out of 5</caption><thead><tr><th scope="col">Competency</th><th scope="col">Coach</th><th scope="col">Courtside</th></tr></thead><tbody>{MWNA_COMPETENCIES.map((s,i)=><tr key={s.id}><th scope="row">{s.shortLabel}</th><td>{coach[i]}/5</td><td>{court[i]===null?<span>Not scored</span>:`${court[i]}/5`}</td></tr>)}</tbody></table></div><p className={styles.evidenceCaveat}>Six courtside criteria map to the eight-skill coach report. Unscored skills stay unscored; missing evidence is never treated as zero.</p><div className={styles.compareNote}><strong>What this means for Team Builder</strong><p>Consider the skill profile, preferred positions, shooting evidence and coaching context together. Review team suggestions and make the final decisions.</p></div><button className={styles.evidenceAction} onClick={()=>setTab("reports")}>Read the match context <ArrowRight size={13}/></button></>}
      </div>
    </div>
    <div className={styles.evidenceFlow}><span>Coach reports</span><ArrowRight size={16}/><span>Grading</span><ArrowRight size={16}/><strong>Team Builder</strong></div>
    <figcaption>Explore the evidence behind the team decision.<small>Interactive product explainer · fictional players, ratings and reports</small></figcaption>
  </figure>
}
