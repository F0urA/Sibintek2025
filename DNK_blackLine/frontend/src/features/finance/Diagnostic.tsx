import React, { useState } from "react";
import { api, FinSort } from "../../services/apiClient";
import { Card } from "../../shared/ui/Card";
import { Button } from "../../shared/ui/Button";
import { Tag } from "../../shared/ui/Tag";

type Row = { supplier?: string; sum_total?: number };

export default function Diagnostic(){
    const [sort,setSort]=useState<FinSort>("SUM_TOTAL_DESC");
    const [rows,setRows]=useState<Row[]>([]);
    const [diag,setDiag]=useState("");

    const runDiag = async ()=>{
        setRows([]); setDiag("");
        try{
            const txt = await api.diagnosticPreview(sort);
            try{
                const j = JSON.parse(txt);
                if (Array.isArray(j?.rows)) {
                    setRows(api.sortFinRows(j.rows, sort));
                    return;
                }
            }catch{}
            setDiag(txt); 
        }catch(e:any){
            const m = String(e.message||"");
            try{
                const j = JSON.parse(m);
                if (Array.isArray(j?.rows)) {
                    setRows(api.sortFinRows(j.rows, sort));
                    return;
                }
            }catch{}
            setDiag(m);
        }
    };


    return (
        <Card className="grid">
            <div className="card-title">Черновой расчёт</div>
            <div className="row">
                <select className="input" style={{maxWidth:260}} value={sort} onChange={e=>setSort(e.target.value as FinSort)}>
                    <option value="SUM_TOTAL_DESC">Сумма ↓</option>
                    <option value="SUM_TOTAL_ASC">Сумма ↑</option>
                    <option value="SUPPLIER_ASC">Поставщик A→Z</option>
                </select>
                <Button onClick={runDiag}>Показать отчёт</Button>
                <Tag>Предварительная проверка входных данных</Tag>
            </div>

            {rows.length>0 && (
                <div className="card scroll-panel">
                    <table className="table">
                        <thead><tr><th>Поставщик</th><th className="right">Сумма</th></tr></thead>
                        <tbody>
                        {rows.map((r,i)=>(
                            <tr key={i}>
                                <td>{r.supplier||"—"}</td>
                                <td className="right">{(r.sum_total??0).toLocaleString()}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}

            {diag && <pre className="card" style={{whiteSpace:"pre-wrap"}}>{diag}</pre>}
        </Card>
    );
}
