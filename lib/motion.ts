/** Read the same tokens for CSS surfaces and imperative, reversible animations. */
export function getMotion() {
  const root=document.documentElement, styles=getComputedStyle(root);
  const token=styles.getPropertyValue("--motion-duration").trim();
  const parsed=parseFloat(token)*(token.endsWith("ms")?1:1000);
  return {
    reduced:root.dataset.motion==="reduced" || matchMedia("(prefers-reduced-motion: reduce)").matches,
    duration:Number.isFinite(parsed)&&parsed>0?parsed:320,
    easing:styles.getPropertyValue("--motion-ease").trim()||"cubic-bezier(.22,1,.36,1)",
  };
}
