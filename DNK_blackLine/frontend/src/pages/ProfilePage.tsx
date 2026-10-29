import React from "react";
import ProfileCard from "../features/profile/ProfileCard";
import ProfileSecrets from "../features/profile/ProfileSecrets";

export default function ProfilePage(){
    return (
        <div className="container">
            <ProfileCard/>

            <div className="panel" style={{maxWidth:620}}>
                <div className="section-title">Личная служебная пометка</div>
                <ProfileSecrets/>
            </div>
        </div>
    );
}
