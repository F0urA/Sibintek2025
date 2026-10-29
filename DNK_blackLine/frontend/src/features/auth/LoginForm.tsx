import React, { useState } from "react";
import { api } from "../../services/apiClient";
import { Input } from "../../shared/ui/Input";
import { Button } from "../../shared/ui/Button";
import { useToast } from "../../shared/ui/Toast";

export default function LoginForm({onOk}:{onOk:()=>void}){
    const { push } = useToast();
    const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
    const submit = async () => {
        try { await api.login(email,password); onOk(); }
        catch(e:any){ push({kind:"err",title:"Не удалось войти", text:e.message}); }
    };

    return (
        <div style={{minHeight:"100vh", display:"grid", placeItems:"center"}}>
            <div className="panel" style={{width:"min(480px, 90vw)", padding:"22px"}}>
                <div className="section-title">Вход в DNK BlackLine</div>
                <div className="form">
                    <div className="field">
                        <label>Email</label>
                        <Input placeholder="pilot@fleet.io" value={email} onChange={e=>setEmail(e.target.value)} />
                    </div>
                    <div className="field">
                        <label>Пароль</label>
                        <Input type="password" placeholder="Пароль" value={password} onChange={e=>setPassword(e.target.value)} />
                    </div>
                    <div className="row">
                        <Button onClick={submit}>Войти</Button>
                        <a className="link" href="/register">Регистрация</a>
                    </div>
                </div>
            </div>
        </div>
    );
}
