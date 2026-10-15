import{r as c,j as l}from"./react-vendor-DSjZMWWp.js";import{L as p}from"./leaflet-CZbxc4iF.js";import{a as b}from"./index-DeCj8mRC.js";import"./three-vendor-BCHJGKAj.js";import"./charts-BDgK-oP_.js";import"./vendor-DlpL6yCd.js";import"./http-CzApALvg.js";import"./motion-S7rAk493.js";import"./icons-PiK5nb9A.js";const h=[7.5,80.6],f=8,u=[{id:"colombo-pettah",name:"Colombo (Pettah)",type:"capital",coords:[6.9403,79.8522],note:"National & commercial capital — main bus terminal hub"},{id:"makumbura",name:"Makumbura",type:"junction",coords:[6.8768,79.975],note:"E01 Southern Expressway interchange (Kottawa)"},{id:"kandy",name:"Kandy",type:"city",coords:[7.2906,80.6337],note:"Hill capital, A1 / A5 junction"},{id:"galle",name:"Galle",type:"city",coords:[6.0329,80.217],note:"Southern coastal city, E01 / A2 junction"},{id:"matara",name:"Matara",type:"city",coords:[5.9549,80.555],note:"Southern terminus — E01 / A2"},{id:"tangalle",name:"Tangalle",type:"city",coords:[6.0245,80.7988],note:"E01 (Hambantota extension)"},{id:"hambantota",name:"Hambantota",type:"city",coords:[6.124,81.1205],note:"Port city — E01 / A7 junction"},{id:"kataragama",name:"Kataragama",type:"city",coords:[6.4187,81.335],note:"Pilgrimage town — E01 / A4 terminus"},{id:"ampara",name:"Ampara",type:"city",coords:[7.2975,81.6822],note:"Eastern province hub"},{id:"siyambalanduwa",name:"Siyambalanduwa",type:"city",coords:[6.9043,81.4187]},{id:"wellawaya",name:"Wellawaya",type:"city",coords:[6.7368,81.0997],note:"A4 / A7 junction"},{id:"mattala",name:"Mattala",type:"city",coords:[6.2998,81.1204],note:"Mattala Rajapaksa Intl. Airport (HRI)"},{id:"badulla",name:"Badulla",type:"city",coords:[6.9934,81.055],note:"Uva capital — A5 terminus"},{id:"ella",name:"Ella",type:"city",coords:[6.8667,81.0467],note:"Hill-country tourist town"},{id:"jaffna",name:"Jaffna",type:"city",coords:[9.6615,80.0255],note:"Northern capital — A9 terminus"},{id:"vavuniya",name:"Vavuniya",type:"city",coords:[8.7514,80.4971],note:"Northern gateway on A9"},{id:"anuradhapura",name:"Anuradhapura",type:"city",coords:[8.3114,80.4037],note:"Sacred city — A9"},{id:"kurunegala",name:"Kurunegala",type:"city",coords:[7.4863,80.3652],note:"North Western hub — A9"},{id:"matale",name:"Matale",type:"city",coords:[7.4683,80.6214]},{id:"maharagama",name:"Maharagama",type:"city",coords:[6.8484,79.9228]},{id:"kadawatha",name:"Kadawatha",type:"junction",coords:[6.9898,79.9571],note:"A1 / A9 junction, north of Colombo"},{id:"panadura",name:"Panadura",type:"city",coords:[6.7136,79.9074],note:"Coastal city on A2"},{id:"katunayake",name:"Katunayake",type:"city",coords:[7.1648,79.8823],note:"Bandaranaike Intl. Airport (CMB) — E03"},{id:"negombo",name:"Negombo",type:"city",coords:[7.2084,79.8358],note:"Coastal city near airport"},{id:"trincomalee",name:"Trincomalee",type:"city",coords:[8.5874,81.2152],note:"Eastern port & naval city"},{id:"polonnaruwa",name:"Polonnaruwa",type:"city",coords:[7.9403,81.0188],note:"Ancient capital"},{id:"ratnapura",name:"Ratnapura",type:"city",coords:[6.7056,80.3844],note:"Gem city — A4"},{id:"nuwara-eliya",name:"Nuwara Eliya",type:"city",coords:[6.9497,80.7891],note:"Hill station — A5"},{id:"middeniya",name:"Middeniya",type:"city",coords:[6.2095,80.7793]},{id:"walasmulla",name:"Walasmulla",type:"city",coords:[6.1596,80.6785]},{id:"beliatta",name:"Beliatta",type:"city",coords:[6.0458,80.7343],note:"E01 interchange (Hambantota extension)"},{id:"hakmana",name:"Hakmana",type:"city",coords:[6.0809,80.6534]},{id:"embilipitiya",name:"Embilipitiya",type:"city",coords:[6.3428,80.8474],note:"A4 junction in the deep south"},{id:"rakwana",name:"Rakwana",type:"city",coords:[6.5142,80.5595]},{id:"welimada",name:"Welimada",type:"city",coords:[6.9071,80.898],note:"Highlands market town — A5"},{id:"passara",name:"Passara",type:"city",coords:[6.9552,81.1519]},{id:"bibila",name:"Bibila",type:"city",coords:[6.7842,81.1746]}],y=[{id:"a1",code:"A1",name:"Colombo – Kandy Road",color:"#f59e0b",weight:3,labelPos:[7.22,80.45],summary:"Colombo → Kadawatha → Ambepussa → Kegalle → Kandy",operators:["SLTB","Singhegiri Transport","Namali Travels"],points:[[6.9403,79.8522],[6.9898,79.9571],[7.197,80.15],[7.251,80.3436],[7.265,80.594],[7.2906,80.6337]]},{id:"a9",code:"A9",name:"Kandy / Jaffna Highway (North Road)",color:"#f59e0b",weight:3,labelPos:[8.55,80.47],summary:"Colombo → Kurunegala → Dambulla → Anuradhapura → Vavuniya → Jaffna",operators:["SLTB","Jaffna Travels","SK Sons","Liyanage Express"],points:[[6.9403,79.8522],[6.9898,79.9571],[7.4863,80.3652],[7.86,80.651],[8.3114,80.4037],[8.7514,80.4971],[9.381,80.411],[9.6615,80.0255]]},{id:"a2",code:"A2",name:"Galle Road (Southern Coast)",color:"#94a3b8",weight:3,labelPos:[6.24,80.1],summary:"Colombo → Panadura → Kalutara → Galle → Matara",operators:["SLTB","Jayalath Traders","Maleesha Tours"],points:[[6.9403,79.8522],[6.7136,79.9074],[6.585,79.962],[6.235,80.055],[6.146,80.102],[6.0329,80.217],[5.9549,80.555]]},{id:"a4",code:"A4",name:"Ratnapura / Buttala Road",color:"#94a3b8",weight:3,labelPos:[6.45,80.72],summary:"Avissawella → Ratnapura → Rakwana → Embilipitiya → Kataragama",operators:["SLTB","SK Sons","Namali Travels"],points:[[6.9558,80.2134],[6.7056,80.3844],[6.5142,80.5595],[6.3428,80.8474],[6.466,80.968],[6.4187,81.335]]},{id:"a5",code:"A5",name:"Kandy – Badulla Road (Hill Country)",color:"#94a3b8",weight:3,labelPos:[6.9,80.9],summary:"Kandy → Gampola → Nuwara Eliya → Welimada → Ella → Badulla",operators:["SLTB","Namunukula Highway Express","NCG Express","Singhegiri Transport"],points:[[7.2906,80.6337],[7.265,80.594],[7.165,80.57],[7.01,80.52],[6.9497,80.7891],[6.9071,80.898],[6.8667,81.0467],[6.9934,81.055]]},{id:"a7",code:"A7",name:"Hambantota – Wellawaya Road",color:"#94a3b8",weight:3,labelPos:[6.55,81.2],summary:"Hambantota → Tissamaharama → Wellawaya → Monaragala",operators:["SLTB","Maleesha Tours","Liyanage Express"],points:[[6.124,81.1205],[6.283,81.29],[6.7368,81.0997],[6.8726,81.3497]]},{id:"e03",code:"E03",name:"Colombo – Katunayake Expressway",color:"#38bdf8",weight:5,labelPos:[7.1,79.9],summary:"Colombo (Peliyagoda) → Katunayake (Bandaranaike Intl. Airport)",operators:["Expressway Bus","SLTTS Katubadda","Dilanka Express"],points:[[6.9403,79.8522],[6.975,79.89],[7.09,79.9],[7.1648,79.8823]]},{id:"e01",code:"E01",name:"Southern Expressway",color:"#10b981",weight:5,labelPos:[6.1,80.75],summary:"Kottawa → Makumbura → Galle → Matara → Tangalle → Hambantota → Mattala / Kataragama",operators:["Expressway Bus","SLTTS Katubadda","NCG Express","Vishmitha Highway","GreenLeaf","Jayalath Traders"],points:[[6.8414,79.9666],[6.8768,79.975],[6.5992,80.0015],[6.4349,80.0313],[6.209,80.158],[6.0329,80.217],[5.983,80.39],[5.9549,80.555],[6.0458,80.7343],[6.0245,80.7988],[6.1126,81.019],[6.124,81.1205],[6.2998,81.1204],[6.4187,81.335]]}],v="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",x='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',m="#a78bfa";function w(a){const o=a.operators.map(t=>`<span class="vygo-operator">${t}</span>`).join("");return`
    <div class="vygo-popup-title"><span class="vygo-dot" style="background:${a.color}"></span>${a.code} · ${a.name}</div>
    <div class="vygo-popup-route">${a.summary}</div>
    ${a.operators.length?`<div class="vygo-popup-label">Bus Owners</div><div class="vygo-popup-operators">${o}</div>`:""}
  `}function E(a){const o=a.type==="capital"?'<span class="vygo-tag vygo-tag-capital">Capital</span>':a.type==="junction"?'<span class="vygo-tag vygo-tag-junction">Junction</span>':"";return`<div class="vygo-popup-title">${a.name}</div>${o}${a.note?`<div class="vygo-popup-route">${a.note}</div>`:""}`}function A(a,o){const t=p.polyline(o.points,{color:o.color,weight:o.weight,opacity:.92,lineJoin:"round",lineCap:"round"}).addTo(a);t.bindTooltip(`<span class="vygo-corridor-code">${o.code}</span> <span class="vygo-corridor-name">${o.name}</span>`,{permanent:!0,direction:"top",offset:[0,-8],className:"vygo-corridor-label",opacity:.95});const e=t.getTooltip();e&&e.setLatLng(o.labelPos),t.bindPopup(w(o),{className:"vygo-popup",maxWidth:320})}function T(a,o){const t=o.type==="capital",e=o.type==="junction",n=p.circleMarker(o.coords,{radius:t?7:e?5.5:4.5,color:"#0f172a",weight:1.5,fillColor:t?"#fbbf24":e?"#38bdf8":"#f8fafc",fillOpacity:.95}).addTo(a);n.bindTooltip(o.name,{direction:"top",offset:[0,-6],className:"vygo-city-tooltip"}),n.bindPopup(E(o),{className:"vygo-popup",maxWidth:260})}function g(a){if(!a)return null;if(Array.isArray(a))return[a[0],a[1]];if(typeof a=="object"){if(a.lat!=null&&a.lng!=null)return[a.lat,a.lng];if(a.latitude!=null&&a.longitude!=null)return[a.latitude,a.longitude]}const o=u.find(t=>t.name.toLowerCase().includes(String(a).toLowerCase()));return o?o.coords:null}function C(a,o){if(!Array.isArray(o)||o.length===0)return;let t=0;return o.forEach(e=>{const n=String(e.routeType||"").toUpperCase();if(n&&n!=="EXPRESSWAY")return;const i=g(e.fromCity??e.from??e.origin),r=g(e.toCity??e.to??e.destination);if(!i||!r)return;const d=e.routeNumber?`${e.routeNumber} · ${e.fromCity??""} → ${e.toCity??""}`:`${e.fromCity??""} → ${e.toCity??""}`;p.polyline([i,r],{color:m,weight:2,opacity:.75,dashArray:"5 7",interactive:!0}).addTo(a).bindPopup(`<div class="vygo-popup-title">Live route</div><div class="vygo-popup-route">${d}</div>`,{className:"vygo-popup",maxWidth:260}),[i,r].forEach(s=>p.circleMarker(s,{radius:3,color:"#0f172a",weight:1,fillColor:m,fillOpacity:1}).addTo(a)),t+=1}),t}function $({className:a="",height:o=480}){const t=c.useRef(null),e=c.useRef(null),n=c.useRef(null);return c.useEffect(()=>{const i=e.current;if(!i||n.current)return;const r=p.map(i,{center:h,zoom:f,minZoom:7,maxZoom:17,zoomControl:!0});n.current=r,p.tileLayer(v,{attribution:x,subdomains:"abcd",maxZoom:19}).addTo(r),y.forEach(s=>A(r,s)),u.forEach(s=>T(r,s));let d=!1;return b.get("/routes").then(s=>{d||C(r,s.data)}).catch(()=>{}),()=>{d=!0,n.current&&(n.current.remove(),n.current=null)}},[]),l.jsxs("div",{ref:t,className:`vygo-map-shell ${a}`,style:{position:"relative",width:"100%",height:o},"data-testid":"route-map",children:[l.jsx("div",{ref:e,"aria-label":"Sri Lanka bus route map",className:"vygo-map-root",style:{height:"100%",width:"100%"}}),l.jsxs("div",{className:"vygo-legend","aria-hidden":"true",children:[l.jsx("div",{className:"vygo-legend-title",children:"Corridors"}),y.map(i=>l.jsxs("div",{className:"vygo-legend-item",children:[l.jsx("span",{className:"vygo-legend-line",style:{background:i.color}}),l.jsx("span",{className:"vygo-legend-code",children:i.code}),l.jsx("span",{className:"vygo-legend-name",children:i.name})]},i.id))]}),l.jsx("style",{children:`
        .vygo-map-shell .leaflet-container { background: #020617; font-family: inherit; }

        /* Corridor permanent labels */
        .vygo-map-shell .vygo-corridor-label {
          background: rgba(15, 23, 42, 0.94);
          border: 1px solid rgba(148, 163, 184, 0.4);
          color: #f1f5f9;
          border-radius: 6px;
          padding: 2px 8px;
          font-weight: 700;
          font-size: 11px;
          letter-spacing: 0.03em;
          white-space: nowrap;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
        }
        .vygo-map-shell .vygo-corridor-label::before { display: none; }
        .vygo-map-shell .vygo-corridor-label .vygo-corridor-name { font-weight: 500; }

        /* City tooltips */
        .vygo-map-shell .vygo-city-tooltip {
          background: #0f172a;
          border: 1px solid rgba(148, 163, 184, 0.3);
          color: #e2e8f0;
          border-radius: 6px;
          padding: 3px 9px;
          font-size: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
        }
        .vygo-map-shell .vygo-city-tooltip::before { display: none; }

        /* Popups */
        .vygo-map-shell .vygo-popup .leaflet-popup-content-wrapper,
        .vygo-map-shell .vygo-popup .leaflet-popup-tip {
          background: #0f172a;
          color: #e2e8f0;
          border: 1px solid rgba(148, 163, 184, 0.25);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55);
        }
        .vygo-map-shell .vygo-popup .leaflet-popup-content { margin: 12px 14px; line-height: 1.5; }
        .vygo-map-shell .vygo-popup a.leaflet-popup-close-button { color: #94a3b8; }
        .vygo-map-shell .vygo-popup-title { font-weight: 700; color: #f8fafc; margin-bottom: 4px; }
        .vygo-map-shell .vygo-popup-route { font-size: 12px; color: #cbd5e1; }
        .vygo-map-shell .vygo-popup-label {
          margin: 8px 0 4px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #94a3b8;
        }
        .vygo-map-shell .vygo-popup-operators { display: flex; flex-wrap: wrap; gap: 4px; }
        .vygo-map-shell .vygo-operator {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.12);
          border: 1px solid rgba(148, 163, 184, 0.25);
          font-size: 11px;
          color: #cbd5e1;
        }
        .vygo-map-shell .vygo-dot {
          display: inline-block;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          margin-right: 6px;
          vertical-align: middle;
        }
        .vygo-map-shell .vygo-tag {
          display: inline-block;
          margin: 0 0 6px;
          padding: 1px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .vygo-map-shell .vygo-tag-capital { background: rgba(251, 191, 36, 0.15); color: #fbbf24; }
        .vygo-map-shell .vygo-tag-junction { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }

        /* Legend card */
        .vygo-map-shell .vygo-legend {
          position: absolute;
          left: 10px;
          bottom: 24px;
          z-index: 1000;
          pointer-events: none;
          background: rgba(15, 23, 42, 0.92);
          border: 1px solid rgba(148, 163, 184, 0.25);
          border-radius: 10px;
          padding: 8px 10px;
          color: #e2e8f0;
          font-size: 11px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
          max-width: 240px;
        }
        .vygo-map-shell .vygo-legend-title {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #94a3b8;
          margin-bottom: 4px;
        }
        .vygo-map-shell .vygo-legend-item { display: flex; align-items: center; gap: 6px; line-height: 1.7; }
        .vygo-map-shell .vygo-legend-line {
          width: 18px;
          height: 4px;
          border-radius: 2px;
          flex: none;
        }
        .vygo-map-shell .vygo-legend-code { font-weight: 700; min-width: 26px; }
        .vygo-map-shell .vygo-legend-name { color: #cbd5e1; }
      `})]})}export{$ as default};
