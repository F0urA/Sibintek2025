import React from "react";
import { Card } from "../shared/ui/Card";
import { Link } from "react-router-dom";
import { useAuth } from "../services/auth";
import RadialGauge from "../features/dashboard/RadialGauge";
import ResourceTile from "../features/dashboard/ResourceTile";
import QuickActions from "../features/dashboard/QuickActions";
import Activity from "../features/dashboard/Activity";
export default function DashboardPage(){
    const { role } = useAuth();
    const Retail = () => (<div className="grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))"}}>
        <Card><div className="h2">Моя смена</div><div>Открытие/закрытие смены, контроль операций.</div><Link to="/retail" className="link">Перейти</Link></Card>
        <Card><div className="h2">Профиль</div><div>Личные параметры и служебная пометка.</div><Link to="/profile" className="link">Перейти</Link></Card>
    </div>);
    const Fleet = () => (<div className="grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))"}}>
        <Card><div className="h2">Интеграции</div><div>Регистрация входящих уведомлений.</div><Link to="/fleet" className="link">Перейти</Link></Card>
        <Card><div className="h2">Профиль</div><div>Личные параметры и служебная пометка.</div><Link to="/profile" className="link">Перейти</Link></Card>
    </div>);
    const Fin = () => (<div className="grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))"}}>
        <Card><div className="h2">Черновой расчёт</div><div>Диагностика входных данных расчёта.</div><Link to="/finance" className="link">Перейти</Link></Card>
        <Card><div className="h2">Профиль</div><div>Личные параметры и служебная пометка.</div><Link to="/profile" className="link">Перейти</Link></Card>
    </div>);
    const All = () => (<div className="grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))"}}>
        <Card><div className="h2">Моя смена</div><div>Операции участка.</div><Link to="/retail" className="link">Перейти</Link></Card>
        <Card><div className="h2">Интеграции</div><div>Входящие уведомления.</div><Link to="/fleet" className="link">Перейти</Link></Card>
        <Card><div className="h2">Финансы</div><div>Диагностика расчёта.</div><Link to="/finance" className="link">Перейти</Link></Card>
        <Card><div className="h2">Профиль</div><div>Параметры и пометка.</div><Link to="/profile" className="link">Перейти</Link></Card>
    </div>);

    return (
        <div className="grid">
            <div className="h1">Панель состояния</div>
            {role==="retail" && <Retail/>}
            {role==="fleet" && <Fleet/>}
            {role==="fin" && <Fin/>}
            {role==="admin" && <All/>}
            {!role && <div>Войдите в систему</div>}
            <div className="grid-kpi">
                <RadialGauge value={72} label="Reactor flow" unit="%" />
                <ResourceTile title="Пропеллент" subtitle="запас в контуре" value={128_500} unit="t" trend={[90,92,91,94,98,95,101,99]}/>
                <ResourceTile title="Входящие каналы" subtitle="телеметрия" value={role==="fleet"||role==="admin"? 44:12} unit="" trend={[12,14,13,16,18,17,21,20]}/>
                <ResourceTile title="Расчётный буфер" subtitle="очередь операций" value={role==="fin"||role==="admin"? 67:23} unit="" trend={[6,5,7,8,6,9,7,8]}/>
            </div>

            <QuickActions/>

            <Activity/>
        </div>

    );
}
