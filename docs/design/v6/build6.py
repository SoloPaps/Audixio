"""Build v6 : INC, polices base64, logo en <symbol>, faux site et 8 domaines générés depuis content-fr.json, CSS minifié."""
import re,base64,os,json,html
import os;B=os.path.dirname(os.path.abspath(__file__));S=f'{B}/src6'
C=json.load(open(f'{S}/content-fr.json'))
raw=open(f'{B}/logo.svg').read()
paths=re.findall(r'<path[^>]*?d="([^"]+)"',raw)
def rnd(d): return re.sub(r'-?\d+\.\d+',lambda m:str(round(float(m.group()))),d)
LOGOSYM='<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><symbol id="logo" viewBox="0 0 2894 918">'+''.join(f'<path fill="currentColor" fill-rule="evenodd" d="{rnd(d)}"/>' for d in paths)+'</symbol></svg>'
LOGO='<svg class="logo-svg" viewBox="0 0 2894 918" aria-hidden="true" focusable="false"><use href="#logo"/></svg>'
def font(m): return 'data:font/woff2;base64,'+base64.b64encode(open(f'{B}/fonts/{m.group(1)}.woff2','rb').read()).decode()
FS=C['fakeSite']
def st(b): return f'style="--l:{b[0]}%;--t:{b[1]}%;--w:{b[2]}%;--h:{b[3]}%"'
def fs(m):
    t=m.group(1);o=''
    for k,b in FS['pos'].items():
        if t=='r': o+=f'<div class="e-{k}" {st(b)}>{FS["render"][k]}</div>'
        else:
            c,a,d=FS['layers'][t][k]
            o+=f'<div class="e-{k}{" "+c if c else ""}" {st(b)}><span class="k">{a}</span>{"<span>"+d+"</span>" if d else ""}</div>'
    return o
LK='<svg class="lk" aria-hidden="true"><use href="#ic-lock"/></svg>'
def dom():
    Z=C['zones'];D=C['domains'];U=C['domainUi'];n=len(D)
    tabs=''.join(f'<button class="tab" type="button" role="tab" id="t-{d["k"]}" aria-controls="p-{d["k"]}" aria-selected="{"true" if i==0 else "false"}" tabindex="{0 if i==0 else -1}" data-z="{" ".join(d["z"])}"{" data-lock" if d.get("lock") else ""}><span class="ic"><svg aria-hidden="true"><use href="#ic-{d["k"]}"/></svg></span><span class="nm">{d["n"]}{LK if d.get("lock") else ""}</span><span class="ph">{d["q"]}</span><span class="pg"></span></button>' for i,d in enumerate(D))
    zones=''.join(f'<div class="z {k}" data-z="{k}" {st(b)}>{b[4]}</div>' for k,b in Z.items())
    calls=''
    for i,d in enumerate(D):
        b=Z[d['z'][0]];below=b[1]+b[3]<74;left=b[0]+b[2]/2<55
        pos=(f'left:{3.5+b[0]*.93+1:.2f}%;' if left else f'right:{3.5+(100-b[0]-b[2])*.93+1:.2f}%;')+(f'top:{3.5+(b[1]+b[3])*.93+1.5:.2f}%' if below else f'bottom:{3.5+(100-b[1])*.93+1.5:.2f}%')
        inner=(LK+f'<span><b>{U["locked"]}</b><br><span class="blur">{d["ex"]}</span></span>') if d.get('lock') else f'<span><b>{U["example"]}</b><br>{d["ex"]}</span>'
        calls+=f'<div class="film-call{" lockc" if d.get("lock") else ""}{"" if i==0 else " out"}" style="{pos}" data-call="{i}">{inner}</div>'
    pans=''
    for i,d in enumerate(D):
        lk=d.get('lock')
        pans+=(f'<div class="ctl-panel{" on" if i==0 else ""}" role="tabpanel" id="p-{d["k"]}" aria-labelledby="t-{d["k"]}" tabindex="0"{"" if i==0 else " inert"}>'
          f'<div class="cp-h"><span class="cp-ic"><svg aria-hidden="true"><use href="#ic-{d["k"]}"/></svg></span><h3>{d["n"]}</h3>'
          +(f'<span class="cp-st lock">{LK}{U["after"]}</span>' if lk else f'<span class="cp-st">{U["free"]}</span>')+f'<p class="q">{d["q"]}</p></div>'
          f'<div class="cp-b"><div><h4>{U["look"]}</h4><ul>'+''.join(f'<li>{c}</li>' for c in d['c'])+f'</ul></div><div><h4>{U["why"]}</h4><p class="why">{d["w"]}</p></div></div>'
          +(f'<p class="cp-note">{U["lockNote"]}</p>' if lk else f'<p class="cp-note">{U["exNote"]}{d["ex"]}.</p>')+'</div>')
    t=open(f'{S}/b-dom.html').read()
    return t.replace('{{TABS}}',tabs).replace('{{ZONES}}',zones).replace('{{CALLS}}',calls).replace('{{PANELS}}',pans).replace('{{N}}',f'{n:02d}').replace('{{N1}}',D[0]['n'])
def css_min(s):
    s=re.sub(r'/\*.*?\*/','',s,flags=re.S); s=re.sub(r'\s*\n\s*','',s); s=re.sub(r'\s*([{};,>])\s*',r'\1',s); return s.replace(';}','}')
def inc(m):
    n=m.group(1)
    if n=='b-dom.html': return dom()
    s=open(f'{S}/{n}').read()
    if n.endswith('.css'): return css_min(s)
    if n.endswith('.json'): return json.dumps(json.loads(s),ensure_ascii=False,separators=(',',':'))
    return s
s=open(f'{S}/shell.html').read()
for _ in range(3): s=re.sub(r'\{\{INC:([\w./-]+)\}\}',inc,s)
s=re.sub(r'\{\{FONT:([\w-]+)\}\}',font,s).replace('{{LOGOSYM}}',LOGOSYM).replace('{{LOGO}}',LOGO)
s=re.sub(r'\{\{FS:(\w)\}\}',fs,s)
left=re.findall(r'\{\{[A-Z]+[^}]*\}\}',s)
if left: print('RESTE',left[:5])
out=f'{B}/audixio-v6.html'; open(out,'w').write(s); print('audixio-v6',os.path.getsize(out))
