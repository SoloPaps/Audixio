"""En-tête global Audixio (reprise fidèle de apps/web/src/components/CanonBar.svelte sur main),
habillé avec les jetons et la typo v6. Utilisé par build6.py (accueil) et la maquette /methode.
Entrées et ordre : Accueil, Méthode, Sites suivis, Tarifs. Outils : FR|EN, thème, Connexion/Compte.
Mobile (<=900px) : burger + panneau (dialog) + voile ; bouton « Remonter en haut »."""
import html as H
# Textes : slim.ts (FR) et dictionnaire-en.json (EN) de main ; (*) = clé absente du pack EN lu, proposée.
L = {
 'nav.home': ('Accueil', 'Home'),            # (*) EN
 'nav.method': ('Méthode', 'Method'),
 'nav.sites.long': ('Sites suivis', 'Tracked sites'),
 'nav.pricing': ('Tarifs', 'Pricing'),       # (*) EN
 'nav.login': ('Connexion', 'Sign in'),
 'nav.account': ('Compte', 'Account'),
 'nav.open': ('Ouvrir le menu', 'Open menu'),  # (*) EN
 'nav.close': ('Fermer le menu', 'Close menu'),
 'nav.menu': ('Menu', 'Menu'),
 'nav.bottom': ('Navigation principale', 'Main navigation'),            # (*) EN
 'nav.mobile': ('Navigation principale (mobile)', 'Main navigation (mobile)'),  # (*) EN
 'nav.backtop': ('Remonter en haut', 'Back to top'),  # (*) EN
 'locale.label': ('Langue', 'Language'),
 'locale.en.short': ('EN — English', 'EN — English'),
 'locale.fr.short': ('FR — Français', 'FR — Français'),
 'theme.label': ('Thème', 'Theme'),
 'footer.home': ('Audixio — accueil', 'Audixio — home'),  # (*) EN
}
ITEMS = [('/', 'nav.home'), ('/methode', 'nav.method'), ('/sites', 'nav.sites.long'), ('/pro', 'nav.pricing')]
SUN = '<svg class="axn-sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
MOON = '<svg class="axn-moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
PERSON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>'
UP = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 19V5M5 12l7-7 7 7"/></svg>'
LOGO_D = '<svg class="axn-logo-d" viewBox="0 0 2894 918" aria-hidden="true" focusable="false"><use href="#logo"/></svg>'
LOGO_M = '<svg class="axn-logo-m" viewBox="0 0 918 918" aria-hidden="true" focusable="false"><use href="#logo"/></svg>'

def build(here, lang='fr', di=False):
    """here : chemin courant (/, /methode…). di=True : ajoute data-i / data-ia pour la bascule de langue en page."""
    i = 0 if lang == 'fr' else 1
    def tx(k): return H.escape(L[k][i], quote=False)
    def at(k): return H.escape(L[k][i], quote=True)
    def dI(k): return f' data-i="{k}"' if di else ''
    def dA(*pairs): return (' data-ia="' + ';'.join(f'{a}:{k}' for a, k in pairs) + '"') if di else ''
    def cur(h): return ' aria-current="page"' if (here == h if h == '/' else (here == h or here.startswith(h + '/'))) else ''
    def links(idx=False):
        return ''.join(f'<li{f" style=\"--i:{n}\"" if idx else ""}><a href="{h}"{cur(h)}{dI(k)}>{tx(k)}</a></li>' for n, (h, k) in enumerate(ITEMS))
    lang_seg = (f'<div class="axn-lang" role="group" aria-label="{at("locale.label")}"{dA(("aria-label","locale.label"))} data-axn-lang></div>')
    theme = f'<button class="axn-theme" type="button" aria-pressed="true" aria-label="{at("theme.label")}"{dA(("aria-label","theme.label"))} data-axn-theme>{SUN}{MOON}</button>'
    cta = lambda extra='': (f'<a class="axn-cta"{extra} href="/connexion" data-axn-cta>{PERSON}<span class="axn-cta-txt" data-axn-cta-t>{tx("nav.login")}</span></a>')
    return (
     f'<header class="axn site-bar" data-chrome id="axn" data-component="SiteNav" data-l-open="{at("nav.open")}" data-l-close="{at("nav.close")}" data-l-login="{at("nav.login")}" data-l-account="{at("nav.account")}"'
     f'{dA(("data-l-open","nav.open"),("data-l-close","nav.close"),("data-l-login","nav.login"),("data-l-account","nav.account"))}>'
     f'<div class="axn-bar">'
     f'<a class="axn-logo" href="/" aria-label="{at("footer.home")}"{dA(("aria-label","footer.home"))}>{LOGO_D}{LOGO_M}</a>'
     f'<nav aria-label="{at("nav.bottom")}"{dA(("aria-label","nav.bottom"))}><ul class="axn-links">{links()}</ul></nav>'
     f'<div class="axn-tools">{lang_seg}{theme}{cta()}</div>'
     f'<button class="axn-burger" type="button" aria-expanded="false" aria-controls="axn-menu" aria-label="{at("nav.open")}" data-axn-burger><i aria-hidden="true"><b></b><b></b><b></b></i></button>'
     f'</div>'
     f'<div class="axn-scrim" aria-hidden="true" data-axn-scrim></div>'
     f'<div class="axn-sheet" id="axn-menu" role="dialog" aria-modal="false" aria-label="{at("nav.menu")}"{dA(("aria-label","nav.menu"))} inert data-axn-sheet>'
     f'<nav aria-label="{at("nav.mobile")}"{dA(("aria-label","nav.mobile"))}><ul>{links(True)}</ul></nav>'
     f'<div class="axn-row" style="--i:4">{lang_seg}{theme}</div>'
     f'<div class="axn-cta-wrap">{cta(" style=\"--i:5\"")}</div>'
     f'</div></header>')

def backtop(lang='fr', di=False):
    i = 0 if lang == 'fr' else 1
    d = ' data-ia="aria-label:nav.backtop"' if di else ''
    return f'<button class="axn-top" data-chrome type="button" aria-label="{H.escape(L["nav.backtop"][i],quote=True)}"{d} data-axn-top>{UP}</button>'
