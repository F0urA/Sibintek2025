from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, login_required, current_user
from models import db, User

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        email = request.form.get('email')
        is_journalist = request.form.get('is_journalist') == 'on'
        
        if not username or not password or not email:
            flash('Все поля обязательны для заполнения', 'error')
            return render_template('register.html')
        
        if User.query.filter_by(username=username).first():
            flash('Пользователь с таким именем уже существует', 'error')
            return render_template('register.html')
        
        if User.query.filter_by(email=email).first():
            flash('Email уже зарегистрирован', 'error')
            return render_template('register.html')
        
        if is_journalist:
            user_role = 'journalist'
        else:
            user_role = 'user'
        
        new_user = User(
            username=username,
            email=email,
            role=user_role
        )
        new_user.set_password(password)
        
        db.session.add(new_user)
        db.session.commit()
        
        flash('Регистрация успешна! Теперь вы можете войти.', 'success')
        return redirect(url_for('auth.login'))
    
    return render_template('register.html')


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        
        if user is None or not user.check_password(password):
            flash('Неверное имя пользователя или пароль', 'error')
            return render_template('login.html')
        
        login_user(user)
        
        next_page = request.args.get('next')
        if next_page:
            return redirect(next_page)
        
        flash(f'Добро пожаловать, {user.username}!', 'success')
        return redirect(url_for('index'))
    
    return render_template('login.html')


@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Вы успешно вышли из системы', 'info')
    return redirect(url_for('index'))


@auth_bp.route('/profile')
@login_required
def profile():
    user_news = current_user.news
    user_reports = current_user.reports
    return render_template('profile.html', user_news=user_news, user_reports=user_reports)


@auth_bp.route('/profile/edit', methods=['POST'])
@login_required
def edit_profile():
    bio = request.form.get('bio', '')
    email = request.form.get('email')
    
    if email and email != current_user.email:
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            flash('Email уже используется другим пользователем', 'error')
            return redirect(url_for('auth.profile'))
        current_user.email = email
    
    current_user.bio = bio
    db.session.commit()
    
    flash('Профиль успешно обновлен', 'success')
    return redirect(url_for('auth.profile'))
