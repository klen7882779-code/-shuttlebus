// ── 接駁車系統核心（櫃台頁與司機頁共用）────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc, getDoc, updateDoc, arrayUnion }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import React, { useState, useEffect, useMemo } from "https://esm.sh/react@18.2.0";
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client";

const firebaseConfig = {
  apiKey: "AIzaSyBCnbLSHADMCqlbJnQarvaaCpFFOlWKAF4",
  authDomain: "shuttlebus-fac47.firebaseapp.com",
  projectId: "shuttlebus-fac47",
  storageBucket: "shuttlebus-fac47.firebasestorage.app",
  messagingSenderId: "45295439094",
  appId: "1:45295439094:web:83523229256f737e99b0d7",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const DOC = doc(db, "shuttle", "main");
const LOG = doc(db, "shuttle", "log");
export const h = React.createElement;
export { useState, useEffect, useMemo, createRoot, DOC, LOG, onSnapshot, setDoc, getDoc, updateDoc, arrayUnion };

// ── 異動紀錄：寫一筆 + 清掉 60 天前 ──────────────────
const LOG_KEEP_MS = 60 * 24 * 60 * 60 * 1000; // 60 天
export async function writeLog(entry) {
  try {
    const snap = await getDoc(LOG);
    const now = Date.now();
    let items = (snap.exists() && snap.data().items) ? snap.data().items : [];
    items.push({ t: now, ...entry });
    // 只留 60 天內
    items = items.filter(x => now - x.t < LOG_KEEP_MS);
    await setDoc(LOG, { items });
  } catch (e) { console.error("log fail", e); }
}


export const SEAT_CAP = 10;
export const ROUTES = [
  { id: "gongguan", name: "公館線", color: "#2563eb" },
  { id: "zhongxiao", name: "忠孝復興線", color: "#059669" },
  { id: "zhonghe", name: "中和線", color: "#d97706" },
];
export const ROUTE_STOPS = { zhonghe: ["景安", "永安", "頂溪"] };
export const SIDE_COLORS = { A: "#7c3aed", B: "#db2777", R: "#0891b2" };
const WEEKDAY_SLOTS = [
  { time: "08:00", back: "11:00", label: "早上" },
  { time: "11:30", back: "14:30", label: "中午" },
  { time: "15:00", back: "18:00", label: "下午" },
  { time: "18:30", back: "21:00", label: "晚間" },
];
const WEEKDAY_ROUTE_DAYS = { gongguan: [1,2,4,5], zhongxiao: [2,5], zhonghe: [1,4] };
const WEEKEND_SLOTS = {
  6: [{ time: "08:00", back: "12:30", label: "早上" }, { time: "13:00", back: "17:30", label: "下午" }],
  0: [{ time: "08:00", back: "12:30", label: "早上" }],
};
const WEEKEND_ROUTE_DAYS = {
  gongguan: { 6: ["08:00","13:00"], 0: ["08:00"] },
  zhongxiao: { 6: ["08:00"], 0: ["08:00"] },
  zhonghe: { 6: ["08:00"], 0: ["08:00"] },
};
export const WEEKDAYS = [1,2,3,4,5];
export const WEEKENDS = [6,0];
export const DAY_NAME = { 0:"日",1:"一",2:"二",3:"三",4:"四",5:"五",6:"六" };
export const tk = (r,d,t) => `${r}_${d}_${t}`;
export const EMPTY = () => ({ A: [], B: [], R: [] });

// 產生表格結構
export function buildGrid(tab) {
  if (tab === "weekday") {
    return WEEKDAY_SLOTS.map(slot => ({ slot, days: WEEKDAYS.map(day => {
      const routes = ROUTES.filter(r => WEEKDAY_ROUTE_DAYS[r.id].includes(day));
      return { day, routes: routes.map(r => ({ route: r, time: slot.time })) };
    })}));
  } else {
    return ["08:00","13:00"].map(time => ({
      slot: { time, label: time === "08:00" ? "早上" : "下午" },
      days: WEEKENDS.map(day => {
        const s = (WEEKEND_SLOTS[day]||[]).find(x => x.time === time);
        if (!s) return { day, routes: [] };
        const routes = ROUTES.filter(r => (WEEKEND_ROUTE_DAYS[r.id][day]||[]).includes(time));
        return { day, routes: routes.map(r => ({ route: r, time })) };
      })
    }));
  }
}

// 名單列（共用）
export function NameList({ c, route, readOnly, removeP, cKey }) {
  const stops = ROUTE_STOPS[route.id];
  const row = (p, side) => h("div", { key:p.id, style:{ display:"flex",alignItems:"center",gap:4,fontSize:13,padding:"3px 0" } },
    h("span", { style:{ width:6,height:6,borderRadius:2,background:SIDE_COLORS[side],display:"inline-block",flexShrink:0 } }),
    h("span", { style:{ fontWeight:600 } }, p.name),
    side==="R" ? h("span", { style:{ fontSize:10,color:SIDE_COLORS.R,fontWeight:700 } }, "補") : null,
    p.phone ? h("span", { style:{ fontSize:11,color:"#9ca3af" } }, p.phone) : null,
    stops && p.stop ? h("span", { style:{ fontSize:11,color:"#475569",background:"#f1f5f9",borderRadius:4,padding:"0 5px" } }, p.stop) : null,
    p.note ? h("span", { style:{ fontSize:11,color:"#0891b2",background:"#ecfeff",borderRadius:4,padding:"0 5px" } }, p.note) : null,
    !readOnly ? h("button", { onClick:()=>removeP(cKey,side,p.id), style:{ marginLeft:"auto",border:"none",background:"none",color:"#dc2626",cursor:"pointer",fontSize:12 } }, "✕") : null,
  );
  return h("div", { style:{ marginTop:4 } }, c.A.map(p=>row(p,"A")), c.B.map(p=>row(p,"B")), c.R.map(p=>row(p,"R")));
}

export const dot = (c) => ({ width:10,height:10,borderRadius:3,background:c,display:"inline-block" });
export const tabGroup = { display:"flex",gap:4,background:"#f3f4f6",borderRadius:10,padding:4 };
export const tabBtn = (a) => ({ padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,background:a?"#fff":"transparent",color:a?"#1f2937":"#6b7280",boxShadow:a?"0 1px 3px rgba(0,0,0,0.1)":"none" });
export const thTime = { padding:"10px 8px",background:"#f9fafb",borderBottom:"2px solid #e5e7eb",fontSize:12,color:"#6b7280",width:64,position:"sticky",left:0 };
export const thDay = { padding:"10px 8px",background:"#f9fafb",borderBottom:"2px solid #e5e7eb",fontSize:14,fontWeight:700 };
export const tdTime = { padding:"8px",borderBottom:"1px solid #f0f0f0",background:"#fafafa",textAlign:"center",verticalAlign:"top",position:"sticky",left:0 };
export const tdCell = { padding:"6px",borderBottom:"1px solid #f0f0f0",borderLeft:"1px solid #f0f0f0",verticalAlign:"top",minWidth:130 };
