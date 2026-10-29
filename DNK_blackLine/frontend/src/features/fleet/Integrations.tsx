import React, { useEffect, useState } from "react";
import { api } from "../../services/apiClient";
import { Card } from "../../shared/ui/Card";
import { Input } from "../../shared/ui/Input";
import { Button } from "../../shared/ui/Button";
import { Tag } from "../../shared/ui/Tag";
import { useToast } from "../../shared/ui/Toast";

type MineItem = { id:number; url:string; owner_id:number; status:string };

export default function Integrations(){
    const { push } = useToast();
    const [url,setUrl]=useState("https://example.com/inbound");
    const [list,setList]=useState<MineItem[]>([]);
    const [show,setShow]=useState(18);

    const load = async ()=>{
        try{
            const r = await fetch(`/api/fleet/webhooks?mine=1`, {
                headers: { "Authorization": `Bearer ${localStorage.getItem("jwt")||""}` }
            });
            const j = r.ok ? await r.json() : { items: [] };
            setList(j.items||[]);
        }catch{ setList([]); }
    };
    useEffect(()=>{ load(); },[]);

    return (

        <div className="container cols-2">
            <Card className="panel fit">
                    <div className="section-title">Регистрация входящего URL</div>
                    <div className="form">
                        <div className="field">
                            <label>URL приёмника</label>
                            <Input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://..." />
                            <div className="help">Адрес, на который мы будем отправлять события телеметрии.</div>
                        </div>
                        <div className="row">
                            <Button onClick={async()=>{
                                try{ await api.createWebhook(url); push({kind:"ok",title:"Сохранено"}); await load(); }
                                catch(e:any){ push({kind:"err",title:"Ошибка",text:e.message}); }
                            }}>Сохранить</Button>
                        </div>
                    </div>
                </Card>

            <Card className="panel">
                <div className="section-title">Мои входящие точки</div>
                <div className="scroll-panel">
                    <div className="container" style={{gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))"}}>
                        {list.slice(0,show).map(i=>(
                            <div key={i.id} className="card" style={{display:"grid",gap:8}}>
                                <div style={{fontWeight:800}}>Интеграция #{i.id}</div>
                                <div className="url-ellipsis" title={i.url}>{i.url}</div>
                                <div className="row">
                                    <Tag>status: {i.status}</Tag>
                                    <Button onClick={async()=>{
                                        try{
                                            const w:any = await api.getWebhook(i.id);
                                            const sec = (w?.secret_token||"");
                                            const mask = sec ? "•".repeat(Math.min(12,sec.length)) : "—";
                                            push({kind:"ok", title:"Секрет подписи", text: mask});
                                        }catch(e:any){ push({kind:"err",title:"Недоступно", text:e.message}); }
                                    }}>Статус</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {list.length>show && (
                        <div className="row" style={{justifyContent:"center",marginTop:10}}>
                            <Button onClick={()=>setShow(s=>s+18)}>Показать ещё</Button>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
