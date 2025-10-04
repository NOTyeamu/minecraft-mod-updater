// Константы
let MODS = [
    { name: "sodium", displayName: "Sodium", id: "sodium" },
    { name: "lithium", displayName: "Lithium", id: "lithium" },
    { name: "fabric-api", displayName: "Fabric API", id: "P7dR8mSH" },
    { name: "iris", displayName: "Iris Shaders", id: "YL57xq9U" }
];

// Элементы DOM
const versionCombo = document.getElementById('versionCombo');
const loaderCombo = document.getElementById('loaderCombo');
const updateButton = document.getElementById('updateButton');
const notification = document.getElementById('notification');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const settingsBtn = document.getElementById('settingsBtn');
const settingsToggle = document.getElementById('settingsToggle');
const modsSettingsPanel = document.getElementById('modsSettingsPanel');
const modsList = document.getElementById('modsList');
const modNameInput = document.getElementById('modNameInput');
const modIdInput = document.getElementById('modIdInput');

// Загрузка версий Minecraft
async function loadVersions() {
    try {
        const response = await fetch('https://api.modrinth.com/v2/tag/game_version');
        const versions = await response.json();
        
        versionCombo.innerHTML = '';
        versions.forEach(version => {
            const option = document.createElement('option');
            option.value = version.version;
            option.textContent = version.version;
            versionCombo.appendChild(option);
        });
    } catch (error) {
        console.error('Ошибка загрузки версий:', error);
        showNotification(false, ['Не удалось загрузить список версий']);
    }
}

// Получить информацию о моде с Modrinth
async function getModInfo(modId, mcVersion, loader) {
    try {
        // Получаем список версий мода
        const response = await fetch(`https://api.modrinth.com/v2/project/${modId}/version?game_versions=["${mcVersion}"]&loaders=["${loader}"]`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const versions = await response.json();
        
        if (versions.length === 0) {
            return null; // Версия не найдена
        }
        
        // Берем последнюю версию
        const latestVersion = versions[0];
        return {
            name: latestVersion.name,
            version: latestVersion.version_number,
            downloadUrl: latestVersion.files[0].url,
            fileName: latestVersion.files[0].filename
        };
    } catch (error) {
        console.error(`Ошибка получения информации о моде ${modId}:`, error);
        return null;
    }
}

// Скачать реальный файл мода
async function downloadModFile(downloadUrl, fileName) {
    try {
        const response = await fetch(downloadUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.blob();
    } catch (error) {
        console.error(`Ошибка скачивания файла ${fileName}:`, error);
        return null;
    }
}

// Обновление прогресса
function updateProgress(percent, text) {
    progressFill.style.width = percent + '%';
    progressText.textContent = text;
}

// Показать уведомление
function showNotification(success, messages = []) {
    progressContainer.style.display = 'none';
    
    if (success) {
        notification.textContent = '✔';
        notification.className = 'notification success';
        notification.title = messages.length > 0 ? messages.join('\n') : 'Операция выполнена успешно';
    } else {
        notification.textContent = '✖';
        notification.className = 'notification error';
        
        if (messages.length > 0) {
            notification.style.cursor = 'pointer';
            notification.title = 'Нажмите для просмотра деталей';
            notification.onclick = () => showFailedMods(messages);
        } else {
            notification.style.cursor = 'default';
            notification.title = 'Произошла ошибка';
            notification.onclick = null;
        }
    }
    
    notification.style.display = 'flex';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 2500);
}

// Показать список нескачанных модов
function showFailedMods(failedMods) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <h3>Детали загрузки:</h3>
        <div class="failed-mods-list">
            ${failedMods.map(mod => `<div class="failed-mod-item">${mod}</div>`).join('')}
        </div>
        <button class="close-btn" onclick="this.parentElement.remove()">Закрыть</button>
    `;
    
    document.body.appendChild(errorDiv);
}

// Скачать моды и создать ZIP архив
async function downloadModsAndCreateZip(mcVersion, loader) {
    const zip = new JSZip();
    const modsFolder = zip.folder("mods");
    
    let downloadedCount = 0;
    const failedMods = [];
    const successMods = [];
    
    // Показать прогресс бар
    progressContainer.style.display = 'flex';
    updateProgress(0, 'Проверка модов...');
    
    for (let i = 0; i < MODS.length; i++) {
        const mod = MODS[i];
        
        try {
            updateProgress(
                (i / MODS.length) * 100,
                `Проверка ${mod.displayName}...`
            );
            
            // Получаем информацию о моде
            const modInfo = await getModInfo(mod.id, mcVersion, loader);
            
            if (!modInfo) {
                failedMods.push(`❌ ${mod.displayName} - не найден для ${mcVersion} (${loader})`);
                continue;
            }
            
            updateProgress(
                ((i + 0.5) / MODS.length) * 100,
                `Скачивание ${mod.displayName}...`
            );
            
            // Скачиваем реальный файл мода
            const modFile = await downloadModFile(modInfo.downloadUrl, modInfo.fileName);
            
            if (!modFile) {
                failedMods.push(`❌ ${mod.displayName} - ошибка скачивания`);
                continue;
            }
            
            // Добавляем файл в ZIP архив
            modsFolder.file(modInfo.fileName, modFile);
            downloadedCount++;
            successMods.push(`✅ ${mod.displayName} v${modInfo.version}`);
            
            updateProgress(
                ((i + 1) / MODS.length) * 100,
                `Скачано ${downloadedCount}/${MODS.length}`
            );
            
        } catch (error) {
            console.error(`Ошибка обработки ${mod.name}:`, error);
            failedMods.push(`❌ ${mod.displayName} - ошибка: ${error.message}`);
        }
    }
    
    // Создаем README файл
    const readmeContent = `
Minecraft Mods Collection
=========================

Version: ${mcVersion}
Loader: ${loader}
Total mods: ${MODS.length}
Successfully downloaded: ${downloadedCount}
Failed: ${failedMods.length}

${successMods.length > 0 ? `
Successfully downloaded mods:
${successMods.map(mod => `- ${mod}`).join('\n')}
` : ''}

${failedMods.length > 0 ? `
Failed to download:
${failedMods.map(mod => `- ${mod}`).join('\n')}
` : ''}

Instructions:
1. Extract this ZIP file
2. Copy the 'mods' folder to your Minecraft directory
3. Launch Minecraft with ${loader} loader

Generated by Minecraft Mod Updater
Date: ${new Date().toLocaleDateString()}
    `.trim();
    
    zip.file("README.txt", readmeContent);
    
    return { zip, downloadedCount, failedMods, successMods };
}

// Начать обновление
async function startUpdate() {
    const mcVersion = versionCombo.value;
    const loader = loaderCombo.value;

    if (!mcVersion || !loader) {
        showNotification(false, ['Выберите версию и загрузчик']);
        return;
    }

    // Показываем состояние загрузки на кнопке
    updateButton.disabled = true;
    updateButton.classList.add('loading');
    notification.style.display = 'none';

    try {
        const result = await downloadModsAndCreateZip(mcVersion, loader);
        
        if (result.downloadedCount > 0) {
            // Генерируем и скачиваем ZIP архив
            const zipBlob = await result.zip.generateAsync({ 
                type: "blob",
                compression: "DEFLATE",
                compressionOptions: { level: 6 }
            });
            
            // Скачиваем архив
            saveAs(zipBlob, `minecraft-mods-${mcVersion}-${loader}.zip`);
            
            updateProgress(100, 'Скачивание завершено!');
            
            // Формируем сообщение о результате
            const allMessages = [
                `Успешно скачано: ${result.downloadedCount} из ${MODS.length} модов`
            ];
            
            if (result.successMods.length > 0) {
                allMessages.push('', '📦 Скачанные моды:', ...result.successMods);
            }
            
            if (result.failedMods.length > 0) {
                allMessages.push('', '❌ Проблемы:', ...result.failedMods);
            }
            
            showNotification(result.failedMods.length === 0, allMessages);
            
        } else {
            const errorMessages = [
                'Не удалось скачать ни одного мода',
                '',
                'Возможные причины:',
                '• Моды не поддерживают выбранную версию',
                '• Моды не поддерживают выбранный загрузчик', 
                '• Проблемы с интернет-соединением',
                '',
                ...result.failedMods
            ];
            showNotification(false, errorMessages);
        }
        
    } catch (error) {
        console.error('Ошибка при создании архива:', error);
        showNotification(false, [
            'Ошибка при создании архива',
            `Детали: ${error.message}`
        ]);
    } finally {
        // Восстанавливаем кнопку
        updateButton.disabled = false;
        updateButton.classList.remove('loading');
    }
}

// Функции для работы с настройками модов

// Открыть настройки
function openSettings() {
    modsSettingsPanel.classList.add('active');
    renderModsList();
}

// Закрыть настройки
function closeSettings() {
    modsSettingsPanel.classList.remove('active');
    settingsToggle.checked = false;
}

// Сохранить настройки модов
function saveModsSettings() {
    // Сохраняем в localStorage
    localStorage.setItem('minecraftMods', JSON.stringify(MODS));
    showNotification(true, ['Настройки модов сохранены!']);
    closeSettings();
}

// Загрузить настройки модов из localStorage
function loadModsSettings() {
    const savedMods = localStorage.getItem('minecraftMods');
    if (savedMods) {
        MODS = JSON.parse(savedMods);
    }
}

// Добавить кастомный мод
function addCustomMod() {
    const name = modNameInput.value.trim();
    const id = modIdInput.value.trim();
    
    if (!name || !id) {
        showNotification(false, ['Заполните все поля']);
        return;
    }
    
    // Проверяем, нет ли уже такого мода
    if (MODS.some(mod => mod.id === id)) {
        showNotification(false, ['Мод с таким ID уже существует']);
        return;
    }
    
    // Добавляем мод в список
    MODS.push({
        name: id.toLowerCase(),
        displayName: name,
        id: id
    });
    
    // Очищаем поля ввода
    modNameInput.value = '';
    modIdInput.value = '';
    
    // Обновляем список
    renderModsList();
    
    // Показываем уведомление
    showNotification(true, [`Мод "${name}" добавлен в список`]);
}

// Удалить мод
function removeMod(index) {
    const modName = MODS[index].displayName;
    MODS.splice(index, 1);
    renderModsList();
    showNotification(true, [`Мод "${modName}" удален из списка`]);
}

// Отрисовать список модов
function renderModsList() {
    modsList.innerHTML = '';
    
    if (MODS.length === 0) {
        modsList.innerHTML = '<div class="no-mods-message">Нет добавленных модов</div>';
        return;
    }
    
    MODS.forEach((mod, index) => {
        const modItem = document.createElement('div');
        modItem.className = 'mod-item';
        modItem.innerHTML = `
            <div class="mod-info">
                <span class="mod-item-name">${mod.displayName}</span>
                <span class="mod-item-id">ID: ${mod.id}</span>
            </div>
            <button class="remove-mod-btn" onclick="removeMod(${index})">Удалить</button>
        `;
        modsList.appendChild(modItem);
    });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    loadVersions();
    loadModsSettings();
    
    // Обработчики для кнопки - гарантия белого цвета
    updateButton.addEventListener('mouseenter', function() {
        this.style.color = '#fff';
    });
    
    updateButton.addEventListener('mouseleave', function() {
        this.style.color = '#fff';
    });
    
    // Принудительно устанавливаем белый цвет при загрузке
    updateButton.style.color = '#fff';
    
    // Обработчики для настроек
    settingsToggle.addEventListener('change', function() {
        if (this.checked) {
            openSettings();
        } else {
            closeSettings();
        }
    });
    
    // Закрытие настроек при клике вне области
    modsSettingsPanel.addEventListener('click', function(e) {
        if (e.target === this) {
            closeSettings();
        }
    });
    
    // Инициализация списка модов
    renderModsList();
});