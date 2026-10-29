import { loadJWT, saveJWT, clearJWT } from "../shared/lib/storage";
type JwtPayload = { role?: string; [k:string]:any };

function parseJwt(t:string):JwtPayload|null{
    try{ const [,pl]=t.split("."); const s=pl.replace(/-/g,"+").replace(/_/g,"/"); return JSON.parse(atob(s)); }catch{ return null; }
}

class Auth {
    jwt: string | null = loadJWT();
    role: string | null = null;
    constructor(){ if(this.jwt){ this.role = parseJwt(this.jwt)?.role ?? null; } }
    setJWT(t:string){ this.jwt=t; saveJWT(t); this.role=parseJwt(t)?.role ?? null; }
    logout(){ this.jwt=null; this.role=null; clearJWT(); }
}
export const auth = new Auth();
export function useAuth(){ return auth; }
