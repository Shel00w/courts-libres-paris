/****************************************************/
/* SPECIFIC THEME CUSTOM SITE SCRIPTS OVERRIDES     */
/****************************************************/
document.addEventListener("DOMContentLoaded", (event) => {
	if (document.querySelector('[data-js-homepage]')) {
		sectionMapPanel();
		sectionFilterDisplayButton();
		sectionFilterSwitchButtons();
		initializePopovers();
		closePopovers();
		initHourFromAndHourToByDefault();
		displaySearchButton();
		popoverLocationReinitializationDesktop();
		popoverDateReinitializationDesktop();
		popoverCriteriasReinitializationDesktop();
		popoverLocationReinitializationMobile();
		popoverDateReinitializationMobile();
		popoverCriteriasReinitializationMobile();
		updateFilterByUrlParam();
	}
	if (document.querySelector('[data-js-profil-tarification-etape-1]')) {
		profilTarificationRadioActivateValidation();
	}
	if (document.querySelector('[data-js-profil-tarification-etape-2]')) {
		profilTarificationInputFileActivateValidation();
	}
	if (document.querySelector('[data-js-inscription-c1d1]')) {
		inscriptionC1D1InputFileActivateValidation();
	}
	if (document.querySelector('[data-js-centre-sportif]')) {
		centerSlotReservation();
	}
	if (document.querySelector('.carousel')) {
		carouselsTennisInit();
	}
	if (document.querySelector('[data-js-reservation-etape1]')) {
		reservationEtape1Init();
	}

	document.querySelectorAll('.btn-favoris').forEach( btn => {
		btn.addEventListener('click', onLikeClicked);
	});
	
	if(document.querySelector('[data-js-section-filters-button-switch-list]'))
	{
		document.querySelector('[data-js-section-filters-button-switch-list]').click();
	}
});

function sectionMapPanel() {
	const panelButton = document.querySelector('[data-js-section-map-panel-button]');
	const panel = document.querySelector('[data-js-section-map-panel]');
	panelButton.addEventListener('click', function() {
       panel.classList.toggle('active');
       panelButton.setAttribute('aria-expanded', panel.classList.contains('active') ? 'true' : 'false');
    });
}

function sectionFilterSwitchButtons() {
	const buttonMap = document.querySelector('[data-js-section-filters-button-switch-map]');
	const buttonList = document.querySelector('[data-js-section-filters-button-switch-list]');
	const sectionMapMobileMap = document.querySelector('[data-js-section-map-mobile-map]');
	const sectionMapMobileList = document.querySelector('[data-js-section-map-mobile-list]');
	const input = document.getElementById('mobileViewType');

	buttonMap.addEventListener('click', function() {
        if (!this.classList.contains('active')) {
            this.classList.add('active');
            buttonList.classList.remove('active');
            sectionMapMobileMap.classList.remove('hidden');
            sectionMapMobileList.classList.add('hidden');

        }
        this.setAttribute('aria-pressed', 'true');
        buttonList.setAttribute('aria-pressed', 'false');
        input.value = 'map';
        // La carte mobile a ete initialisee alors qu'elle etait masquee : on force
        // Leaflet a recalculer sa taille pour charger les tuiles CapGeo.
        refreshMobileMapView();
    });

    buttonList.addEventListener('click', function() {
        if (!this.classList.contains('active')) {
            this.classList.add('active');
            buttonMap.classList.remove('active');
            sectionMapMobileMap.classList.add('hidden');
            sectionMapMobileList.classList.remove('hidden');

        }
        this.setAttribute('aria-pressed', 'true');
        buttonMap.setAttribute('aria-pressed', 'false');
         input.value = 'list';
    });
}

/**
 * Force le recalcul de la taille de la carte Leaflet une fois son conteneur
 * mobile visible (bascule Liste -> Carte, affichage initial en vue carte).
 * Utilise un double requestAnimationFrame pour attendre que le navigateur ait
 * applique la mise en page (suppression de la classe "hidden") avant d'appeler
 * invalidateSize().
 */
function refreshMobileMapView() {
	if (!window.ParistennisMap || typeof window.ParistennisMap.refreshMap !== 'function') {
		return;
	}
	requestAnimationFrame(function() {
		requestAnimationFrame(function() {
			window.ParistennisMap.refreshMap();
		});
	});
}

function updateFilterByUrlParam() {
	const buttonMap = document.querySelector('[data-js-section-filters-button-switch-map]');
	const buttonList = document.querySelector('[data-js-section-filters-button-switch-list]');
	const sectionMapMobileMap = document.querySelector('[data-js-section-map-mobile-map]');
	const sectionMapMobileList = document.querySelector('[data-js-section-map-mobile-list]');
	const params = new URLSearchParams(window.location.search);
	const mobileViewType = params.get("mobileViewType");

	if( mobileViewType === "list" ){
		if (!buttonList.classList.contains('active')) {
			buttonList.classList.add('active');
            buttonMap.classList.remove('active');
		}
		buttonList.setAttribute('aria-pressed', 'true');
		buttonMap.setAttribute('aria-pressed', 'false');
		sectionMapMobileList.classList.remove('hidden');
        sectionMapMobileMap.classList.add('hidden');
	}
	else{
		if (!buttonMap.classList.contains('active')) {
			buttonMap.classList.add('active');
            buttonList.classList.remove('active');
		}
		buttonMap.setAttribute('aria-pressed', 'true');
		buttonList.setAttribute('aria-pressed', 'false');
		sectionMapMobileMap.classList.remove('hidden');
        sectionMapMobileList.classList.add('hidden');
        // Vue carte affichee au chargement (ex. apres une recherche) : la carte
        // etait masquee lors de son initialisation, on la rafraichit.
        refreshMobileMapView();
	}
}

function sectionFilterDisplayButton() {
    const buttonDisplay = document.querySelector('[data-js-section-filters-button-display]');
    const blockDisplay = document.querySelector('[data-js-section-filters-block-display]');

    if (!buttonDisplay || !blockDisplay) {
        return;
    }

    const selectedAccordion = document.querySelector('.tc-homepage-filters-accordion.selected');

    if (selectedAccordion) {
        buttonDisplay.classList.add('hidden');
        blockDisplay.classList.remove('hidden');
    } else {
        buttonDisplay.addEventListener('click', function() {
            this.classList.add('hidden');
            blockDisplay.classList.remove('hidden');
        });
    }
}

function initializePopovers() {
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-js-popover-trigger]'));
    popoverTriggerList.forEach(function (popoverTriggerEl) {
        popoverTriggerEl.addEventListener('click', function() {
			displayPopovers(popoverTriggerEl);
	    });
	    popoverTriggerEl.addEventListener('keydown', function(event) {
			if (event.key === 'Enter' || event.keyCode === 13) {
				displayPopovers(popoverTriggerEl);
			}
		});
    });
}


function displayPopovers(popoverTriggerEl) {
    const popoverTriggerElId = popoverTriggerEl.id;
    const popoverId = document.querySelector(`#${popoverTriggerElId}-popover`);
    const focusableElements = 'checkbox, a, input, select, textarea';
    const firstFocusableElement = popoverId.querySelectorAll(focusableElements)[0];
    popoverId.parentNode.classList.remove('hidden');
    firstFocusableElement.focus();
    handleAccessibilityModal(popoverId);
    popoverTriggerEl.setAttribute('data-focus', '');
}


function handleAccessibilityModal(modal) {
	const focusableElements = 'button, a, input, select, textarea';
	const firstFocusableElement = modal.querySelectorAll(focusableElements)[0];
	const focusableContent = modal.querySelectorAll(focusableElements);
	const lastFocusableElement = focusableContent[focusableContent.length - 1];

	modal.addEventListener('keydown', function(e) {
		if (e.key === 'Tab' || e.keyCode === 9) {
			if (e.shiftKey) {
				if (document.activeElement === firstFocusableElement) {
					lastFocusableElement.focus();
					e.preventDefault();
				}
			} else {
				if (document.activeElement === lastFocusableElement) {
					console.log('last')
					firstFocusableElement.focus();
					e.preventDefault();
				}
			}
		}
	})
}

function closePopovers() {
	const popovers = document.querySelectorAll('[data-js-popover]');

	popovers.forEach(popover => {
		const overlay = popover.parentNode.querySelector('[data-js-popover-overlay]');
		overlay.addEventListener('click', function() {
			popover.parentNode.classList.add('hidden');
		});

		const button = popover.querySelector('[data-js-popover-button-close]');
		button.addEventListener('click', function() {
			popover.parentNode.classList.add('hidden');
		});
	});

	const dataFocus = document.querySelector('[data-focus]');
	if( dataFocus !== null )
	{
		dataFocus.focus();
		dataFocus.removeAttribute('data-focus');
	}
}

function displaySearchButton() {
    const radioButtons = document.querySelectorAll('[data-js-popover-sport-checkboxes] input[type="radio"]');

    function checkHomepageRadioButtons() {
    	const reinitButtons = document.querySelectorAll('[data-js-reinit-button]');
    	const searchButtons = document.querySelectorAll('[data-js-search-button]');
    	let isChecked = false;

    	radioButtons.forEach(function(radioButton) {
    		if (radioButton.checked)
    		{
    			isChecked = true;
    		}
    	});

    	const mobileSearchBlock = document.querySelector('[data-js-mobile-search-block]');
    	if (isChecked)
    	{
    		mobileSearchBlock.classList.remove('hidden');
    		reinitButtons.forEach(reinitButton => {
    			reinitButton.disabled = false;
    		});
    		searchButtons.forEach(searchButton => {
    			searchButton.disabled = false;
    		});
    	}
    }

    radioButtons.forEach(function(radioButton) {
        radioButton.addEventListener('change', checkHomepageRadioButtons);
    });

     checkHomepageRadioButtons();
}

function popoverLocationReinitializationDesktop() {
	const popoverLocationButtons = document.querySelectorAll("[data-js-popover-location-button]");
	const popoverLocationInput = document.querySelector("[data-js-popover-location-input]");
	const popupLocationTrigger = document.getElementById("whereToPlay");
	const accLocationTrigger = document.getElementById("accWhereToPlay");

	if (!popoverLocationInput) return;

	function updateButtonsState() {
    		const isEmpty = popoverLocationInput.value.trim() === '';
    		popoverLocationButtons.forEach(button => {
    			button.disabled = isEmpty;
    		});
    	}

	popoverLocationButtons.forEach(button => {
		button.addEventListener('click', function() {
			popoverLocationInput.value = '';
			updateButtonsState();
		});
	});

	popoverLocationInput.addEventListener('input', updateButtonsState);

	if ( popupLocationTrigger )
	{
        popupLocationTrigger.addEventListener('click', () => {
            updateButtonsState();
        });
    	}

    if ( accLocationTrigger )
    {
        accLocationTrigger.addEventListener('click', () => {
            updateButtonsState();
        })
    }
}

function popoverLocationReinitializationMobile() {
	const popoverLocationButtons = document.querySelectorAll("[data-js-popover-location-button]");
	const popoverLocationInputs = document.querySelectorAll("[data-js-popover-location-input]");
	const popupLocationTrigger = document.getElementById("whereToPlay");
	const accLocationTrigger = document.getElementById("accWhereToPlay");

	function updateButtonsState() {
		const isEmpty = [...popoverLocationInputs].every(
			input => !input || typeof input.value !== 'string' || input.value.trim() === ''
		);
		popoverLocationButtons.forEach(button => {
			button.disabled = isEmpty;
		});
	}

	popoverLocationButtons.forEach(button => {
		button.addEventListener('click', function() {
			console.log('reinit')
			popoverLocationInputs.forEach( popoverLocationInput => {
				popoverLocationInput.value = '';
			});
			updateButtonsState();
		});
	});

	popoverLocationInputs.forEach( popoverLocationInput => {
		popoverLocationInput.addEventListener('input', updateButtonsState);
	});

	if ( popupLocationTrigger )
	{
        popupLocationTrigger.addEventListener('click', () => {
            updateButtonsState();
        });
    	}

    if ( accLocationTrigger )
    {
        accLocationTrigger.addEventListener('click', () => {
            updateButtonsState();
        })
    }
}

function popoverDateReinitializationDesktop() {
	const popoverDateButtons  = document.querySelectorAll("[data-js-popover-date-button-desktop]");
	const popoverDateCheckboxes = document.querySelectorAll("[data-js-popover-location-checkboxes-desktop] input[type='checkbox']");
	const popupDateTrigger = document.getElementById("whenToPlay");
	const accDateTrigger = document.getElementById("accWhenToPlay");

	popoverDateCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            popoverToggleButtonState(popoverDateCheckboxes, popoverDateButtons);
        });
    });

    popoverDateButtons.forEach(button => {
        button.addEventListener('click', function() {
            popoverDeactivateCheckboxes(popoverDateCheckboxes, popoverDateButtons);
            initHourFromAndHourToByDefault();
        });
    });

    if ( popupDateTrigger )
    {
        popupDateTrigger.addEventListener('click', () => {
            popoverToggleButtonState(popoverDateCheckboxes, popoverDateButtons);
        });
    }

    if ( accDateTrigger )
    {
        accDateTrigger.addEventListener('click', () => {
            popoverToggleButtonState(popoverDateCheckboxes, popoverDateButtons);
        });
    }

    popoverToggleButtonState(popoverDateCheckboxes, popoverDateButtons);
}

function popoverDateReinitializationMobile() {
	const popoverDateButtons  = document.querySelectorAll("[data-js-popover-date-button-mobile]");
	const popoverDateCheckboxes = document.querySelectorAll("[data-js-popover-location-checkboxes-mobile] input[type='checkbox']");
	const popupDateTrigger = document.getElementById("whenToPlay");
	const accDateTrigger = document.getElementById("accWhenToPlay");

	popoverDateCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            popoverToggleButtonState(popoverDateCheckboxes, popoverDateButtons);
        });
    });

    popoverDateButtons.forEach(button => {
        button.addEventListener('click', function() {
            popoverDeactivateCheckboxes(popoverDateCheckboxes, popoverDateButtons);
            initHourFromAndHourToByDefault();
        });
    });

    if ( popupDateTrigger )
    {
        popupDateTrigger.addEventListener('click', () => {
            popoverToggleButtonState(popoverDateCheckboxes, popoverDateButtons);
        });
    }

    if ( accDateTrigger )
    {
        accDateTrigger.addEventListener('click', () => {
            popoverToggleButtonState(popoverDateCheckboxes, popoverDateButtons);
        });
    }

    popoverToggleButtonState(popoverDateCheckboxes, popoverDateButtons);
}

function popoverCriteriasReinitializationDesktop() {
	const popoverCriteriasButtons  = document.querySelectorAll("[data-js-popover-criterias-button-desktop]");
	const popoverCriteriasCheckboxes = document.querySelectorAll("[data-js-popover-criterias-checkboxes-desktop] input[type='checkbox']");
	const popupCriteriasTrigger = document.getElementById("criterias");
	const accCriteriasTrigger = document.getElementById("accCriterias");

	popoverCriteriasCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            popoverToggleButtonState(popoverCriteriasCheckboxes, popoverCriteriasButtons);
        });
    });

    popoverCriteriasButtons.forEach(button => {
        button.addEventListener('click', function() {
            popoverDeactivateCheckboxes(popoverCriteriasCheckboxes, popoverCriteriasButtons);
        });
    });

    if ( popupCriteriasTrigger )
    {
        popupCriteriasTrigger.addEventListener('click', () => {
            popoverToggleButtonState(popoverCriteriasCheckboxes, popoverCriteriasButtons);
        });
    }

    if ( accCriteriasTrigger )
    {
        accCriteriasTrigger.addEventListener('click', () => {
            popoverToggleButtonState(popoverCriteriasCheckboxes, popoverCriteriasButtons);
        });
    }

    popoverToggleButtonState(popoverCriteriasCheckboxes, popoverCriteriasButtons);
}

function popoverCriteriasReinitializationMobile() {
	const popoverCriteriasButtons  = document.querySelectorAll("[data-js-popover-criterias-button-mobile]");
	const popoverCriteriasCheckboxes = document.querySelectorAll("[data-js-popover-criterias-checkboxes-mobile] input[type='checkbox']");
	const popupCriteriasTrigger = document.getElementById("criterias");
	const accCriteriasTrigger = document.getElementById("accCriterias");

	popoverCriteriasCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            popoverToggleButtonState(popoverCriteriasCheckboxes, popoverCriteriasButtons);
        });
    });

    popoverCriteriasButtons.forEach(button => {
        button.addEventListener('click', function() {
            popoverDeactivateCheckboxes(popoverCriteriasCheckboxes, popoverCriteriasButtons);
        });
    });

    if ( popupCriteriasTrigger )
    {
        popupCriteriasTrigger.addEventListener('click', () => {
            popoverToggleButtonState(popoverCriteriasCheckboxes, popoverCriteriasButtons);
        });
    }

    if ( accCriteriasTrigger )
    {
        accCriteriasTrigger.addEventListener('click', () => {
            popoverToggleButtonState(popoverCriteriasCheckboxes, popoverCriteriasButtons);
        });
    }

    popoverToggleButtonState(popoverCriteriasCheckboxes, popoverCriteriasButtons);
}

/**
 * Gère l'état désactivé d'un élément de manière accessible,
 * que ce soit un <button> (propriété .disabled) ou un <a>
 * (aria-disabled + tabindex + classe CSS "disabled").
 */
function setElementDisabled(el, disabled) {
    if (!el) return;
    if (el.tagName === 'A') {
        if (disabled) {
            el.setAttribute('aria-disabled', 'true');
            el.setAttribute('tabindex', '-1');
            el.classList.add('disabled');
        } else {
            el.setAttribute('aria-disabled', 'false');
            el.removeAttribute('tabindex');
            el.classList.remove('disabled');
        }
    } else {
        el.disabled = disabled;
    }
}

function popoverToggleButtonState(checkboxes, buttons) {
    const isChecked = Array.from(checkboxes).some(checkbox => checkbox.checked);

	if (!buttons || buttons.length === 0) return;

    if (buttons.length > 1) {
		buttons.forEach(button => {
	        setElementDisabled(button, !isChecked);
	    });
	} else {
		setElementDisabled(buttons, !isChecked);
	}
}

function popoverDeactivateCheckboxes(checkboxes, buttons) {
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            checkbox.checked = false;
        }
    });
    popoverToggleButtonState(checkboxes, buttons);
}

function addSelectedByDefault(valueToSelected, selectInput)
{
	for(var i, j = 0; i = selectInput.options[j]; j++)
	{
		if(i.value == valueToSelected)
		{
			selectInput.selectedIndex = j;
			break;
		}
	}
}

function initHourFromAndHourToByDefault()
{
    var hourFromByDefault = '08:00';
    var hourToByDefault = '22:00'

    const selectHourFromDesktop = document.querySelector('[name=selectHourFrom-desktop]');
    const selectHourFromMobile = document.querySelector('[name=selectHourFrom-mobile]');
    const selectHourToDesktop = document.querySelector('[name=selectHourTo-desktop]');
    const selectHourToMobile = document.querySelector('[name=selectHourTo-mobile]');

    if ( selectHourFromDesktop )
    {
        addSelectedByDefault( hourFromByDefault, selectHourFromDesktop );
    }

    if ( selectHourFromMobile )
    {
        addSelectedByDefault( hourFromByDefault, selectHourFromMobile );
    }

    if ( selectHourToDesktop )
    {
        addSelectedByDefault( hourToByDefault, selectHourToDesktop );
    }

    if ( selectHourToMobile )
    {
        addSelectedByDefault(hourToByDefault, selectHourToMobile);
    }
}

function profilTarificationRadioActivateValidation() {
	const profilTarificationValidationButton  = document.querySelector("[data-js-profil-tarification-validation-button]");
	const profilTarificationRadios = document.querySelectorAll("[data-js-profil-tarification-radio] input[type='radio']");

	profilTarificationRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            popoverToggleButtonState(profilTarificationRadios, profilTarificationValidationButton);
        });
    });

    popoverToggleButtonState(profilTarificationRadios, profilTarificationValidationButton);
}

function profilTarificationInputFileActivateValidation() {
	const profilTarificationValidationButton = document.querySelector("[data-js-profil-tarification-validation-button]");

	function checkAllFiles() {
		const inputFiles = $("[data-js-profil-tarification-input-file] input[type='file']");
		checkFiles(inputFiles, profilTarificationValidationButton);
	}

	$(document).on('fileuploaddone', '.pieceJointeUploadHandler', () => {
		setElementDisabled(profilTarificationValidationButton, true);
		setTimeout(() => {
			checkAllFiles();
		}, 1000);
	});

	$(document).on('click', '.deleteSingleFile', () => {
		setElementDisabled(profilTarificationValidationButton, true);
		setTimeout(() => {
			checkAllFiles();
		}, 1000);
	});

	checkAllFiles();
}

function inscriptionC1D1InputFileActivateValidation() {
	const inscriptionC1D1ValidationButton = document.querySelector("[data-js-inscription-c1d1-validation-button]");

	function checkAllFiles() {
		const inputFiles = $("[data-js-inscription-c1d1-input-file] input[type='file']");
		checkFiles(inputFiles, inscriptionC1D1ValidationButton);
	}

	$(document).on('fileuploaddone', '.pieceJointeUploadHandler', () => {
		inscriptionC1D1ValidationButton.disabled = true;
		setTimeout(() => {
			checkAllFiles();
		}, 1000);
	});

	$(document).on('click', '.deleteSingleFile', () => {
		inscriptionC1D1ValidationButton.disabled = true;
		setTimeout(() => {
			checkAllFiles();
		}, 1000);
	});

	checkAllFiles();
}

function checkFiles(fileInputs, submitButton) {
	setTimeout(() => {
		let nbFilesSelected = 0;
		fileInputs.each(function() {
			const nbFiles = $(this).closest('.dropzone').find('.files-group li').length;
			if (nbFiles > 0 ) {
				nbFilesSelected += 1;
			}
		});

		setElementDisabled(submitButton, nbFilesSelected == 0);
	}, 1000);
}

function centerSlotReservation() {
	const radioGroups = document.querySelectorAll('[data-js-center-slot-container]');
	const alertsAllSlots = document.querySelectorAll('[data-js-center-slot-alert]');
	const captchaEnabled = document.getElementById('captcha-enabled').value == 1;
	
	window._pendingRedirect = null;
	window._redirectDone = false;

	if (captchaEnabled) {
		const modalEl = document.getElementById('tc-centre-sportif-modal-captchaModal');
		window.captchaModal = bootstrap.Modal.getOrCreateInstance(modalEl, {
			backdrop: 'static',
			keyboard: false
		});
		window.captchaModal.hide();
	}
	
	radioGroups.forEach(group => {
		const radioButtons = group.querySelectorAll('input[type="radio"]');
		const submitButton = group.querySelector('[data-js-center-slot-button]');
		const alerts = group.querySelectorAll('[data-js-center-slot-alert]');

		radioButtons.forEach(radio => {
			radio.addEventListener('change', () => {
				// Hide all buttons first
				document.querySelectorAll('[id="btnReserverCreneau"]').forEach(button => button.classList.add('d-none'));
				// Show the button related to the selected radio button
				submitButton.classList.remove('d-none');
				if (alertsAllSlots && alertsAllSlots.forEach) {
					alertsAllSlots.forEach(alert => {
						alert.classList.add('d-none');
					});
				}
				if (alerts && alerts.forEach) {
					alerts.forEach(alert => {
						alert.classList.remove('d-none');
					});
				}
			});
		});
		
		if (captchaEnabled) {
			submitButton.addEventListener('click', (e) => {
				e.preventDefault();
				if(document.getElementById('li-antibot-token-code').value != 100)
				{
					window._pendingRedirect = e.currentTarget.href;
					toggleCaptcha();
				} else {
					redirectToReservation(e.currentTarget);
				}
			});
		}
	});

	if (captchaEnabled) {
		document.getElementById('tc-centre-sportif-modal-captchaModal').addEventListener('hidden.bs.modal', () => {
			if (!window._redirectDone && window._pendingRedirect) {
		        window._redirectDone = true;
		        window.location.href = window._pendingRedirect;
		    }
		});

		initCaptcha();
	}
}

function carouselsTennisInit() {
	var carousels = document.querySelectorAll('.carousel');
	carousels.forEach(function (carouselElement) {
		var carousel = new bootstrap.Carousel(carouselElement, {
        	interval: false,
			wrap: true
		});

		var prevButton = carouselElement.querySelector('.carousel-control-prev');
		var nextButton = carouselElement.querySelector('.carousel-control-next');

		prevButton.addEventListener('click', function () {
			carousel.prev();
		});

		nextButton.addEventListener('click', function () {
			carousel.next();
		});
	});
}

document.querySelectorAll('[data-js-profil-tarification-etape-1] .btn-selection').forEach(selection => {
    selection.addEventListener('click', e => {
        const radio = selection.querySelector('input[type="radio"]');
        if (!radio || radio.disabled) {
			return;
		}

        e.preventDefault();

        const isActive = selection.classList.contains('active');

        document.querySelectorAll('[data-js-profil-tarification-etape-1] .btn-selection').forEach(other => {
            other.classList.remove('active');
            const input = other.querySelector('input[type="radio"]');
            if (input) {
				setTimeout(() => {
					input.checked = false;
					radio.dispatchEvent(new Event('change', { bubbles: true }));
				}, 0);
			}
        });

        if (!isActive) {
			setTimeout(() => {
			    radio.checked = true;
				radio.dispatchEvent(new Event('change', { bubbles: true }));
			}, 0);
            selection.classList.add('active');
        }
    });
});

function onLikeClicked(e) {
	e.stopPropagation();
	const btn = e.currentTarget;
	const id = btn.dataset.id;
	const buttons = document.querySelectorAll('.btn-favoris[data-id="'+ id +'"]');
	$.ajax({
		url : 'jsp/site/Portal.jsp?page=favoris&equipementId=' + id,
		beforeSend() {
			buttons.forEach(button => button.style.display = 'none');
		},
    	success(data){
			if( data.favoris ) {
				buttons.forEach(button => button.classList.add('active'));
			} else  {
				buttons.forEach(button => button.classList.remove('active'));
			}
		},
		complete() {
			buttons.forEach(button => button.style.display = 'inline');
		}
	});
}

function reservationEtape1Init() {
	// btns
	const btnAddPartner = document.querySelector('[data-js-reservation-etape1-btn-add-partner]');
	const btnCancel = document.querySelector('[data-js-reservation-etape1-btn-cancel]');
	const btnSearch = document.querySelector('[data-js-reservation-etape1-btn-search]');
	var btnEtapeNext = document.querySelector('[data-js-reservation-etape1-btn-etape-2]');
	if(!btnEtapeNext){
		btnEtapeNext = document.querySelector('[data-js-reservation-etape1-btn-etape-3]');
	}
	const btnCreatePartner = document.querySelector('[data-js-reservation-etape1-btn-create-partner]');
	// blocs
	const blocAddPartnerRadioGroup = document.querySelector('#addPartnerRadioGroup');
	const blocSearchPartenaire = document.querySelector('#blocSearchPartenaire');
	const blocNewPartenaire = document.querySelector("#blocNewPartenaire");
	const blocPartenaireNonFavoris = document.querySelector("#blocPartenaireNonFavoris");
	const blocSearchResult = document.querySelector("#blocSearchResult");
	// radioboxes
	const addPartnerRadioKnown =  document.querySelector('[data-js-reservation-etape1-add-partner-radio-known]');
	const addPartnerRadioUnknown =  document.querySelector('[data-js-reservation-etape1-add-partner-radio-unknown]');
	if (btnAddPartner) {
		btnAddPartner.addEventListener('click', function () {
			blocAddPartnerRadioGroup.classList.remove('hidden');
			btnAddPartner.classList.add('hidden');
		});
	}
	if (btnCancel) {
		btnCancel.addEventListener('click', function () {
			resetAllAddPartenaireBlocs();
		});
	}
	addPartnerRadioKnown.addEventListener('change', function () {
		if (addPartnerRadioKnown.checked) {
	    	blocSearchPartenaire.classList.remove('hidden');
	    	const blocEtape1AlertPartner = document.querySelector('[data-js-reservation-etape1-alert-partner]');
	    	if(blocEtape1AlertPartner) {
				blocEtape1AlertPartner.classList.add('hidden');
			}
			const card01 = document.getElementById('cardAddPartner01');
			const card02 = document.getElementById('cardAddPartner02');
			if (card01) card01.classList.add('tc-radio-card-selected');
			if (card02) card02.classList.remove('tc-radio-card-selected');
	    }
	});
	addPartnerRadioUnknown.addEventListener('change', function () {
		if (addPartnerRadioUnknown.checked) {
	    	blocSearchPartenaire.classList.add('hidden');
	    	blocSearchResult.classList.add('hidden');
	    	const blocEtape1AlertPartner = document.querySelector('[data-js-reservation-etape1-alert-partner]');
	    	if(blocEtape1AlertPartner) {
				blocEtape1AlertPartner.classList.remove('hidden');
			}
			const card01 = document.getElementById('cardAddPartner01');
			const card02 = document.getElementById('cardAddPartner02');
			if (card01) card01.classList.remove('tc-radio-card-selected');
			if (card02) card02.classList.add('tc-radio-card-selected');
	    }
	});
	btnSearch.addEventListener('click', function () {
		blocNewPartenaire.classList.add('hidden');
		filterPartenaires();
	});
	btnCreatePartner.addEventListener('click', function () {
		addNewPartenaire();
		blocPartenaireNonFavoris.classList.remove('hidden');
	});
	updateSelectedNames();
	initBlocNonFavoris();
	initBlocFavoris();
}

function updateListPartenaireFavoris(p){
	const blocPartenaireFavoris = document.querySelector("#blocPartenaireFavoris");
	blocPartenaireFavoris.classList.remove('hidden');
	const ulList = document.querySelector('[data-js-reservation-etape1-favoris-partenaire-list]');
	const item = `<li class="d-flex flex-column mt-4 me-lg-5 pe-lg-5">
							<div class=" form-check mb-2 btn-selection">
								<div class="selection-check">
    								<input type="checkbox" id="checkboxPartenaire_${p.id}" name="checkboxPartenaire_${p.id}" class="form-check-input" value="${p.id}" checked>
									<label class="form-check-label" for="checkboxPartenaire_${p.id}">
										${p.prenom} ${p.nom}
									</label>
								</div>
								<p class="selection-subtitle ms-m my-sm">${p.mailMasked}</p>
							</div>
							<input type="hidden" class=" form-control" name="checkboxPartenaire_${p.id}-id" id="checkboxPartenaire_${p.id}-id" value="${p.id}">
							<input type="hidden" class=" form-control" name="checkboxPartenaire_${p.id}-nom" id="checkboxPartenaire_${p.id}-nom" value="${p.nom}">
							<input type="hidden" class=" form-control" name="checkboxPartenaire_${p.id}-prenom" id="checkboxPartenaire_${p.id}-prenom" value="${p.prenom} ">
							<p class="m-0 main-success-color font-bold"><svg class="paris-icon paris-icon-check" data-mce-svg="paris-icon paris-icon-check" aria-labelledby="paris-icon-check-paris-title-25543745160991" focusable="false" role="img">
							<title id="paris-icon-check-paris-title-25543745160991">check</title>
							<use xlink:href="#paris-icon-check"></use></svg>Favoris</p>
						</li>`;
	ulList.insertAdjacentHTML("beforeend", item);
	initBlocFavoris();
}

function resetAllAddPartenaireBlocs(selectDefaultRadio = true)
{
	const btnAddPartner = document.querySelector('[data-js-reservation-etape1-btn-add-partner]');
	const blocAddPartnerRadioGroup = document.querySelector('#addPartnerRadioGroup');
	const blocSearchPartenaire = document.querySelector('#blocSearchPartenaire');
	const blocNewPartenaire = document.querySelector("#blocNewPartenaire");
	const blocSearchResult = document.querySelector("#blocSearchResult");
	const blocEtapeAlertPartner = document.querySelector('[data-js-reservation-etape1-alert-partner]');

	resetBlocAddPartnerRadioGroup();
	blocSearchPartenaire.classList.add('hidden');
	resetBlocSearchPartenaire();
	blocSearchResult.classList.add('hidden');
	blocNewPartenaire.classList.add('hidden');
	resetBlocNewPartenaire();

	// Sélectionner "Ajouter un nouveau partenaire plus tard" par défaut
	if (selectDefaultRadio) {
		const addPartnerRadioUnknown = document.querySelector('[data-js-reservation-etape1-add-partner-radio-unknown]');
		if (addPartnerRadioUnknown) {
			addPartnerRadioUnknown.checked = true;
			const card02 = document.getElementById('cardAddPartner02');
			if (card02) card02.classList.add('tc-radio-card-selected');
			if (blocEtapeAlertPartner) blocEtapeAlertPartner.classList.remove('hidden');
		} else {
			if (blocEtapeAlertPartner) blocEtapeAlertPartner.classList.add('hidden');
		}
	}

	const maxJoueurInput = document.getElementById('maxJoueur');
    const maxJoueur = parseInt(maxJoueurInput?.value || '0', 10);
    const maxPartenaires = maxJoueur > 0 ? maxJoueur - 1 : 0;
	const bloc = document.getElementById('blocListPartenaireOfCard');
    const allParagraphs = bloc.querySelectorAll('p[data-partner-name]');
    const partnerCount = allParagraphs.length;
    if (partnerCount >= maxPartenaires && btnAddPartner) {
        btnAddPartner.classList.add('hidden');
    }else if(btnAddPartner && blocAddPartnerRadioGroup.classList.contains('hidden')){
		btnAddPartner.classList.remove('hidden');
	}
}

function filterPartenaires() {
   	const firstNameInput = document.querySelector("#firstName").value;
   	const firstNameField = document.querySelector("#firstName");
    const lastNameInput = document.querySelector("#lastName").value;
    const lastNameField = document.querySelector("#lastName");
    const emailInput = document.querySelector("#mail").value;
    const emailField = document.querySelector("#mail");
    const dateBirthInput = document.querySelector("#dateBirth").value;
    const dateBirthField = document.querySelector("#dateBirth");

	const alertErrorFirstName = document.querySelector('[data-js-reservation-etape1-btn-search-validation-error-firstname]');
	const alertErrorLastName = document.querySelector('[data-js-reservation-etape1-btn-search-validation-error-lastname]');
	const alertErrorMail = document.querySelector('[data-js-reservation-etape1-btn-search-validation-error-mail]');
	const alertErrorBirthDate = document.querySelector('[data-js-reservation-etape1-btn-search-validation-error-birthdate]');
	resetAlertBlocSearchPartenaire();
	resetBlocNewPartenaire();

	const blocSearchResult = document.querySelector("#blocSearchResult");
	if( !firstNameInput || firstNameInput.trim() === "" ){
		alertErrorFirstName.classList.remove('hidden');
		alertErrorFirstName.style.display = 'block';
		alertErrorLastName.classList.add('hidden');
		alertErrorLastName.style.removeProperty('display');
		alertErrorBirthDate.classList.add('hidden');
		alertErrorBirthDate.style.removeProperty('display');
		alertErrorMail.classList.add('hidden');
		alertErrorMail.style.removeProperty('display');
		firstNameField.classList.add('is-invalid');
		firstNameField.setAttribute('aria-invalid', 'true');
		blocSearchResult.classList.add('hidden');
		return;
	}else if( !lastNameInput || lastNameInput.trim() === "" ){
		alertErrorFirstName.classList.add('hidden');
		alertErrorFirstName.style.removeProperty('display');
		alertErrorLastName.classList.remove('hidden');
		alertErrorLastName.style.display = 'block';
		alertErrorBirthDate.classList.add('hidden');
		alertErrorBirthDate.style.removeProperty('display');
		alertErrorMail.classList.add('hidden');
		alertErrorMail.style.removeProperty('display');
		lastNameField.classList.add('is-invalid');
		lastNameField.setAttribute('aria-invalid', 'true');
		blocSearchResult.classList.add('hidden');
		return;
	}else if( !dateBirthInput || dateBirthInput.trim() === "" ){
		alertErrorFirstName.classList.add('hidden');
		alertErrorFirstName.style.removeProperty('display');
		alertErrorLastName.classList.add('hidden');
		alertErrorLastName.style.removeProperty('display');
		alertErrorBirthDate.classList.remove('hidden');
		alertErrorBirthDate.style.display = 'block';
		alertErrorMail.classList.add('hidden');
		alertErrorMail.style.removeProperty('display');
		dateBirthField.classList.add('is-invalid');
		dateBirthField.setAttribute('aria-invalid', 'true');
		blocSearchResult.classList.add('hidden');
		return;
	}else if( !isValidDateDDMMYYYY(dateBirthInput.trim()) ){
		const alertErrorBirthDateInvalid = document.querySelector('[data-js-reservation-etape1-btn-search-validation-error-birthdate-invalid]');
		alertErrorFirstName.classList.add('hidden');
		alertErrorFirstName.style.removeProperty('display');
		alertErrorLastName.classList.add('hidden');
		alertErrorLastName.style.removeProperty('display');
		alertErrorBirthDate.classList.add('hidden');
		alertErrorBirthDate.style.removeProperty('display');
		alertErrorBirthDateInvalid.classList.remove('hidden');
		alertErrorBirthDateInvalid.style.display = 'block';
		alertErrorMail.classList.add('hidden');
		alertErrorMail.style.removeProperty('display');
		dateBirthField.classList.add('is-invalid');
		dateBirthField.setAttribute('aria-invalid', 'true');
		blocSearchResult.classList.add('hidden');
		return;
	}else if( emailInput && !isValidEmail(emailInput.trim()) ){
		alertErrorFirstName.classList.add('hidden');
		alertErrorFirstName.style.removeProperty('display');
		alertErrorLastName.classList.add('hidden');
		alertErrorLastName.style.removeProperty('display');
		alertErrorBirthDate.classList.add('hidden');
		alertErrorBirthDate.style.removeProperty('display');
		alertErrorMail.classList.remove('hidden');
		alertErrorMail.style.display = 'block';
		emailField.classList.add('is-invalid');
		emailField.setAttribute('aria-invalid', 'true');
		blocSearchResult.classList.add('hidden');
		return;
	}

	blocSearchResult.classList.remove('hidden');

    let requestParamToAdd = "";
    if (lastNameInput){
		requestParamToAdd = requestParamToAdd + "&nom=" + lastNameInput.trim()
	}
	if (firstNameInput){
		requestParamToAdd = requestParamToAdd + "&prenom=" + firstNameInput.trim()
	}
	if (emailInput){
		requestParamToAdd = requestParamToAdd + "&mail=" + emailInput.trim()
	}
	if (dateBirthInput){
		requestParamToAdd = requestParamToAdd + "&dateBirth=" + dateBirthInput.trim()
	}

    $.ajax({ url: "jsp/site/Portal.jsp?page=reservation-etape-1&view=getPartenairesFiltered"+requestParamToAdd,
             async: false,
             dataType: 'json',
             success: function( result ){
				if(result){
					renderFilterResult(result);
					const alertErrorHasSuspendu = document.querySelector('#blocHasPartnerSuspendu');
					const alertErrorHasQuotaDepassed = document.querySelector('#blocHasPartnerQuota');
					alertErrorHasSuspendu.classList.add('hidden');
					alertErrorHasQuotaDepassed.classList.add('hidden');
					result.forEach(p => {
						if(p.isSuspendu=='true'){
							alertErrorHasSuspendu.classList.remove('hidden');
						}
						if(p.disabled=='true'){
							alertErrorHasQuotaDepassed.classList.remove('hidden');
						}
					});
				}
             },
             error: function (jqXhr, textStatus, errorMessage) {
                 console.log('Error: ' + errorMessage);
        	 }
    });
}

function renderFilterResult(listJoueur) {
    const ulList = document.querySelector('[data-js-reservation-etape1-search-result-list]');
    ulList.innerHTML = "";
    const blocNewPartenaire = document.querySelector("#blocNewPartenaire");
    const blocSearchPartenaireTitle = document.querySelector('[data-js-reservation-etape1-search-result-title]');
    const blocSearchResult = document.querySelector("#blocSearchResult");

	if (listJoueur.length === 0) {
		blocSearchResult.classList.add('hidden');
	    blocNewPartenaire.classList.remove('hidden');
	    const lastNameVal = document.querySelector('#lastName')?.value || '';
	    const firstNameVal = document.querySelector('#firstName')?.value || '';
	    const dateBirthVal = document.querySelector('#dateBirth')?.value || '';
	    const lastNameNew = document.getElementById('lastNameNew');
	    const firstNameNew = document.getElementById('firstNameNew');
	    const dateBirthNew = document.getElementById('dateBirthNew');
	    if (lastNameNew) { lastNameNew.value = lastNameVal; lastNameNew.setAttribute('readonly', 'readonly'); }
	    if (firstNameNew) { firstNameNew.value = firstNameVal; firstNameNew.setAttribute('readonly', 'readonly'); }
	    if (dateBirthNew) { dateBirthNew.value = dateBirthVal; dateBirthNew.setAttribute('readonly', 'readonly'); }

	    // Déclencher setupToggle pour activer le bouton (les champs sont remplis)
	    if (firstNameNew) firstNameNew.dispatchEvent(new Event('input'));

	    const btnCreate = document.querySelector('[data-js-reservation-etape1-btn-create-partner]');
	    if (btnCreate && lastNameVal && firstNameVal && dateBirthVal) {
		    // Désactiver si le joueur recherché est le réservataire
		    const reservataireNomEl = document.getElementById('reservataireNom');
		    const reservatairePrenomEl = document.getElementById('reservatairePrenom');
		    const reservataireDateEl = document.getElementById('reservataireDateNaissance');
		    if (reservataireNomEl && reservatairePrenomEl && reservataireDateEl) {
			    const isReservataire =
				    lastNameVal.trim().toUpperCase() === reservataireNomEl.value.trim().toUpperCase() &&
				    firstNameVal.trim().toUpperCase() === reservatairePrenomEl.value.trim().toUpperCase() &&
				    dateBirthVal.trim() === convertToISODateFormat(reservataireDateEl.value.trim());
			    if (isReservataire) { btnCreate.disabled = true; return; }
		    }
		    // Désactiver si le joueur est déjà dans la réservation (doublon)
		    const partnerKey = (lastNameVal.trim() + '|' + firstNameVal.trim()).toUpperCase();
		    const allPartners = document.querySelectorAll(
			    '#blocPartenaireNonFavoris input[type="checkbox"][id^="checkboxPartenaire_"], ' +
			    '#blocPartenaireFavoris input[type="checkbox"][id^="checkboxPartenaire_"]'
		    );
		    let isDuplicate = false;
		    allPartners.forEach(cb => {
			    const nomEl = document.getElementById(cb.id + '-nom');
			    const prenomEl = document.getElementById(cb.id + '-prenom');
			    if (nomEl && prenomEl) {
				    if ((nomEl.value.trim() + '|' + prenomEl.value.trim()).toUpperCase() === partnerKey) {
					    isDuplicate = true;
				    }
			    }
		    });
		    if (isDuplicate) btnCreate.disabled = true;
	    }
	    return;
	}

	if (listJoueur.length === 1) {
	    blocSearchPartenaireTitle.innerHTML=listJoueur.length + ' résultat';
	}else{
		blocSearchPartenaireTitle.innerHTML=listJoueur.length + ' résultats';
	}

	// Références du réservataire pour désactiver son propre résultat
	const reservataireNomEl = document.getElementById('reservataireNom');
	const reservatairePrenomEl = document.getElementById('reservatairePrenom');
	const reservataireDateEl = document.getElementById('reservataireDateNaissance');

	listJoueur.forEach(p => {
	    const pNom = (p.nom || '').trim().toUpperCase();
	    const pPrenom = (p.prenom || '').trim().toUpperCase();
	    const pDate = (p.dateNaissance || '').trim();

	    // 1. Le résultat correspond au réservataire lui-même
	    let isReservataire = false;
	    if (reservataireNomEl && reservatairePrenomEl && reservataireDateEl) {
	        isReservataire =
	            pNom === reservataireNomEl.value.trim().toUpperCase() &&
	            pPrenom === reservatairePrenomEl.value.trim().toUpperCase() &&
	            pDate === convertToISODateFormat(reservataireDateEl.value.trim());
	    }

	    // 2. Le résultat est déjà présent dans les favoris ou dans les nouveaux partenaires
	    const partnerKey = pNom + '|' + pPrenom;
	    let isAlreadyAdded = false;
	    document.querySelectorAll(
	        '#blocPartenaireNonFavoris input[type="checkbox"][id^="checkboxPartenaire_"], ' +
	        '#blocPartenaireFavoris input[type="checkbox"][id^="checkboxPartenaire_"]'
	    ).forEach(cb => {
	        const nomEl = document.getElementById(cb.id + '-nom');
	        const prenomEl = document.getElementById(cb.id + '-prenom');
	        if (nomEl && prenomEl) {
	            const existingKey = (nomEl.value.trim() + '|' + prenomEl.value.trim()).toUpperCase();
	            if (existingKey === partnerKey) {
	                isAlreadyAdded = true;
	            }
	        }
	    });

	    const isResultDisabled = isReservataire || isAlreadyAdded || p.disabled != "false" || p.isSuspendu == "true";

	    const item = `<li class="d-flex flex-column mt-4 me-lg-5 pe-lg-5">
							<div class=" form-check mb-2 btn-selection${isResultDisabled ? ' disabled' : ''}" id="divCheckboxPartenaire_${p.id}" ${isResultDisabled ? 'style="pointer-events: none;" aria-disabled="true"' : ''}>
								<div class="selection-check">
	    							<input type="checkbox" id="checkboxPartenaire_${p.id}"  ${isResultDisabled ? 'disabled' : ''}  name="checkboxPartenaire_${p.id}" class="form-check-input" value="${p.id}">
									<label class="form-check-label" for="${isResultDisabled ? '' : 'checkboxPartenaire_' + p.id}" id="labelCheckboxPartenaire_${p.id}">
										${p.prenom} ${p.nom}
									</label>
									<input type="hidden" value="${p.nom}" name="checkboxPartenaire_${p.id}-nom" id="checkboxPartenaire_${p.id}-nom" />
									<input type="hidden" value="${p.prenom}" name="checkboxPartenaire_${p.id}-prenom" id="checkboxPartenaire_${p.id}-prenom" />
									<input type="hidden" value="${p.dateNaissance}" name="checkboxPartenaire_${p.id}-dateNaissance" id="checkboxPartenaire_${p.id}-dateNaissance" />
									<input type="hidden" value="${p.mail}" name="checkboxPartenaire_${p.id}-mail" id="checkboxPartenaire_${p.id}-mail" />
									<input type="hidden" value="${p.mailMasked}" name="checkboxPartenaire_${p.id}-mailMasked" id="checkboxPartenaire_${p.id}-mailMasked" />
								</div>
								<p class="selection-subtitle ms-m my-sm" id="text-new-partenaire-mail_${p.id}" >${p.mailMasked} </p>
							</div>
							 ${p.isInitial == "true" ? `
						        <div class="d-flex">
						            <p class="m-0">Partenaire non vérifié</p>
						        </div>` : ''}
						</li>`;
	        ulList.insertAdjacentHTML("beforeend", item);
	});
	const checkboxesSearchResult = document.querySelectorAll('#blocSearchResult input[type="checkbox"][id^="checkboxPartenaire_"]');
	const partenaireList = document.querySelector('[data-js-reservation-etape1-non-favoris-partenaire-list]');

    checkboxesSearchResult.forEach(checkbox => {
		checkbox.addEventListener('change', function () {
	      	const suffix = this.id.replace('checkboxPartenaire_', '');
	      	const divToMove = document.getElementById('divCheckboxPartenaire_' + suffix);

	      	if (!divToMove) return;
	        const existingLi = partenaireList.querySelector('li[data-suffix="' + suffix + '"]');
	        if (checkbox.checked) {
		        if (!existingLi) {
		          const li = document.createElement('li');
		          li.className = "d-flex flex-column mt-4 me-lg-5 pe-lg-5";
		          li.setAttribute('data-suffix', suffix);
		          li.appendChild(divToMove.cloneNode(true));
		          const clonedCheckbox = li.querySelector('input[type="checkbox"][id^="checkboxPartenaire_"]');
		          if (clonedCheckbox) { clonedCheckbox.checked = true; }
		          $.ajax({ url: "jsp/site/Portal.jsp?page=reservation-etape-1&action=getPartenairesDto&idPartenaire="+suffix,
				             async: false,
				             dataType: 'json',
				             success: function(p) {
				                if (p && p.id) {
				                    if (p.isInitial =="true") {
				                        const unverifDiv = document.createElement('div');
				                        unverifDiv.className = "d-flex";
				                        unverifDiv.innerHTML = `
				                            <p class="m-0 align-content-center">Partenaire non vérifié - </p>
				                            <button id="btn-modifiy-partenaire_${p.id}" class="btn btn-none p-0 m-0" type="button">
				                                <p class="main-info-color p-0 m-0">modifier</p>
				                            </button>
				                        `;
				                        li.appendChild(unverifDiv);

				                    } else {
				                        const favorisBtn = document.createElement('button');
				                        favorisBtn.className = "btn btn-none p-0 m-0 font-bold fit-content";
				                        favorisBtn.setAttribute("type", "button");
				                        favorisBtn.id = "btn-add-favoris_" + p.id;

				                        favorisBtn.innerHTML = `
				                            <span class="btn-label main-color">
				                                <svg class="paris-icon paris-icon-plus" aria-hidden="true" focusable="false" role="img">
				                                    <use xlink:href="#paris-icon-plus"></use>
				                                </svg>Ajouter dans mes favoris
				                            </span>
				                        `;

				                        li.appendChild(favorisBtn);
				                    }
				                }
				             },
				             error: function (jqXhr, textStatus, errorMessage) {
				                 console.log('Error: ' + errorMessage);
				        	 }
				  });
		          partenaireList.appendChild(li);
		          resetAllAddPartenaireBlocs(false);
		        }
		    } else {
		        if (existingLi) {
		          existingLi.remove();
		        }
		    }
		    updateSelectedNames();
		    initBlocNonFavoris();
	    });
	});
}

function addNewPartenaire() {
   	const firstNameNewInput = document.querySelector("#firstNameNew").value.trim();
    const lastNameNewInput = document.querySelector("#lastNameNew").value.trim();
    const dateBirthNewInput = document.querySelector("#dateBirthNew").value.trim();
    const emailNewInput = document.querySelector("#mailNew").value.trim();
    const ulListNewPartenaire = document.querySelector('[data-js-reservation-etape1-non-favoris-partenaire-list]');

    const alertErrorFirstName = document.querySelector('[data-js-reservation-etape1-btn-create-partner-validation-error-firstname]');
	const alertErrorLastName = document.querySelector('[data-js-reservation-etape1-btn-create-partner-validation-error-lastname]');
	const alertErrorBirthDate = document.querySelector('[data-js-reservation-etape1-btn-create-partner-validation-error-birthdate]');
	const alertErrorMail = document.querySelector('[data-js-reservation-etape1-btn-create-partner-validation-error-mail]');
	resetAlertBlocNewPartenaire();

	if( !firstNameNewInput || firstNameNewInput.trim() === "" )
	{
		alertErrorFirstName.classList.remove('hidden');
		alertErrorLastName.classList.add('hidden');
		alertErrorBirthDate.classList.add('hidden');
		alertErrorMail.classList.add('hidden');
		return;
	}
	else if( !lastNameNewInput || lastNameNewInput.trim() === "" )
	{
		alertErrorFirstName.classList.add('hidden');
		alertErrorLastName.classList.remove('hidden');
		alertErrorBirthDate.classList.add('hidden');
		alertErrorMail.classList.add('hidden');
		return;
	}
	else if( !dateBirthNewInput || dateBirthNewInput.trim() === "" )
	{
		alertErrorFirstName.classList.add('hidden');
		alertErrorLastName.classList.add('hidden');
		alertErrorBirthDate.classList.remove('hidden');
		alertErrorMail.classList.add('hidden');
		return;
	}
	else if( !isValidDateDDMMYYYY(dateBirthNewInput.trim()) )
	{
		const alertErrorBirthDateInvalid = document.querySelector('[data-js-reservation-etape1-btn-create-partner-validation-error-birthdate-invalid]');
		alertErrorFirstName.classList.add('hidden');
		alertErrorLastName.classList.add('hidden');
		alertErrorBirthDate.classList.add('hidden');
		alertErrorBirthDateInvalid.classList.remove('hidden');
		alertErrorMail.classList.add('hidden');
		return;
	}
	else if( emailNewInput && !isValidEmail(emailNewInput.trim()) )
	{
		alertErrorFirstName.classList.add('hidden');
		alertErrorLastName.classList.add('hidden');
		alertErrorBirthDate.classList.add('hidden');
		alertErrorMail.classList.remove('hidden');
		return;
	}

	// Vérification : le réservataire ne peut pas se déclarer comme partenaire
	const reservataireNomElNew = document.getElementById('reservataireNom');
	const reservatairePrenomElNew = document.getElementById('reservatairePrenom');
	const reservataireDateElNew = document.getElementById('reservataireDateNaissance');
	if (reservataireNomElNew && reservatairePrenomElNew && reservataireDateElNew) {
		const reservataireNomValNew = reservataireNomElNew.value.trim().toUpperCase();
		const reservatairePrenomValNew = reservatairePrenomElNew.value.trim().toUpperCase();
		const reservataireDateISONew = convertToISODateFormat(reservataireDateElNew.value.trim());
		if (
			lastNameNewInput.trim().toUpperCase() === reservataireNomValNew &&
			firstNameNewInput.trim().toUpperCase() === reservatairePrenomValNew &&
			dateBirthNewInput.trim() === reservataireDateISONew
		) {
			return;
		}
	}

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // months are 0-indexed
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const suffixUnique = `${year}${month}${day}${hour}${minutes}${seconds}`;
    const emailNewInputMasked = getMailMasked(emailNewInput);

    const item = `<li class="d-flex flex-column mt-4 me-lg-5 pe-lg-5" data-suffix='${suffixUnique}'>
						<div class=" form-check mb-2 btn-selection" >
							<div class="selection-check">
				    			<input checked type="checkbox" id="checkboxPartenaire_${suffixUnique}" name="checkboxPartenaire_${suffixUnique}" class="form-check-input" value="${firstNameNewInput}_${lastNameNewInput}">
								<label class="form-check-label" for="checkboxPartenaire_${suffixUnique}" id="labelCheckboxPartenaire_${suffixUnique}">
									${firstNameNewInput} ${lastNameNewInput}
								</label>
							</div>
							<p class="selection-subtitle ms-m my-sm" id="text-new-partenaire-mail_${suffixUnique}">${emailNewInputMasked}</p>
							<input type="hidden" value="${lastNameNewInput}" name="checkboxPartenaire_${suffixUnique}-nom" id="checkboxPartenaire_${suffixUnique}-nom" />
							<input type="hidden" value="${firstNameNewInput}" name="checkboxPartenaire_${suffixUnique}-prenom" id="checkboxPartenaire_${suffixUnique}-prenom" />
							<input type="hidden" value="${dateBirthNewInput}" name="checkboxPartenaire_${suffixUnique}-dateNaissance" id="checkboxPartenaire_${suffixUnique}-dateNaissance" />
							<input type="hidden" value="${emailNewInput}" name="checkboxPartenaire_${suffixUnique}-mail" id="checkboxPartenaire_${suffixUnique}-mail" />
							<input type="hidden" value="${emailNewInputMasked}" name="checkboxPartenaire_${suffixUnique}-mailMasked" id="checkboxPartenaire_${suffixUnique}-mailMasked" />
						</div>
						<div class="d-flex">
							<p class="m-0 align-content-center">Partenaire non vérifié - </p>
							<button class="btn btn-none p-0 m-0 " type="button" id="btn-modifiy-partenaire_${suffixUnique}" >
								<p class=" main-info-color p-0 m-0 ">modifier</p>
							</button>
						</div>
					</li>`;
	ulListNewPartenaire.insertAdjacentHTML("beforeend", item);
	initBlocNonFavoris();
  	updateSelectedNames();
			// Keep current radio state after adding a partner (do not force "unknown").
			resetAllAddPartenaireBlocs(false);

	const btnModifyPartenaire = document.getElementById(`btn-modifiy-partenaire_${suffixUnique}`);
	if (btnModifyPartenaire) {
		btnModifyPartenaire.onclick = function () {
			const firstNameTemp = document.getElementById(`checkboxPartenaire_${suffixUnique}-prenom`)?.value;
			const lastNameTemp = document.getElementById(`checkboxPartenaire_${suffixUnique}-nom`)?.value;
			const birthDateTemp = document.getElementById(`checkboxPartenaire_${suffixUnique}-dateNaissance`)?.value;
			const emailTemp = document.getElementById(`checkboxPartenaire_${suffixUnique}-mail`)?.value;

			document.getElementById('firstNameModified').value = firstNameTemp || '';
			document.getElementById('lastNameModified').value = lastNameTemp || '';
			const formattedDate = convertToISODateFormat(birthDateTemp);
			document.getElementById('dateBirthModified').value = formattedDate || '';
			document.getElementById('mailModified').value = emailTemp || '';

			$('#modifyPartenaireModal').modal('show');

			const btnModifyPartenaireValider = document.querySelector('[data-js-reservation-etape1-modal-modify-partenaire-btn-valider]');
			if (btnModifyPartenaireValider) {
				btnModifyPartenaireValider.onclick = function () {
					const inputFirstNameTemp = document.getElementById(`checkboxPartenaire_${suffixUnique}-prenom`);
					const inputLastNameTemp = document.getElementById(`checkboxPartenaire_${suffixUnique}-nom`);
					const inputBirthDateTemp = document.getElementById(`checkboxPartenaire_${suffixUnique}-dateNaissance`);
					const inputEmailTemp = document.getElementById(`checkboxPartenaire_${suffixUnique}-mail`);
					const inputEmailMaskedTemp = document.getElementById(`checkboxPartenaire_${suffixUnique}-mailMasked`);

					const inputFirstNameTempValue = document.getElementById('firstNameModified').value || '';
					const inputLastNameTempValue = document.getElementById('lastNameModified').value || '';
					const inputBirthDateTempValue = document.getElementById('dateBirthModified').value || '';
					const inputEmailTempValue = document.getElementById('mailModified').value || '';
					const inputEmailMaskedTempValue = getMailMasked(inputEmailTempValue);

					const alertErrorFirstName = document.querySelector('[data-js-reservation-etape1-modal-modify-partenaire-btn-valider-validation-error-firstname]');
					const alertErrorLastName = document.querySelector('[data-js-reservation-etape1-modal-modify-partenaire-btn-valider-validation-error-lastname]');
					const alertErrorBirthDate = document.querySelector('[data-js-reservation-etape1-modal-modify-partenaire-btn-valider-validation-error-birthdate]');
					const alertErrorMail = document.querySelector('[data-js-reservation-etape1-modal-modify-partenaire-btn-valider-validation-error-mail]');

					if( !inputFirstNameTempValue || inputFirstNameTempValue.trim() === "" )
					{
						alertErrorFirstName.classList.remove('hidden');
						alertErrorLastName.classList.add('hidden');
						alertErrorBirthDate.classList.add('hidden');
						alertErrorMail.classList.add('hidden');
					}
					else if( !inputLastNameTempValue || inputLastNameTempValue.trim() === "" )
					{
						alertErrorFirstName.classList.add('hidden');
						alertErrorLastName.classList.remove('hidden');
						alertErrorBirthDate.classList.add('hidden');
						alertErrorMail.classList.add('hidden');
					}
					else if( !inputBirthDateTempValue || inputBirthDateTempValue.trim() === "" )
					{
						alertErrorFirstName.classList.add('hidden');
						alertErrorLastName.classList.add('hidden');
						alertErrorBirthDate.classList.remove('hidden');
						alertErrorMail.classList.add('hidden');
					}
					else if( !isValidDateDDMMYYYY(inputBirthDateTempValue.trim()) && !/^\d{4}-\d{2}-\d{2}$/.test(inputBirthDateTempValue.trim()) )
					{
						const alertErrorBirthDateInvalid = document.querySelector('[data-js-reservation-etape1-modal-modify-partenaire-btn-valider-validation-error-birthdate-invalid]');
						alertErrorFirstName.classList.add('hidden');
						alertErrorLastName.classList.add('hidden');
						alertErrorBirthDate.classList.add('hidden');
						if (alertErrorBirthDateInvalid) alertErrorBirthDateInvalid.classList.remove('hidden');
						alertErrorMail.classList.add('hidden');
					}
					else if( inputEmailTempValue && !isValidEmail(inputEmailTempValue.trim()) )
					{
						alertErrorFirstName.classList.add('hidden');
						alertErrorLastName.classList.add('hidden');
						alertErrorBirthDate.classList.add('hidden');
						alertErrorMail.classList.remove('hidden');
					}
					else
					{
						alertErrorFirstName.classList.add('hidden');
						alertErrorLastName.classList.add('hidden');
						alertErrorBirthDate.classList.add('hidden');
						alertErrorMail.classList.add('hidden');

						const checkboxNewPartenaire = document.getElementById(`checkboxPartenaire_${suffixUnique}`);
						const labelNewPartenaire = document.getElementById(`labelCheckboxPartenaire_${suffixUnique}`);
						const textMailNewPartenaire = document.getElementById(`text-new-partenaire-mail_${suffixUnique}`);

						inputFirstNameTemp.value = inputFirstNameTempValue;
						inputLastNameTemp.value = inputLastNameTempValue;
						inputBirthDateTemp.value = inputBirthDateTempValue;
						inputEmailTemp.value = inputEmailTempValue;
						inputEmailMaskedTemp.value = inputEmailMaskedTempValue;

						labelNewPartenaire.innerText = inputFirstNameTempValue+' '+inputLastNameTempValue;
						textMailNewPartenaire.innerText = inputEmailMaskedTempValue;
						checkboxNewPartenaire.value = inputFirstNameTempValue+'_'+inputLastNameTempValue;

						$('#modifyPartenaireModal').modal('hide');
						updateSelectedNames();
					}
				};
			}
		};
	}

}

function getMailMasked(email) {
    const parts = email.split('@');
    if (parts.length !== 2) return email; // Invalid format, return as is

    const username = parts[0];
    const domain = parts[1];

    let maskedUsername = username;
    let maskedDomain = domain;

    if (username.length > 5) { // 2 + 3
        const start = username.substring(0, 2);
        const end = username.substring(username.length - 3);
        const masked = '*'.repeat(username.length - 2 - 3);
        maskedUsername = start + masked + end;
    }

    if (domain.length > 4) { // 2 + 2
        const start = domain.substring(0, 2);
        const end = domain.substring(domain.length - 2);
        const masked = '*'.repeat(domain.length - 2 - 2);
        maskedDomain = start + masked + end;
    }

    return `${maskedUsername}@${maskedDomain}`;
}

function initBtnModifyPartenaireValider (suffixUnique){
	const btnModifyPartenaireValider = document.querySelector('[data-js-reservation-etape1-modal-modify-partenaire-btn-valider]');
	if (btnModifyPartenaireValider) {
		btnModifyPartenaireValider.onclick = function () {
			const inputFirstNameTemp = document.getElementById(`checkboxPartenaire_${suffixUnique}-prenom`);
			const inputLastNameTemp = document.getElementById(`checkboxPartenaire_${suffixUnique}-nom`);
			const inputBirthDateTemp = document.getElementById(`checkboxPartenaire_${suffixUnique}-dateNaissance`);
			const inputEmailTemp = document.getElementById(`checkboxPartenaire_${suffixUnique}-mail`);

			const inputFirstNameTempValue = document.getElementById('firstNameModified').value || '';
			const inputLastNameTempValue = document.getElementById('lastNameModified').value || '';
			const inputBirthDateTempValue = document.getElementById('dateBirthModified').value || '';
			const inputEmailTempValue = document.getElementById('mailModified').value || '';

			const alertErrorFirstName = document.querySelector('[data-js-reservation-etape1-modal-modify-partenaire-btn-valider-validation-error-firstname]');
			const alertErrorLastName = document.querySelector('[data-js-reservation-etape1-modal-modify-partenaire-btn-valider-validation-error-lastname]');
			const alertErrorBirthDate = document.querySelector('[data-js-reservation-etape1-modal-modify-partenaire-btn-valider-validation-error-birthdate]');
			const alertErrorMail = document.querySelector('[data-js-reservation-etape1-modal-modify-partenaire-btn-valider-validation-error-mail]');

			if( !inputFirstNameTempValue || inputFirstNameTempValue.trim() === "" )
			{
				alertErrorFirstName.classList.remove('hidden');
				alertErrorLastName.classList.add('hidden');
				alertErrorBirthDate.classList.add('hidden');
				alertErrorMail.classList.add('hidden');
			}
			else if( !inputLastNameTempValue || inputLastNameTempValue.trim() === "" )
			{
				alertErrorFirstName.classList.add('hidden');
				alertErrorLastName.classList.remove('hidden');
				alertErrorBirthDate.classList.add('hidden');
				alertErrorMail.classList.add('hidden');
			}
			else if( !inputBirthDateTempValue || inputBirthDateTempValue.trim() === "" )
			{
				alertErrorFirstName.classList.add('hidden');
				alertErrorLastName.classList.add('hidden');
				alertErrorBirthDate.classList.remove('hidden');
				alertErrorMail.classList.add('hidden');
			}
			else if( inputEmailTempValue && !isValidEmail(inputEmailTempValue.trim()) )
			{
				alertErrorFirstName.classList.add('hidden');
				alertErrorLastName.classList.add('hidden');
				alertErrorBirthDate.classList.add('hidden');
				alertErrorMail.classList.remove('hidden');
			}
			else
			{
				alertErrorFirstName.classList.add('hidden');
				alertErrorLastName.classList.add('hidden');
				alertErrorBirthDate.classList.add('hidden');
				alertErrorMail.classList.add('hidden');

				const checkboxNewPartenaire = document.getElementById(`checkboxPartenaire_${suffixUnique}`);
				const labelNewPartenaire = document.getElementById(`labelCheckboxPartenaire_${suffixUnique}`);
				const textMailNewPartenaire = document.getElementById(`text-new-partenaire-mail_${suffixUnique}`);

				inputFirstNameTemp.value = document.getElementById('firstNameModified').value || '';
				inputLastNameTemp.value = document.getElementById('lastNameModified').value || '';
				inputBirthDateTemp.value = document.getElementById('dateBirthModified').value || '';
				inputEmailTemp.value = document.getElementById('mailModified').value || '';

				labelNewPartenaire.innerText = inputFirstNameTempValue+' '+inputLastNameTempValue;
				textMailNewPartenaire.innerText = inputEmailTempValue;
				checkboxNewPartenaire.value = inputFirstNameTempValue+'_'+inputLastNameTempValue;

				$('#modifyPartenaireModal').modal('hide');
				updateSelectedNames();
			}
		};
	}
}

function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function resetBlocAddPartnerRadioGroup() {
	const blocAddPartnerRadioGroup = document.querySelector('#addPartnerRadioGroup');
	const fieldsBlocAddPartnerRadioGroup = blocAddPartnerRadioGroup.querySelectorAll("input");
	fieldsBlocAddPartnerRadioGroup.forEach(field => {
		if (field.type === "checkbox" || field.type === "radio") {
			field.checked = false;
		} else {
			field.value = "";
		}
	});
	const card01 = document.getElementById('cardAddPartner01');
	const card02 = document.getElementById('cardAddPartner02');
	if (card01) card01.classList.remove('tc-radio-card-selected');
	if (card02) card02.classList.remove('tc-radio-card-selected');
}

function resetBlocSearchPartenaire() {
	const blocSearchPartenaire = document.querySelector('#blocSearchPartenaire');
	const fieldsBlocSearchPartenaire = blocSearchPartenaire.querySelectorAll("input");
	fieldsBlocSearchPartenaire.forEach(field => {
		if (field.type === "checkbox" || field.type === "radio") {
			field.checked = false;
		} else {
			field.value = "";
		}
	});
	resetAlertBlocSearchPartenaire();
}

function resetAlertBlocSearchPartenaire() {
	const alertErrorFirstName = document.querySelector('[data-js-reservation-etape1-btn-search-validation-error-firstname]');
	const alertErrorLastName = document.querySelector('[data-js-reservation-etape1-btn-search-validation-error-lastname]');
	const alertErrorBirthDate = document.querySelector('[data-js-reservation-etape1-btn-search-validation-error-birthdate]');
	const alertErrorBirthDateInvalid = document.querySelector('[data-js-reservation-etape1-btn-search-validation-error-birthdate-invalid]');
	const alertErrorMail = document.querySelector('[data-js-reservation-etape1-btn-search-validation-error-mail]');
	alertErrorFirstName.classList.add('hidden');
	alertErrorFirstName.style.removeProperty('display');
	alertErrorLastName.classList.add('hidden');
	alertErrorLastName.style.removeProperty('display');
	alertErrorBirthDate.classList.add('hidden');
	alertErrorBirthDate.style.removeProperty('display');
	if (alertErrorBirthDateInvalid) { alertErrorBirthDateInvalid.classList.add('hidden'); alertErrorBirthDateInvalid.style.removeProperty('display'); }
	alertErrorMail.classList.add('hidden');
	alertErrorMail.style.removeProperty('display');
	const alertErrorHasQuotaDepassed = document.querySelector('#blocHasPartnerQuota');
	alertErrorHasQuotaDepassed.classList.add('hidden');
}

function resetBlocSearchResult() {
	const blocSearchPartenaireTitle = document.querySelector('[data-js-reservation-etape1-search-result-title]');
	const blocSearchResult = document.querySelector("#blocSearchResult");
	resetAlertBlocSearchResult();
}

function resetAlertBlocSearchResult() {
	const alertErrorFirstName = document.querySelector('[data-js-reservation-etape1-btn-search-validation-error-firstname]');
	const alertErrorLastName = document.querySelector('[data-js-reservation-etape1-btn-search-validation-error-lastname]');
	const alertErrorBirthDate = document.querySelector('[data-js-reservation-etape1-btn-search-validation-error-birthdate]');
	const alertErrorMail = document.querySelector('[data-js-reservation-etape1-btn-search-validation-error-mail]');
	alertErrorFirstName.classList.add('hidden');
	alertErrorLastName.classList.add('hidden');
	alertErrorBirthDate.classList.add('hidden');
	alertErrorMail.classList.add('hidden');
}

function resetBlocNewPartenaire() {
	const blocNewPartenaire = document.querySelector("#blocNewPartenaire");
	blocNewPartenaire.classList.add('hidden');
	const fieldsBlocNewPartenaire = blocNewPartenaire.querySelectorAll("input");
	fieldsBlocNewPartenaire.forEach(field => {
			  if (field.type === "checkbox" || field.type === "radio") {
			    field.checked = false;
			  } else {
			    field.value = "";
			    field.removeAttribute('readonly');
			  }
	});
	resetAlertBlocNewPartenaire();
}

function resetAlertBlocNewPartenaire() {
	const alertErrorFirstName = document.querySelector('[data-js-reservation-etape1-btn-create-partner-validation-error-firstname]');
	const alertErrorLastName = document.querySelector('[data-js-reservation-etape1-btn-create-partner-validation-error-lastname]');
	const alertErrorBirthDate = document.querySelector('[data-js-reservation-etape1-btn-create-partner-validation-error-birthdate]');
	const alertErrorBirthDateInvalid = document.querySelector('[data-js-reservation-etape1-btn-create-partner-validation-error-birthdate-invalid]');
	const alertErrorMail = document.querySelector('[data-js-reservation-etape1-btn-create-partner-validation-error-mail]');
	alertErrorFirstName.classList.add('hidden');
	alertErrorLastName.classList.add('hidden');
	alertErrorBirthDate.classList.add('hidden');
	if (alertErrorBirthDateInvalid) alertErrorBirthDateInvalid.classList.add('hidden');
	alertErrorMail.classList.add('hidden');
}

function initBlocFavoris(){
	// Afficher le message si un favori disabled est présent au chargement
	const alertErrorHasSuspendu = document.querySelector('#blocHasPartnerSuspendu');
	const hasSuspenduFavori = document.querySelectorAll('#blocPartenaireFavoris input[type="checkbox"][id^="checkboxPartenaire_"][disabled]').length > 0;
	if (alertErrorHasSuspendu && hasSuspenduFavori) {
		alertErrorHasSuspendu.classList.remove('hidden');
	}
	document.querySelectorAll('#blocPartenaireFavoris input[type="checkbox"][id^="checkboxPartenaire_"]').forEach(checkbox => {
		checkbox.addEventListener('change', function () {
		    updateSelectedNames();
	    });
	});
}

function updateTitreNouveauxPartenaires() {
	const titre = document.getElementById('titreNouveauxPartenaires');
	if (!titre) return;
	const list = document.querySelector('[data-js-reservation-etape1-non-favoris-partenaire-list]');
	const hasItems = list && list.querySelectorAll('li').length > 0;
	if (hasItems) {
		titre.classList.remove('hidden');
	} else {
		titre.classList.add('hidden');
	}
}

function initBlocNonFavoris(){
	document.querySelectorAll('#blocPartenaireNonFavoris input[type="checkbox"][id^="checkboxPartenaire_"]').forEach(checkbox => {
	    const suffix = checkbox.id.replace('checkboxPartenaire_', '');
	    const btnModifyPartenaire = document.getElementById(`btn-modifiy-partenaire_${suffix}`);
		if (btnModifyPartenaire) {
			btnModifyPartenaire.onclick = function () {
				const firstNameTemp = document.getElementById(`checkboxPartenaire_${suffix}-prenom`)?.value;
				const lastNameTemp = document.getElementById(`checkboxPartenaire_${suffix}-nom`)?.value;
				const birthDateTemp = document.getElementById(`checkboxPartenaire_${suffix}-dateNaissance`)?.value;
				const emailTemp = document.getElementById(`checkboxPartenaire_${suffix}-mail`)?.value;
				document.getElementById('firstNameModified').value = firstNameTemp || '';
				document.getElementById('lastNameModified').value = lastNameTemp || '';
				const formattedDate = convertToISODateFormat(birthDateTemp);
				document.getElementById('dateBirthModified').value = formattedDate || '';
				document.getElementById('mailModified').value = emailTemp || '';
				$('#modifyPartenaireModal').modal('show');
				initBtnModifyPartenaireValider (suffix);
			};
		}
		const btnAddFavoris = document.getElementById(`btn-add-favoris_${suffix}`);
		if (btnAddFavoris) {
				btnAddFavoris.onclick = function () {
					const partenaireFavorisList = document.querySelector('[data-js-reservation-etape1-favoris-partenaire-list]');
					const checkboxCount = partenaireFavorisList.querySelectorAll('input[type="checkbox"][id^="checkboxPartenaire_"]').length;
					if(checkboxCount >= 6){
						const alertDiv = document.querySelector('[var-data-js-reservation-etape1-favoris-partenaire-list-max]');
						if (alertDiv && partenaireFavorisList) {
							const newAlert = alertDiv.cloneNode(true);
							newAlert.removeAttribute('var-data-js-reservation-etape1-favoris-partenaire-list-max');
    						newAlert.setAttribute('data-js-reservation-etape1-favoris-partenaire-list-max', '');
    						newAlert.classList.remove('hidden');
    						partenaireFavorisList.parentNode.insertBefore(newAlert, partenaireFavorisList.nextSibling);
						}
					}
					else{
						let requestParamToAdd = "";
					    if (suffix)
					    {
							requestParamToAdd = requestParamToAdd + "&idPartenaire=" + suffix
						}
					    $.ajax({ url: "jsp/site/Portal.jsp?page=reservation-etape-1&action=addPartenairesFavoris"+requestParamToAdd,
					             async: false,
					             dataType: 'json',
					             success: function( result ){
								 	if(result && result.id){
										updateListPartenaireFavoris(result);
										const partenaireList = document.querySelector('[data-js-reservation-etape1-non-favoris-partenaire-list]');
			        				 	const existingLi = partenaireList.querySelector('li[data-suffix="' + result.id + '"]');
			        				 	if (existingLi) {
								        	existingLi.remove();
								        }
								        updateSelectedNames();
									}
					             },
					             error: function (jqXhr, textStatus, errorMessage) {
					                 console.log('Error: ' + errorMessage);
					        	 }
					    });
					}
				};

		}
		checkbox.addEventListener('change', function () {
		    updateSelectedNames();
	    });
	});
	updateTitreNouveauxPartenaires();
}

function updateSelectedNames() {
	const container = document.querySelector("#blocListPartenaireOfCard");
	if (!container) { return; }
    container.querySelectorAll('p[data-partner-name]').forEach(p => p.remove());
    let hasChecked = false;

	const checkboxes = document.querySelectorAll(
		  '#blocPartenaireNonFavoris input[type="checkbox"][id^="checkboxPartenaire_"], ' +
		  '#blocPartenaireFavoris input[type="checkbox"][id^="checkboxPartenaire_"]'
		);
	const title = container.querySelector('.font-bold');
	checkboxes.forEach(checkbox => {
      if (checkbox.checked) {
        hasChecked = true;
        const firstNameInput = document.getElementById(checkbox.id + '-prenom');
        const lastNameInput = document.getElementById(checkbox.id + '-nom');
        if (firstNameInput && lastNameInput) {
          const firstName = firstNameInput.value;
          const lastName = lastNameInput.value;
          const displayName = (firstName.charAt(0).toUpperCase() + '.' + lastName).toUpperCase();
          const p = document.createElement('p');
          p.className = "text-center fst-italic text-uppercase";
          p.setAttribute('data-partner-name', '');
          p.textContent = displayName;
          container.appendChild(p);
        }
      }
    });
    title.style.display = hasChecked ? 'block' : 'none';

    const maxJoueurInput = document.getElementById('maxJoueur');
    const minJoueurInput = document.getElementById('minJoueur');
    const maxJoueur = parseInt(maxJoueurInput?.value || '4', 10);
    const minJoueur = parseInt(minJoueurInput?.value || '2', 10);
    // minJoueur et maxJoueur représentent le nombre total de joueurs (réservataire inclus)
    // On compare donc avec le nombre de partenaires sélectionnés (sans compter le réservataire)
    const maxPartenaires = maxJoueur - 1;
    const minPartenaires = minJoueur - 1;
	const bloc = document.getElementById('blocListPartenaireOfCard');
    const allParagraphs = bloc.querySelectorAll('p[data-partner-name]');
    const partnerCount = allParagraphs.length;

    // Recalcul centralisé des droits d'ajout/suppression (ticket TMMA-1736).
    // Toute la logique de limitation (max 3 partenaires) vit désormais dans le
    // module paristennis-partenaires-limit.js (window.ParistennisPartenaires),
    // seule source de vérité. On évite ainsi la désynchronisation entre le
    // compteur affiché, la liste réelle des partenaires et l'état des contrôles.
    try {
        if (window.ParistennisPartenaires && typeof window.ParistennisPartenaires.enforce === 'function') {
            window.ParistennisPartenaires.enforce({ root: document });
        } else if (typeof window.enforceMaxPartenaires === 'function') {
            window.enforceMaxPartenaires();
        }
    } catch (e) {
        console.warn('updateSelectedNames - gestion partenaires error:', e);
    }
	// Vérification doublons : même nom + prénom parmi les partenaires sélectionnés
	const partnerKeys = new Set();
	let hasDuplicate = false;
	const allSelectedCb = document.querySelectorAll(
		'#blocPartenaireNonFavoris input[type="checkbox"][id^="checkboxPartenaire_"]:checked, ' +
		'#blocPartenaireFavoris input[type="checkbox"][id^="checkboxPartenaire_"]:checked'
	);
	allSelectedCb.forEach(cb => {
		const nomEl = document.getElementById(cb.id + '-nom');
		const prenomEl = document.getElementById(cb.id + '-prenom');
		if (nomEl && prenomEl) {
			const key = (nomEl.value.trim() + '|' + prenomEl.value.trim()).toUpperCase();
			if (partnerKeys.has(key)) {
				hasDuplicate = true;
			} else {
				partnerKeys.add(key);
			}
		}
	});
}

function disableCheckboxPartenaireFavoris()
{
	const checkboxes = document.querySelectorAll('#blocPartenaireFavoris input[type="checkbox"][id^="checkboxPartenaire_"]');
	checkboxes.forEach(checkbox => {
		if (!checkbox.checked) {
	        checkbox.disabled = true;
	    }
	});
}

function enableCheckboxPartenaireFavoris()
{
	try {
		$.ajax({ url: "jsp/site/Portal.jsp?page=reservation-etape-1&action=getPartenairesFavorisToActivate",
	             async: false,
	             dataType: 'json',
	             success: function( result ){
	                if (result && Array.isArray(result)) {
	                    result.forEach(p => {
				          if(p&&p.id){
							  const checkbox = document.querySelector('#checkboxPartenaire_'+p.id);
							  if(checkbox){
								  checkbox.disabled = false;
							  }
						  }
					    });
	                }
	             },
	             error: function (jqXhr, textStatus, errorMessage) {
	                 console.log('Error: ' + errorMessage);
	        	 }
	    });
    } catch (e) {
        console.warn('enableCheckboxPartenaireFavoris error:', e);
    }
}

/**
 * Validates a date string in dd/mm/yyyy format.
 * Checks format AND logical validity (day/month ranges, leap years).
 */
function isValidDateDDMMYYYY(dateStr) {
  if (!dateStr || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return false;
  }
  const [day, month, year] = dateStr.split('/').map(Number);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > new Date().getFullYear()) return false;
  // Check day validity for the given month/year
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === (month - 1) && date.getDate() === day;
}

function convertToISODateFormat(dateStr) {
  if (!dateStr || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return dateStr;
  }
  const [day, month, year] = dateStr.split('/');
  return `${year}-${month}-${day}`;
}


function onCaptchaSuccess()
{
	window.captchaModal.hide( );
	document.querySelectorAll('#btnReserverCreneau:not(.d-none)').forEach((btn) => {
		redirectToReservation(btn);
	});
}

function initCaptcha() {
	let options = {
		locale: "fr",
		successCallback: onCaptchaSuccess
	}
	LI_ANTIBOT.ready(function() {
		LI_ANTIBOT.execute(options);
	});
}

function toggleCaptcha() {
	const token = document.getElementById('li-antibot-token').value;
	if (token == undefined || token == "") {
		window.captchaModal.show();
	}
}

function redirectToReservation( buttonReserver )
{
	if (window._redirectDone) return;
	window._redirectDone = true;  
	
	const urlParams = new URLSearchParams(window.location.search);
	const idCentre = urlParams.get('id');
	
	const token = document.getElementById('li-antibot-token').value;
	
	const url = new URL(buttonReserver.href);
	url.searchParams.set("li-antibot-token", token);
	url.searchParams.set("idCentre", idCentre);
	
	window.location.href = url.toString();
}