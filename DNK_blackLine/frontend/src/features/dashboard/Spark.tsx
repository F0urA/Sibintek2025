import React from "react";

export default function Spark({ data=[12,18,16,20,26,22,28,24], color="url(#sg)" }:{
    data?: number[]; color?: string;
}){
    const w=180, h=42, p=8;
    const max=Math.max(...data,1), min=Math.min(...data,0);
    const sx = (i:number)=> p + (w-2*p) * (i/(data.length-1));
    const sy = (v:number)=> h - p - (h-2*p) * ((v-min)/(max-min||1));

    const d = data.map((v,i)=> (i===0?`M ${sx(i)},${sy(v)}`:`L ${sx(i)},${sy(v)}`)).join(" ");
    const area = `${d} L ${p+(w-2*p)} ${h-p} L ${p} ${h-p} Z`;
    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="spark">
            <defs>
                <linearGradient id="sg" x1="0" y1="0" x2={w} y2="0">
                    <stop offset="0%" stopColor="#43E3B0"/><stop offset="100%" stopColor="#F7C843"/>
                </linearGradient>
            </defs>
            <path d={area} fill="rgba(247,200,67,.08)"/>
            <path d={d} stroke={color} strokeWidth="2.2" fill="none" strokeLinecap="round"
                  style={{filter:"drop-shadow(0 0 6px rgba(247,200,67,.35))"}}/>
        </svg>
    );
}
