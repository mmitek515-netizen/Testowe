import React, { useEffect, useMemo, useState } from 'react';
import { Globe2, Pause, Play, Plus, Minus, RotateCcw, Activity, Radar } from 'lucide-react';

type Body = { id: string; name: string; radius: number; size: number; color: string; period: number; phase: number; type: string; distance: string; description: string };
const bodies: Body[] = [
  { id:'mercury',name:'Merkury',radius:54,size:3.5,color:'#a9a9a9',period:0.24,phase:1.2,type:'Planeta skalista',distance:'0,39 AU',description:'Najbliższa planeta Słońca.' },
  { id:'venus',name:'Wenus',radius:83,size:5.5,color:'#e9ba80',period:0.62,phase:2.3,type:'Planeta skalista',distance:'0,72 AU',description:'Gęsta atmosfera i bardzo wysoka temperatura.' },
  { id:'earth',name:'Ziemia',radius:114,size:6.5,color:'#60b9ff',period:1,phase:3.5,type:'Planeta skalista',distance:'1,00 AU',description:'Nasz świat. Jedyna znana planeta z życiem.' },
  { id:'mars',name:'Mars',radius:148,size:5,color:'#ef7956',period:1.88,phase:0.5,type:'Planeta skalista',distance:'1,52 AU',description:'Czerwona planeta, cel badań i eksploracji.' },
  { id:'jupiter',name:'Jowisz',radius:192,size:13,color:'#d7ad84',period:11.86,phase:4.1,type:'Gazowy olbrzym',distance:'5,20 AU',description:'Największa planeta Układu Słonecznego.' },
  { id:'saturn',name:'Saturn',radius:237,size:11,color:'#ddc48f',period:29.46,phase:2.1,type:'Gazowy olbrzym',distance:'9,58 AU',description:'Planeta słynąca z rozległych pierścieni.' },
  { id:'uranus',name:'Uran',radius:278,size:8,color:'#80d6e3',period:84,phase:5.4,type:'Lodowy olbrzym',distance:'19,2 AU',description:'Lodowy olbrzym o silnie nachylonej osi obrotu.' },
  { id:'neptune',name:'Neptun',radius:317,size:8,color:'#537be6',period:164.8,phase:3.0,type:'Lodowy olbrzym',distance:'30,1 AU',description:'Najdalsza planeta Układu Słonecznego.' }
];
const stars = Array.from({length:125},(_,i)=>({x:(i*137.508+31)%1000,y:(i*79.17+53)%700,r:i%9===0?1.4:0.6}));

export default function SphericalScopeVisualizer() {
  const [selected,setSelected]=useState('earth');
  const [zoom,setZoom]=useState(1);
  const [running,setRunning]=useState(true);
  const [elapsed,setElapsed]=useState(0);
  const [snapshot,setSnapshot]=useState<any>(null);
  const [statusError,setStatusError]=useState('');
  useEffect(()=>{
    if(!running)return;
    const timer=window.setInterval(()=>setElapsed(t=>t+0.012),80);
    return()=>window.clearInterval(timer);
  },[running]);
  useEffect(()=>{
    let active=true;
    const update=async()=>{
      try {
        const response=await fetch('/api/spaa/last');
        if(!response.ok)throw new Error('HTTP '+response.status);
        const data=await response.json();
        if(active){setSnapshot(data);setStatusError('');}
      } catch(e) { if(active)setStatusError('Brak danych SPAA'); }
    };
    void update();
    const timer=window.setInterval(()=>void update(),15000);
    return()=>{active=false;window.clearInterval(timer);};
  },[]);
  const current=useMemo(()=>bodies.find(b=>b.id===selected) || bodies[2],[selected]);
  const points=useMemo(()=>bodies.map(b=>{
    const angle=b.phase+elapsed/Math.sqrt(b.period);
    return {...b,x:500+b.radius*Math.cos(angle),y:350+b.radius*0.66*Math.sin(angle)};
  }),[elapsed]);
  const observations=Array.isArray(snapshot?.observations)?snapshot.observations:[];
  const ok=observations.filter((o:any)=>o.ok).length;
  return (
    <section className="rounded-2xl overflow-hidden border border-cyan-500/25 bg-[#060c1c] shadow-2xl">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-cyan-500/20 bg-[#091429]">
        <div className="flex items-center gap-3">
          <Globe2 className="w-6 h-6 text-cyan-400"/>
          <div>
            <h3 className="text-base sm:text-lg tracking-[.12em] font-semibold text-cyan-100">GALACTIC NAVIGATION · SOL</h3>
            <p className="text-[11px] text-cyan-400/70 font-mono">UKŁAD SŁONECZNY / MAPA TAKTYCZNA / SPAA 360°</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setZoom(z=>Math.min(2.4,z+0.2))} aria-label="Przybliż" className="p-2 rounded-lg border border-cyan-500/30 hover:bg-cyan-500/20"><Plus size={17}/></button>
          <button onClick={()=>setZoom(z=>Math.max(.65,z-.2))} aria-label="Oddal" className="p-2 rounded-lg border border-cyan-500/30 hover:bg-cyan-500/20"><Minus size={17}/></button>
          <button onClick={()=>setRunning(v=>!v)} aria-label={running?'Zatrzymaj animację':'Wznów animację'} className="p-2 rounded-lg border border-cyan-500/30 hover:bg-cyan-500/20">{running?<Pause size={17}/>:<Play size={17}/>}</button>
          <button onClick={()=>{setZoom(1);setElapsed(0);setSelected('earth');}} aria-label="Resetuj widok" className="p-2 rounded-lg border border-cyan-500/30 hover:bg-cyan-500/20"><RotateCcw size={17}/></button>
        </div>
      </header>
      <div className="relative bg-[#030916]">
        <svg viewBox="0 0 1000 700" role="img" aria-label="Interaktywna mapa Układu Słonecznego z planetami i orbitami" className="w-full h-auto min-h-[290px] max-h-[660px] touch-manipulation">
          <defs>
            <radialGradient id="solar-background"><stop offset="0%" stopColor="#11274b"/><stop offset="100%" stopColor="#030916"/></radialGradient>
            <radialGradient id="solar-star"><stop offset="0%" stopColor="#fff8d5"/><stop offset="48%" stopColor="#f8b64a"/><stop offset="100%" stopColor="#ad4e1c"/></radialGradient>
            <filter id="solar-glow"><feGaussianBlur stdDeviation="9"/></filter>
          </defs>
          <rect width="1000" height="700" fill="url(#solar-background)"/>
          {stars.map((s,i)=><circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#b4d7ff" opacity={i%4===0?.7:.28}/>)}
          <g transform={`translate(500 350) scale(${zoom}) translate(-500 -350)`}>
            {bodies.map(b=><ellipse key={b.id} cx="500" cy="350" rx={b.radius} ry={b.radius*.66} stroke="#3c7899" strokeOpacity=".37" strokeWidth="1.2" strokeDasharray="3 5" fill="none"/>)}
            <circle cx="500" cy="350" r="31" fill="#f8ae42" opacity=".23" filter="url(#solar-glow)"/>
            <circle cx="500" cy="350" r="18" fill="url(#solar-star)" stroke="#ffe1a0" strokeWidth="1.5"/>
            <text x="500" y="386" textAnchor="middle" fontSize="13" fill="#ffe6a0" letterSpacing="2">SŁOŃCE</text>
            {points.map(b=><g key={b.id} onClick={()=>setSelected(b.id)} style={{cursor:'pointer'}} role="button" tabIndex={0} aria-label={`Wybierz ${b.name}`} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(b.id);}}}>
              {selected===b.id&&<circle cx={b.x} cy={b.y} r={b.size+12} stroke="#67e8f9" strokeWidth="1.5" strokeDasharray="4 3" fill="#22d3ee" fillOpacity=".09"/>}
              <circle cx={b.x} cy={b.y} r={Math.max(13,b.size+6)} fill="transparent"/>
              <circle cx={b.x} cy={b.y} r={b.size} fill={b.color} stroke="#d9eaff" strokeOpacity=".55"/>
              {b.id==='saturn'&&<ellipse cx={b.x} cy={b.y} rx="20" ry="7" stroke="#ddc48f" strokeWidth="2" fill="none" transform={`rotate(-22 ${b.x} ${b.y})`}/>}
              <text x={b.x+12} y={b.y-12} fill={selected===b.id?'#a5f3fc':'#a9bfd8'} fontSize="13" fontWeight={selected===b.id?700:400}>{b.name}</text>
            </g>)}
          </g>
          <text x="24" y="32" fill="#70c5e9" fontSize="12" letterSpacing="3">SYSTEM SOL · MAPA POGLĄDOWA</text>
          <text x="24" y="680" fill="#6e8aa5" fontSize="11">Odległości i rozmiary nie są w skali · animacja ilustracyjna</text>
        </svg>
        <div className="absolute right-3 top-3 rounded-lg border border-cyan-500/20 bg-[#071527]/90 px-3 py-2 text-[10px] font-mono text-cyan-300">ZOOM {Math.round(zoom*100)}%</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 border-t border-cyan-500/20">
        <div className="p-4 sm:p-5 border-b md:border-b-0 md:border-r border-cyan-500/20">
          <div className="text-[10px] uppercase tracking-[.22em] text-cyan-400 mb-2">Wybrany obiekt</div>
          <h4 className="text-xl font-semibold text-white">{current.name}</h4>
          <p className="text-sm text-slate-400 mt-1">{current.type} · {current.distance} od Słońca</p>
          <p className="text-sm text-slate-300 mt-3">{current.description}</p>
          <div className="flex flex-wrap gap-2 mt-4">{bodies.map(b=><button key={b.id} onClick={()=>setSelected(b.id)} className={`text-xs px-2.5 py-1.5 rounded-md border ${selected===b.id?'border-cyan-400 bg-cyan-500/20 text-cyan-100':'border-slate-700 text-slate-400 hover:border-cyan-700'}`}>{b.name}</button>)}</div>
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-2 text-cyan-300 text-xs uppercase tracking-widest"><Radar size={16}/> Sferyczna telemetria SPAA</div>
          <div className="flex items-center gap-2 mt-3 text-sm text-slate-300"><Activity size={15}/>{observations.length? `${ok}/${observations.length} źródeł odpowiada`:'Oczekiwanie na pomiar backendu'}</div>
          <p className="text-xs text-slate-500 mt-2">{snapshot?.timestamp?'Ostatni pomiar: '+new Date(snapshot.timestamp).toLocaleString('pl-PL'):'Brak zapisanego pomiaru'}{statusError?' · '+statusError:''}</p>
          <div className="space-y-2 mt-3">{observations.map((o:any)=><div key={o.source} className="flex justify-between gap-3 text-xs rounded-md bg-slate-900/70 border border-slate-800 p-2"><span className="text-slate-300">{o.source}</span><span className={o.ok?'text-emerald-400':'text-rose-400'}>{o.ok?'ONLINE':'BRAK ODPOWIEDZI'}</span></div>)}</div>
          <p className="text-[11px] text-slate-500 mt-3">Mapa planet jest wizualizacją. Telemetria pochodzi z rzeczywistych pomiarów backendu, gdy jest dostępna.</p>
        </div>
      </div>
    </section>
  );
}
