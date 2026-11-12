/**
 * paristennis-map-refresh.js
 *
 * Utilitaires d'affichage / rafraichissement de la carte Leaflet.
 *
 * Gere aussi le centrage de la vue : la moitie gauche de la carte est recouverte
 * par le panneau "liste des centres", la vue doit donc etre centree sur la moitie
 * droite visible (vue par defaut sur Paris, ou recadrage sur les resultats d'une
 * recherche de localisation).
 *
 * Corrige egalement le bug d'affichage mobile (fond blanc puis fond gris avec un seul pin) :
 * la carte est initialisee alors que son conteneur est masque (display:none) via
 * le switch "Liste / Carte". Leaflet calcule alors une taille de 0x0 et ne charge
 * jamais les tuiles CapGeo. Il faut appeler map.invalidateSize() une fois le
 * conteneur reellement visible (bascule de vue, redimensionnement, changement
 * d'orientation) puis recadrer la vue.
 *
 * Le module est expose :
 *  - sur window.ParistennisMap (navigateur, chargement via <script>) ;
 *  - via module.exports (Node, pour les tests unitaires).
 */
(function (global) {
	'use strict';

	// Vue par defaut de la carte (arrivee sur la page d'accueil, sans recherche
	// de localisation) : centrage sur Paris, comme sur l'ancien site.
	var DEFAULT_CENTER = [48.85632, 2.33272];
	var DEFAULT_ZOOM = 12;

	var context = {
		getMap: function () { return global.leafletMap; },
		getEquipements: function () { return []; },
		isMobile: function () { return false; },
		getMenuElement: function () { return null; },
		hasLocationSearch: function () { return false; },
		L: (typeof L !== 'undefined') ? L : (global.L || null)
	};

	/**
	 * Configure le contexte utilise par refreshMap() lorsqu'aucun parametre
	 * explicite n'est fourni (branche par paristennis-leaflet.js).
	 */
	function configure(cfg) {
		if (!cfg) {
			return context;
		}
		Object.keys(cfg).forEach(function (key) {
			if (cfg[key] !== undefined) {
				context[key] = cfg[key];
			}
		});
		return context;
	}

	/**
	 * Construit les bornes (LatLngBounds) englobant tous les equipements
	 * possedant des coordonnees valides. Retourne null si aucune coordonnee.
	 */
	function getBounds(equipements, L) {
		if (!L || typeof L.latLngBounds !== 'function') {
			return null;
		}
		var coords = [];
		(equipements || []).forEach(function (e) {
			if (e &&
				e.latitude !== undefined && e.latitude !== '' &&
				e.longitude !== undefined && e.longitude !== '') {
				coords.push([e.latitude, e.longitude]);
			}
		});
		if (coords.length === 0) {
			return null;
		}
		return L.latLngBounds(coords).pad(0.13);
	}

	/**
	 * Largeur (en px) de la partie gauche de la carte masquee par le panneau
	 * "liste des centres" : celui-ci est positionne en absolu au-dessus de la
	 * moitie gauche de la carte (left: 0; width: 50%).
	 * La zone reellement visible par l'usager est donc la moitie droite.
	 * @returns {number} 0 en mobile ou lorsque le panneau est replie.
	 */
	function getHiddenLeftWidth(map, menuElement, mobile) {
		if (mobile || !map || typeof map.getContainer !== 'function') {
			return 0;
		}
		if (!menuElement || !menuElement.classList ||
			!menuElement.classList.contains('active') ||
			typeof menuElement.getBoundingClientRect !== 'function') {
			return 0;
		}
		var mapContainer = map.getContainer();
		if (!mapContainer || typeof mapContainer.getBoundingClientRect !== 'function') {
			return 0;
		}
		var mapRect = mapContainer.getBoundingClientRect();
		var menuRect = menuElement.getBoundingClientRect();
		// Recouvrement reel du panneau sur la carte (et non largeur du panneau).
		var hidden = menuRect.right - mapRect.left;
		if (!(hidden > 0)) {
			return 0;
		}
		return Math.min(hidden, mapRect.width);
	}

	/**
	 * Recadre la carte sur l'ensemble des equipements.
	 * Applique un padding a gauche (zone masquee par le panneau liste) pour que
	 * les equipements soient centres sur la moitie droite visible de la carte.
	 * @returns {boolean} true si un fitBounds a ete effectue.
	 */
	function fitMapToEquipements(map, equipements, options) {
		options = options || {};
		var L = options.L || context.L;
		if (!map || typeof map.fitBounds !== 'function') {
			return false;
		}
		var bounds = getBounds(equipements, L);
		if (!bounds) {
			return false;
		}
		var fitOptions = {};
		var hidden = getHiddenLeftWidth(map, options.menuElement, options.mobile);
		if (hidden > 0) {
			fitOptions.paddingTopLeft = [hidden, 0];
			fitOptions.paddingBottomRight = [0, 0];
		}
		map.fitBounds(bounds, fitOptions);
		return true;
	}

	/**
	 * Centre la carte sur Paris (vue par defaut, sans recherche de localisation).
	 * Le centre est decale vers l'ouest de la moitie de la zone masquee par le
	 * panneau liste : Paris apparait ainsi au milieu de la moitie droite visible
	 * et non au milieu du conteneur (dont la moitie gauche est recouverte).
	 * @returns {boolean} true si la vue a ete appliquee.
	 */
	function centerMapOnDefault(map, options) {
		options = options || {};
		if (!map || typeof map.setView !== 'function') {
			return false;
		}
		var zoom = (options.zoom !== undefined) ? options.zoom : DEFAULT_ZOOM;
		var center = options.center || DEFAULT_CENTER;
		var hidden = getHiddenLeftWidth(map, options.menuElement, options.mobile);
		if (hidden > 0 && typeof map.project === 'function' && typeof map.unproject === 'function') {
			center = map.unproject(map.project(center, zoom).subtract([hidden / 2, 0]), zoom);
		}
		map.setView(center, zoom, { animate: false });
		return true;
	}

	/**
	 * Applique la vue attendue :
	 *  - recadrage sur les resultats lorsqu'une recherche de localisation est
	 *    active (l'usager a choisi une adresse / station / arrondissement) ;
	 *  - sinon centrage par defaut sur Paris.
	 * Dans les deux cas le recadrage tient compte du panneau liste (moitie droite).
	 * @returns {boolean} true si une vue a ete appliquee.
	 */
	function applyView(map, equipements, options) {
		options = options || {};
		if (options.hasLocationSearch &&
			fitMapToEquipements(map, equipements, options)) {
			return true;
		}
		return centerMapOnDefault(map, options);
	}

	/**
	 * Force Leaflet a recalculer la taille de son conteneur puis recadre la vue.
	 * A appeler chaque fois que la carte (re)devient visible ou change de taille.
	 * @returns {boolean} true si la carte a pu etre rafraichie.
	 */
	function refreshMap(opts) {
		opts = opts || {};
		var map = opts.map || context.getMap();
		if (!map || typeof map.invalidateSize !== 'function') {
			return false;
		}
		map.invalidateSize(opts.animate === true);

		var equipements = opts.equipements || context.getEquipements();
		var mobile = (opts.mobile !== undefined) ? opts.mobile : context.isMobile();
		var menuElement = opts.menuElement || context.getMenuElement();
		var hasLocationSearch = (opts.hasLocationSearch !== undefined)
			? opts.hasLocationSearch
			: context.hasLocationSearch();

		applyView(map, equipements, {
			L: opts.L || context.L,
			mobile: mobile,
			menuElement: menuElement,
			hasLocationSearch: hasLocationSearch
		});
		return true;
	}

	var api = {
		DEFAULT_CENTER: DEFAULT_CENTER,
		DEFAULT_ZOOM: DEFAULT_ZOOM,
		configure: configure,
		getBounds: getBounds,
		getHiddenLeftWidth: getHiddenLeftWidth,
		fitMapToEquipements: fitMapToEquipements,
		centerMapOnDefault: centerMapOnDefault,
		applyView: applyView,
		refreshMap: refreshMap
	};

	global.ParistennisMap = api;

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = api;
	}
})(typeof window !== 'undefined' ? window : this);
