import React, { useEffect, useState } from "react";
import { api } from "../../services/apiClient";
import { Card } from "../../shared/ui/Card";
import { Button } from "../../shared/ui/Button";

type Shift = { id:number; site_id:number; open_ts:number; close_ts?:number; notes?:string };

export default function MyShift(){
    const [items,setItems]=useState<Shift[]>([]);
    const [siteId,setSiteId]=useState("1");
    const [notes,setNotes]=useState("");
    const [closingNotes,setClosingNotes]=useState("");

    const load = async()=>{ const j:any = await api.listShifts(); setItems(j?.items||[]); };

    useEffect(()=>{ load(); },[]);

    return (
        <div className="grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))"}}>
            <Button onClick={async()=>{
                try {
                    await api.openShift(Number(siteId), notes);
                    setNotes("");
                    await load();
                } catch(e:any){ alert(e.message||"Ошибка"); }
            }}>Открыть</Button>


            <Button onClick={async()=>{
                const last = items.find(s=>!s.close_ts);
                if(!last){ alert("Нет открытой смены"); return; }
                try {
                    await api.closeShift(last.id, closingNotes);
                    setClosingNotes("");
                    await load();
                } catch(e:any){ alert(e.message||"Ошибка"); }
            }}>Закрыть</Button>


            <Card className="grid">
                <div className="h2">Мои смены</div>
                {items.length===0 ? <div>Пока нет записей</div> :
                    <div className="grid">
                        {items.map(s=>(
                            <div key={s.id} className="card">
                                <div><b>Смена #{s.id}</b> • участок {s.site_id}</div>
                                <div>Открыта: {new Date(s.open_ts).toLocaleString()}</div>
                                <div>Закрыта: {s.close_ts ? new Date(s.close_ts).toLocaleString() : "—"}</div>
                            </div>
                        ))}
                    </div>}
            </Card>
        </div>
    );
}
