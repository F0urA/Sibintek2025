import { showNotification } from './ui.js';
import { loadPigeons } from './pigeons.js';

let token = localStorage.getItem('token');
let currentUsername = localStorage.getItem('username');

export function getToken() {
    return token;
}

export function getCurrentUsername() {
    return currentUsername;
}

export function initAuth() {
    if (token) {
        showApp();
        loadPigeons();
    } else {
        showAuth();
    }
}

export function showLogin() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
}

export function showRegister() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}

function showAuth() {
    document.getElementById('auth-section').style.display = 'flex';
    document.getElementById('app-section').style.display = 'none';
}

function showApp() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('app-section').style.display = 'block';
    if (currentUsername) {
        document.getElementById('username-display').textContent = currentUsername;
    }
}

export async function register() {
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;

    if (!username || !password) {
        showNotification('Заполните все поля', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('Пароль должен содержать минимум 6 символов', 'error');
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const data = await response.json();
            token = data.token;
            currentUsername = username;
            localStorage.setItem('token', token);
            localStorage.setItem('username', username);
            showNotification('Регистрация успешна!', 'success');
            showApp();
            await loadPigeons();
            // Очистка полей
            document.getElementById('register-username').value = '';
            document.getElementById('register-password').value = '';
        } else {
            if (response.status === 409) {
                showNotification('Пользователь с таким именем уже существует', 'error');
                return;
            }
            const error = await response.text();
            showNotification(error, 'error');
        }
    } catch (error) {
        showNotification('Ошибка соединения с сервером', 'error');
    }
}

export async function login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
        showNotification('Заполните все поля', 'error');
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const data = await response.json();
            token = data.token;
            currentUsername = username;
            localStorage.setItem('token', token);
            localStorage.setItem('username', username);
            showNotification('Вход выполнен успешно!', 'success');
            showApp();
            loadPigeons();

            // Очистка полей
            document.getElementById('login-username').value = '';
            document.getElementById('login-password').value = '';
        } else {
            showNotification('Неверное имя пользователя или пароль', 'error');
        }
    } catch (error) {
        showNotification('Ошибка соединения с сервером', 'error');
    }
}

export function logout() {
    token = null;
    currentUsername = null;
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    showNotification('Вы вышли из системы', 'success');
    showAuth();
    showLogin();
}

export async function showProfileModal() {
    const token = getToken();
    if (!token) return;

    try {
        const response = await fetch('/api/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const profile = await response.json();
            displayProfileModal(profile);
        } else {
            showNotification('Ошибка загрузки профиля', 'error');
        }
    } catch (error) {
        showNotification('Ошибка соединения', 'error');
    }
}

function displayProfileModal(profile) {
    // Создаем модальное окно если его нет
    let modal = document.getElementById('profile-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'profile-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>👤 Профиль пользователя</h2>
                <span class="close" onclick="closeProfileModal()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="profile-info">
                    <div class="profile-avatar">🕊️</div>
                    <div class="profile-details">
                        <h3>${escapeHtml(profile.username)}</h3>
                        <p class="profile-stat">Голубей: <strong>${profile.pigeons_count}</strong></p>
                    </div>
                </div>
                <form id="profile-form" onsubmit="updateProfile(event)">
                    <div class="form-group">
                        <label for="profile-email">Email</label>
                        <input type="email" id="profile-email" value="${profile.email || ''}" placeholder="email@example.com">
                    </div>
                    <div class="form-group">
                        <label for="profile-bio">О себе</label>
                        <textarea id="profile-bio" rows="3" placeholder="Расскажите о себе...">${profile.bio || ''}</textarea>
                    </div>
                    <div class="modal-actions">
                        <button type="submit" class="btn btn-primary">Сохранить</button>
                        <button type="button" class="btn btn-secondary" onclick="closeProfileModal()">Отмена</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

export function closeProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

export async function updateProfile(event) {
    event.preventDefault();

    const email = document.getElementById('profile-email').value.trim();
    const bio = document.getElementById('profile-bio').value.trim();
    const token = getToken();

    const data = {};
    if (email) data.email = email;
    if (bio) data.bio = bio;

    try {
        const response = await fetch('/api/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showNotification('Профиль обновлён!', 'success');
            closeProfileModal();
        } else {
            showNotification('Ошибка обновления профиля', 'error');
        }
    } catch (error) {
        showNotification('Ошибка соединения', 'error');
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
