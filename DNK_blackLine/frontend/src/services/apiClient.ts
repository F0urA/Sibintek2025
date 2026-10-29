import { apiFetch } from "../shared/lib/fetcher";
import { auth } from "./auth";
export type FinSort = "SUM_TOTAL_DESC" | "SUM_TOTAL_ASC" | "SUPPLIER_ASC";

export class API {
    get jwt(){ return auth.jwt; }

    async login(email:string, password:string){
        const r = await fetch("/api/auth/login",{ method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({email,password}) });
        if(!r.ok) throw new Error(await r.text());
        const j = await r.json(); if(j.jwt) auth.setJWT(j.jwt); return j;
    }
    register(email:string,password:string,role:string,name:string){
        return apiFetch<{id:number}>(`/auth/register`,{ method:"POST", body: JSON.stringify({email,password,role,name}) });
    }

    getProfileSecrets(){ return apiFetch<{profile_flag:string}>(`/profile/secrets`,{},this.jwt||undefined); }
    putProfileSecrets(v:string){ return apiFetch(`/profile/secrets`,{method:"PUT",body:JSON.stringify({profile_flag:v})},this.jwt||undefined); }

    getRetailProfile(){ return apiFetch(`/retail/profile/config`,{},this.jwt||undefined); }
    putRetailProfile(payload:any){ return apiFetch(`/retail/profile/config`,{method:"PUT",body:JSON.stringify(payload)},this.jwt||undefined); }

    listShifts(){ return apiFetch(`/retail/shifts`,{},this.jwt||undefined); } // ?mine=1 уже на бэке
    openShift(site_id:number, notes:string){ return apiFetch(`/retail/shifts/open`,{method:"POST",body:JSON.stringify({site_id, opening_level:{}, notes})},this.jwt||undefined); }
    closeShift(id:number, notes:string){ return apiFetch(`/retail/shifts/${id}/close`,{method:"POST",body:JSON.stringify({closing_level:{}, notes})},this.jwt||undefined); }

    createWebhook(url:string){

        const sub = (()=>{ try{ return JSON.parse(atob((this.jwt||"").split(".")[1]||"{}")).sub||0; }catch{return 0;} })();
        return apiFetch<{id:number}>(`/fleet/webhooks`,{method:"POST",body:JSON.stringify({url, owner_id:sub, secret_token:""})},this.jwt||undefined);
    }
    getWebhook(id:number){ return apiFetch(`/fleet/webhooks/${id}`,{},this.jwt||undefined); }
    listMyWebhookIDs(){
        return fetch(`/api/fleet/webhooks/ids?mine=1`, {
            headers: { ...(this.jwt?{Authorization:`Bearer ${this.jwt}`}:{}) }
        }).then(async r => r.ok ? r.json() : Promise.reject(await r.text()));
    }

    getFinProfile(){ return apiFetch(`/fin/profile/config`,{},this.jwt||undefined); }
    putFinProfile(payload:any){ return apiFetch(`/fin/profile/config`,{method:"PUT",body:JSON.stringify(payload)},this.jwt||undefined); }

    async diagnosticPreview(sort: FinSort = "SUM_TOTAL_DESC"){
        const h:Record<string,string> = {"Content-Type":"application/json"};
        if (this.jwt) h["Authorization"] = `Bearer ${this.jwt}`;

        const q = `?orderBy=${encodeURIComponent(sort)}`;
        const r = await fetch(`/api/fin/reports/preview${q}`, { method:"POST", headers:h, body:"{}" });
        const txt = await r.text();

        if (!r.ok) throw new Error(txt || String(r.status));
        return txt;
    }

    sortFinRows(rows: Array<any>, sort: FinSort){
        const copy = [...rows];
        if (sort === "SUM_TOTAL_DESC") {
            copy.sort((a,b)=>(b.sum_total??0)-(a.sum_total??0));
        } else if (sort === "SUM_TOTAL_ASC") {
            copy.sort((a,b)=>(a.sum_total??0)-(b.sum_total??0));
        } else if (sort === "SUPPLIER_ASC") {
            copy.sort((a,b)=>String(a.supplier||"").localeCompare(String(b.supplier||"")));
        }
        return copy;
    }


    async safePutFinProfile(patch:any){
        const current:any = await this.getFinProfile().catch(()=> ({}));
        const merged = { ...current, ...patch };
        if (merged.role_fin_flag === "") delete merged.role_fin_flag;
        return apiFetch(`/fin/profile/config`, { method:"PUT", body: JSON.stringify(merged) }, this.jwt||undefined);
    }


    emitAudit(kind:string,note:string,log_flag?:string){ return apiFetch(`/audit/emit`,{method:"POST",body:JSON.stringify({kind,note,log_flag})},this.jwt||undefined); }
    listAudit(since_ms=0){ return apiFetch(`/audit/events${since_ms?`?since_ms=${since_ms}`:""}`,{},this.jwt||undefined); }
}
export const api = new API();
