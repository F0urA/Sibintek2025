from flask import Flask, render_template
from flask_login import LoginManager
from models import db, User
from config import config
import os


def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    instance_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'instance')
    os.makedirs(instance_path, exist_ok=True)
    
    db.init_app(app)
    
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Пожалуйста, войдите для доступа к этой странице.'
    
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))
    
    from routes.auth import auth_bp
    from routes.news import news_bp
    from routes.admin import admin_bp
    from routes.api import api_bp
    from routes.reports import reports_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(news_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(api_bp)
    app.register_blueprint(reports_bp)
    
    @app.route('/')
    def index():
        from models import News
        latest_news = News.query.filter_by(is_private=False).order_by(News.created_at.desc()).limit(5).all()
        return render_template('index.html', latest_news=latest_news)
    
    with app.app_context():
        db.create_all()
        init_database()
    
    return app


def init_database():
    from models import User, News, SystemConfig
    import random
    import string
    
    if User.query.count() > 0:
        return
    
    admin_username = 'admin_' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    admin_password = ''.join(random.choices(string.ascii_letters + string.digits + string.punctuation, k=16))
    
    admin = User(
        username=admin_username,
        email=f'{admin_username}@dnk.space',
        role='admin',
        bio='Системный администратор DNK Space'
    )
    admin.set_password(admin_password)
    db.session.add(admin)
    
    print(f"[INIT] Создан администратор: {admin_username} / {admin_password}")
    
    journalist = User(
        username='journalist_demo',
        email='journalist@dnk.space',
        role='journalist',
        bio='Космический корреспондент DNK Space'
    )
    journalist.set_password('demo123')
    db.session.add(journalist)
    
    user = User(
        username='user_demo',
        email='user@dnk.space',
        role='user',
        bio='Инженер орбитальной станции Титан-7'
    )
    user.set_password('demo123')
    db.session.add(user)
    
    db.session.commit()
    
    news_data = [
        {
            'title': 'Открыта новая орбитальная станция добычи на спутнике Энцелад',
            'content': 'Космическая корпорация DNK Space торжественно открыла орбитальную добывающую станцию "Энцелад-Прайм" на орбите ледяного спутника Сатурна. Станция оборудована новейшими квантовыми бурами и способна добывать до 50 тысяч тонн редких минералов ежемесячно. Экипаж из 150 специалистов уже приступил к работе.',
            'category': 'Орбитальная добыча',
            'is_private': False
        },
        {
            'title': 'Запущен квантовый реактор нового поколения на станции Титан-7',
            'content': 'На флагманской перерабатывающей станции DNK Space "Титан-7" успешно запущен квантовый реактор Q-CORE 5000. Новая технология позволяет увеличить эффективность переработки космических ресурсов на 300% при нулевых выбросах. Реактор работает на принципах квантового резонанса и управляемого термоядерного синтеза.',
            'category': 'Квантовая переработка',
            'is_private': False
        },
        {
            'title': 'DNK Space стала лидером межпланетной энергодобычи',
            'content': 'По итогам галактического квартала корпорация DNK Space заняла первое место среди космических энергетических компаний. Капитализация превысила 250 миллиардов кредитов. Компания управляет 15 орбитальными станциями и ведет добычу на трех планетарных системах.',
            'category': 'Космические технологии',
            'is_private': False
        }
    ]
    
    for news_item in news_data:
        news = News(
            title=news_item['title'],
            content=news_item['content'],
            category=news_item['category'],
            is_private=news_item['is_private'],
            author_id=journalist.id
        )
        db.session.add(news)
    
    system_configs = [
        {
            'service_name': 'Quantum API Gateway',
            'internal_url': 'http://localhost:5000/api/news/1',
            'description': 'Квантовый шлюз для доступа к новостному API'
        },
        {
            'service_name': 'Orbital Database Service',
            'internal_url': 'http://localhost:5000/api/reports/1',
            'description': 'Орбитальный сервис управления базами данных'
        }
    ]
    
    for config_item in system_configs:
        config_obj = SystemConfig(
            service_name=config_item['service_name'],
            internal_url=config_item['internal_url'],
            description=config_item['description']
        )
        db.session.add(config_obj)
    
    db.session.commit()
    print("[INIT] База данных инициализирована с тестовыми данными")


if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 3000))
    app = create_app(os.environ.get('FLASK_ENV', 'development'))
    app.run(host='0.0.0.0', port=port, debug=True)
