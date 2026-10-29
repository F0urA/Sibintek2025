import React, { useEffect, useState } from "react";
import { api } from "../../services/apiClient";
import { Card } from "../../shared/ui/Card";
import { Input } from "../../shared/ui/Input";
import { Button } from "../../shared/ui/Button";

export default function FinConfig(){
    const [current,setCurrent]=useState<any>({});
    const [integr,setIntegr]=useState<string>("");
    const [pay,setPay]=useState<string>("");
    const [masked,setMasked]=useState("—");

    const load = async ()=>{
        const r:any = await api.getFinProfile().catch(()=> ({}));
        setCurrent(r||{});
        setIntegr(r?.integr_code ?? "");
        setPay(r?.pay_channel ?? "");
        const k = r?.role_fin_flag || "";
        setMasked(k ? "•".repeat(Math.min(12,k.length)) : "—");
    };

    useEffect(()=>{ load(); },[]);

    const save = async()=>{
        localStorage.setItem("fin.integr_code", integr);
        localStorage.setItem("fin.pay_channel", pay);

        const payload:any = {};
        if ((current?.role_fin_flag ?? "").length > 0) {
            payload.role_fin_flag = current.role_fin_flag;
        }
        if (Object.keys(payload).length > 0) {
            await api.putFinProfile(payload);
        }

        alert("Сохранено");
        await load(); // обновим маску ключа с бэка
    };
    return (
        <Card className="grid" style={{maxWidth:560}}>
            <div className="card-title">Финансовая конфигурация</div>
            <label>Код интеграции</label>
            <Input value={integr} onChange={e=>setIntegr(e.target.value)} placeholder="например, AC-001"/>
            <label>Канал оплаты</label>
            <Input value={pay} onChange={e=>setPay(e.target.value)} placeholder="например, EFT/Нал/Терминал"/>
            <div>Внутренний финансовый ключ: {masked}</div>
            <div className="row"><Button onClick={save}>Сохранить</Button></div>
        </Card>
    );
}
