import React from "react";
import Spark from "./Spark";

export default function ResourceTile({ title, subtitle, value, unit="t", trend=[10,12,9,13,15,14,18,17] }:{
    title:string; subtitle:string; value:number; unit?:string; trend?:number[];
}){
    return (
        <div className="holo">
            <div className="ttl">{title}</div>
            <div className="sub">{subtitle}</div>
            <div className="sep"/>
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
                <div className="kpi-num">{value.toLocaleString()}<span className="kpi-unit">{unit}</span></div>
                <div style={{width:190}}><Spark data={trend}/></div>
            </div>
        </div>
    );
}
