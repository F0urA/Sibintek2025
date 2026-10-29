import { useCallback, useState } from "react";
export function usePromise<T>(fn:()=>Promise<T>, deps:any[]=[]){
    const [data,setData]=useState<T|null>(null);
    const [err,setErr]=useState<string| null>(null);
    const [loading,setLoading]=useState(false);
    const run = useCallback(async ()=>{
        setLoading(true); setErr(null);
        try{ const d = await fn(); setData(d); }catch(e:any){ setErr(e?.message||"Ошибка"); }
        finally{ setLoading(false); }
    }, deps);
    return { data, err, loading, run };
}
