import {getToken} from './auth.js';
import {showNotification} from './ui.js';
import {loadPigeonsForMessage} from './messages.js';

let currentView = 'grid';

export async function addPigeon(event) {
    event.preventDefault();

    const name = document.getElementById('pigeon-name').value.trim();
    const color = document.getElementById('pigeon-color').value.trim();
    const age = parseInt(document.getElementById('pigeon-age').value, 10);
    const description = document.getElementById('pigeon-description').value.trim();

    if (!name || !color || Number.isNaN(age) || !description) {
        showNotification('Все поля обязательны для заполнения!', 'error');
        return;
    }

    if (age < 0 || age > 50) {
        showNotification('Укажите корректный возраст (0-50 лет)', 'error');
        return;
    }

    const token = getToken();
    if (!token) {
        showNotification('Требуется авторизация', 'error');
        return;
    }

    try {
        const response = await fetch('/api/pigeons', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({name, color, age, description})
        });

        if (response.ok) {
            showNotification('Голубь успешно добавлен!', 'success');
            document.getElementById('add-pigeon-form').reset();
            loadPigeons();
            loadPigeonsForMessage();
        } else {
            showNotification('Ошибка при добавлении голубя', 'error');
        }
    } catch (error) {
        showNotification('Ошибка соединения с сервером', 'error');
    }
}

export async function deletePigeon(id) {
    if (!confirm('Вы уверены, что хотите удалить этого голубя?')) {
        return;
    }

    const token = getToken();
    if (!token) {
        showNotification('Требуется авторизация', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/pigeons/${id}`, {
            method: 'DELETE',
            headers: {'Authorization': `Bearer ${token}`}
        });

        if (response.ok) {
            showNotification('Голубь удалён', 'success');
            loadPigeons();
            loadPigeonsForMessage();
        } else {
            showNotification('Ошибка при удалении голубя', 'error');
        }
    } catch (error) {
        showNotification('Ошибка соединения с сервером', 'error');
    }
}

export async function searchPigeons(searchTerm = '', color = '', page = 1) {
    const token = getToken();
    if (!token) return;

    try {
        let url = `/api/pigeons?page=${page}&per_page=10`;
        if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
        if (color) url += `&color=${encodeURIComponent(color)}`;

        const response = await fetch(url, {
            headers: {'Authorization': `Bearer ${token}`}
        });

        if (response.ok) {
            const result = await response.json();
            displayPigeons(result.pigeons);
            updateStats(result.total);
            populateColorFilter(result.pigeons);
            displayPagination(result);
        }
    } catch (error) {
        console.log(error)
        showNotification('Ошибка поиска', 'error');
    }
}

export async function updatePigeon(id, data) {
    const token = getToken();
    if (!token) {
        showNotification('Требуется авторизация', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/pigeons/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showNotification('Голубь обновлён!', 'success');
            loadPigeons();
        } else {
            showNotification('Ошибка обновления', 'error');
        }
    } catch (error) {
        showNotification('Ошибка соединения', 'error');
    }
}

export async function loadStatistics() {
    const token = getToken();
    if (!token) return;

    try {
        const response = await fetch('/api/statistics', {
            headers: {'Authorization': `Bearer ${token}`}
        });

        if (response.ok) {
            const stats = await response.json();
            displayStatistics(stats);
        }
    } catch (error) {
        console.error('Ошибка загрузки статистики', error);
    }
}

export async function showEditPigeonModal(id) {
    const token = getToken();
    if (!token) return;

    try {
        const response = await fetch(`/api/pigeons/${id}`, {
            headers: {'Authorization': `Bearer ${token}`}
        });

        if (response.ok) {
            const pigeon = await response.json();
            displayEditPigeonModal(pigeon);
        } else {
            showNotification('Ошибка загрузки голубя', 'error');
        }
    } catch (error) {
        showNotification('Ошибка соединения', 'error');
    }
}

export function setView(view) {
    currentView = view;
    const container = document.getElementById('pigeons-container');
    const gridBtn = document.getElementById('grid-view');
    const listBtn = document.getElementById('list-view');

    if (view === 'grid') {
        container.className = 'pigeons-grid';
        gridBtn.classList.add('active');
        listBtn.classList.remove('active');
    } else {
        container.className = 'pigeons-list';
        listBtn.classList.add('active');
        gridBtn.classList.remove('active');
    }
}

export function handleSearch() {
    const searchTerm = document.getElementById('search-input').value.trim();
    const colorFilter = document.getElementById('color-filter').value;
    searchPigeons(searchTerm, colorFilter, 1);
}

export async function loadPigeons() {
    const token = getToken();
    if (!token) return;

    try {
        const response = await fetch('/api/pigeons', {
            headers: {'Authorization': `Bearer ${token}`}
        });

        if (response.ok) {
            const pigeons = await response.json();
            displayPigeons(pigeons.pigeons);
            updateStats(pigeons.length);
            populateColorFilter(pigeons.pigeons);
            displayPagination(pigeons);
            loadStatistics();
        } else if (response.status === 401) {
            const {logout} = await import('./auth.js');
            logout();
        }
    } catch (error) {
        console.log(error)
        showNotification('Ошибка загрузки данных', 'error');
    }
}

function populateColorFilter(pigeons) {
    const colorFilter = document.getElementById('color-filter');
    const colors = [...new Set(pigeons.map(p => p.color))].sort();

    // Сохраняем текущий выбор
    const currentValue = colorFilter.value;

    // Очищаем и заполняем заново
    colorFilter.innerHTML = '<option value="">Все цвета</option>';
    colors.forEach(color => {
        const option = document.createElement('option');
        option.value = color;
        option.textContent = color;
        colorFilter.appendChild(option);
    });

    // Восстанавливаем выбор
    colorFilter.value = currentValue;
}

function displayPigeons(pigeons) {
    let container = document.getElementById('pigeons-container');

    if (pigeons.length === 0) {
        container.outerHTML = `
            <div class="empty-state" id="pigeons-container">
                <div class="empty-state-icon">🕊️</div>
                <h3>Голубей пока нет</h3>
                <p>Добавьте своего первого голубя, используя форму слева</p>
            </div>
        `;
        return;
    }else {
        container.outerHTML = `<div id="pigeons-container" class="pigeons-grid"></div>`;
    }

    container = document.getElementById('pigeons-container');

    container.innerHTML = ''

    pigeons.forEach((pigeon, index) => {
        const card = document.createElement('div');
        card.className = 'pigeon-card';
        card.style.animationDelay = `${index * 0.05}s`;
        card.innerHTML = `
            <h3>${escapeHtml(pigeon.name)}</h3>
            <p><strong>Цвет:</strong> ${escapeHtml(pigeon.color)}</p>
            <p><strong>Возраст:</strong> ${pigeon.age} ${pluralize(pigeon.age, 'год', 'года', 'лет')}</p>
            <p><strong>Описание:</strong> ${escapeHtml(pigeon.description)}</p>
            <div class="pigeon-actions">
                <button onclick="window.showSendMessageModal(${pigeon.id}, '${escapeHtml(pigeon.name)}')" class="btn btn-primary">✉️ Написать</button>
                <button onclick="window.showEditPigeonModal(${pigeon.id})" class="btn btn-secondary">✏️ Изменить</button>
                <button onclick="window.deletePigeon(${pigeon.id})" class="btn btn-danger">🗑️ Удалить</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function updateStats(count) {
    document.getElementById('total-pigeons').textContent = count;
}

function displayStatistics(stats) {
    const statsContainer = document.getElementById('stats-details');
    let colorsHtml = '';
    if (stats.colors_distribution && stats.colors_distribution.length > 0) {
        colorsHtml = '<div class="colors-distribution"><h4>Распределение по цветам:</h4>';
        stats.colors_distribution.forEach(colorStat => {
            colorsHtml += `
                <div class="color-stat-item">
                    <span>${escapeHtml(colorStat.color)}:</span>
                    <span class="stat-value">${colorStat.count}</span>
                </div>
            `;
        });
        colorsHtml += '</div>';
    }

    if (!statsContainer) return;

    const avgAge = typeof stats.average_age === 'number' ? stats.average_age.toFixed(1) : '—';
    const totalUsers = typeof stats.total_users === 'number' ? stats.total_users : '—';

    statsContainer.innerHTML = `
        <div class="stat-item">
            <span>Средний возраст:</span>
            <span class="stat-value">${avgAge} лет</span>
        </div>
        <div class="stat-item">
            <span>Всего пользователей:</span>
            <span class="stat-value">${totalUsers}</span>
        </div>
        ${colorsHtml}
    `;
}

function displayPagination(result) {
    const container = document.getElementById('pagination');
    if (!container) return;

    const totalPages = Math.ceil(result.total / result.per_page);
    let html = '';

    for (let i = 1; i <= totalPages; i++) {
        const active = i === result.page ? 'active' : '';
        html += `<button class="page-btn ${active}" onclick="window.searchPigeons('', '', ${i})">${i}</button>`;
    }

    container.innerHTML = html;
} // фикс потерянной закрывающей скобки

function displayEditPigeonModal(pigeon) {
    let modal = document.getElementById('edit-pigeon-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'edit-pigeon-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>✏️ Редактировать голубя</h2>
                <span class="close" onclick="closeEditPigeonModal()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="edit-pigeon-form" onsubmit="saveEditedPigeon(event, ${pigeon.id})">
                    <div class="form-group">
                        <label for="edit-pigeon-name">Имя голубя</label>
                        <input type="text" id="edit-pigeon-name" value="${escapeHtml(pigeon.name)}" required>
                    </div>
                    <div class="form-group">
                        <label for="edit-pigeon-color">Цвет оперения</label>
                        <input type="text" id="edit-pigeon-color" value="${escapeHtml(pigeon.color)}" required>
                    </div>
                    <div class="form-group">
                        <label for="edit-pigeon-age">Возраст (лет)</label>
                        <input type="number" id="edit-pigeon-age" value="${pigeon.age}" min="0" required>
                    </div>
                    <div class="form-group">
                        <label for="edit-pigeon-description">Описание</label>
                        <textarea id="edit-pigeon-description" rows="3" required>${escapeHtml(pigeon.description)}</textarea>
                    </div>
                    <div class="modal-actions">
                        <button type="submit" class="btn btn-primary">Сохранить</button>
                        <button type="button" class="btn btn-secondary" onclick="closeEditPigeonModal()">Отмена</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

export function closeEditPigeonModal() {
    const modal = document.getElementById('edit-pigeon-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

export async function saveEditedPigeon(event, id) {
    event.preventDefault();

    const name = document.getElementById('edit-pigeon-name').value.trim();
    const color = document.getElementById('edit-pigeon-color').value.trim();
    const age = parseInt(document.getElementById('edit-pigeon-age').value, 10);
    const description = document.getElementById('edit-pigeon-description').value.trim();

    if (!name || !color || Number.isNaN(age) || !description) {
        showNotification('Все поля обязательны для заполнения!', 'error');
        return;
    }
    if (age < 0 || age > 50) {
        showNotification('Укажите корректный возраст (0-50 лет)', 'error');
        return;
    }

    const data = {name, color, age, description};

    await updatePigeon(id, data);
    closeEditPigeonModal();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function pluralize(number, one, few, many) {
    const mod10 = number % 10;
    const mod100 = number % 100;

    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
}

window.showEditPigeonModal = showEditPigeonModal;
window.closeEditPigeonModal = closeEditPigeonModal;
window.saveEditedPigeon = saveEditedPigeon;
window.searchPigeons = searchPigeons;
window.updatePigeon = updatePigeon;
window.loadStatistics = loadStatistics;
window.handleSearch = handleSearch;
window.deletePigeon = deletePigeon;
