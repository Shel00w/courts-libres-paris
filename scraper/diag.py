#!/usr/bin/env python3
"""Diagnostic : rejoue la collecte et enregistre ce que renvoie tennis.paris.fr."""
import os, sys, json, traceback, urllib.request, urllib.error
sys.path.insert(0, os.path.dirname(__file__))
import scrape  # noqa: E402

os.makedirs("diag", exist_ok=True)
log = []
def note(m):
    print(m, flush=True); log.append(str(m))

# 1) requête brute sur la page de recherche, avec statut et en-têtes
try:
    req = urllib.request.Request(scrape.SEARCH_PAGE, headers={"User-Agent": scrape.UA, "Accept-Language": "fr-FR"})
    with urllib.request.urlopen(req, timeout=60) as r:
        body = r.read()
        note(f"GET search: status={r.status} final_url={r.geturl()} len={len(body)}")
        note("headers: " + json.dumps(dict(r.headers), ensure_ascii=False))
        open("diag/search_raw.html", "wb").write(body)
except urllib.error.HTTPError as e:
    b = e.read()
    note(f"GET search HTTPError {e.code} {e.reason} len={len(b)}")
    note("headers: " + json.dumps(dict(e.headers), ensure_ascii=False))
    open("diag/search_error.html", "wb").write(b)
except Exception as e:
    note(f"GET search EXC {type(e).__name__}: {e}")

# 2) même chose via le collecteur
try:
    page = scrape.fetch(scrape.SEARCH_PAGE)
    open("diag/search_page.html", "w", encoding="utf-8").write(page)
    feats = scrape.extract_features(page)
    note(f"fetch ok len={len(page)} token={scrape.parse_token(page)} features={len(feats)} var_tennis={'var tennis' in page}")
    note("title: " + (page.split('<title>')[1].split('</title>')[0] if '<title>' in page else '-'))
except Exception as e:
    note(f"fetch EXC {type(e).__name__}: {e}")

# 3) collecte complète sur 2 jours
try:
    data = scrape.collect(days=2, log=note)
    note(f"collect total={data['total']} sites={len(data['sites'])} errors={data['errors'][:5]}")
except Exception:
    note("collect EXC\n" + traceback.format_exc())

open("diag/log.txt", "w", encoding="utf-8").write("\n".join(log))
