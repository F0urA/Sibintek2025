import React, { useState } from "react";
import { api } from "../../services/apiClient";
import { Input } from "../../shared/ui/Input";
import { Button } from "../../shared/ui/Button";
import { useToast } from "../../shared/ui/Toast";

export default function RegisterForm(){
    const { push } = useToast();
    const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
    const [name,setName]=useState("");  const [role,setRole]=useState("retail");

    const submit = async ()=>{
        try{ await api.register(email,password,role,name); push({kind:"ok",title:"Учётная запись создана"}); location.href="/login"; }
        catch(e:any){ push({kind:"err",title:"Регистрация",text:e.message}); }
    };

    return (
        <div style={{minHeight:"100vh", display:"grid", placeItems:"center"}}>
            <div className="panel" style={{width:"min(520px, 92vw)", padding:"22px"}}>
                <div className="section-title">Регистрация DNK BlackLine</div>
                <div className="form">
                    <div className="field">
                        <label>Email</label>
                        <Input value={email} onChange={e=>setEmail(e.target.value)} placeholder="pilot@fleet.io"/>
                    </div>
                    <div className="field">
                        <label>Пароль</label>
                        <Input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Пароль"/>
                    </div>
                    <div className="field">
                        <label>Имя</label>
                        <Input value={name} onChange={e=>setName(e.target.value)} placeholder="Имя/позывной"/>
                    </div>
                    <div className="field">
                        <label>Роль</label>
                        <select className="input" value={role} onChange={e=>setRole(e.target.value)}>
                            <option value="retail">оператор узла </option>
                            <option value="fleet">куратор флотилии </option>
                            <option value="fin">интендант потоков </option>
                        </select>
                        <div className="help">Роль влияет на набор доступных разделов и прав.</div>
                    </div>
                    <div className="row">
                        <Button onClick={submit}>Зарегистрировать</Button>
                        <a className="link" href="/login">У меня уже есть доступ</a>
                    </div>
                </div>
            </div>
        </div>
    );
}
