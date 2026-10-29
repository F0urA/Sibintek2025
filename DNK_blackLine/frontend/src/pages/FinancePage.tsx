import React from "react";
import Diagnostic from "../features/finance/Diagnostic";
import FinConfig from "../features/profile/FinConfig";

export default function FinancePage(){
    return (
        <div className="container">
            <div className="panel">
                <div className="section-title">Черновой расчёт</div>
                <Diagnostic/>
            </div>
            <div className="panel" style={{maxWidth:620}}>
                <div className="section-title">Финансовая конфигурация</div>
                <FinConfig/>
            </div>
        </div>
    );
}
