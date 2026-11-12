
(function() {
	const popupProviderUrl = "rest/leaflet/popup/";
	const popupProviderName = "paristennis";

	const desktopPopupOptions = {
		maxWidth: 500,
		closeButton: false,
		closeOnEscapeKey: true,
		keepInView: false,
		offset: [-200, 10]
	}

	const mobilePopupOptions = {
		maxWidth: 500,
		closeButton: false,
		closeOnEscapeKey: true,
		keepInView: false,
		offset: [0, -25]
	}

	let svgIconCache = {};

	const MARKERS_ICONS = {
		'default': 'images/site/icons/tennis-icon-map-marker.svg',
		'ball': 'images/site/icons/tennis-icon-map-marker-ball.svg',
		'cross': 'images/site/icons/tennis-icon-map-marker-cross.svg',
		'like': 'images/site/icons/tennis-icon-map-marker-like.svg',
	};

	const STATUS_COLORS = {
		'cs-ferme': '#071F32',
		'creneau-dispo': '#257D1B',
		'creneau-non-dispo': '#5C769E',
		'selected': '#257D1B'
	};

	const ICON_SIZE = [25, 41];

	let markersLayer;
	let equipements = [];
	let isFavoris;
	let activeMarker = null;
	let markersById = {};
	let popupLoading = false;

	document.addEventListener('DOMContentLoaded', async function() {
		if(isMobileBreakpoint())
		{
			mapWrapper = document.querySelector('[data-js-section-map-mobile-map] #paristennis-map');
		} else {
			mapWrapper = document.querySelector('[data-js-section-map-desktop-map] #paristennis-map'); // #paristennis-map
		}

		const defaultCenter = (window.ParistennisMap && window.ParistennisMap.DEFAULT_CENTER) || [48.85632, 2.33272];
		const defaultZoom = (window.ParistennisMap && window.ParistennisMap.DEFAULT_ZOOM) || 12;

		window.leafletMap = L.map(mapWrapper, {
			zoomControl: false,
			maxZoom: 16
		}).setView(defaultCenter, defaultZoom);
		markersLayer = L.featureGroup().addTo(window.leafletMap);
		L.esri.Vector.vectorTileLayer('https://tiles.arcgis.com/tiles/yFAX7hJID4ONeUHP/arcgis/rest/services/Fond_Ville_Vectoriel/VectorTileServer', {
			minZoom: 8,
			maxZoom: 16
		}).addTo(window.leafletMap);

		L.control.zoom({
		    position: 'topright'
		}).addTo(window.leafletMap);

		window.leafletMap.on('popupopen', function() {
			popupOpened = true;
		});

		window.leafletMap.on('popupclose', function() {
			popupOpened = false;

			// Replace le marker original si un marker était sélectionné
			if (activeMarker) {
				const originalMarker = markersById[activeMarker._equipementId];
				if (originalMarker && !markersLayer.hasLayer(originalMarker)) {
					markersLayer.addLayer(originalMarker);
				}
				markersLayer.removeLayer(activeMarker);
				activeMarker = null;
			}
		});

		window.leafletMap.whenReady(() => {
			makeLeafletElementsNonFocusable();
		});

		window.leafletMap.on('layeradd', () => {
		  makeLeafletElementsNonFocusable();
		});

		authType = document.getElementsByName('auth-type')[0].value;
		isFavoris = document.getElementsByName('favoris')[0].value === 'true';

		await preloadSvgIcons(MARKERS_ICONS);

		parseEquipements();

		for (let equipement of equipements) {
			if(equipement.latitude != "" && equipement.longitude != "" ) {
				buildMarker(equipement).addTo(markersLayer);
			}
		}

		// Contexte partage utilise par ParistennisMap.refreshMap() lorsqu'il est
		// declenche depuis l'exterieur (switch Liste/Carte, resize, orientation).
		if (window.ParistennisMap) {
			window.ParistennisMap.configure({
				getMap: () => window.leafletMap,
				getEquipements: () => equipements,
				isMobile: isMobileBreakpoint,
				getMenuElement: () => document.querySelector('.tc-homepage-block-list-centers-container'),
				hasLocationSearch: hasLocationSearch,
				L: L
			});
		}

		setupView();

		// La carte peut avoir ete initialisee dans un conteneur masque (vue mobile
		// "Liste" par defaut) : on recalcule sa taille apres redimensionnement ou
		// changement d'orientation pour recharger correctement les tuiles CapGeo.
		window.addEventListener('resize', debouncedRefresh);
		window.addEventListener('orientationchange', debouncedRefresh);

		document.querySelectorAll('.tc-homepage-list-centers .card').forEach( card => {
			card.addEventListener('click', onCardClick);
		});

		document.querySelector('[data-js-section-map-panel-button]').addEventListener('click', centerAndZoom);

		document.addEventListener('click', function(e) {
			const btn = e.target.closest('.leaflet-popup-btn-close');
			if (btn) {
				e.preventDefault();
				e.stopPropagation();
				window.leafletMap.closePopup();
			}
		});

	});

	function makeLeafletElementsNonFocusable() {
	  document.querySelectorAll(
	    '.leaflet-container, .leaflet-control-container a, .leaflet-control-attribution, .leaflet-interactive'
	  ).forEach(el => {
	    el.setAttribute('tabindex', '-1');
	    el.setAttribute('aria-hidden', 'true');
	  });
	}

	function parseEquipements() {
		$('.equipement-list-item').each(function() {
			equipements.push({
				id: $(this).attr('id'),
				nom: $(this).text(),
				latitude: $(this).data('lat'),
				longitude: $(this).data('lng'),
				status: $(this).data('status')
			});
		});
	}

	let refreshTimeout = null;
	function debouncedRefresh() {
		if (refreshTimeout) {
			clearTimeout(refreshTimeout);
		}
		refreshTimeout = setTimeout(function() {
			if (window.ParistennisMap) {
				window.ParistennisMap.refreshMap();
			} else if (window.leafletMap) {
				window.leafletMap.invalidateSize();
				setupView();
			}
		}, 150);
	}

	/**
	 * Une recherche de localisation est active des qu'une adresse / station /
	 * arrondissement a ete selectionne dans l'autocompletion : les champs caches
	 * de latitude sont alors alimentes (desktop ou mobile).
	 */
	function hasLocationSearch() {
		const latitudeInputs = document.querySelectorAll('#latitude-desktop, #latitude-mobile');
		return Array.from(latitudeInputs).some(input => input.value && input.value.trim() !== '');
	}

	function setupView() {
		// Vue delegue au module partage (meme logique desktop/mobile) : centrage
		// par defaut sur Paris, recadrage sur les resultats si recherche active.
		if (window.ParistennisMap) {
			window.ParistennisMap.applyView(window.leafletMap, equipements, {
				L: L,
				mobile: isMobileBreakpoint(),
				menuElement: document.querySelector('.tc-homepage-block-list-centers-container'),
				hasLocationSearch: hasLocationSearch()
			});
			return;
		}
		if (hasLocationSearch() && equipements.length > 0) {
			window.leafletMap.fitBounds(boundFromEquipements(0.13), {});
		}
	}

	function boundFromEquipements(padding) {
		let allEquipementsCoords = [];
		equipements.forEach((equipement) => {
			if( equipement.latitude !== undefined && equipement.latitude !== '' && equipement.longitude !== undefined && equipement.longitude !== '') {
				allEquipementsCoords.push([equipement.latitude, equipement.longitude]);
			}
		});
		return L.latLngBounds(allEquipementsCoords).pad(padding);
	}

	function centerAndZoom() {
		const map = window.leafletMap;
		if (!activeMarker || !map) return;

		// L'id "paristennis-map" est present deux fois (desktop + mobile) : on cible
		// le conteneur reel de la carte active plutot que le premier du document.
		const mapElement = map.getContainer();
		const mapRect = mapElement.getBoundingClientRect();

		const menuElement = document.querySelector('.tc-homepage-block-list-centers-container');
		const menuRect = menuElement.getBoundingClientRect();

		const popupWidth = 350;

		let offsetY = 0;
		let offsetX = 0;
		if (!isMobileBreakpoint()) {
			const menuActive = menuElement.classList.contains('active');
			offsetY = -(mapRect.height / 2) + 30;
			if (menuActive) {
				offsetX = -(menuRect.width / 2) - 200;
			} else {
				offsetX = -(menuRect.width / 2) + 30;
			}
		} else {
			const switchListBtn = document.querySelector('[data-js-section-filters-button-switch-list]');
				const menuActive = switchListBtn && switchListBtn.classList.contains('active');
			if(menuActive) {
				offsetX = -(mapRect.width / 2) + (popupWidth/2);
			}
			offsetY = -350;
		}
		panRelativeFromLatLng(activeMarker.getLatLng(), offsetX, offsetY);
	}

	function buildIcon(statusCS) {
		let iconType = 'default';
		if (statusCS === 'cs-ferme') {
			iconType = 'cross';
		} else if (isFavoris) {
			iconType = 'like';
		} else if (statusCS === 'selected') {
			iconType = 'ball';
		}

		let svg = svgIconCache[iconType];
		if (!svg) {
			return null;
		}

		let cleanedSvg = svg
			.replace(/fill="[^"]*"/g, '')         // supprime tous les attributs fill
			.replace(/style="[^"]*"/g, '')        // supprime tous les styles inline
			.replace(/<svg /, `<svg fill="${STATUS_COLORS[statusCS] || '#000'}" `); // applique le bon fill à la balise racine

		return  L.divIcon({
			className: 'custom-svg-icon',
			html: cleanedSvg,
			iconSize: ICON_SIZE,
			iconAnchor: [ICON_SIZE[0] / 2, ICON_SIZE[1]],
			popupAnchor: [0, -ICON_SIZE[1]]
		});
	}

	function buildMarker(equipement) {
		const marker = createMarker([equipement.latitude, equipement.longitude], equipement.status, equipement.id);
		if (marker) {
			if (!markersById[equipement.id]) {
				markersById[equipement.id] = marker; // stocke le marker original
			}
			markersLayer.addLayer(marker);
		}
		return marker;
	}

	function createMarker(latlng, status, equipementId, originalStatus = null) {
		const icon = buildIcon(status);
		if (!icon) {
			return null;
		}

		const marker = L.marker(latlng, { icon });

		marker._originalStatus = originalStatus || status;
		marker._equipementId = equipementId;

		marker.on('click', function (e) {
			onMarkerClicked(e, equipementId);
		});

		return marker;
	}

	function buildPopup(e, equipementId) {

		// On ne build pas la popup si elle est déjà là
		const popup = document.querySelector('.tc-homepage-section-map-card');
		if(popup && popup.dataset.id === equipementId)
		{
			return;
		}

		const discipline = $('input[type="radio"][name^="fieldSport"]:checked').val();
		const popupUrl = popupProviderUrl + popupProviderName + '/' + equipementId + '/' + discipline;
		const latlng = e.latlng;
		const popupOptions = isMobileBreakpoint( ) ? mobilePopupOptions : desktopPopupOptions;

		popupLoading = true;
		$.get(popupUrl)
		.done(function(data) {
			L.popup(popupOptions).setLatLng(latlng)
			.setContent(data)
			.openOn(window.leafletMap);

			const listItem = document.querySelector('.tc-homepage-block-list-centers-container .card[data-id="' + equipementId +'"]');
			const popupItem = document.querySelector('.tc-homepage-section-map-card[data-id="' + equipementId +'"]');

			// set image de la popup depuis la liste
			const sourceImg = listItem.querySelector('.card-img-top');
			const targetImg = popupItem.querySelector('.card-img-top');
			if (sourceImg && targetImg) {
				targetImg.src = sourceImg.src;
			}

			const htmlCreneaux = listItem.querySelector('.nb-creneaux-dispo').innerHTML;
			popupItem.querySelector('.nb-creneaux-dispo').innerHTML = htmlCreneaux;

			const htmlCourts = listItem.querySelector('.courts').innerHTML;
			popupItem.querySelector('.courts').innerHTML = htmlCourts;

			bindPopupEvents(equipementId);
			centerAndZoom();
		})
		.fail(function(){
			console.error("Erreur lors du chargement de la popup");
		})
		.always(function() {
			setTimeout( function( ) {
				popupLoading = false;
			}, 500);
		});
	}
	
	function buildModalCreneaux(equipementId) {
		const modalElement = document.getElementById('modal-creneauxModal');
		const dateInput = document.querySelector('[name="date-creneau-en"]');
		const modalBackdrop = document.querySelector('[data-js-modal-backdrop]');
		const tableContainer = document.querySelector('.tc-homepage-section-map-card-modal-table-container');

		const today = resetTime(new Date());
		dateInput.value = toIsoDate(today);
		tableContainer.innerHTML = "";

		// Les fleches sont dans le caption du tableau recharge a chaque date : delegation d'evenement
		tableContainer.onclick = (event) => {
			const button = event.target.closest('#btn-date-incr, #btn-date-decr');
			if (!button || button.disabled) {
				return;
			}
			const amount = button.id === 'btn-date-decr' ? -1 : 1;
			dateInput.value = toIsoDate(addDays(parseIsoDate(dateInput.value), amount));

			fetchCreneaux(equipementId, dateInput, tableContainer, button.id);
		};

		modalElement.dataset.id = equipementId;

		const modal = new bootstrap.Modal(modalElement, {
			backdrop: false,
			keyboard: false
		});

		fetchCreneaux(equipementId, dateInput, tableContainer);
		modal.show();

		modalBackdrop.classList.remove('hidden');
		modalBackdrop.classList.add('show');

		modalElement.querySelectorAll('[data-bs-dismiss="modal"]').forEach(button => {
			button.addEventListener('click', () => {
				modalBackdrop.classList.add('hidden');
				modalBackdrop.classList.remove('show');
			});
		});
	}
	
	function checkDateInRange(date) {
		const min = resetTime(new Date());
		const max = addDays(min, 14);

		const btnDecr = document.getElementById('btn-date-decr');
		const btnIncr = document.getElementById('btn-date-incr');
		if (!btnDecr || !btnIncr) {
			return;
		}

		const time = date.getTime();
		btnDecr.disabled = time <= min.getTime();
		btnIncr.disabled = time >= max.getTime();
	}
	
	// Le tableau (et donc ses fleches) est remplace : on redonne le focus a la fleche utilisee
	// (ou a l'autre si elle est desormais desactivee) et on annonce la nouvelle date
	function restoreFocusAndAnnounce(clickedButtonId) {
		const otherButtonId = clickedButtonId === 'btn-date-decr' ? 'btn-date-incr' : 'btn-date-decr';
		const clickedButton = document.getElementById(clickedButtonId);
		const buttonToFocus = clickedButton && !clickedButton.disabled ? clickedButton : document.getElementById(otherButtonId);
		if (buttonToFocus) {
			buttonToFocus.focus();
		}

		const title = document.getElementById('creneaux-caption-title');
		const liveRegion = document.getElementById('creneaux-date-live');
		if (title && liveRegion) {
			liveRegion.textContent = title.textContent.replace(/\s+/g, ' ').trim();
		}
	}

	function addDays(date, days) {
		const result = new Date(date);
		result.setDate(result.getDate() + days);
		return result;
	}
	
	function resetTime(date) {
		date.setHours(0, 0, 0, 0);
		return date;
	}
	
	function fetchCreneaux(equipementId, dateInput, tableContainer, clickedButtonId) {
		$.ajax({
			url: 'rest/paristennis/creneaux',
			data: {
				idEquipement: equipementId,
				date: dateInput.value
			},
			success(data) {
				tableContainer.innerHTML = data.html;
				dateInput.value = data.date;
				checkDateInRange(parseIsoDate(data.date));

				if (clickedButtonId) {
					restoreFocusAndAnnounce(clickedButtonId);
				}
			},
			error(xhr) {
				console.error("Erreur lors du chargement des créneaux:", xhr);
				tableContainer.innerHTML = "<p class='text-danger'>Erreur de chargement. Veuillez réessayer.</p>";
			}
		});
	}

	function toggleActiveMarker(clickedMarker) {
		const clickedId = clickedMarker._equipementId;

		// Si on reclique sur le même marker actif : désélection
		if (activeMarker && activeMarker._equipementId === clickedId) {
			markersLayer.removeLayer(activeMarker);

			const originalMarker = markersById[clickedId];
			if (originalMarker && !markersLayer.hasLayer(originalMarker)) {
				markersLayer.addLayer(originalMarker);
			}

			activeMarker = null;
			return;
		}

		// Si un autre marker est actif, le remettre à son état d'origine
		if (activeMarker) {
			markersLayer.removeLayer(activeMarker);
			const previousId = activeMarker._equipementId;
			const originalMarker = markersById[previousId];
			if (originalMarker && !markersLayer.hasLayer(originalMarker)) {
				markersLayer.addLayer(originalMarker);
			}
			activeMarker = null;
		}

		// Sélection du nouveau marker
		const originalMarker = markersById[clickedId];
		if (!originalMarker) {
			console.warn("Marker introuvable pour l’ID", clickedId);
			return;
		}

		// Supprimer tous les markers existants pour cet ID (original ou autre)
		markersLayer.eachLayer(layer => {
			if (layer._equipementId === clickedId) {
				markersLayer.removeLayer(layer);
			}
		});

		const latlng = originalMarker.getLatLng();
		const selectedMarker = createMarker(latlng, 'selected', clickedId, originalMarker._originalStatus);

		markersLayer.addLayer(selectedMarker);
		activeMarker = selectedMarker;
	}


	function onMarkerClicked(e, equipementId) {
		toggleActiveMarker(e.target);
		if(!popupLoading)
		{
			buildPopup(e, equipementId);
		}
		// on active la card du menu correspondant
		document.querySelectorAll('.tc-homepage-list-centers .card').forEach( c => c.classList.remove('disabled'));
		document.querySelector(`.tc-homepage-list-centers .card[data-id="${equipementId}"]`).classList.add('disabled');
		scrollToCard(equipementId);
	}

	async function preloadSvgIcons(iconMap) {
		for (const key in iconMap) {
			if (iconMap.hasOwnProperty(key)) {
				try {
					const response = await fetch(iconMap[key]);
					const svgText = await response.text();
					svgIconCache[key] = svgText;
				} catch (error) {
					console.error(`Erreur lors du chargement de l'icône ${key}:`, error);
				}
			}
		}
	}

	function onCardClick(e) {
		if(popupLoading)
		{
			return;
		}
		const card =  e.currentTarget;
		const id = card.dataset.id;
		const marker = markersById[id];

		const fakeEvent = {
			latlng: marker.getLatLng(),
			target: marker
		};

		document.querySelectorAll('.tc-homepage-list-centers .card').forEach( c => {
			c.classList.remove('disabled');
		});
		card.classList.add('disabled');
		onMarkerClicked(fakeEvent, marker._equipementId);
	}

	function isMobileBreakpoint() {
		return !window.matchMedia("(min-width: 992px)").matches;
	}

	function toIsoDate(date) {
	  const year = date.getFullYear();
	  const month = String(date.getMonth() + 1).padStart(2, '0'); 
	  const day = String(date.getDate()).padStart(2, '0');
	  return `${year}-${month}-${day}`;
	}
	
	function parseIsoDate(dateString) {
		const [year, month, day] = dateString.split('-').map(Number);
		return new Date(year, month - 1, day);
	}


	function bindPopupEvents(equipementId) {

		document.querySelectorAll('[data-js="btn-modal-creneaux"]').forEach(button => {
			button.removeEventListener('click', button._clickHandlerCreneaux);
			button._clickHandlerCreneaux = function() {
				buildModalCreneaux(equipementId);
			};
			button.addEventListener('click', button._clickHandlerCreneaux);
		});

		document.querySelectorAll('.btn-favoris').forEach(btn => {
			btn.removeEventListener('click', onLikeClicked);
			btn.addEventListener('click', onLikeClicked);
		});
	}

	function panRelativeFromLatLng(latLng, offsetX = 0, offsetY = 0) {
        const map = window.leafletMap;

        const point = map.latLngToContainerPoint(latLng);
        const shiftedPoint = point.add([offsetX, offsetY]);
        const targetLatLng = map.containerPointToLatLng(shiftedPoint);

        map.panTo(targetLatLng, {
            animate: true
        });
	}

	function scrollToCard(cardId, duration=1) {
		const container = document.querySelector('.tc-homepage-block-list-centers');
			const card = container.querySelector(`.card[data-id="${cardId}"]`);

			if (!card || !container) return;

			const start = container.scrollTop;
			const end = card.offsetTop - 20;
			const change = end - start;
			const startTime = performance.now();

			function animateScroll(currentTime) {
				const elapsed = currentTime - startTime;
				const progress = Math.min(elapsed / duration, 1);

				// easing: easeInOutQuad
				const easedProgress = progress < 0.5
					? 2 * progress * progress
					: -1 + (4 - 2 * progress) * progress;

				container.scrollTop = start + change * easedProgress;

				if (progress < 1) {
					requestAnimationFrame(animateScroll);
				}
			}

			requestAnimationFrame(animateScroll);
	}
})();
