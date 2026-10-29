import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../services/auth";

const MENU: Record<string, Array<{to:string; label:string; icon:string}>> = {
    retail: [
        { to: "/",        label: "Панель",            icon: "🪐" },
        { to: "/retail",  label: "Резервуары / Смена",icon: "⛽" },
        { to: "/profile", label: "Профиль",           icon: "👤" }
    ],
    fleet: [
        { to: "/",        label: "Панель",            icon: "🪐" },
        { to: "/fleet",   label: "Интеграции",        icon: "🛰️" },
        { to: "/profile", label: "Профиль",           icon: "👤" }
    ],
    fin: [
        { to: "/",        label: "Панель",            icon: "🪐" },
        { to: "/finance", label: "Финансы",           icon: "💱" },
        { to: "/profile", label: "Профиль",           icon: "👤" }
    ],
    admin: [
        { to: "/",        label: "Панель",            icon: "🪐" },
        { to: "/retail",  label: "Резервуары / Смена",icon: "⛽" },
        { to: "/fleet",   label: "Интеграции",        icon: "🛰️" },
        { to: "/finance", label: "Финансы",           icon: "💱" },
        { to: "/profile", label: "Профиль",           icon: "👤" }
    ]
};

export function Sidebar(){
    const loc = useLocation();
    const auth = useAuth();
    const role = auth.role ? (MENU[auth.role] ? auth.role : "retail") : "retail";
    const items = MENU[role];

    return (
        <aside className="sidebar glass">
            <div className="logo">✦</div>
            {items.map(i=>(
                <Link key={i.to} to={i.to} className={`link ${loc.pathname===i.to?"active":""}`}>
                    <span className="link-ico">{i.icon}</span>
                    <span>{i.label}</span>
                </Link>
            ))}
        </aside>
    );
}
