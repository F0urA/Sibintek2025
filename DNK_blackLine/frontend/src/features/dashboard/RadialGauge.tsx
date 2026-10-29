import React from "react";

export default function RadialGauge({
                                        value = 72,
                                        label = "Reactor flow",
                                        unit = "%"
                                    }:{ value?: number; label?: string; unit?: string }){
    const v = Math.max(0, Math.min(100, value));
    const R = 56;
    const C = 2 * Math.PI * R;
    const off = C * (1 - v/100);

    return (
        <div className="holo" style={{display:"flex", alignItems:"center", gap:14}}>
            <div className="radial">
                <svg viewBox="0 0 136 136" preserveAspectRatio="xMidYMid meet">
                    <circle cx="68" cy="68" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="10"/>
                    <defs>
                        <linearGradient id="rg" x1="0" y1="0" x2="136" y2="136">
                            <stop offset="0%" stopColor="#43E3B0"/><stop offset="100%" stopColor="#F7C843"/>
                        </linearGradient>
                    </defs>
                    <circle cx="68" cy="68" r={R} fill="none" stroke="url(#rg)" strokeWidth="10"
                            strokeDasharray={C} strokeDashoffset={off} strokeLinecap="round"
                            style={{filter:"drop-shadow(0 0 6px rgba(67,227,176,.4))"}}/>
                </svg>
                <div className="val">
                    <span style={{fontWeight:800, fontSize:20}}>{v}</span>
                    <span className="kpi-unit" style={{marginLeft:6}}>{unit}</span>
                </div>
            </div>

            <div style={{minWidth:0}}>
                <div className="ttl">{label}</div>
                <div className="sub">Стабильность контура подачи</div>
                <div className="sep"/>
                <div className="badge ok">online</div>
            </div>
        </div>
    );
}
