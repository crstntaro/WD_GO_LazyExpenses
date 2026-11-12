"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { getMotion } from "@/lib/motion";
import { AccountManager } from "./account-manager";
import { budgetCents, type Setup } from "@/lib/setup-store";
import type { Transaction } from "@/lib/finance";
export function AccountPanel({setup,items,update,onClose}:{setup:Setup;items:Transaction[];update:(patch:Partial<Setup>)=>void;onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null);
  const opening = useRef<Animation | null>(null), closing = useRef<Animation | null>(null);
  const closingStarted = useRef(false);
  const restoreFrame = useRef<number | null>(null);
  const closeCallback = useRef(onClose);
  useEffect(()=>{closeCallback.current=onClose;},[onClose]);
  function closeAccount(){
    const element=dialog.current;if(closingStarted.current)return;
    closingStarted.current=true;
    const motion=getMotion();
    if(!element?.animate || motion.reduced){closeCallback.current();return;}
    const current=getComputedStyle(element);const from={opacity:current.opacity,transform:current.transform};
    opening.current?.cancel();element.dataset.closing="true";
    closing.current=element.animate([from,{opacity:0,transform:"translateY(calc(-50% + 12px)) scale(.975)"}],{duration:motion.duration*.6875,easing:motion.easing,fill:"both"});
    void closing.current.finished.then(()=>closeCallback.current()).catch(()=>{});
  }
  const [name,setName]=useState(setup.name),[enabled,setEnabled]=useState(setup.budgetEnabled),[budget,setBudget]=useState(setup.budgetInput),[error,setError]=useState(""),[saved,setSaved]=useState(false);
  useEffect(()=>{
    if(restoreFrame.current!==null)cancelAnimationFrame(restoreFrame.current);
    const restoreTarget=document.activeElement;
    const element=dialog.current;element?.showModal();
    const motion=getMotion();
    if(element?.animate && !motion.reduced)opening.current=element.animate([{opacity:0,transform:"translateY(calc(-50% + 20px)) scale(.965)"},{opacity:1,transform:"translateY(-50%) scale(1)"}],{duration:motion.duration*1.125,easing:motion.easing});
    return()=>{opening.current?.cancel();closing.current?.cancel();element?.close();restoreFrame.current=requestAnimationFrame(()=>{if(restoreTarget instanceof HTMLElement && restoreTarget.isConnected)restoreTarget.focus({preventScroll:true});});};
  },[]);
  function save(e:FormEvent){e.preventDefault();if(enabled&&budgetCents(budget)===null){setError("Enter a monthly budget above ₱0.");return;}update({name:name.trim(),budgetEnabled:enabled,budgetInput:budget});setError("");setSaved(true);}
  return <dialog ref={dialog} className="expense-dialog account-dialog" aria-labelledby="account-title" onCancel={(event)=>{event.preventDefault();closeAccount();}}><div className="dialog-heading"><div><span className="eyebrow">YOUR CORNER</span><h2 id="account-title">You & your money.</h2></div><button type="button" className="icon-button" aria-label="Close account" onClick={closeAccount}>×</button></div><form onSubmit={save} noValidate className="account-profile"><label htmlFor="account-profile-name">Name or nickname</label><input id="account-profile-name" className="setup-input" maxLength={40} value={name} onChange={(e)=>{setName(e.target.value);setSaved(false);}} /><label className="inline-check"><input type="checkbox" checked={enabled} onChange={(e)=>{setEnabled(e.target.checked);setSaved(false);}} />Use a monthly budget</label>{enabled&&<><label htmlFor="account-budget">Monthly budget · PHP</label><input id="account-budget" className="setup-input" inputMode="decimal" maxLength={20} value={budget} onChange={(e)=>{setBudget(e.target.value);setSaved(false);}} /></>}{error&&<p role="alert" className="field-error">{error}</p>}<button className="secondary-button" type="submit">Save profile</button>{saved&&<p role="status">Profile saved.</p>}</form><div className="account-wallet-heading"><h3>Your wallets & cards</h3><p>Amounts stay on this device. Tap a card to update it.</p></div><AccountManager setup={setup} update={update} transactions={items} /></dialog>;
}
