#!/usr/bin/env python3
"""Collecte tous les créneaux libres des tennis municipaux de Paris (intra-muros).

Source : tennis.paris.fr, la recherche de créneaux publique (aucun compte requis).
Sortie : un fichier JSON (par défaut site/data.json) lu par site/index.html.

Python 3.9+ et bibliothèque standard uniquement : rien à installer.

    python scraper/scrape.py                 # écrit site/data.json
    python scraper/scrape.py --out data.json

Code de sortie 1 si la collecte n'a rien donné (la page publiée garde alors
les données précédentes plutôt que d'afficher une liste vide).
"""
from __future__ import annotations

import argparse
import gzip
import html as htmllib
import io
import json
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from http.cookiejar import CookieJar
from zoneinfo import ZoneInfo

BASE = "https://tennis.paris.fr/tennis/jsp/site/Portal.jsp"
SEARCH_PAGE = BASE + "?page=recherche&view=recherche_creneau"
SEARCH_ACTION = BASE + "?page=recherche&action=rechercher_creneau"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/129.0 Safari/537.36")
PARIS = ZoneInfo("Europe/Paris")

# Codes des surfaces et couvert (V) / découvert (F) attendus par le formulaire.
COATINGS = ["96", "2095", "94", "1324", "2016", "92"]
IN_OUT = ["V", "F"]

DAYS = 8          # aujourd'hui + 7 : on prend large, le dernier jour s'ouvre à 8h
CLUBS_PER_REQUEST = 8
DELAY_S = 0.8     # pause entre deux requêtes, pour rester discret

# Barème de la Ville (prix d'un court pour 1 h), utilisé si le prix affiché manque.
PRICE_GRID = {("P", True): 20, ("P", False): 12, ("R", True): 12, ("R", False): 7}


# --------------------------------------------------------------------------- HTTP

_jar = CookieJar()
_opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(_jar))
_opener.addheaders = [
    ("User-Agent", UA),
    ("Accept-Encoding", "gzip"),
    ("Accept-Language", "fr-FR,fr;q=0.9"),
]


def fetch(url: str, form: dict | None = None, retries: int = 3) -> str:
    body = urllib.parse.urlencode(form, doseq=True).encode() if form else None
    for attempt in range(retries):
        try:
            with _opener.open(url, body, timeout=60) as r:
                raw = r.read()
                if r.headers.get("Content-Encoding") == "gzip" or raw[:2] == b"\x1f\x8b":
                    raw = gzip.GzipFile(fileobj=io.BytesIO(raw)).read()
                return raw.decode("utf-8", "replace")
        except Exception:
            if attempt == retries - 1:
                raise
            time.sleep(4 * (attempt + 1))
    raise RuntimeError("unreachable")


# ------------------------------------------------------------------------ parsing

def norm_key(s: str) -> str:
    """Clé de rapprochement entre le nom d'un club et l'id de son panneau HTML."""
    s = htmllib.unescape(s or "")
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", s.lower())


def clean(s: str | None) -> str:
    s = htmllib.unescape(s or "").replace("\xa0", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s.rstrip(" -,").strip()


def _general_field(block: str, key: str):
    m = re.search(r'"%s"\s*:\s*"((?:[^"\\]|\\.)*)"' % re.escape(key), block)
    if m:
        try:
            return json.loads('"' + m.group(1) + '"')
        except ValueError:
            return m.group(1)
    m = re.search(r'"%s"\s*:\s*(-?[0-9.]+|true|false|null)' % re.escape(key), block)
    return m.group(1) if m else None


def parse_sites(page: str) -> tuple[list[dict], str | None]:
    """Clubs et jeton anti-rejeu, lus dans la page de recherche."""
    m = (re.search(r'id="token"[^>]*value="([^"]+)"', page)
         or re.search(r'value="([^"]+)"[^>]*id="token"', page)
         or re.search(r'name="token"[^>]*value="([^"]+)"', page))
    token = m.group(1) if m else None

    sites, seen = [], set()
    for block in re.findall(r'"general"\s*:\s*\{(.*?)\}\s*,\s*"transports"', page, re.S):
        name = clean(_general_field(block, "_nomSrtm"))
        if not name or name in seen:
            continue
        seen.add(name)

        def num(key, cast=float):
            v = _general_field(block, key)
            try:
                return cast(v)
            except (TypeError, ValueError):
                return None

        sites.append({
            "name": name,
            "arr": num("_arrondissement", int),
            "address": clean(_general_field(block, "_adresse")),
            "cp": clean(_general_field(block, "_codePostal")),
            "lat": num("_gpsLat"),
            "lon": num("_gpsLon"),
            "bookable": _general_field(block, "_ouvRes") == "V",
        })
    return sites, token


def is_intra_muros_tennis(site: dict) -> bool:
    return (site["cp"] or "").startswith("75") and "padel" not in site["name"].lower()


_ROW_SPLIT = re.compile(r'<div[^>]*class="[^"]*\btennis-court\b[^"]*"', re.S)


def parse_results(page: str, key_to_name: dict[str, str]) -> tuple[list[dict], set[str]]:
    """Créneaux libres d'une page de résultats.

    La page contient un panneau par club et par heure (id="head<Club><HH>h"),
    puis une ligne "tennis-court" par court libre : nom du court, surface,
    éclairage, prix, type de tarif et couvert/découvert.
    """
    out, unknown = [], set()
    for chunk in page.split('id="head')[1:]:
        m = re.match(r'([^"]*?)(\d{1,2})h"', chunk)
        if not m:
            continue
        key, hour = m.group(1), int(m.group(2))
        site = key_to_name.get(norm_key(key))
        if site is None:
            unknown.add(key)
            continue
        for row in _ROW_SPLIT.split(chunk)[1:]:
            cm = re.search(r'class="court"[^>]*>(.*?)</', row, re.S)
            if not cm:
                continue
            parts = [clean(p) for p in re.sub(r"<[^>]+>", " ", cm.group(1)).split(" - ")]
            parts = [p for p in parts if p]
            if not parts:
                continue
            court = parts[0]
            lit = any("clair" in p.lower() for p in parts[1:])
            surface = next((p for p in parts[1:] if "clair" not in p.lower()), "")

            pm = re.search(r'class="price"[^>]*>(.*?)</', row, re.S)
            price_txt = clean(re.sub(r"<[^>]+>", " ", pm.group(1))) if pm else ""
            dm = re.search(r'class="price-description"[^>]*>((?:[^<]|<br\s*/?>)*)', row, re.S)
            desc = [clean(x) for x in re.split(r"<br\s*/?>", dm.group(1))] if dm else []
            tarif_txt = desc[0] if desc else ""
            cover_txt = desc[1] if len(desc) > 1 else ""

            hm = re.search(r'datedeb="\d{4}/\d{2}/\d{2} (\d{1,2}):', row)
            idm = re.search(r'courtid="(\d+)"', row)

            covered = cover_txt.lower().startswith("couvert")
            tarif = "R" if "réduit" in tarif_txt.lower() or "reduit" in tarif_txt.lower() else "P"
            pr = re.search(r"(\d+(?:[.,]\d+)?)", price_txt)
            price = float(pr.group(1).replace(",", ".")) if pr else PRICE_GRID[(tarif, covered)]
            if price == int(price):
                price = int(price)

            out.append({
                "site": site,
                "hour": int(hm.group(1)) if hm else hour,
                "court": court,
                "court_id": idm.group(1) if idm else "",
                "surface": surface,
                "covered": covered,
                "lit": lit,
                "price": price,
                "tarif": tarif,
            })
    return out, unknown


# --------------------------------------------------------------------------- main

def collect(days: int = DAYS, delay: float = DELAY_S, log=print) -> dict:
    started = time.time()
    page = fetch(SEARCH_PAGE)
    all_sites, token = parse_sites(page)
    sites = sorted((s for s in all_sites if s["bookable"] and is_intra_muros_tennis(s)),
                   key=lambda s: (s["arr"] or 99, s["name"]))
    log(f"{len(all_sites)} clubs sur la carte, {len(sites)} réservables intra-muros, "
        f"jeton {'trouvé' if token else 'absent'}")
    if not sites:
        raise RuntimeError("aucun club trouvé dans la page de recherche (structure changée ?)")

    key_to_name = {norm_key(s["name"]): s["name"] for s in sites}
    index = {s["name"]: i for i, s in enumerate(sites)}
    names = [s["name"] for s in sites]
    groups = [names[i:i + CLUBS_PER_REQUEST] for i in range(0, len(names), CLUBS_PER_REQUEST)]

    today = datetime.now(PARIS).date()
    dates = [today + timedelta(days=d) for d in range(days)]
    slots: dict[str, list] = {d.isoformat(): [] for d in dates}
    errors: list[str] = []
    unknown_keys: set[str] = set()
    requests_ok = 0

    for d in dates:
        seen = set()
        for gi, group in enumerate(groups):
            form = {
                "token": token or "",
                "when": d.strftime("%d/%m/%Y"),
                "hourRange": "8-22",
                "selWhereTennisName": group,
                "selInOut": IN_OUT,
                "selCoating": COATINGS,
            }
            try:
                res, unknown = parse_results(fetch(SEARCH_ACTION, form), key_to_name)
                requests_ok += 1
                unknown_keys |= unknown
                for r in res:
                    k = (r["site"], r["hour"], r["court_id"] or r["court"])
                    if k in seen:
                        continue
                    seen.add(k)
                    slots[d.isoformat()].append([
                        index[r["site"]], r["hour"], r["court"], r["court_id"], r["surface"],
                        int(r["covered"]), int(r["lit"]), r["price"], r["tarif"],
                    ])
            except Exception as e:  # une requête ratée ne doit pas tout faire tomber
                errors.append(f"{d.isoformat()} groupe {gi + 1}: {type(e).__name__}: {e}")
                log(f"ERREUR {errors[-1]}")
            time.sleep(delay)
        slots[d.isoformat()].sort(key=lambda x: (x[1], x[0], x[2]))
        log(f"{d.isoformat()} : {len(slots[d.isoformat()])} créneaux")

    if unknown_keys:
        log(f"panneaux sans club correspondant : {sorted(unknown_keys)[:10]}")

    total = sum(len(v) for v in slots.values())
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "tennis.paris.fr",
        "days": [d.isoformat() for d in dates],
        "sites": [{k: s[k] for k in ("name", "arr", "address", "cp", "lat", "lon")} for s in sites],
        "slot_fields": ["site", "hour", "court", "court_id", "surface",
                        "covered", "lit", "price", "tarif"],
        "slots": slots,
        "total": total,
        "requests_ok": requests_ok,
        "errors": errors,
        "duration_s": round(time.time() - started),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--out", default="site/data.json")
    ap.add_argument("--days", type=int, default=DAYS)
    args = ap.parse_args()

    log = lambda msg: print(msg, file=sys.stderr, flush=True)  # noqa: E731
    try:
        data = collect(days=args.days, log=log)
    except Exception as e:
        log(f"Échec de la collecte : {type(e).__name__}: {e}")
        return 1

    if data["total"] == 0:
        log("Aucun créneau trouvé : on ne remplace pas les données existantes.")
        return 1

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    log(f"OK : {data['total']} créneaux, {len(data['sites'])} clubs, "
        f"{len(data['errors'])} erreurs, {data['duration_s']} s → {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
