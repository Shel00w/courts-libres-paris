
const tabParamNames = ['hourFrom', 'hourTo'];

const tabSelectIdsGroups = [
    ['selectHourFrom-desktop', 'selectHourFrom-mobile'],
    ['selectHourTo-desktop', 'selectHourTo-mobile']
];

// Liste des boutons et leurs versions associées
const buttons = [
    { id: 'resetAllFilter-desktop', version: 'desktop', action: 'reset' },
    { id: 'resetAllFilter-mobile', version: 'mobile', action: 'reset' }
];

// Ajouter un écouteur d'événement pour chaque bouton
buttons.forEach( button => {
    const element = document.getElementById( button.id );
    if ( element )
    {
        element.addEventListener('click', ( ) => {

        // Si l'action est validDate, appeler directement la fonction validateDate
        if ( button.action === 'validDate' )
        {
            const isValid = validateDate( button.version );
            if ( !isValid )
            {
                return;
            }
        }
        else if ( button.action == 'reset' )
        {
            event.preventDefault();

            // Redirige vers la page d'accueil sans aucun paramètres
            window.location.href = window.location.href.split('&')[0];
        }
        // Appeler la fonction pour soumettre le formulaire avec l'action et la version
        submitFormWithAction( button.action, button.version );
        });
    }
});

function getRadioByValueDesktop( value )
{
    inputsRadioDesktop = document.querySelectorAll('input[type="radio"][id*="-desktop"]');

    let matchingInput = null;
    inputsRadioDesktop.forEach( input =>
    {
        if (input.value == value)
        {
            matchingInput = input;
        }
    });
    return matchingInput || false;
}

function getRadioByValueMobile( value )
{
    inputRadioMobile = document.querySelectorAll('input[type="radio"][id*="-mobile"]');

    let matchingInput = null;
    inputRadioMobile.forEach( input =>
    {
        if (input.value == value)
        {
            matchingInput = input;
        }
    });
    return matchingInput || false;
}


// Fonction pour récupérer les paramètres de l'URL
function getUrlParams()
{
    const params = new URLSearchParams( window.location.search );
    return params;
}

// Fonction pour appliquer les valeurs des paramètres sur les checkboxes
function setCheckboxesFromUrlParams(version) {
    const params = new URLSearchParams(window.location.search);
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const versionsToCheck = version ? [version] : ['desktop', 'mobile'];

    versionsToCheck.forEach( vers =>
    {
        const paramGroups =
        {
            [`dateCheckbox-${vers}`]: /^date\d+$/,
            [`criteriasCheckbox-${vers}`]: /^typeCours\d+$/,
            [`criteriasRevetementCheckbox-${vers}`]: /^revetement\d+$/,
            [`accesPMR-${vers}`]: /^accesPMR$/
        };

        const matchedParams = Object.keys(paramGroups)
            .reduce((acc, key) => ({ ...acc, [key]: new Set() }), {});

        for (const [key, value] of params.entries()) {
            for (const [groupName, regex] of Object.entries(paramGroups)) {
                if (regex.test(key)) {
                    matchedParams[groupName].add(normalizeValue(value));
                }
            }
        }

        checkboxes.forEach(checkbox => {
            for (const [groupName, valuesSet] of Object.entries(matchedParams)) {
                if ( checkbox.name.startsWith(groupName) && valuesSet.has(normalizeValue(checkbox.value)) ) {
                    checkbox.checked = true;
                }
            }
        });
    });
}

function setSelectFromUrlParams( paramNames, selectIdsGroups )
{
    const params = getUrlParams();

       paramNames.forEach( ( paramName, index ) => {
           const selectValue = params.get( paramName );

           if ( selectValue )
           {
               // Parcourir tous les identifiants associés au paramètre
               selectIdsGroups[index].forEach( selectId => {
                   const select = document.querySelector( `#${selectId}` );
                   if ( select )
                   {
                       select.value = selectValue;
					   select.dispatchEvent(new Event("change"));
                   }
               });
           }
       });
}


function removeInputsByVersion( version )
{
    let  className = '';
    if ( version === 'desktop' )
    {
        className = 'd-none.d-lg-block.mt-0';
    }
    else
    {
        className = 'd-block d-lg-none';
    }

    if ( className )
    {
        // Sélectionner la div avec la classe spécifiée
        const mainDiv = document.querySelector( `.${className.replace(/\./g, ' ')}` );
        if ( mainDiv )
        {
            // Trouver tous les éléments input à l'intérieur de la div
            const inputs = mainDiv.querySelectorAll('input');

            // Parcourir les inputs et les supprimer
            inputs.forEach( input => input.remove( ) );
        }
    }
}

function submitFormWithAction( action, version )
{
    const actionInput = document.getElementById('actionInput');
    actionInput.value = action;

    // Sélectionner le formulaire existant
    const form = document.querySelector('#search');
    if ( form )
    {
        let currentAction = form.getAttribute('action') || '';
        let separator = currentAction.includes('?') ? '&' : '?';
        if ( version === null )
        {
            const params = new URLSearchParams(document.location.search);
            const paramVersion = params.get("version");

            if ( paramVersion )
            {
                version = paramVersion;
            }
        }

        form.action = `${currentAction}${separator}version=${version}`;

        if ( action === 'search' )
        {
            const urlParams = new URLSearchParams(window.location.search);
            urlParams.delete('page');
            urlParams.delete('error_login');

            const remainingParams = urlParams.toString( );
            form.action = `${currentAction}${separator}${remainingParams ? '&' + remainingParams : ''}`;

            if( !version )
            {
                // Vérifier si un sport est coché dans la version desktop
                const desktopRadio = document.querySelector( 'input[type="radio"][name="fieldSport-desktop"]:checked' );
                if ( desktopRadio )
                {
                    version = 'desktop';
                    urlParams.set( 'sport', desktopRadio.value );
                }

                 const mobileRadio = document.querySelector( 'input[type="radio"][name="fieldSport-mobile"]:checked' );
                if ( mobileRadio )
                {
                    version = 'mobile';
                    urlParams.set( 'sport', mobileRadio.value );
                }
            }

             if( version === 'desktop' )
             {
                disableInputsByName( 'fieldSport-mobile' );
                const desktopRadio = document.querySelector( 'input[type="radio"][name="fieldSport-desktop"]:checked' );
                if ( desktopRadio )
                {
                    version = 'desktop';
                    urlParams.set( 'sport', desktopRadio.value );
                }
             }
             else if ( version === 'mobile' )
             {
                disableInputsByName( 'fieldSport-desktop' );
                const mobileRadio = document.querySelector( 'input[type="radio"][name="fieldSport-mobile"]:checked' );
                if ( mobileRadio )
                {
                    version = 'mobile';
                    urlParams.set( 'sport', mobileRadio.value );
                }
             }

             urlParams.set( 'version', version );

             const updatedParams = urlParams.toString();
             form.action = `${currentAction}${separator}${updatedParams}`;

            // Soumettre le formulaire
            form.submit( );

        }
        else
        {
            if ( !isRadioSportChecked( version ) )
            {
                const fieldName = version === 'desktop' ? 'fieldSport-desktop' : 'fieldSport-mobile';
                const radios = document.querySelectorAll(`input[type="radio"][name="${fieldName}"]`);

                if ( radios.length > 0 )
                {
                        // Ajouter l'attribut required au premier champ radio
                        radios[0].setAttribute('required', true);

                        // Mettre le focus sur le premier champ radio
                        radios[0].focus();

                        form.reportValidity();
                        return;
                }
            }
            form.submit( );
        }
    }
}

function validateDate( version )
{
    const startTimeSelect = document.getElementById( `selectHourFrom-${version}` );
    const endTimeSelect = document.getElementById( `selectHourTo-${version}` );
    const startTime = startTimeSelect.value;
    const endTime = endTimeSelect.value;
    const errorMessage = document.getElementById( `errorMessage-${version}` );

    // Comparer les heures (si l'heure de fin est inférieure à l'heure de début)
    if ( startTime && endTime && endTime < startTime )
    {
        event.preventDefault( );

        // Afficher le message d'erreur
        errorMessage.style.display = 'block';
        return false;
    }
    else
    {
        // Masquer le message d'erreur et traiter le formulaire
        errorMessage.style.display = 'none';
        return true;
    }
}

function isRadioSportChecked( version )
{
    // Définir le nom du champ en fonction de la version
    const fieldName = version === 'desktop' ? 'fieldSport-desktop' : 'fieldSport-mobile';

    // Sélectionner tous les inputs radio correspondant au nom
    const radios = document.querySelectorAll(`input[type="radio"][name="${fieldName}"]`);

    // Vérifier si au moins un des inputs radio est coché
    for ( const radio of radios )
    {
        if ( radio.checked )
        {
            return true; // Une case radio est cochée
        }
    }
    return false; // Aucune case radio n'est cochée
}

function disableInput( inputId )
{
    const inputField = document.getElementById( inputId );
    if( inputField )
    {
        inputField.addEventListener( 'keydown', function( event )
        {
            event.preventDefault( );
        });

        inputField.addEventListener( 'paste', function( event )
        {
            event.preventDefault( );
        });

        inputField.addEventListener( 'input', function( event )
        {
            event.preventDefault( );
        });
    }
}

function disableInputsByName( name )
{
    const inputs = document.querySelectorAll( `input[type="radio"][name="${name}"]` );
    inputs.forEach(input =>
    {
        input.disabled = true; // Désactiver l'input
        input.removeAttribute('name'); // Supprimer l'attribut name pour éviter les erreurs
    });
}

function normalizeValue(value) {
    if (!value) return "";
    let str = decodeURIComponent(value)
        .replace(/[-_+]+/g, ' ')
        .normalize("NFD").replace(/[\u0300-\u036f]/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
        .toLowerCase();
	return str.charAt(0).toUpperCase() + str.slice(1);
}

// --- Modale "Quand jouer" ---
$(document).ready(function ()
{
    const dateFilterModalEl = document.getElementById('dateFilterModal');

    if ( dateFilterModalEl )
    {
        let dateFilterSnapshot = null;
        let dateFilterConfirmed = false;

        function getDateFilterVersion( )
        {
            return window.matchMedia('(min-width: 992px)').matches ? 'desktop' : 'mobile';
        }

        function snapshotDateFilter( )
        {
            const snapshot = { checkboxes: [], selects: [] };

            dateFilterModalEl.querySelectorAll('input[type="checkbox"]').forEach( checkbox =>
            {
                snapshot.checkboxes.push( { id: checkbox.id, checked: checkbox.checked } );
            });

            dateFilterModalEl.querySelectorAll('select').forEach( select =>
            {
                snapshot.selects.push( { id: select.id, value: select.value } );
            });

            return snapshot;
        }

        function restoreDateFilter( snapshot )
        {
            if ( !snapshot )
            {
                return;
            }

            snapshot.checkboxes.forEach( item =>
            {
                const checkbox = document.getElementById( item.id );
                if ( checkbox )
                {
                    checkbox.checked = item.checked;
                }
            });

            snapshot.selects.forEach( item =>
            {
                const select = document.getElementById( item.id );
                if ( select )
                {
                    select.value = item.value;
                }
            });
        }

        // A l'ouverture de la modale : on resynchronise depuis l'URL (filtres déjà appliqués)
        // puis on prend un instantané pour pouvoir annuler les modifications en cours
        dateFilterModalEl.addEventListener('show.bs.modal', function ( )
        {
            setCheckboxesFromUrlParams( null );
            setSelectFromUrlParams( tabParamNames, tabSelectIdsGroups );

            dateFilterConfirmed = false;
            dateFilterSnapshot = snapshotDateFilter( );
        });

        // A la fermeture (croix ou bouton Annuler) : si la recherche n'a pas été lancée,
        // on annule les modifications en cours sans toucher aux critères déjà appliqués
        dateFilterModalEl.addEventListener('hidden.bs.modal', function ( )
        {
            if ( !dateFilterConfirmed )
            {
                restoreDateFilter( dateFilterSnapshot );
            }
        });

        const validateDateButtonShared = document.getElementById('validateDateButtonShared');
        if ( validateDateButtonShared )
        {
            validateDateButtonShared.addEventListener('click', function ( )
            {
                const version = getDateFilterVersion( );
                const isValid = validateDate( version );
                if ( !isValid )
                {
                    return;
                }

                dateFilterConfirmed = true;
                submitFormWithAction( 'search', version );
            });
        }
    }
});

// --- Modale "Critères de jeu" ---
$(document).ready(function ()
{
    const criteriasFilterModalEl = document.getElementById('criteriasFilterModal');

    if ( criteriasFilterModalEl )
    {
        let criteriasFilterSnapshot = null;
        let criteriasFilterConfirmed = false;

        function getCriteriasFilterVersion( )
        {
            return window.matchMedia('(min-width: 992px)').matches ? 'desktop' : 'mobile';
        }

        function snapshotCriteriasFilter( )
        {
            const snapshot = { checkboxes: [] };

            criteriasFilterModalEl.querySelectorAll('input[type="checkbox"]').forEach( checkbox =>
            {
                snapshot.checkboxes.push( { id: checkbox.id, checked: checkbox.checked } );
            });

            return snapshot;
        }

        function restoreCriteriasFilter( snapshot )
        {
            if ( !snapshot )
            {
                return;
            }

            snapshot.checkboxes.forEach( item =>
            {
                const checkbox = document.getElementById( item.id );
                if ( checkbox )
                {
                    checkbox.checked = item.checked;
                }
            });
        }

        // A l'ouverture de la modale : on resynchronise depuis l'URL (filtres déjà appliqués)
        // puis on prend un instantané pour pouvoir annuler les modifications en cours
        criteriasFilterModalEl.addEventListener('show.bs.modal', function ( )
        {
            setCheckboxesFromUrlParams( null );

            criteriasFilterConfirmed = false;
            criteriasFilterSnapshot = snapshotCriteriasFilter( );
        });

        // A la fermeture (croix ou bouton Annuler) : si la recherche n'a pas été lancée,
        // on annule les modifications en cours sans toucher aux critères déjà appliqués
        criteriasFilterModalEl.addEventListener('hidden.bs.modal', function ( )
        {
            if ( !criteriasFilterConfirmed )
            {
                restoreCriteriasFilter( criteriasFilterSnapshot );
            }
        });

        const validateCriteriasButtonShared = document.getElementById('validateCriteriasButtonShared');
        if ( validateCriteriasButtonShared )
        {
            validateCriteriasButtonShared.addEventListener('click', function ( )
            {
                const version = getCriteriasFilterVersion( );

                criteriasFilterConfirmed = true;
                submitFormWithAction( 'search', version );
            });
        }
    }
});

// --- Recherche dynamique (sport, localisation, ...) ---
$(document).ready(function () {

    function getDynamicSearchVersion() {
        return window.matchMedia('(min-width: 992px)').matches ? 'desktop' : 'mobile';
    }

    // Exposée globalement pour les scripts de localisation.
    // Resynchronise cases + selects depuis l'URL (les modales fermées ont leurs
    // cases décochées dans le DOM), puis soumet le formulaire.
    window.triggerDynamicSearch = function ( version ) {
        const v = version || getDynamicSearchVersion();
        setCheckboxesFromUrlParams( null );
        setSelectFromUrlParams( tabParamNames, tabSelectIdsGroups );
        submitFormWithAction( 'search', v );
    };

    // Radios "Sport" desktop + mobile
    document.querySelectorAll(
        'input[type="radio"][name="fieldSport-desktop"], input[type="radio"][name="fieldSport-mobile"]'
    ).forEach(radio => {
        radio.addEventListener('change', function () {
            if (this.checked) {
                window.triggerDynamicSearch();
            }
        });
    });
});


