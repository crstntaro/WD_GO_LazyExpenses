"use client";
import { useEffect, useRef, useState } from "react";
const KEY="whereditgo-review-reminder-v1";
export function ReviewReminder({count,available,onReview}:{count:number;available:boolean;onReview:()=>void}){
  const [open,setOpen]=useState(false);const dialog=useRef<HTMLDialogElement>(null);const seen=useRef(false);
  useEffect(()=>{if(count<5||!available||seen.current)return;try{const last=Number(localStorage.getItem(KEY));if(last&&Date.now()-last<86400000)return;}catch{}
    const timer=setTimeout(()=>{if(document.hidden || document.activeElement?.matches("input,textarea,select"))return;seen.current=true;setOpen(true);try{localStorage.setItem(KEY,String(Date.now()));}catch{}},4000);return()=>clearTimeout(timer);
  },[count,available]);
  useEffect(()=>{if(open)dialog.current?.showModal();else dialog.current?.close();},[open]);
  return <dialog ref={dialog} className="expense-dialog reminder-dialog" aria-labelledby="reminder-title" onCancel={()=>setOpen(false)}><span className="reminder-symbol" aria-hidden="true">?</span><h2 id="reminder-title">A few loose ends?</h2><p>{count} expenses could use a name or a quick check. They’re already saved and counted.</p><div className="review-actions"><button type="button" className="primary-button" onClick={()=>{setOpen(false);onReview();}}>Organize expenses</button><button type="button" className="text-button" onClick={()=>setOpen(false)}>Later</button></div></dialog>;
}
