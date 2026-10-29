import os


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY')
    
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:////' + os.path.join(os.path.abspath(os.path.dirname(__file__)), 'instance', 'dnk_news.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    COMPANY_NAME = 'DNK Space Corporation'
    SERVICE_NAME = 'DNK Space News'
    
    NEWS_CATEGORIES = [
        'Орбитальная добыча',
        'Квантовая переработка',
        'Космические технологии',
        'Безопасность станций'
    ]
    INTERNAL_NETWORK_PREFIX = '192.168.100.'
    
    POSTS_PER_PAGE = 10


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
