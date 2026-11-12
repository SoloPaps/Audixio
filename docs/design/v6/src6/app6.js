/* Audixio v6 : une fonction init par composant (future action Svelte), chacune renvoie destroy(). Aucun texte ici : tout vient du HTML ou de i18n-fr.json. */
(function(){
var d=document,R=d.documentElement,W=window,T=JSON.parse(d.getElementById('i18n-fr').textContent);
var RM=W.matchMedia('(prefers-reduced-motion: reduce)');
function rm(){return RM.matches}
function $(s,c){return (c||d).querySelector(s)}function $$(s,c){return Array.prototype.slice.call((c||d).querySelectorAll(s))}
function cl(v,a,b){return Math.max(a,Math.min(b,v))}
function fmt(s,o){return s.replace(/\{(\w+)\}/g,function(_,k){return o[k]})}
function pad(n){return (n<10?'0':'')+n}
function on(el,ev,f,o){el.addEventListener(ev,f,o);return function(){el.removeEventListener(ev,f,o)}}
function seen(el,f,opt){var io=new IntersectionObserver(function(es){es.forEach(function(e){f(e.isIntersecting,e)})},opt||{});io.observe(el);return function(){io.disconnect()}}
function onScroll(f){var t=false;function h(){if(t)return;t=true;requestAnimationFrame(function(){t=false;f()})}var a=on(W,'scroll',h,{passive:true}),b=on(W,'resize',h);f();return function(){a();b()}}

function initTheme(el){var b=$('[data-theme-toggle]',el);function lab(){b.setAttribute('aria-label',R.dataset.theme==='dark'?T.theme.toLight:T.theme.toDark)}lab();
 var off=on(b,'click',function(){var f=function(){R.dataset.theme=R.dataset.theme==='dark'?'light':'dark';lab()};if(d.startViewTransition&&!rm())d.startViewTransition(f);else f()});
 var p=onScroll(function(){var mx=R.scrollHeight-W.innerHeight;R.style.setProperty('--sp',(mx>0?W.scrollY/mx:0).toFixed(4))});
 return function(){off();p()}}

function initReveal(){var els=$$('[data-rv]');if(rm()){els.forEach(function(e){e.classList.add('in')});return function(){}}
 var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.2});
 els.forEach(function(e){io.observe(e)});return function(){io.disconnect()}}

function initHeroScan(el){var vp=$('[data-scan]',el),js=$$('.journal li',el),tot=$('[data-tot]',el),sst=$('[data-scanst]',el),rv=$('[data-ringv]',el),rn=$('[data-ringn2]',el),rl=$('[data-ringl]',el),last=-1;
 function setX(x){vp.style.setProperty('--x',(x*100).toFixed(2)+'%');vp.style.setProperty('--xp',x.toFixed(4));
  js.forEach(function(li){li.classList.toggle('on',x>=+li.dataset.at)});var sv=Math.round(67*cl(x/.7,0,1));
  if(sv!==last){last=sv;rv.style.setProperty('--o',(100-sv).toFixed(1));rn.textContent=sv}
  var done=x>=.7;tot.classList.toggle('on',done);rl.textContent=done?'C':'·';sst.textContent=done?T.scan.done:T.scan.running}
 if(rm()){setX(.62);tot.classList.add('on');rv.style.setProperty('--o',33);rn.textContent=67;rl.textContent='C';sst.textContent=T.scan.done;return function(){}}
 var raf=0,t0=performance.now(),acc=0,prev=0;
 function loop(t){acc+=t-prev;prev=t;var c=(acc%7000)/7000,x=c<.72?c/.72:1;x=x<1?(1-Math.cos(x*Math.PI))/2*.98:.98;if(c>.93)x=.98*(1-(c-.93)/.07);setX(x);raf=requestAnimationFrame(loop)}
 var stop=seen(vp,function(v){cancelAnimationFrame(raf);raf=0;if(v){prev=performance.now();raf=requestAnimationFrame(loop)}});
 return function(){stop();cancelAnimationFrame(raf)}}

function initHow(el){var ty=$('[data-type]',el),rg=$('[data-ring]',el),rn=$('[data-ringn]',el),iv=0,tm=0,offs=[];
 var C=2*Math.PI*40,sg=C/8,gp=5,h='';for(var i=0;i<8;i++)h+='<circle class="seg'+(i>4?' lock':'')+'" cx="50" cy="50" r="40" stroke-dasharray="'+(sg-gp).toFixed(2)+' '+(C-sg+gp).toFixed(2)+'" stroke-dashoffset="'+(-i*sg).toFixed(2)+'"/>';rg.innerHTML=h;
 var how=$('[data-how]',el);
 function once(target,f){var done=false,s=seen(target,function(v){if(v&&!done){done=true;how.classList.add('in');f()}},{threshold:.25});offs.push(s)}
 once(ty.closest('.step'),function(){var s=ty.dataset.type,i=0;if(rm()){ty.textContent=s;return}iv=setInterval(function(){ty.textContent=s.slice(0,++i);if(i>=s.length)clearInterval(iv)},80)});
 once(rg.closest('.step'),function(){var cs=$$('.seg',rg),k=0;if(rm()){cs.forEach(function(c){c.classList.add('on')});rn.textContent=8;return}(function nx(){if(k>=8)return;cs[k].classList.add('on');rn.textContent=++k;tm=setTimeout(nx,260)})()});
 return function(){offs.forEach(function(f){f()});clearInterval(iv);clearTimeout(tm)}}

function initDomains(el){var TB=$$('[role=tab]',el),PN=$$('[role=tabpanel]',el),CL=$$('[data-call]',el),ZS=$$('.z',el),film=$('[data-film]',el),hn=$('[data-hudn]',el),ht=$('[data-hudt]',el);
 var ci=0,auto=!rm(),timer=0,vis=false,DUR=parseFloat(getComputedStyle(el).getPropertyValue('--dur'))||5500,n=TB.length;
 function zones(i){var t=TB[i],z=t.dataset.z.split(' '),lk=t.hasAttribute('data-lock');ZS.forEach(function(e){var o=z.indexOf(e.dataset.z)>=0;e.classList.toggle('on',o);e.classList.toggle('bad',o&&!lk&&e.dataset.z===z[0]);e.classList.toggle('lockz',o&&lk)})}
 function restart(t){var g=$('.pg',t),c=g.cloneNode();g.replaceWith(c)}
 function sel(i,focus){if(i===ci)return;ci=i;
  TB.forEach(function(t,j){var o=j===i;t.setAttribute('aria-selected',o);t.tabIndex=o?0:-1});restart(TB[i]);if(focus)TB[i].focus();
  PN.forEach(function(p,j){var o=j===i;p.classList.toggle('on',o);if(o)p.removeAttribute('inert');else p.setAttribute('inert','')});
  CL.forEach(function(c,j){c.classList.toggle('out',j!==i)});zones(i);
  if(!rm()){film.classList.add('dim');film.classList.remove('sweep');void film.offsetWidth;film.classList.add('sweep')}
  hn.textContent=fmt(T.domains.hud,{n:pad(i+1),t:pad(n)});ht.textContent=$('.nm',TB[i]).textContent;if(auto)arm()}
 function arm(){clearTimeout(timer);el.style.setProperty('--dur',DUR+'ms');timer=setTimeout(function(){if(auto&&vis)sel((ci+1)%n)},DUR)}
 function stop(){auto=false;clearTimeout(timer);el.classList.remove('auto')}
 zones(0);
 var offs=[seen(el,function(v){vis=v;if(v&&auto){el.classList.add('auto');restart(TB[ci]);arm()}else{clearTimeout(timer);el.classList.remove('auto')}},{threshold:.35})];
 TB.forEach(function(t,i){offs.push(on(t,'click',function(){stop();sel(i)}));
  offs.push(on(t,'keydown',function(e){var k=e.key,m=null;if(k==='ArrowDown'||k==='ArrowRight')m=(i+1)%n;else if(k==='ArrowUp'||k==='ArrowLeft')m=(i+n-1)%n;else if(k==='Home')m=0;else if(k==='End')m=n-1;if(m!==null){e.preventDefault();stop();sel(m,true)}}))});
 return function(){stop();offs.forEach(function(f){f()})}}

function initExplode(el){var stk=$('[data-stack]',el),lys=$$('.ly',stk),lis=$$('[data-lyr] li',el),res=$('[data-exres]',el),hint=$('.hint',el),cn=$('[data-capn]',el),ct=$('[data-capt]',el),cdd=$('[data-capd]',el),cur=-1;
 function act(i,dim){lis.forEach(function(li,j){li.classList.toggle('on',j===i)});lys.forEach(function(l,j){l.classList.toggle('dim',dim&&j!==i)});if(i!==cur){cur=i;cn.textContent=pad(i+1);ct.textContent=lis[i].dataset.capT;cdd.textContent=lis[i].dataset.capD}}
 if(rm()){act(0,false);res.classList.add('on');return function(){}}
 return onScroll(function(){var r=el.getBoundingClientRect(),h=el.offsetHeight-(W.innerHeight-64),q=cl(-r.top/(h>0?h:1),0,1),sep=cl(q/.38,0,1),e=sep<1?(1-Math.cos(sep*Math.PI))/2:1;
  stk.style.setProperty('--p',e.toFixed(4));hint.style.opacity=q>.04?0:1;act(q<.4?0:Math.min(3,Math.floor((q-.4)/.13)),q>=.4&&q<.92);res.classList.toggle('on',q>=.92)})}

function initGame(el){var gv=$('[data-game]',el),fl=$$('[data-found] li',el),gc=$('[data-gc]',el),sp=$$('.spot',gv),xr=$('[data-xr]',el),offs=[];
 function gup(){var n=sp.filter(function(s){return s.getAttribute('aria-pressed')==='true'}).length;gc.textContent=n===sp.length?T.game.all:fmt(T.game.count,{n:n})}
 sp.forEach(function(s){offs.push(on(s,'click',function(){var o=s.getAttribute('aria-pressed')!=='true';s.setAttribute('aria-pressed',o);fl[+s.dataset.s].classList.toggle('on',o);gup()}))});
 offs.push(on(xr,'click',function(){var o=xr.getAttribute('aria-pressed')!=='true';xr.setAttribute('aria-pressed',o);gv.classList.toggle('xr',o)}));
 offs.push(on($('[data-all]',el),'click',function(){sp.forEach(function(s){s.setAttribute('aria-pressed','true')});fl.forEach(function(l){l.classList.add('on')});xr.setAttribute('aria-pressed','true');gv.classList.add('xr');gup()}));
 return function(){offs.forEach(function(f){f()})}}

function initReport(el){var body=$('.rp-body',el),ks=$$('[data-hl]',el),offs=[];
 function hl(k){body.setAttribute('data-hl-on',k.dataset.hl);ks.forEach(function(b){b.setAttribute('aria-pressed',b===k)})}
 ks.forEach(function(k){offs.push(on(k,'click',function(){hl(k)}));offs.push(on(k,'mouseenter',function(){hl(k)}));offs.push(on(k,'focus',function(){hl(k)}))});
 return function(){offs.forEach(function(f){f()})}}

function initDock(el){var btn=$('[data-dock-toggle]',el),dn=$('[data-dock-n]',el),dt=$('[data-dock-t]',el),links=$$('.dock-l a',el),secs=links.map(function(a){return d.getElementById(a.getAttribute('href').slice(1))}),
 hero=d.getElementById('top'),fin=d.getElementById('fin'),foot=$('footer'),hide={h:true,f:false,o:false},act=-1,offs=[];
 function vis(){var o=!hide.h&&!hide.f&&!hide.o;el.classList.toggle('on',o);if(!o)close()}
 function setAct(i){if(i===act)return;act=i;links.forEach(function(a,j){if(j===i)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')});
  if(i>=0){dn.textContent=fmt(T.dock.pos,{n:pad(i+1),t:pad(links.length)});dt.textContent=$('.t',links[i]).textContent}}
 function open(){el.classList.add('open');btn.setAttribute('aria-expanded','true');btn.setAttribute('aria-label',dt.textContent+', '+T.dock.close)}
 function close(){if(!el.classList.contains('open'))return;el.classList.remove('open');btn.setAttribute('aria-expanded','false');btn.removeAttribute('aria-label')}
 offs.push(seen(hero,function(v){hide.h=v;vis()}));offs.push(seen(fin,function(v){hide.f=v;vis()}));offs.push(seen(foot,function(v){hide.o=v;vis()}));
 offs.push(onScroll(function(){var y=W.innerHeight*.45,i=-1;secs.forEach(function(s,j){if(s.getBoundingClientRect().top<=y)i=j});setAct(i)}));
 offs.push(on(btn,'click',function(){if(el.classList.contains('open'))close();else open()}));
 links.forEach(function(a){offs.push(on(a,'click',close))});
 offs.push(on(d,'keydown',function(e){if(e.key==='Escape'&&el.classList.contains('open')){close();btn.focus()}}));
 offs.push(on(d,'click',function(e){if(!el.contains(e.target))close()}));
 return function(){offs.forEach(function(f){f()})}}

function initSnap(el){var l=$('[data-snap]',el);if(!l)return function(){};function chk(){if(l.scrollWidth>l.clientWidth+1)l.tabIndex=0;else l.removeAttribute('tabindex')}var ro=new ResizeObserver(chk);ro.observe(l);return function(){ro.disconnect()}}
function initForm(el){return on(el,'submit',function(e){e.preventDefault();var i=$('input',el),er=$('.err',el),v=i.value.trim();er.hidden=!!v;i.setAttribute('aria-invalid',!v);if(!v)i.focus()})}

function initFinal(el){var f=$('[data-final]',el);if(rm())return function(){};
 var s=0,stopS=function(){};var io=seen(f,function(v){stopS();if(v)stopS=onScroll(function(){var r=f.getBoundingClientRect();f.style.setProperty('--fx',cl(1-(r.top+r.height/2)/W.innerHeight,0,1).toFixed(3))})});
 return function(){io();stopS()}}

function initFaq(el){var ds=$$('details',el);return on(el,'keydown',function(e){if(e.key!=='Escape')return;var o=ds.filter(function(x){return x.open&&x.contains(d.activeElement)})[0];if(o){o.open=false;$('summary',o).focus()}})}

var C={SiteHeader:initTheme,HeroScan:initHeroScan,HowItWorks:initHow,DomainsXray:initDomains,ExplodedView:initExplode,SpotGame:initGame,ReportPreview:initReport,AfterNote:initSnap,Plans:initSnap,SectionDock:initDock,ScanForm:initForm,FinalCta:initFinal,Faq:initFaq};
var jobs=[function(){initReveal()}];
$$('[data-component]').forEach(function(el){var f=C[el.dataset.component];if(f)jobs.push(function(){f(el)})});
requestAnimationFrame(function(){(function next(){var j=jobs.shift();if(!j)return;j();setTimeout(next,0)})()});
})();
