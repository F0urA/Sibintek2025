const K="jwt";
export const loadJWT=()=>localStorage.getItem(K);
export const saveJWT=(t:string)=>localStorage.setItem(K,t);
export const clearJWT=()=>localStorage.removeItem(K);
