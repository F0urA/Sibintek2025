import React, { useEffect, useState } from "react";
import { api } from "../../services/apiClient";
import { Card } from "../../shared/ui/Card";
import { Input } from "../../shared/ui/Input";
import { Button } from "../../shared/ui/Button";
import { Tag } from "../../shared/ui/Tag";

export default function ProfileSecrets(){
    const [v,setV]=useState(""); const [msg,setMsg]=useState("");
    useEffect(()=>{ api.getProfileSecrets().then(r=>setV(r.profile_flag||"")).catch(()=>{}); },[]);
    return (
        <Card className="grid" style={{maxWidth:620}}>
            <div className="h2">Личная служебная пометка</div>
            <Input value={v} onChange={e=>setV(e.target.value)} placeholder="Заметка (видна только вам)"/>
            <div className="row"><Button onClick={async()=>{ await api.putProfileSecrets(v); setMsg("Сохранено"); }}>Сохранить</Button>{msg && <Tag>{msg}</Tag>}</div>
        </Card>
    );
}
