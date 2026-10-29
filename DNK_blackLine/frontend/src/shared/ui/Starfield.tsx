import React, { useEffect, useRef } from "react";

export default function Starfield(){
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(()=>{
        const canvas = ref.current!;
        const ctx = canvas.getContext("2d")!;
        let w = canvas.width = window.innerWidth;
        let h = canvas.height = window.innerHeight;
        const DPR = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = w * DPR; canvas.height = h * DPR; ctx.scale(DPR, DPR);

        const stars = Array.from({length: 300}, ()=>({
            x: Math.random()*w,
            y: Math.random()*h,
            z: 0.2 + Math.random()*0.8,
            r: Math.random()*1.2 + 0.2,
            a: 0.6 + Math.random()*0.4,
            vx: (Math.random()-0.5)*0.05
        }));

        let raf = 0;
        const draw = ()=>{
            ctx.clearRect(0,0,w,h);

            const g = ctx.createRadialGradient(w*0.7,h*0.3,50, w*0.7,h*0.3, w*0.9);
            g.addColorStop(0,"rgba(25,185,130,0.10)");
            g.addColorStop(0.5,"rgba(247,200,67,0.08)");
            g.addColorStop(1,"rgba(0,0,0,0)");
            ctx.fillStyle = g; ctx.fillRect(0,0,w,h);

            for (const s of stars){
                s.x += s.vx * s.z;
                if (s.x < -10) s.x = w+10;
                if (s.x > w+10) s.x = -10;
                ctx.globalAlpha = s.a;
                ctx.fillStyle = "#E9ECEF";
                ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
            }
            ctx.globalAlpha = 1;
            raf = requestAnimationFrame(draw);
        };
        draw();

        const onResize = ()=>{
            w = canvas.width = window.innerWidth;
            h = canvas.height = window.innerHeight;
            canvas.width = w * DPR; canvas.height = h * DPR; ctx.scale(DPR, DPR);
        };
        window.addEventListener("resize", onResize);
        return ()=>{ cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
    },[]);

    return <canvas ref={ref} className="starfield" />;
}
