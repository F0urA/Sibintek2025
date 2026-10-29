import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../services/auth";

const MENU_BY_ROLE: Record<string, Array<{to:string; label:string}>> = {
    retail: [
        { to: "/",         label: "Обзор" },
        { to: "/profile",  label: "Профиль" },
        { to: "/retail",   label: "Резервуары" }
    ],
    fleet: [
        { to: "/",         label: "Обзор" },
        { to: "/profile",  label: "Профиль" },
        { to: "/fleet",    label: "Интеграции" }
    ],
    fin: [
        { to: "/",         label: "Обзор" },
        { to: "/profile",  label: "Профиль" },
        { to: "/finance",  label: "Финансы" }
    ],
    admin: [
        { to: "/",         label: "Обзор" },
        { to: "/profile",  label: "Профиль" },
        { to: "/retail",   label: "Резервуары" },
        { to: "/fleet",    label: "Интеграции" },
        { to: "/finance",  label: "Финансы" }
    ]
};

export function Navbar(){
    const loc = useLocation();
    const auth = useAuth();
    const { jwt, role } = auth;
    const tabs = role ? (MENU_BY_ROLE[role] ?? MENU_BY_ROLE["retail"]) : [];

    return (
        <div className="nav">
            <div className="brand"><span style={{background:"var(--accent)",width:10,height:24,borderRadius:2,display:"inline-block"}}/> DNK • Нефтебаза</div>
            <div style={{flex:1}}/>
            {tabs.map(({to,label})=>(
                <Link key={to} to={to} className={`link ${loc.pathname===to?"active":""}`}>{label}</Link>
            ))}
            <div style={{flex:1}}/>
            {jwt && (
                <button className="btn" onClick={()=>{ auth.logout(); try{localStorage.clear();}catch{}; window.location.replace("/login");
                }}>Выйти</button>
            )}
        </div>
    );
}
