import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Sidebar } from "../shared/ui/Sidebar";
import { Topbar } from "../shared/ui/Topbar";
import DashboardPage from "../pages/DashboardPage";
import ProfilePage from "../pages/ProfilePage";
import RetailPage from "../pages/RetailPage";
import FleetPage from "../pages/FleetPage";
import FinancePage from "../pages/FinancePage";
import LoginForm from "../features/auth/LoginForm";
import RegisterForm from "../features/auth/RegisterForm";
import { useAuth } from "../services/auth";

function RequireAuth({ children }:{children: JSX.Element}){
    const { jwt } = useAuth();
    const loc = useLocation();
    if(!jwt) return <Navigate to="/login" state={{ from: loc }} replace />;
    return children;
}
function RoleGate({ allow, children }:{ allow:string[], children: JSX.Element }){
    const { role } = useAuth();
    if(!role) return <Navigate to="/login" replace />;
    if(!allow.includes(role) && role!=="admin") return <Navigate to="/" replace />;
    return children;
}

function Layout({children}:{children:React.ReactNode}){
    return (
        <div className="layout">
            <Sidebar/>
            <div>
                <Topbar/>
                <div className="main">{children}</div>
            </div>
        </div>
    );
}

export default function AppRouter(){
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginForm onOk={()=>{ location.href="/"; }} />} />
                <Route path="/register" element={<RegisterForm />} />
                <Route path="/*" element={
                    <RequireAuth>
                        <Layout>
                            <Routes>
                                <Route path="/" element={<DashboardPage/>} />
                                <Route path="/profile" element={<ProfilePage/>} />
                                <Route path="/retail"  element={<RoleGate allow={["retail"]}><RetailPage/></RoleGate>} />
                                <Route path="/fleet"   element={<RoleGate allow={["fleet"]}><FleetPage/></RoleGate>} />
                                <Route path="/finance" element={<RoleGate allow={["fin"]}><FinancePage/></RoleGate>} />
                                <Route path="*" element={<Navigate to="/" replace/>} />
                            </Routes>
                        </Layout>
                    </RequireAuth>
                } />
            </Routes>
        </BrowserRouter>
    );
}
