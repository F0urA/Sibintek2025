import React, { useMemo } from "react";
import { useAuth } from "../../services/auth";
import { Link } from "react-router-dom";

function parseJwt(t:string){
    try{ const p=t.split(".")[1]; return JSON.parse(atob(p.replace(/-/g,"+").replace(/_/g,"/"))); }catch{return {}}
}
function roleLabel(r?:string|null){
    if(r==="retail") return "оператор узла";
    if(r==="fleet")  return "куратор флотилии";
    if(r==="fin")    return "интендант потоков";
    if(r==="admin")  return "архитектор сектора";
    return "—";
}
function initials(email:string){
    const u = (email||"").split("@")[0];
    const parts = u.split(/[._-]/).filter(Boolean);
    const a = (parts[0]?.[0]||"U").toUpperCase();
    const b = (parts[1]?.[0]||"").toUpperCase();
    return (a+b).slice(0,2);
}

export default function ProfileCard(){
    const auth = useAuth();
    const payload:any = useMemo(()=> auth.jwt ? parseJwt(auth.jwt) : {}, [auth.jwt]);
    const email = payload?.email || "—";
    const uid   = payload?.sub ?? "—";
    const role  = roleLabel(auth.role);
    const expS  = payload?.exp ? (payload.exp*1000 - Date.now())/1000 : null;
    const expTxt= expS!=null ? (expS<=0 ? "истёк" : `${Math.floor(expS/3600)}ч ${Math.floor((expS%3600)/60)}м`) : "—";
    const expKind = expS==null ? "warn" : expS<=0 ? "err" : expS<3600 ? "warn" : "ok";
    const tz   = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now  = new Date().toLocaleString();

    const avatar = initials(email);

    return (
        <div className="panel">
            <div className="section-title">Профиль </div>
            <div style={{display:"grid", gridTemplateColumns:"64px 1fr", gap:14, alignItems:"center"}}>
                <div style={{
                    width:64, height:64, borderRadius:12, display:"grid", placeItems:"center",
                    background:"linear-gradient(135deg,#2A6A55,#17222E)", boxShadow:"0 0 22px rgba(67,227,176,.35)",
                    fontWeight:900, fontSize:22
                }}>{avatar}</div>
                <div style={{minWidth:0}}>
                    <div style={{display:"flex", gap:10, alignItems:"baseline", flexWrap:"wrap"}}>
                        <div style={{fontWeight:800, fontSize:"1.1rem"}}>{email}</div>
                        <span className="chip">UID: {uid}</span>
                        <span className="chip">{role}</span>
                    </div>
                    <div style={{display:"flex", gap:10, marginTop:8, flexWrap:"wrap"}}>
                        <span className={`chip ${expKind==="ok"?"chip-ok":expKind==="warn"?"":""}`}>JWT: {expTxt}</span>
                        <span className="chip">Время: {now} ({tz})</span>
                    </div>
                    <div className="row" style={{marginTop:10}}>
                        {(auth.role==="retail"||auth.role==="admin") && <Link className="btn" to="/retail">Резервуары / Смена</Link>}
                        {(auth.role==="fleet" ||auth.role==="admin") && <Link className="btn" to="/fleet">Интеграции</Link>}
                        {(auth.role==="fin"   ||auth.role==="admin") && <Link className="btn" to="/finance">Финансы</Link>}
                    </div>
                </div>
            </div>
        </div>
    );
}
