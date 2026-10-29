export async function apiFetch<T>(path:string, init:RequestInit={}, jwt?:string):Promise<T>{
    const headers:Record<string,string> = {"Content-Type":"application/json"};
    if(jwt) headers["Authorization"] = `Bearer ${jwt}`;
    const r = await fetch(`/api${path}`, {...init, headers});
    const text = await r.text().catch(()=> "");
    if(!r.ok) throw new Error(text || String(r.status));
    try { return text ? JSON.parse(text) as T : ("" as any as T); }
    catch { return text as any as T; }
}
