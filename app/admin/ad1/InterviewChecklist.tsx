"use client";

import { useEffect, useState } from "react";
import { initialSections } from "./interview-data";
import styles from "./interviews.module.css";

const KEY = "sidelinepro-interviews-v2";
type Section = (typeof initialSections)[number];

export default function InterviewChecklist() {
  const [sections, setSections] = useState(initialSections);
  const [active, setActive] = useState("setup");
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Loading saved checklist…");
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState("2026-11-08");
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        // Validate before restoring; a damaged backup must not break filming notes.
        if (Array.isArray(saved.sections) && saved.sections.length === initialSections.length && saved.sections.every((s: Section, i: number) => s.id === initialSections[i].id && typeof s.notes === "string" && Array.isArray(s.groups) && s.groups.every(g => typeof g.title === "string" && Array.isArray(g.items) && g.items.every(q => typeof q.id === "string" && typeof q.text === "string" && typeof q.done === "boolean")))) {
          setSections(saved.sections);
          if (typeof saved.date === "string") setDate(saved.date);
        } else { setStatus("Saved checklist could not be restored. Original questions loaded."); setReady(true); return; }
      }
      setStatus("Saved on this browser only");
    } catch { setStatus("Browser storage unavailable — download your notes before leaving."); }
    setReady(true);
  }, []);

  function persist(next: Section[], nextDate = date) {
    setSections(next); setDate(nextDate);
    try { localStorage.setItem(KEY, JSON.stringify({sections: next, date: nextDate})); setStatus("Saved on this browser only"); }
    catch { setStatus("Could not save — download your notes before leaving."); }
  }
  function updateItem(sectionId: string, itemId: string, patch: {text?: string; done?: boolean}) {
    persist(sections.map(s => s.id !== sectionId ? s : {...s, groups: s.groups.map(g => ({...g, items: g.items.map(q => q.id === itemId ? {...q, ...patch} : q)}))}));
  }
  function download() {
    const text = [`Seaforth testimonial interviews · ${date}`, ...sections.flatMap(s => ["", s.name, s.focus, ...s.groups.flatMap(g => ["", g.title, ...g.items.map(q => `${q.done ? "[x]" : "[ ]"} ${q.text}`)]), "", "Filming notes / takes", s.notes])].join("\n");
    const url = URL.createObjectURL(new Blob([text], {type:"text/plain;charset=utf-8"}));
    const a = document.createElement("a"); a.href=url; a.download=`seaforth-interviews-${date}.txt`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const total = sections.flatMap(s => s.groups.flatMap(g => g.items));
  return <div className={styles.page}>
    <header className={styles.header}>
      <p className={styles.eyebrow}>SEAFORTH · FILMING COMPANION</p>
      <h1>Testimonial interviews</h1>
      <p>Tick off prompts as you go. Listen first, then follow the story.</p>
      <div className={styles.tools}>
        <label>Filming date <input aria-label="Filming date" type="date" value={date} disabled={!ready} onChange={e => persist(sections,e.target.value)} /></label>
        <button disabled={!ready} aria-pressed={editing} onClick={() => setEditing(!editing)}>{editing ? "Done editing" : "Edit questions"}</button>
        <button disabled={!ready} onClick={download}>Download notes</button>
        <button onClick={() => window.print()}>Print all</button>
      </div>
      <p role="status" className={styles.status}>{status}. Edits and ticks do not sync to another device.</p>
    </header>
    <nav className={styles.nav} aria-label="Interview sections">
      {sections.map(s => {
        const items=s.groups.flatMap(g=>g.items);
        return <button key={s.id} aria-current={active===s.id ? "page" : undefined} onClick={()=>setActive(s.id)}>{s.id === "setup" ? "On the day" : s.name.split(" · ")[0]} <span>{items.filter(q=>q.done).length}/{items.length}</span></button>;
      })}
    </nav>
    <p className={styles.progress}>{total.filter(q=>q.done).length} of {total.length} prompts ticked · Questions are a guide, not a script you must finish.</p>
    {sections.map(s => <section key={s.id} className={`${styles.section} ${active !== s.id ? styles.hidden : ""}`}>
      <h2>{s.name}</h2><p className={styles.focus}>{s.focus}</p>
      {s.groups.map((g,gi) => <div className={styles.group} key={g.title}>
        <h3>{g.title}</h3>
        <ul>{g.items.map(q => <li key={q.id} className={q.done ? styles.checked : ""}>
          <input type="checkbox" id={`tick-${q.id}`} checked={q.done} disabled={!ready} aria-label={`Completed: ${q.text}`} onChange={e=>updateItem(s.id,q.id,{done:e.target.checked})}/>
          {editing ? <textarea aria-label="Edit prompt" rows={3} value={q.text} onChange={e=>updateItem(s.id,q.id,{text:e.target.value})}/> : <label htmlFor={`tick-${q.id}`}>{q.text}</label>}
        </li>)}</ul>
        {editing && <button onClick={()=>persist(sections.map(section=>section.id!==s.id?section:{...section,groups:section.groups.map((group,index)=>index!==gi?group:{...group,items:[...group.items,{id:crypto.randomUUID(),text:"New question — edit here",done:false}]})}))}>+ Add prompt</button>}
      </div>)}
      <div className={styles.notes}><label htmlFor={`notes-${s.id}`}>Filming notes · good quotes, take numbers, verified figures</label><textarea id={`notes-${s.id}`} rows={6} disabled={!ready} value={s.notes} onChange={e=>persist(sections.map(section=>section.id===s.id?{...section,notes:e.target.value}:section))} placeholder="Capture the useful details here…"/><div className={styles.printNotes}>{s.notes}</div></div>
      <button className={styles.reset} disabled={!ready} onClick={()=>{if(window.confirm(`Clear ticks for ${s.name}? Your edited questions and notes will stay.`)) persist(sections.map(section=>section.id!==s.id?section:{...section,groups:section.groups.map(g=>({...g,items:g.items.map(q=>({...q,done:false}))}))}));}}>Clear this section’s ticks</button>
    </section>)}
  </div>;
}
