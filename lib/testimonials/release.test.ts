import {describe,it,expect} from "vitest";
import {isAdult, releaseSchema, RELEASE_VERSION} from "./release";
describe("adult testimonial consent",()=>{
 const today=new Date("2026-11-09T01:00:00Z");
 it("checks the eighteenth birthday, not just the year",()=>{expect(isAdult("2008-11-09",today)).toBe(true);expect(isAdult("2008-11-10",today)).toBe(false);});
 it("rejects invalid and future birth dates",()=>{for(const d of ["2000-02-30","2090-01-01","bad",""])expect(isAdult(d,today)).toBe(false);});
 const valid={id:"d80e7306-4be7-4af0-990a-75adb9a8d15f",fullName:"Example Adult",dob:"1990-01-01",role:"",signature:"Example Adult",consent:true,version:RELEASE_VERSION};
 it("requires explicit consent, current wording and matching signature",()=>{expect(releaseSchema.safeParse(valid).success).toBe(true);for(const change of [{consent:false},{signature:"Someone Else"},{version:"old"},{fullName:""}])expect(releaseSchema.safeParse({...valid,...change}).success).toBe(false);});
});
