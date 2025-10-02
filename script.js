// Константы
const MODS = [
    { name: "sodium", displayName: "Sodium" },
    { name: "lithium", displayName: "Lithium" },
    { name: "fabric-api", displayName: "Fabric API" },
    { name: "iris", displayName: "Iris Shaders" }
];

// Элементы DOM
const versionCombo = document.getElementById('versionCombo');
const loaderCombo = document.getElementById('loaderCombo');
const updateButton = document.getElementById('updateButton');
const notification = document.getElementById('notification');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

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

// Обновление прогресса
function updateProgress(percent, text) {
    progressFill.style.width = percent + '%';
    progressText.textContent = text;
}

// Показать уведомление
function showNotification(success, failedMods = []) {
    progressContainer.style.display = 'none';
    
    notification.textContent = success ? '✔' : '✖';
    notification.className = `notification ${success ? 'success' : 'error'}`;
    
    if (!success && failedMods.length > 0) {
        notification.style.cursor = 'pointer';
        notification.onclick = () => showFailedMods(failedMods);
    } else {
        notification.style.cursor = 'default';
        notification.onclick = null;
    }
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 2500);
}

// Показать список нескачанных модов
function showFailedMods(failedMods) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <h3>Не скачанные моды:</h3>
        <ul>
            ${failedMods.map(mod => `<li>${mod}</li>`).join('')}
        </ul>
        <button class="close-btn" onclick="this.parentElement.remove()">Закрыть</button>
    `;
    
    document.body.appendChild(errorDiv);
}

// Создать фиктивные файлы модов
function createMockModFile(modName, version, loader) {
    const content = `
Minecraft Mod: ${modName}
Version: ${version}
Loader: ${loader}
Downloaded from: Minecraft Mod Updater
Date: ${new Date().toLocaleDateString()}

This is a mock mod file for demonstration purposes.
In a real application, this would be the actual mod file.
    `.trim();
    
    return new Blob([content], { type: 'application/java-archive' });
}

// Скачать моды и создать ZIP архив
async function downloadModsAndCreateZip(mcVersion, loader) {
    const zip = new JSZip();
    const modsFolder = zip.folder("mods");
    
    let downloadedCount = 0;
    const failedMods = [];
    
    // Показать прогресс бар
    progressContainer.style.display = 'flex';
    updateProgress(0, 'Подготовка...');
    
    for (const mod of MODS) {
        try {
            updateProgress(
                (downloadedCount / MODS.length) * 100,
                `Скачивание ${mod.displayName}...`
            );
            
            // Имитация задержки скачивания
            await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));
            
            // Создаем фиктивный файл мода
            const modFile = createMockModFile(mod.displayName, mcVersion, loader);
            const fileName = `${mod.name}-${mcVersion}-${loader}.jar`;
            
            // Добавляем файл в ZIP архив
            modsFolder.file(fileName, modFile);
            downloadedCount++;
            
            updateProgress(
                (downloadedCount / MODS.length) * 100,
                `Скачано ${downloadedCount}/${MODS.length}`
            );
            
        } catch (error) {
            console.error(`Ошибка скачивания ${mod.name}:`, error);
            failedMods.push(mod.displayName);
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

Mods included:
${MODS.map(mod => `- ${mod.displayName}`).join('\n')}

${failedMods.length > 0 ? `
Failed to download:
${failedMods.map(mod => `- ${mod}`).join('\n')}
` : ''}

Instructions:
1. Extract this ZIP file
2. Copy the 'mods' folder to your Minecraft directory
3. Launch Minecraft with ${loader} loader

Generated by Minecraft Mod Updater
    `.trim();
    
    zip.file("README.txt", readmeContent);
    
    return { zip, downloadedCount, failedMods };
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
            setTimeout(() => {
                showNotification(true);
            }, 1000);
            
        } else {
            showNotification(false, ['Не удалось скачать ни одного мода']);
        }
        
    } catch (error) {
        console.error('Ошибка при создании архива:', error);
        showNotification(false, ['Ошибка при создании архива']);
    } finally {
        // Восстанавливаем кнопку
        updateButton.disabled = false;
        updateButton.classList.remove('loading');
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    loadVersions();
    
    // Обработчики для кнопки - гарантия белого цвета
    updateButton.addEventListener('mouseenter', function() {
        this.style.color = '#fff';
    });
    
    updateButton.addEventListener('mouseleave', function() {
        this.style.color = '#fff';
    });
    
    // Принудительно устанавливаем белый цвет при загрузке
    updateButton.style.color = '#fff';
});