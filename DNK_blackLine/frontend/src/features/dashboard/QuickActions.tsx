import React from "react";
import { useAuth } from "../../services/auth";
import { Link } from "react-router-dom";

export default function QuickActions(){
    const { role } = useAuth();
    return (
        <div className="holo">
            <div className="ttl">Быстрые действия</div>
            <div className="sub">Операции по текущей роли</div>
            <div className="sep"/>
            <div className="row">
                {(role==="retail"||role==="admin") && <Link className="btn" to="/retail">Открыть/закрыть смену</Link>}
                {(role==="fleet" ||role==="admin") && <Link className="btn" to="/fleet">Зарегистрировать входящий URL</Link>}
                {(role==="fin"   ||role==="admin") && <Link className="btn" to="/finance">Диагностика расчёта</Link>}
                <Link className="btn btn-ghost" to="/profile">Профиль</Link>
            </div>
        </div>
    );
}
