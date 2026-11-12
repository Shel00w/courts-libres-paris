/*
 * Avertissement "reservation non annulable" sur la page centre sportif.
 *
 * L'annulation d'une reservation n'est plus possible a moins de 24h du debut du creneau
 * (cf. Creneau.isAnnulationPossible). L'avertissement doit donc etre affiche pour tout
 * creneau debutant dans moins de 24h, et pas uniquement pour les creneaux du jour meme.
 *
 * Chaque radio de creneau porte l'attribut data-js-slot-annulable renseigne cote serveur ;
 * l'alerte du court concerne (data-js-slot-non-annulable-alert) est affichee lorsque le
 * creneau selectionne n'est pas annulable.
 */
(function() {
	'use strict';

	var SELECTOR_CONTAINER = '[data-js-center-slot-container]';
	var SELECTOR_RADIO = SELECTOR_CONTAINER + ' input[type="radio"][name="creneauRadio"]';
	var SELECTOR_ALERT = '[data-js-slot-non-annulable-alert]';

	function hideAllAlerts() {
		document.querySelectorAll(SELECTOR_ALERT).forEach(function(alert) {
			alert.classList.add('d-none');
		});
	}

	function refreshAlert(radio) {
		hideAllAlerts();

		if (radio.getAttribute('data-js-slot-annulable') !== 'false') {
			return;
		}

		var container = radio.closest(SELECTOR_CONTAINER);
		var alert = container ? container.querySelector(SELECTOR_ALERT) : null;

		if (alert) {
			alert.classList.remove('d-none');
		}
	}

	document.addEventListener('DOMContentLoaded', function() {
		document.querySelectorAll(SELECTOR_RADIO).forEach(function(radio) {
			radio.addEventListener('change', function() {
				refreshAlert(radio);
			});

			if (radio.checked) {
				refreshAlert(radio);
			}
		});
	});
})();
