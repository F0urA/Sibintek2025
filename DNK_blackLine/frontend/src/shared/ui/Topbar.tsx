import React from "react";
import { useAuth } from "../../services/auth";

export function Topbar(){
    const auth = useAuth();
    const role = auth.role || "—";

    return (
        <div className="topbar glass">
            <div className="brand-line">
                <span className="brand-dot"/>
                DNK BlackLine
                <span className="brand-sub"> • Fuel for Starliners</span>
            </div>
            <div className="cluster">
                <span className="chip">Объект: депо №1</span>
                <span className="chip chip-ok">Телеметрия: online</span>
                <span className="chip">Роль: {role}</span>
                <button className="btn btn-ghost"
                    onClick={()=>{ auth.logout(); try{localStorage.clear();}catch{}; window.location.replace("/login"); }}>
                    Выйти
                </button>
            </div>
        </div>
    );
}
