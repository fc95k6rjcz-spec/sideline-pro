import {describe,it,expect} from 'vitest';
import {initialSections,mergeInterviewUpdates} from './interview-data';
describe('interview guide updates',()=>{
 it('adds new prompts while retaining local edits, ticks and notes',()=>{
 const saved=structuredClone(initialSections).map(s=>({...s,groups:s.groups.filter(g=>!g.items.some(q=>q.id.includes('nov09')))}));
 saved[1].notes='Take 3 is useful'; saved[1].groups[0].items[0].text='My edited question'; saved[1].groups[0].items[0].done=true;
 saved[1].groups[0].items.push({id:'custom',text:'Local prompt',done:true});
 const result=mergeInterviewUpdates(saved);
 expect(result[1].notes).toBe('Take 3 is useful');
 expect(result[1].groups[0].items[0]).toMatchObject({text:'My edited question',done:true});
 expect(result[1].groups.flatMap(g=>g.items).some(q=>q.id==='custom')).toBe(true);
 expect(result[1].groups.flatMap(g=>g.items).some(q=>q.id.includes('nov09'))).toBe(true);
 expect(mergeInterviewUpdates(result)).toEqual(result);
 });
 it('keeps unique stable IDs',()=>{const ids=initialSections.flatMap(s=>s.groups.flatMap(g=>g.items.map(q=>q.id)));expect(new Set(ids).size).toBe(ids.length);});
});
