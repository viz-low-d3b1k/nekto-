let checkInterval = 1000;
let autoSearchEnabled = true;
let manuallyPaused = false;
let swalCheckInterval = null;

function pauseAutoSearch() {
    autoSearchEnabled = false;
}

function resumeAutoSearch() {
    if (!document.getElementById('toggleAutoSearch').checked) return;
    autoSearchEnabled = true;
}

function checkSwalPresence() {
    let swalElement = document.querySelector('.swal2-container.swal2-center.swal2-fade.swal2-shown');
    if (swalElement) {
        if (autoSearchEnabled) {
            pauseAutoSearch();
        }
    } else {
        if (!manuallyPaused && !autoSearchEnabled) {
            resumeAutoSearch();
        }
    }
}

function checkConversationAndSwalPresence() {
    if (!autoSearchEnabled) return;

    try {
        let endMessage = document.querySelector('.talk-label');
        if (endMessage && endMessage.style.visibility === 'visible' && endMessage.innerText.includes('Разговор завершен')) {
            let nextButton = document.querySelector('.go-scan-button, .btn.btn-lg.go-scan-button');
            if (nextButton) {
                nextButton.click();
            } else {
                let iframes = document.querySelectorAll('iframe');
                for (let iframe of iframes) {
                    let iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
                    let iframeNextButton = iframeDocument.querySelector('.go-scan-button, .btn.btn-lg.go-scan-button');
                    if (iframeNextButton) {
                        iframeNextButton.click();
                        return;
                    }
                }
            }
        } else {
            let conversationElement = document.querySelector('.nekto');
            if (!conversationElement) {
                return;
            }
        }

        checkSwalPresence();

        if (!swalCheckInterval) {
            swalCheckInterval = setInterval(checkSwalPresence, 1000);
        }
    } catch (error) {
        console.error('Error in checkConversationAndSwalPresence:', error);
    }
}

let checkConversationAndSwalPresenceInterval = setInterval(checkConversationAndSwalPresence, checkInterval);

function injectMenu() {
    const menu = document.createElement('div');
    menu.id = "nektop";
    menu.classList.add('draggable');
    menu.innerHTML = `
        <div id="menuHeader" class="menu-header">
            <img src="https://cdn-icons-png.flaticon.com/512/10233/10233389.png" class="img" />
        </div>
        <div id="menuContent" class="menu-content">
            <h3>Nekto+</h3>
            <label>
                <input type="checkbox" id="toggleAutoSearch" checked> Включить автопоиск
            </label><br>
            <label for="interval">Интервал проверки (мс):</label>
            <input type="number" class="interval" id="interval" value="1000" min="1000" max="5000" step="100"><br>
            Переключить ↑, подтвердить ← . Замутиться ↓<br>
            <button id="saveInterval">Сохранить интервал</button>
            <button id="toggleStyleSettings">Настройки стилей</button>
            <div id="styleSettings" style="display:none;">
                <label for="backgroundImageUrl">URL фонового изображения:</label>
                <input type="text" class="backgroundImageUrl" id="backgroundImageUrl" placeholder="Введите URL"><br>
                <label for="backgroundImageInput">Или загрузите изображение:</label>
                <input type="file" id="backgroundImageInput"><br>
                <label for="backgroundColor">Цвет чата:</label>
                <input type="color" id="backgroundColor" class="backgroundColor"><br>
                <label for="navbarColor">Цвет navbar'a:</label>
                <input type="color" id="navbarColor" class="backgroundColor"><br>
                <label for="textColor">Цвет текста:</label>
                <input type="color" id="textColor" class="backgroundColor"><br>
                <button class="saveStyles" id="saveStyles">Сохранить стили</button>
            </div>
            <button id="exportConfig">Экспорт конфига</button>
            <button id="importConfig">Импорт конфига</button>
            <input type="file" id="importConfigFile" style="display:none;">
            <button id="hideMenu">Скрыть меню</button>
        </div>
    `;

    const showMenuButton = document.createElement('button');
    showMenuButton.id = "showMenu";
    showMenuButton.textContent = "Показать меню";
    showMenuButton.style.display = "none";
    showMenuButton.style.position = "fixed";
    document.body.appendChild(showMenuButton);
    document.body.appendChild(menu);

    function makeElementDraggable(draggableElement, handleElement) {
        let offsetX = 0, offsetY = 0;
        let isDragging = false;

        handleElement.addEventListener('mousedown', function (e) {
            isDragging = true;
            offsetX = e.offsetX;
            offsetY = e.offsetY;
        });

        document.addEventListener('mousemove', function (e) {
            if (isDragging) {
                let newLeft = e.pageX - offsetX;
                let newTop = e.pageY - offsetY;

                const maxLeft = window.innerWidth - draggableElement.offsetWidth;
                const maxTop = window.innerHeight - draggableElement.offsetHeight;

                newLeft = Math.max(0, Math.min(newLeft, maxLeft));
                newTop = Math.max(0, Math.min(newTop, maxTop));

                draggableElement.style.left = newLeft + 'px';
                draggableElement.style.top = newTop + 'px';
            }
        });

        document.addEventListener('mouseup', function () {
            isDragging = false;
        });

        handleElement.addEventListener('mouseup', function () {
            chrome.storage.local.set({
                [draggableElement.id + '-left']: draggableElement.style.left,
                [draggableElement.id + '-top']: draggableElement.style.top,
            });
        });
    }

    function setInitialPosition(element) {
        chrome.storage.local.get([element.id + '-left', element.id + '-top'], (result) => {
            if (result[element.id + '-left'] && result[element.id + '-top']) {
                element.style.left = result[element.id + '-left'];
                element.style.top = result[element.id + '-top'];
            } else {
                element.style.left = `${(window.innerWidth - element.offsetWidth) / 2}px`;
                element.style.top = `${(window.innerHeight - element.offsetHeight) / 2}px`;
            }
        });
    }

    const menuHeader = document.getElementById('menuHeader');
    makeElementDraggable(menu, menuHeader);
    setInitialPosition(menu);

    document.getElementById('toggleAutoSearch').addEventListener('change', (event) => {
        autoSearchEnabled = event.target.checked;
        chrome.storage.local.set({ autoSearchEnabled: autoSearchEnabled });
    });

    document.getElementById('saveInterval').addEventListener('click', () => {
        const intervalInput = document.getElementById('interval');
        const newInterval = parseInt(intervalInput.value);
        if (!isNaN(newInterval) && newInterval >= 1000 && newInterval <= 5000) {
            checkInterval = newInterval;
            clearInterval(checkConversationAndSwalPresenceInterval);
            checkConversationAndSwalPresenceInterval = setInterval(checkConversationAndSwalPresence, checkInterval);
            chrome.storage.local.set({ checkInterval: checkInterval });
        }
    });

    document.getElementById('toggleStyleSettings').addEventListener('click', () => {
        const styleSettings = document.getElementById('styleSettings');
        styleSettings.style.display = styleSettings.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('saveStyles').addEventListener('click', () => {
        const backgroundImageUrl = document.getElementById('backgroundImageUrl').value;
        const backgroundColor = document.getElementById('backgroundColor').value;
        const navbarColor = document.getElementById('navbarColor').value;
        const textColor = document.getElementById('textColor').value;

        chrome.storage.local.set({
            backgroundImageUrl: backgroundImageUrl,
            backgroundColor: backgroundColor,
            navbarColor: navbarColor,
            textColor: textColor,
        }, () => {
            applyCustomStyles();
        });
    });

    document.getElementById('backgroundImageInput').addEventListener('change', (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = function (e) {
            const backgroundImageUrl = e.target.result;
            chrome.storage.local.set({ backgroundImageUrl: backgroundImageUrl }, () => {
                applyCustomStyles();
            });
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('hideMenu').addEventListener('click', () => {
        menu.style.display = 'none';
        showMenuButton.style.display = 'block';
        showMenuButton.style.left = menu.style.left;
        showMenuButton.style.top = menu.style.top;
    });

    showMenuButton.addEventListener('click', () => {
        menu.style.display = 'block';
        showMenuButton.style.display = 'none';
        menu.style.left = showMenuButton.style.left;
        menu.style.top = showMenuButton.style.top;
    });

    document.getElementById('exportConfig').addEventListener('click', exportConfig);
    document.getElementById('importConfig').addEventListener('click', () => {
        document.getElementById('importConfigFile').click();
    });
    document.getElementById('importConfigFile').addEventListener('change', importConfig);

    chrome.storage.local.get(['checkInterval', 'autoSearchEnabled', 'backgroundImageUrl', 'backgroundColor', 'navbarColor', 'textColor'], (result) => {
        if (result.checkInterval !== undefined) {
            checkInterval = result.checkInterval;
            document.getElementById('interval').value = result.checkInterval;
        }
        if (result.autoSearchEnabled !== undefined) {
            autoSearchEnabled = result.autoSearchEnabled;
            document.getElementById('toggleAutoSearch').checked = result.autoSearchEnabled;
        }
        if (result.backgroundImageUrl !== undefined) {
            document.getElementById('backgroundImageUrl').value = result.backgroundImageUrl;
        }
        if (result.backgroundColor !== undefined) {
            document.getElementById('backgroundColor').value = result.backgroundColor;
        }
        if (result.navbarColor !== undefined) {
            document.getElementById('navbarColor').value = result.navbarColor;
        }
        if (result.textColor !== undefined) {
            document.getElementById('textColor').value = result.textColor;
        }
        applyCustomStyles();
    });

}

function applyCustomStyles() {
    chrome.storage.local.get(['backgroundImageUrl', 'backgroundColor', 'navbarColor', 'textColor'], (result) => {
        if (result.backgroundImageUrl) {
            document.documentElement.style.setProperty('--night-body-background', `url(${result.backgroundImageUrl})`);
            const styleTag = document.createElement('style');
            styleTag.innerHTML = `body { background: url(${result.backgroundImageUrl}) repeat; }`;
            document.head.appendChild(styleTag);
        }
        if (result.backgroundColor) {
            const bgStyleTag = document.createElement('style');
            bgStyleTag.innerHTML = `
                .audio-chat { background-color: ${result.backgroundColor}; }
                .audio-chat .companion-label span { background-color: ${result.backgroundColor}; }
                .audio-chat .nekto::after { border: 15px solid ${result.backgroundColor}; }
                .audio-chat .nekto { color: ${result.backgroundColor}; }
                .audio-chat .header { background-color: ${result.backgroundColor}; }
                :root  {
                    --night-background-color: ${result.backgroundColor};
                    --night-header-background-color: ${result.backgroundColor};
                    .mask_error { background: ${result.backgroundColor}; }
                }`;
            document.head.appendChild(bgStyleTag);
        }
        if (result.navbarColor) {
            const navbarStyleTag = document.createElement('style');
            navbarStyleTag.innerHTML = `.navbar { background: ${result.navbarColor}; }`;
            document.head.appendChild(navbarStyleTag);
        }
        if (result.textColor) {
            const textStyleTag = document.createElement('style');
            textStyleTag.innerHTML = `
                body { color: ${result.textColor}; }
                .audio-chat .filter-label { color: ${result.textColor}; }
                .audio-chat .talk-label, .audio-chat .timer-label { color: ${result.textColor}; }
                :root { --night-text-color: ${result.textColor}; }
                .night_theme .audio-chat .talk-label,
                .night_theme .audio-chat .timer-label,
                .night_theme .audio-chat .timer-label {
                    color: ${result.textColor} !important;
                }
                .night_theme .audio-chat .nekto {
                    background-color: ${result.textColor};
                }
                .audio-chat .nekto { background-color: ${result.textColor}; }
                .audio-chat .description .title { color: ${result.textColor}; }
                .audio-chat .header .chat { color: ${result.textColor}; }
                .audio-chat .header { color: ${result.textColor}; }
            `;
            document.head.appendChild(textStyleTag);
        }
    });
}

function exportConfig() {
    chrome.storage.local.get(['checkInterval', 'autoSearchEnabled', 'backgroundImageUrl', 'backgroundColor', 'navbarColor', 'textColor'], (result) => {
        const configBlob = new Blob([JSON.stringify(result)], { type: 'application/json' });
        const url = URL.createObjectURL(configBlob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = 'config.json';
        downloadLink.click();
    });
}

function importConfig(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const config = JSON.parse(e.target.result);
            chrome.storage.local.set(config, () => {
                applyCustomStyles();
                location.reload();
            });
        };
        reader.readAsText(file);
    }
}

function handleKeyboardShortcuts(event) {
    console.log('keydown event');
    
    if (event.key === 'ArrowUp') {
        const endButton = document.querySelector('.btn.btn-lg.stop-talk-button');
        if (endButton) {
            endButton.click();
        }
    } else if (event.key === 'ArrowDown') {
        const swalConfirmButton = document.querySelector('.swal2-confirm.swal2-styled');
        if (swalConfirmButton) {
            swalConfirmButton.click();
        }
    } else if (event.key === 'ArrowLeft') {
        const muteButton = document.querySelector('.mute-button');
        if (muteButton) {
            muteButton.click();
        }
    }
}

window.onload = () => {
    document.addEventListener('DOMContentLoaded', injectMenu);
    document.addEventListener('keydown', handleKeyboardShortcuts);
}