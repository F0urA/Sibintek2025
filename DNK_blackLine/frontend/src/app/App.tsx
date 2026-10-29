import React from "react";
import "./theme.css";
import AppRouter from "./AppRouter";
import Starfield from "../shared/ui/Starfield";
import { ToastHost } from "../shared/ui/Toast";

export default function App(){
    return (
        <ToastHost>
            <Starfield/>
            <div className="nebula-overlay"/>
            <AppRouter/>
        </ToastHost>
    );
}
