import React, { useEffect, useState } from "react";

type Audit = { id:number; kind:string; note?:string; ts_unix_ms:number };

export default function Activity(){
    const [items,setItems]=useState<Audit[]>([]);
    useEffect(()=>{
        const jwt = localStorage.getItem("jwt")||"";
        fetch(`/api/audit/events?since_ms=${Date.now()-24*3600*1000}`,{
            headers: { Authorization:`Bearer ${jwt}` }
        }).then(r=>r.ok?r.json():{items:[]})
            .then((j:any)=> setItems((j?.items||[]).slice(0,8)))
            .catch(()=>setItems([]));
    },[]);
    return (
        <div className="holo">
            <div className="ttl">Лента операций</div>
            <div className="sub">последние 24 часа</div>
            <div className="sep"/>
            {items.length===0 ? <div className="sub">Записей нет</div> :
                <div className="grid">
                    {items.map((e)=>(
                        <div key={e.id} className="card" style={{display:"grid",gap:6}}>
                            <div style={{display:"flex",justifyContent:"space-between"}}>
                                <span className="badge">{e.kind}</span>
                                <span className="sub">{new Date(e.ts_unix_ms).toLocaleString()}</span>
                            </div>
                            {e.note && <div>{String(e.note).slice(0,140)}</div>}
                        </div>
                    ))}
                </div>}
        </div>
    );
}
