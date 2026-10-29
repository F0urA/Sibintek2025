import {getToken} from './auth.js';
import {showNotification} from './ui.js';

export async function sendMessage(event) {
    event.preventDefault();

    const pigeonId = parseInt(document.getElementById('message-pigeon').value, 10);
    const recipientUsername = document.getElementById('message-recipient').value.trim();
    const subject = document.getElementById('message-subject').value.trim();
    const content = document.getElementById('message-content').value.trim();

    if (!pigeonId || !recipientUsername || !subject || !content) {
        showNotification('Все поля обязательны для заполнения!', 'error');
        return;
    }

    const token = getToken();
    if (!token) {
        showNotification('Требуется авторизация', 'error');
        return;
    }

    try {
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                pigeon_id: pigeonId,
                recipient_username: recipientUsername,
                subject: subject,
                content: content
            })
        });

        if (response.ok) {
            showNotification('Сообщение успешно отправлено! 🕊️', 'success');
            document.getElementById('send-message-form').reset();
        } else if (response.status === 403) {
            showNotification('Этот голубь вам не принадлежит', 'error');
        } else if (response.status === 404) {
            showNotification('Получатель не найден', 'error');
        } else {
            showNotification('Ошибка при отправке сообщения', 'error');
        }
    } catch (error) {
        showNotification('Ошибка соединения с сервером', 'error');
    }
}

export async function loadPigeonsForMessage() {
    const token = getToken();
    if (!token) return;

    try {
        const response = await fetch('/api/pigeons', {
            headers: {'Authorization': `Bearer ${token}`}
        });

        if (response.ok) {
            const pigeons = await response.json();
            const select = document.getElementById('message-pigeon');
            if (select) {
                select.innerHTML = '<option value="">-- Выберите голубя --</option>' +
                    pigeons.map(p => {
                        const name = escapeHtml(p.name);
                        const color = escapeHtml(p.color);
                        return `<option value="${p.id}">${name} (${color})</option>`;
                    }).join('');
            }
        }
    } catch (error) {
        console.error('Error loading pigeons:', error);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Функция отправки сообщения из модального окна
export async function sendMessageFromModal(event) {
    event.preventDefault();

    const pigeonId = parseInt(document.getElementById('modal-pigeon-id').value, 10);
    const recipientUsername = document.getElementById('modal-message-recipient').value.trim();
    const subject = document.getElementById('modal-message-subject').value.trim();
    const content = document.getElementById('modal-message-content').value.trim();

    if (!pigeonId || !recipientUsername || !subject || !content) {
        showNotification('Все поля обязательны для заполнения!', 'error');
        return;
    }

    const token = getToken();
    if (!token) {
        showNotification('Требуется авторизация', 'error');
        return;
    }

    try {
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                pigeon_id: pigeonId,
                recipient_username: recipientUsername,
                subject: subject,
                content: content
            })
        });

        if (response.ok) {
             const messageData = await response.json();
            closeSendMessageModalPopup();
            showMessageUuidModal(messageData.id);
        } else if (response.status === 403) {
            showNotification('Этот голубь вам не принадлежит', 'error');
        } else if (response.status === 404) {
            showNotification('Получатель не найден', 'error');
        } else {
            showNotification('Ошибка при отправке сообщения', 'error');
        }
    } catch (error) {
        showNotification('Ошибка соединения с сервером', 'error');
    }
}

// Открытие модального окна
export function showSendMessageModalPopup(pigeonId, pigeonName) {
    document.getElementById('modal-pigeon-id').value = pigeonId;
    document.getElementById('modal-pigeon-name').textContent = pigeonName;
    document.getElementById('modal-message-recipient').value = '';
    document.getElementById('modal-message-subject').value = '';
    document.getElementById('modal-message-content').value = '';
    document.getElementById('send-message-modal-popup').style.display = 'flex';
}

// Закрытие модального окна
export function closeSendMessageModalPopup() {
    document.getElementById('send-message-modal-popup').style.display = 'none';
    document.getElementById('send-message-form-popup').reset();
}

// Обработчик закрытия модала при клике вне его
window.addEventListener('click', (e) => {
    const modal = document.getElementById('send-message-modal-popup');
    if (e.target === modal) {
        closeSendMessageModalPopup();
    }

    const getMessageModal = document.getElementById('get-message-modal');
    if (e.target === getMessageModal) {
        closeGetMessageModal();
    }

    const uuidModal = document.getElementById('message-uuid-modal');
    if (e.target === uuidModal) {
        closeMessageUuidModal();
    }
});

// Функция открытия модального окна получения сообщения
export function showGetMessageModal() {
    document.getElementById('get-message-modal').style.display = 'flex';
    document.getElementById('get-message-input-section').style.display = 'block';
    document.getElementById('get-message-result-section').style.display = 'none';
    document.getElementById('message-uuid-input').value = '';
}

// Функция закрытия модального окна получения сообщения
export function closeGetMessageModal() {
    document.getElementById('get-message-modal').style.display = 'none';
    document.getElementById('get-message-form').reset();
}

// Функция сброса и возврата к вводу UUID
export function resetGetMessageModal() {
    document.getElementById('get-message-input-section').style.display = 'block';
    document.getElementById('get-message-result-section').style.display = 'none';
    document.getElementById('message-uuid-input').value = '';
}

// Функция получения сообщения по UUID
export async function getMessageByUuid(event) {
    event.preventDefault();

    const uuid = document.getElementById('message-uuid-input').value.trim();

    if (!uuid) {
        showNotification('Введите UUID сообщения', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/messages?message_id=${encodeURIComponent(uuid)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const messages = await response.json();

            if (messages && messages.length > 0) {
                const message = messages[0];
                displayMessage(message);
            } else {
                showNotification('Сообщение не найдено', 'error');
            }
        } else if (response.status === 404) {
            showNotification('Сообщение с таким UUID не найдено', 'error');
        } else {
            showNotification('Ошибка при получении сообщения', 'error');
        }
    } catch (error) {
        console.error('Error fetching message:', error);
        showNotification('Ошибка соединения с сервером', 'error');
    }
}

// Функция отображения полученного сообщения
function displayMessage(message) {
    // Заполняем поля сообщения
    document.getElementById('display-message-subject').textContent = message.subject;
    document.getElementById('display-message-sender').textContent = message.sender_username;
    document.getElementById('display-message-recipient').textContent = message.recipient_username;
    document.getElementById('display-message-date').textContent = new Date(message.created_at).toLocaleString('ru-RU');
    document.getElementById('display-message-id').textContent = message.id;
    document.getElementById('display-message-content').textContent = message.content;

    // Скрываем форму ввода и показываем результат
    document.getElementById('get-message-input-section').style.display = 'none';
    document.getElementById('get-message-result-section').style.display = 'block';

    showNotification('Сообщение успешно получено! 📬', 'success');
}

// Функция отображения UUID отправленного сообщения
export function showMessageUuidModal(uuid) {
    document.getElementById('message-uuid-display').textContent = uuid;
    document.getElementById('message-uuid-modal').style.display = 'flex';
    showNotification('Сообщение успешно отправлено! 🕊️', 'success');
}

// Функция закрытия модального окна с UUID
export function closeMessageUuidModal() {
    document.getElementById('message-uuid-modal').style.display = 'none';
}

// Функция копирования UUID в буфер обмена
export function copyMessageUuid() {
    const uuid = document.getElementById('message-uuid-display').textContent;
    navigator.clipboard.writeText(uuid).then(() => {
        showNotification('UUID скопирован в буфер обмена! 📋', 'success');
    }).catch(() => {
        showNotification('Не удалось скопировать UUID', 'error');
    });
}

// Экспорт глобальных функций
window.sendMessage = sendMessage;
window.sendMessageFromModal = sendMessageFromModal;
window.showSendMessageModal = showSendMessageModalPopup;
window.closeSendMessageModalPopup = closeSendMessageModalPopup;
window.showGetMessageModal = showGetMessageModal;
window.closeGetMessageModal = closeGetMessageModal;
window.resetGetMessageModal = resetGetMessageModal;
window.getMessageByUuid = getMessageByUuid;
window.showMessageUuidModal = showMessageUuidModal;
window.closeMessageUuidModal = closeMessageUuidModal;
window.copyMessageUuid = copyMessageUuid;

