"""Tests du parseur sur des extraits reproduisant la structure de tennis.paris.fr.

    python -m unittest discover tests
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scraper"))
import scrape  # noqa: E402

SEARCH_PAGE = """
<form><input id="token" type="hidden" value="0b6f1c2e-1111-2222-3333-444455556666"/></form>
<script>var tennis = {"type":"FeatureCollection","features":[
{"type":"Feature","properties":{"general":{"_nomSrtm":"Sablonnière","_arrondissement":15,
 "_adresse":"62 rue Cambronne","_codePostal":"75015","_gpsLat":48.845,"_gpsLon":2.302,"_ouvRes":"V"},
 "transports":[]}},
{"type":"Feature","properties":{"general":{"_nomSrtm":"Atlantique","_arrondissement":15,
 "_adresse":"25 allée du Capitaine Dronne -","_codePostal":"75015","_gpsLat":48.839,"_gpsLon":2.317,"_ouvRes":"V"},
 "transports":[]}},
{"type":"Feature","properties":{"general":{"_nomSrtm":"Puteaux","_arrondissement":16,
 "_adresse":"1 allée des sports","_codePostal":"92800","_gpsLat":48.87,"_gpsLon":2.24,"_ouvRes":"V"},
 "transports":[]}},
{"type":"Feature","properties":{"general":{"_nomSrtm":"Padel Jules Ladoumègue","_arrondissement":19,
 "_adresse":"39 route des Petits Ponts","_codePostal":"75019","_gpsLat":48.89,"_gpsLon":2.4,"_ouvRes":"V"},
 "transports":[]}},
{"type":"Feature","properties":{"general":{"_nomSrtm":"Amandiers","_arrondissement":20,
 "_adresse":"8 rue Louis Delgrès","_codePostal":"75020","_gpsLat":48.86,"_gpsLon":2.38,"_ouvRes":"F"},
 "transports":[]}}
]};</script>
"""

RESULTS = """
<div class="panel panel-default">
 <div class="panel-heading" id="headSablonnière08h">
  <h4 class="panel-title"><a>08h</a></h4>
 </div>
 <div class="panel-collapse">
  <div class="row tennis-court">
   <div class="col-xs-5"><span class="court">Court N°1 - Résine - Éclairé</span></div>
   <div class="col-xs-4"><span class="price">7&nbsp;€</span>
     <div class="price-description">Tarif réduit<br/>Découvert</div></div>
   <div class="col-xs-3"><button class="buttonAllOk" courtid="2511" datedeb="2026/10/20 8:00:00">Réserver</button></div>
  </div>
 </div>
</div>
<div class="panel panel-default">
 <div class="panel-heading" id="headSablonnière19h"><h4 class="panel-title"><a>19h</a></h4></div>
 <div class="panel-collapse">
  <div class="row tennis-court">
   <span class="court">Court N°1 - Résine - Éclairé</span>
   <span class="price">12 €</span><div class="price-description">Tarif plein<br>Découvert</div>
   <button courtid="2511" datedeb="2026/10/20 19:00:00">Réserver</button>
  </div>
  <div class="row tennis-court">
   <span class="court">Court N°2 - Béton poreux</span>
   <span class="price">20 €</span><div class="price-description">Tarif plein<br>Couvert</div>
   <button courtid="2512" datedeb="2026/10/20 19:00:00">Réserver</button>
  </div>
 </div>
</div>
<div class="panel-heading" id="headAtlantique20h"></div>
 <div class="row tennis-court"><span class="court">Court N°3</span>
  <div class="price-description">Tarif plein<br>Couvert</div></div>
<div class="panel-heading" id="headClubInconnu09h"></div>
 <div class="row tennis-court"><span class="court">Court N°9</span></div>
"""


class ParseTest(unittest.TestCase):
    def test_sites(self):
        sites, token = scrape.parse_sites(SEARCH_PAGE)
        self.assertEqual(token, "0b6f1c2e-1111-2222-3333-444455556666")
        self.assertEqual(len(sites), 5)
        kept = [s["name"] for s in sites if s["bookable"] and scrape.is_intra_muros_tennis(s)]
        self.assertEqual(kept, ["Sablonnière", "Atlantique"])
        atl = sites[1]
        self.assertEqual(atl["address"], "25 allée du Capitaine Dronne")
        self.assertEqual((atl["arr"], atl["cp"]), (15, "75015"))
        self.assertAlmostEqual(atl["lat"], 48.839)

    def test_results(self):
        keys = {scrape.norm_key(n): n for n in ["Sablonnière", "Atlantique"]}
        res, unknown = scrape.parse_results(RESULTS, keys)
        self.assertEqual(unknown, {"ClubInconnu"})
        self.assertEqual(len(res), 4)
        a, b, c, d = res
        self.assertEqual((a["site"], a["hour"], a["court"], a["court_id"]), ("Sablonnière", 8, "Court N°1", "2511"))
        self.assertEqual((a["surface"], a["lit"], a["covered"], a["price"], a["tarif"]), ("Résine", True, False, 7, "R"))
        self.assertEqual((b["hour"], b["price"], b["tarif"], b["covered"]), (19, 12, "P", False))
        self.assertEqual((c["court"], c["surface"], c["lit"], c["covered"], c["price"]), ("Court N°2", "Béton poreux", False, True, 20))
        # prix absent : barème de la Ville (plein tarif, couvert)
        self.assertEqual((d["site"], d["hour"], d["price"], d["covered"]), ("Atlantique", 20, 20, True))

    def test_norm_key(self):
        self.assertEqual(scrape.norm_key("Renée Garilhe - ex Courcelles"), scrape.norm_key("ReneeGarilhe-exCourcelles"))
        self.assertEqual(scrape.norm_key("NEUVE SAINT PIERRE"), "neuvesaintpierre")


if __name__ == "__main__":
    unittest.main()
