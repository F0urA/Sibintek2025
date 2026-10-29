import { initAuth, login, register, logout, showLogin, showRegister, showProfileModal, closeProfileModal, updateProfile } from './auth.js';
import { addPigeon, deletePigeon, setView, handleSearch, showEditPigeonModal, closeEditPigeonModal, saveEditedPigeon } from './pigeons.js';
import { loadPigeonsForMessage } from './messages.js';
import './messages.js';

// Инициализация приложения
initAuth();

// Загрузка голубей для формы отправки сообщений при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        setTimeout(loadPigeonsForMessage, 500);
    }
});

// Глобальные функции для HTML onclick
window.login = login;
window.register = register;
window.logout = logout;
window.showLogin = showLogin;
window.showRegister = showRegister;
window.addPigeon = addPigeon;
window.deletePigeon = deletePigeon;
window.setView = setView;
window.showProfileModal = showProfileModal;
window.closeProfileModal = closeProfileModal;
window.updateProfile = updateProfile;
window.handleSearch = handleSearch;
window.showEditPigeonModal = showEditPigeonModal;
window.closeEditPigeonModal = closeEditPigeonModal;
window.saveEditedPigeon = saveEditedPigeon;
