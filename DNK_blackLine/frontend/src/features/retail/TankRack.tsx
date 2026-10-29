import React from "react";

type Tank = {
    name: string; fuel: string; level: number;
    tempC?: number; status?: "ok" | "warn" | "err";
};

function TankCard({t}:{t:Tank}){
    const pct = Math.max(0, Math.min(1, t.level));
    const height = Math.round(pct*100);
    const status = t.status || (pct<.1 ? "warn" : "ok");
    return (
        <div className="tank">
            <div className={`tank-body ${status}`}>
                <div className="tank-fill" style={{height: `${height}%`}}/>
                <div className="tank-glow"/>
            </div>
            <div className="tank-meta">
                <div className="tank-title">{t.name}</div>
                <div className="tank-sub">{t.fuel}</div>
                <div className="tank-kpi">
                    <span className="kpi-num">{Math.round(pct*100)}<span className="kpi-unit">%</span></span>
                    {typeof t.tempC==="number" && <span className="tag">t° {t.tempC}℃</span>}
                </div>
            </div>
        </div>
    );
}

export default function TankRack({
                                     items = [
                                         { name:"Резервуар A", fuel:"RP-1", level:.62, tempC:18 },
                                         { name:"Резервуар B", fuel:"LOX", level:.34, tempC:-182 },
                                         { name:"Резервуар C", fuel:"LH₂", level:.78, tempC:-253 },
                                     ]
                                 }:{ items?: Tank[] }){
    return (
        <div className="panel">
            <div className="section-title">Схема резервуаров</div>
            <div className="tank-grid">
                {items.map((t,i)=><TankCard key={i} t={t}/>)}
            </div>
        </div>
    );
}
