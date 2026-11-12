"use client";
import { getMotion } from "@/lib/motion";
import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";

/** Keep native disclosure semantics, with interruptible height in both directions. */
export function AnimatedDetails({children, ...props}: ComponentPropsWithoutRef<"details">) {
  const ref=useRef<HTMLDetailsElement>(null), animation=useRef<Animation|null>(null), desired=useRef<boolean|null>(null);
  useEffect(()=>()=>{animation.current?.cancel();},[]);
  return <details {...props} ref={ref} onClick={(event)=>{
    const element=ref.current, target=event.target;
    if(!element || !(target instanceof Element) || target.closest("summary")?.parentElement!==element)return;
    event.preventDefault();
    const next=!(desired.current??element.open);desired.current=next;
    const start=element.getBoundingClientRect().height;
    animation.current?.cancel();animation.current=null;
    const motion=getMotion();
    if(!element.animate || motion.reduced){element.open=next;element.style.height="";element.style.overflow="";desired.current=null;return;}
    element.open=true;element.style.height="auto";
    const style=getComputedStyle(element), border=parseFloat(style.borderTopWidth)+parseFloat(style.borderBottomWidth);
    const end=next?element.scrollHeight+border:element.querySelector("summary")!.getBoundingClientRect().height+parseFloat(style.paddingTop)+parseFloat(style.paddingBottom)+border;
    element.style.height=`${start}px`;element.style.overflow="hidden";
    const current=element.animate([{height:`${start}px`},{height:`${end}px`}],{duration:motion.duration,easing:motion.easing});animation.current=current;
    current.onfinish=()=>{if(animation.current!==current)return;element.open=next;element.style.height="";element.style.overflow="";desired.current=null;animation.current=null;};
  }}>{children}</details>;
}
