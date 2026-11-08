import {describe,it,expect,vi,beforeEach} from "vitest";
const mock=vi.hoisted(()=>({getUser:vi.fn(),admin:vi.fn(),insert:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({auth:{getUser:mock.getUser}})}));
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:mock.admin}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
import {saveRelease,withdrawRelease} from "./actions";
import {RELEASE_VERSION} from "@/lib/testimonials/release";
const valid={id:"d80e7306-4be7-4af0-990a-75adb9a8d15f",fullName:"Example Adult",dob:"1990-01-01",role:"",signature:"Example Adult",consent:true,version:RELEASE_VERSION};
beforeEach(()=>{vi.resetAllMocks();mock.admin.mockReturnValue({from:()=>({insert:mock.insert})});});
describe("release actions",()=>{
 it("rejects anonymous signing and withdrawal without reaching the database",async()=>{mock.getUser.mockResolvedValue({data:{user:null}});expect((await saveRelease(valid)).error).toBeTruthy();expect((await withdrawRelease(valid.id)).error).toBeTruthy();expect(mock.admin).not.toHaveBeenCalled();});
 it("rejects a signed-in non-admin",async()=>{mock.getUser.mockResolvedValue({data:{user:{id:"example",email:"not-admin@example.com"}}});expect((await saveRelease(valid)).error).toBeTruthy();expect(mock.admin).not.toHaveBeenCalled();});
 it("stores the server terms and never reports success on a failed write",async()=>{mock.getUser.mockResolvedValue({data:{user:{id:"example",email:"rowan@sidelinepro.com.au"}}});mock.insert.mockResolvedValue({error:{code:"database_error"}});expect((await saveRelease(valid)).error).toBeTruthy();expect(mock.insert.mock.calls[0][0].release_text).toContain("withdraw at any time");expect(mock.insert.mock.calls[0][0].recorded_by).toBe("example");});
});
