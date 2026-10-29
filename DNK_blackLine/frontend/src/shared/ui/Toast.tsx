import React, { createContext, useContext, useState, useCallback } from "react";

type Toast = { id:number; kind:"ok"|"warn"|"err"; title:string; text?:string };
const ToastCtx = createContext<{ push:(t:Omit<Toast,"id">)=>void }>({ push: ()=>{} });

export function useToast(){ return useContext(ToastCtx); }

export function ToastHost({children}:{children:React.ReactNode}){
    const [items,set]=useState<Toast[]>([]);
    const push = useCallback((t:Omit<Toast,"id">)=> {
        const id = Date.now()+Math.random();
        set(s=>[...s,{...t,id}]);
        setTimeout(()=> set(s=>s.filter(x=>x.id!==id)), 3500);
    },[]);
    return (
        <ToastCtx.Provider value={{push}}>
            {children}
            <div className="toast-host">
                {items.map(i=>(
                    <div key={i.id} className={`toast ${i.kind}`}>
                        <div className="ttl">{i.title}</div>
                        {i.text && <div className="txt">{i.text}</div>}
                    </div>
                ))}
            </div>
        </ToastCtx.Provider>
    );
}
