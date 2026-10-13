import{r as m,j as s}from"./react-vendor-DSjZMWWp.js";import{L as g}from"./leaflet-CZbxc4iF.js";const O="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",z='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',j=[7.8731,80.7718],E=7,P=[["colombo",[6.9403,79.8522]],["kandy",[7.2906,80.6337]],["galle",[6.0329,80.217]],["matara",[5.9549,80.555]],["kataragama",[6.4187,81.335]],["badulla",[6.9934,81.055]],["jaffna",[9.6615,80.0255]],["trincomalee",[8.5874,81.2152]],["anuradhapura",[8.3114,80.4037]],["ratnapura",[6.7056,80.3844]],["makumbura",[6.8768,79.975]],["kadawatha",[6.9898,79.9571]],["maharagama",[6.8484,79.9228]],["panadura",[6.7136,79.9074]],["negombo",[7.2084,79.8358]],["katunayake",[7.1648,79.8823]],["kurunegala",[7.4863,80.3652]],["tangalle",[6.0245,80.7988]],["pettah",[6.9403,79.8522]],["horana",[6.7169,80.0594]],["matale",[7.4683,80.6214]],["polonnaruwa",[7.9403,81.0188]],["embilipitiya",[6.3428,80.8474]],["avissawella",[6.9558,80.2134]],["puttalam",[8.0362,79.835]],["batticaloa",[7.7102,81.6924]],["hambantota",[6.124,81.1205]],["vavuniya",[8.7514,80.4971]],["dambulla",[7.86,80.651]],["ella",[6.8667,81.0467]],["nuwara eliya",[6.9497,80.7891]],["wellawaya",[6.7368,81.0997]],["kalutara",[6.585,79.962]],["kottawa",[6.8414,79.9666]],["gampaha",[7.0917,79.9953]],["homagama",[6.8409,80.0055]],["ja-ela",[7.0784,79.8934]],["kegalle",[7.251,80.3436]],["gampola",[7.165,80.57]],["ampara",[7.2975,81.6822]],["monaragala",[6.8726,81.3497]],["mattala",[6.2998,81.1204]],["kilinochchi",[9.381,80.411]],["chilaw",[7.574,79.794]],["mannar",[8.9769,79.9044]],["middeniya",[6.2095,80.7793]],["beliatta",[6.0458,80.7343]],["walasmulla",[6.1596,80.6785]],["hakmana",[6.0809,80.6534]],["rakwana",[6.5142,80.5595]],["siyambalanduwa",[6.9043,81.4187]],["bibila",[6.7842,81.1746]],["passara",[6.9552,81.1519]],["welimada",[6.9071,80.898]],["peradeniya",[7.265,80.594]],["ambalangoda",[6.235,80.055]],["hikkaduwa",[6.146,80.102]]],I={"colombo (pettah)":"colombo","pettah (colombo)":"colombo","katunayake airport":"katunayake","bandaranaike international airport":"katunayake","cmb airport":"katunayake","nuwara-eliya":"nuwara eliya",jaela:"ja-ela","ja ela":"ja-ela","anuradhapura (new town)":"anuradhapura","kataragama (city)":"kataragama"},u={};for(const[o,a]of P)u[o]=a;for(const[o,a]of Object.entries(I))u[a]&&(u[o]=u[a]);function r(o){return String(o??"").replace(/[&<>"']/g,a=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[a])}function h(o){if(!o)return null;const a=String(o).trim().toLowerCase().replace(/\s+/g," ");if(u[a])return u[a];const e=a.replace(/\s*\(.*?\)\s*$/,"").trim();return e&&u[e]?u[e]:null}function C(o){return String(o?.operatorType??"").trim().toUpperCase()==="EXPRESSWAY"?"EXPRESSWAY":"NORMAL"}function k(o){return o?.corridor||`${o?.fromCity??""} → ${o?.toCity??""}`}function c(o){return Array.isArray(o)?o.filter(Boolean):[]}function S(o){return c(o).map(a=>`<span class="vygo-rn">${r(a)}</span>`).join("")}function _(o){return c(o).map(a=>`<span class="vygo-operator">${r(a)}</span>`).join("")}function M(o){return c(o).map(a=>`<a class="vygo-phone" href="tel:${r(a).replace(/[^\d+]/g,"")}">${r(a)}</a>`).join("")}function W(o,a){const e=c(o?.routeNumbers);return`
    <div class="vygo-popup-title">${r(k(o))}</div>
    <div class="vygo-popup-route">${r(o?.fromCity??"")} → ${r(o?.toCity??"")}</div>
    <div class="vygo-popup-label">Type</div>
    <div class="vygo-popup-route">${r(a)}</div>
    ${e.length?`<div class="vygo-popup-label">Route numbers</div><div class="vygo-popup-routes">${S(e)}</div>`:""}
  `}function Y(o,a,e){const i=c(o?.routeNumbers),n=c(o?.operators),d=c(o?.phones);return`
    <div class="vygo-popup-title">${r(a)}: ${r(e)}</div>
    <div class="vygo-popup-route">${r(k(o))}</div>
    ${i.length?`<div class="vygo-popup-label">Route numbers</div><div class="vygo-popup-routes">${S(i)}</div>`:""}
    ${n.length?`<div class="vygo-popup-label">Bus Owners</div><div class="vygo-popup-operators">${_(n)}</div>`:""}
    ${d.length?`<div class="vygo-popup-label">Phones</div><div class="vygo-popup-phones">${M(d)}</div>`:""}
  `}function N(o,a,e,i,n){g.circleMarker(a,{radius:5,color:"#64748b",weight:1.2,fillColor:"#0f172a",fillOpacity:1}).addTo(o).bindTooltip(`${i}: ${n}`,{direction:"top",offset:[0,-6],className:"vygo-city-tip"}).bindPopup(Y(e,i,n),{className:"vygo-popup",maxWidth:280})}function U({routes:o=[],className:a="",height:e=420}){const i=m.useRef(null),n=m.useRef(null),d=m.useRef(null),[w,T]=m.useState(0);m.useEffect(()=>{const t=i.current;if(!t||n.current)return;const l=g.map(t,{center:j,zoom:E,minZoom:6,maxZoom:17,zoomControl:!0});return n.current=l,g.tileLayer(O,{attribution:z,subdomains:"abcd",maxZoom:19}).addTo(l),d.current=g.layerGroup().addTo(l),()=>{n.current&&(n.current.remove(),n.current=null),d.current=null}},[]),m.useEffect(()=>{const t=n.current,l=d.current;if(!t||!l)return;l.clearLayers();const y=[];let b=0;(Array.isArray(o)?o:[]).forEach(p=>{const f=h(p?.fromCity),v=h(p?.toCity);if(!f||!v)return;const $=C(p),x=$==="EXPRESSWAY",A=String(p?.fromCity??"").trim(),L=String(p?.toCity??"").trim();g.polyline([f,v],{color:x?"#14b8a6":"#818cf8",weight:x?3.5:2.5,opacity:x?.9:.7,dashArray:x?null:"6 8",lineJoin:"round",lineCap:"round"}).addTo(l).bindTooltip(`${r(k(p))} · ${r($)}`,{direction:"top",offset:[0,-8],className:"vygo-route-tip"}).bindPopup(W(p,$),{className:"vygo-popup",maxWidth:300}),N(l,f,p,"From",A),N(l,v,p,"To",L),y.push(f,v),b+=1}),b>0&&y.length?t.fitBounds(g.latLngBounds(y).pad(.15),{padding:[24,24]}):t.setView(j,E),t.invalidateSize(),T(b)},[o]);const R=typeof e=="number"?{height:`${e}px`}:{height:e};return s.jsxs("div",{className:`vygo-routetools-map relative w-full overflow-hidden rounded-2xl border border-slate-800 ${a}`,style:R,"data-testid":"route-tools-map",children:[s.jsx("div",{ref:i,"aria-label":"Sri Lanka route corridors map",className:"vygo-routetools-root",style:{height:"100%",width:"100%"}}),w>0&&s.jsx("ul",{className:"sr-only",children:o.map((t,l)=>{const y=h(t?.fromCity),b=h(t?.toCity);if(!y||!b)return null;const p=c(t?.routeNumbers);return s.jsxs("li",{children:[k(t)," (",C(t)==="EXPRESSWAY"?"expressway":"normal","), from"," ",String(t?.fromCity??"").trim()," to ",String(t?.toCity??"").trim(),p.length?`, route numbers ${p.join(", ")}`:""]},l)})}),w===0&&s.jsx("div",{className:"pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center",children:s.jsx("div",{className:"rounded-xl border border-slate-700/60 bg-slate-950/85 px-4 py-2.5 text-sm text-slate-300 backdrop-blur-sm",children:"Select routes to see them on the map"})}),w>0&&s.jsxs("div",{className:"pointer-events-none absolute bottom-6 left-3 z-[1000] flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-[11px] text-slate-300",children:[s.jsxs("span",{className:"flex items-center gap-1.5",children:[s.jsx("span",{className:"block h-1 w-5 rounded-full bg-teal-500"}),"Expressway"]}),s.jsxs("span",{className:"flex items-center gap-1.5",children:[s.jsx("span",{className:"block h-0 w-5 border-t-2 border-dashed border-indigo-400"}),"Normal"]})]}),s.jsx("style",{children:`
        .vygo-routetools-map .leaflet-container { background: #020617; font-family: inherit; }

        .vygo-routetools-map .vygo-route-tip,
        .vygo-routetools-map .vygo-city-tip {
          background: #0f172a;
          border: 1px solid rgba(148, 163, 184, 0.3);
          color: #e2e8f0;
          border-radius: 6px;
          padding: 3px 9px;
          font-size: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
        }
        .vygo-routetools-map .vygo-route-tip::before,
        .vygo-routetools-map .vygo-city-tip::before { display: none; }

        .vygo-routetools-map .vygo-popup .leaflet-popup-content-wrapper,
        .vygo-routetools-map .vygo-popup .leaflet-popup-tip {
          background: #0f172a;
          color: #e2e8f0;
          border: 1px solid rgba(148, 163, 184, 0.25);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55);
        }
        .vygo-routetools-map .vygo-popup .leaflet-popup-content { margin: 12px 14px; line-height: 1.5; }
        .vygo-routetools-map .vygo-popup a.leaflet-popup-close-button { color: #94a3b8; }
        .vygo-routetools-map .vygo-popup-title { font-weight: 700; color: #f8fafc; margin-bottom: 4px; }
        .vygo-routetools-map .vygo-popup-route { font-size: 12px; color: #cbd5e1; }
        .vygo-routetools-map .vygo-popup-label {
          margin: 8px 0 4px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #94a3b8;
        }
        .vygo-routetools-map .vygo-popup-routes,
        .vygo-routetools-map .vygo-popup-operators,
        .vygo-routetools-map .vygo-popup-phones { display: flex; flex-wrap: wrap; gap: 4px; }
        .vygo-routetools-map .vygo-rn,
        .vygo-routetools-map .vygo-operator {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.12);
          border: 1px solid rgba(148, 163, 184, 0.25);
          font-size: 11px;
          color: #cbd5e1;
        }
        .vygo-routetools-map .vygo-phone {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(20, 184, 166, 0.12);
          border: 1px solid rgba(20, 184, 166, 0.3);
          font-size: 11px;
          color: #5eead4;
          text-decoration: none;
        }
        .vygo-routetools-map .vygo-phone:hover { background: rgba(20, 184, 166, 0.22); }
      `})]})}export{U as default};
