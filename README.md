# Courts libres Paris

Tous les créneaux libres des centres de tennis de la Ville de Paris (Paris Tennis Padel, dont Aurelle de Paladines à Neuilly et Bobigny), club par club, avec l'adresse, les courts et le prix pour 1 h ou 2 h, sur tous les jours ouverts à la réservation. La page se met à jour toute seule entre 7 h et 23 h : le planning demande un passage toutes les 15 minutes, GitHub en fait en pratique environ un par heure.

L'app affiche la dispo. Chaque numéro de court ouvre directement la réservation de ce créneau sur [Paris Tennis Padel](https://tennispadel.paris.fr/tennispadel/jsp/site/Portal.jsp?page=paristennis), avec un compte Mon Paris.

## Contenu

```
scraper/scrape.py              collecte (Python 3.9+, bibliothèque standard, rien à installer)
site/index.html                la page (HTML/CSS/JS, sans framework)
site/data.json                 généré à chaque collecte, non versionné
tests/test_scrape.py           tests du collecteur sur des extraits réels du site
tests/fixtures/                extraits de pages tennispadel.paris.fr
.github/workflows/refresh.yml  collecte + publication sur GitHub Pages
.github/workflows/keepalive.yml  commit hebdo pour que GitHub ne mette pas les tâches en pause
```

## Mise en ligne (une fois)

1. Crée un dépôt **public** sur GitHub (public : les minutes GitHub Actions y sont gratuites et illimitées) et pousse ce dossier sur la branche `main`.
2. Dans le dépôt : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
3. Onglet **Actions → Rafraîchir les créneaux → Run workflow**. Au bout de 2 à 3 minutes, la page est en ligne sur `https://<ton-compte>.github.io/<nom-du-dépôt>/`.
4. Sur iPhone : ouvre l'adresse dans Safari, Partager → Sur l'écran d'accueil.

## Comment ça marche

Depuis le 3 novembre 2026, la Ville a remplacé tennis.paris.fr par **tennispadel.paris.fr**. Les disponibilités s'y consultent sans compte. Le script :

1. ouvre la page d'accueil (`Portal.jsp?page=paristennis`) et lit la liste des centres de tennis : identifiant, nom, coordonnées, adresse, statut ;
2. ouvre la page de chaque centre (`Portal.jsp?page=centre-sportif&id=…`, une requête par centre, espacées d'une seconde) ;
3. y lit, jour par jour et court par court, chaque créneau libre : heure, prix affiché, couvert ou découvert, éclairé, surface, et l'identifiant qui sert au lien de réservation (`Portal.jsp?page=reservation-etape-1&id=…`). Les courts de padel sont exclus.

La page propose trois durées : 1 h, 2 h sur le même court, ou 2 h en acceptant de changer de court à l'heure. Elle affiche le prix total, propose le barème réduit (moins de 26 ans domicilié à Paris : 7 € découvert, 12 € couvert) et liste en bas les centres sans créneau libre.

Si une collecte échoue, rien n'est republié : la page garde les données précédentes et affiche « Données anciennes » après 2 h, et le lancement apparaît en rouge dans l'onglet Actions. Si la Ville change encore la structure de son site, c'est `parse_home()` et `parse_centre()` dans `scraper/scrape.py` qu'il faut ajuster.

## En local

```bash
python scraper/scrape.py --out site/data.json
cd site && python -m http.server 8000      # puis http://localhost:8000
python -m unittest discover tests
```

## Crédits

La structure de l'ancien site tennis.paris.fr était documentée par les projets open source [OneCourt](https://github.com/vroux18/onecourt) et [par-ici-tennis](https://github.com/bertrandda/par-ici-tennis).
