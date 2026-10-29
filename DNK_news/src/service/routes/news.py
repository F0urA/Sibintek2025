from flask import Blueprint, render_template, redirect, url_for, flash, request, abort
from flask_login import login_required, current_user
from models import db, News
from config import Config

news_bp = Blueprint('news', __name__, url_prefix='/news')


@news_bp.route('/')
def news_list():
    page = request.args.get('page', 1, type=int)
    
    if current_user.is_authenticated:
        news_query = News.query.filter(
            (News.is_private == False) | (News.author_id == current_user.id)
        )
    else:
        news_query = News.query.filter_by(is_private=False)
    
    news_pagination = news_query.order_by(News.created_at.desc()).paginate(
        page=page,
        per_page=Config.POSTS_PER_PAGE,
        error_out=False
    )
    
    return render_template('news_list.html', news_pagination=news_pagination)


@news_bp.route('/<int:news_id>')
def news_detail(news_id):
    news = News.query.get_or_404(news_id)
    
    if news.is_private:
        if not current_user.is_authenticated or news.author_id != current_user.id:
            abort(403)
    
    return render_template('news_detail.html', news=news)


@news_bp.route('/create', methods=['GET', 'POST'])
@login_required
def create_news():
    if current_user.role not in ['journalist', 'admin']:
        flash('Только журналисты могут создавать новости', 'error')
        return redirect(url_for('news.news_list'))
    
    if request.method == 'POST':
        title = request.form.get('title')
        content = request.form.get('content')
        category = request.form.get('category')
        is_private = request.form.get('is_private') == 'on'
        
        if not title or not content or not category:
            flash('Заполните все обязательные поля', 'error')
            return render_template('news_create.html', categories=Config.NEWS_CATEGORIES)
        
        if category not in Config.NEWS_CATEGORIES:
            flash('Недопустимая категория', 'error')
            return render_template('news_create.html', categories=Config.NEWS_CATEGORIES)
        
        news = News(
            title=title,
            content=content,
            category=category,
            is_private=is_private,
            author_id=current_user.id
        )
        
        db.session.add(news)
        db.session.commit()
        
        flash('Новость успешно создана', 'success')
        return redirect(url_for('news.news_detail', news_id=news.id))
    
    return render_template('news_create.html', categories=Config.NEWS_CATEGORIES)


@news_bp.route('/<int:news_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_news(news_id):
    news = News.query.get_or_404(news_id)
    
    if news.author_id != current_user.id and current_user.role != 'admin':
        abort(403)
    
    if request.method == 'POST':
        news.title = request.form.get('title')
        news.content = request.form.get('content')
        news.category = request.form.get('category')
        news.is_private = request.form.get('is_private') == 'on'
        
        db.session.commit()
        flash('Новость успешно обновлена', 'success')
        return redirect(url_for('news.news_detail', news_id=news.id))
    
    return render_template('news_edit.html', news=news, categories=Config.NEWS_CATEGORIES)


@news_bp.route('/<int:news_id>/delete', methods=['POST'])
@login_required
def delete_news(news_id):
    news = News.query.get_or_404(news_id)
    
    if news.author_id != current_user.id and current_user.role != 'admin':
        abort(403)
    
    db.session.delete(news)
    db.session.commit()
    
    flash('Новость удалена', 'success')
    return redirect(url_for('news.news_list'))
