/* En-tête global : comportement de CanonBar.svelte (main). Défilement (is-scrolled, ↑), menu mobile (dialog, voile,
   verrou de défilement, Échap, piège Tab, fermeture au passage en large), FR|EN, thème, Connexion/Compte.
   La page peut fournir window.AXN.onLang(l) pour basculer sans rechargement (maquette). */
(function(){
var d=document,R=d.documentElement,W=window,h=d.querySelector('[data-component="SiteNav"]');if(!h)return;
var AXN=W.AXN=W.AXN||{};
function $$(s,c){return Array.prototype.slice.call((c||d).querySelectorAll(s))}
var burger=h.querySelector('[data-axn-burger]'),sheet=h.querySelector('[data-axn-sheet]'),scrim=h.querySelector('[data-axn-scrim]'),top=d.querySelector('[data-axn-top]'),open=false,menuScroll=0;
var RM=W.matchMedia('(prefers-reduced-motion: reduce)');
/* Connexion ou Compte : la maquette lit ?session=1 (le site lit la session stockée) */
var logged=false;try{logged=new URLSearchParams(location.search).get('session')==='1'}catch(e){}
function cta(){$$('[data-axn-cta]',h).forEach(function(a){a.setAttribute('href',logged?'/compte':'/connexion');a.querySelector('[data-axn-cta-t]').textContent=h.getAttribute(logged?'data-l-account':'data-l-login')})}
function setMenu(next,back){if(next&&!open)menuScroll=W.scrollY;open=next;h.classList.toggle('is-open',next);burger.setAttribute('aria-expanded',next);burger.setAttribute('aria-label',h.getAttribute(next?'data-l-close':'data-l-open'));
 sheet.setAttribute('aria-modal',next?'true':'false');if(next)sheet.removeAttribute('inert');else sheet.setAttribute('inert','');
 if(next){R.style.overflow='hidden';setTimeout(function(){var f=sheet.querySelector('a,button');if(f)f.focus({preventScroll:true})},50)}
 else{R.style.overflow='';if(W.scrollY!==menuScroll)W.scrollTo({top:menuScroll,behavior:'instant'});if(back)burger.focus({preventScroll:true})}}
burger.addEventListener('click',function(){setMenu(!open,true)});
scrim.addEventListener('click',function(){setMenu(false,true)});
sheet.addEventListener('click',function(e){if(e.target.closest('a[href]:not([data-setlang])'))setMenu(false,false)});
d.addEventListener('keydown',function(e){if(!open)return;if(e.key==='Escape'){e.preventDefault();setMenu(false,true);return}
 if(e.key!=='Tab')return;var list=[burger].concat($$('a[href],button',sheet)),i=list.indexOf(d.activeElement);
 if(e.shiftKey&&i<=0){e.preventDefault();list[list.length-1].focus()}else if(!e.shiftKey&&(i===list.length-1||i<0)){e.preventDefault();list[0].focus()}});
var wide=W.matchMedia('(min-width: 901px)');(wide.addEventListener?wide.addEventListener('change',function(e){if(e.matches&&open)setMenu(false,false)}):0);
/* défilement */
var tk=false;function sc(){var y=W.scrollY;h.classList.toggle('is-scrolled',y>8);if(top)top.classList.toggle('is-on',y>W.innerHeight*.9)}
W.addEventListener('scroll',function(){if(tk)return;tk=true;requestAnimationFrame(function(){tk=false;sc()})},{passive:true});sc();
if(top)top.addEventListener('click',function(){W.scrollTo({top:0,behavior:RM.matches?'auto':'smooth'});var l=h.querySelector('.axn-logo');if(l)l.focus({preventScroll:true})});
/* langue : segment FR|EN, la langue courante est un <span aria-current> */
function seg(l){$$('[data-axn-lang]',h).forEach(function(g){g.innerHTML=l==='fr'
 ?'<span lang="fr" aria-current="true">FR</span><a href="?lang=en" lang="en" hreflang="en" data-setlang="en" aria-label="EN — English">EN</a>'
 :'<a href="?lang=fr" lang="fr" hreflang="fr" data-setlang="fr" aria-label="FR — Français">FR</a><span lang="en" aria-current="true">EN</span>'})}
AXN.setLang=function(l){seg(l);cta();burger.setAttribute('aria-label',h.getAttribute(open?'data-l-close':'data-l-open'))};seg(R.lang==='en'?'en':'fr');
h.addEventListener('click',function(e){var a=e.target.closest('[data-setlang]');if(!a)return;var n=a.dataset.setlang;try{localStorage.setItem('audigy-locale',n)}catch(x){}
 if(AXN.onLang){e.preventDefault();var inSheet=sheet.contains(a);AXN.onLang(n);var t=(inSheet?sheet:h.querySelector('.axn-tools')).querySelector('[data-axn-lang] [aria-current]');if(t){var o=t.parentNode.querySelector('a');if(o)o.focus()}}});
/* thème : aria-pressed = sombre */
function th(){$$('[data-axn-theme]',h).forEach(function(b){b.setAttribute('aria-pressed',R.dataset.theme==='dark'?'true':'false')})}
$$('[data-axn-theme]',h).forEach(function(b){b.addEventListener('click',function(){R.dataset.theme=R.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('audigy-theme',R.dataset.theme)}catch(x){}th()})});th();
cta();
})();
