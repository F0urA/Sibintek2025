import React, { useEffect, useState } from "react";
import { api } from "../../services/apiClient";
import { Card } from "../../shared/ui/Card";
import { Input } from "../../shared/ui/Input";
import { Button } from "../../shared/ui/Button";

export default function RetailConfig(){
    const [cfg,setCfg]=useState<any>({}); const [masked,setMasked]=useState("—");
    useEffect(()=>{ api.getRetailProfile().then((r:any)=>{ setCfg(r||{}); const k=r?.role_retail_flag||""; setMasked(k? "•".repeat(Math.min(12,k.length)) : "—"); }).catch(()=>{}); },[]);
    const save = async()=>{ await api.putRetailProfile(cfg); alert("Сохранено"); };
    return (
        <Card className="grid" style={{maxWidth:620}}>
            <div className="h2">Настройки станции</div>
            <label>Локация</label><Input value={cfg.location||""} onChange={e=>setCfg({...cfg,location:e.target.value})}/>
            <label>Часовой пояс</label><Input value={cfg.tz||""} onChange={e=>setCfg({...cfg,tz:e.target.value})}/>
            <label>Единицы измерения</label><Input value={cfg.units||""} onChange={e=>setCfg({...cfg,units:e.target.value})}/>
            <div>Внутренний ключ конфигурации: {masked}</div>
            <div className="row"><Button onClick={save}>Сохранить</Button></div>
        </Card>
    );
}
