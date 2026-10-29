import React from "react";
import TankRack from "../features/retail/TankRack";
import MyShift from "../features/retail/MyShift";
import RetailConfig from "../features/profile/RetailConfig";

export default function RetailPage(){
    return (
        <div className="container">
            <TankRack/>

            <div className="panel">
                <div className="section-title">Резервуары / Смена</div>
                <MyShift/>
            </div>

            <div className="panel" style={{maxWidth:680}}>
                <div className="section-title">Настройки станции</div>
                <RetailConfig/>
            </div>
        </div>
    );
}
