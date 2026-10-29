from flask import Blueprint, render_template, request, jsonify, abort
from flask_login import login_required, current_user
from models import db, SystemConfig
import subprocess
import shlex

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')


@admin_bp.route('/')
@login_required
def admin_panel():
    if current_user.role != 'admin':
        abort(403)
    services = SystemConfig.query.all()
    
    return render_template('admin_panel.html', services=services)


@admin_bp.route('/check-service', methods=['POST'])
@login_required
def check_service():
    if current_user.role != 'admin':
        return jsonify({'error': 'Access denied'}), 403
    
    service_url = request.form.get('service_url') or request.json.get('service_url')
    
    if not service_url:
        return jsonify({'error': 'URL не указан'}), 400
    
    try:
        result = subprocess.run(
            ['curl', '-s', '-L', '--max-time', '5', service_url],
            capture_output=True,
            text=True,
            timeout=6
        )
        
        return jsonify({
            'status': 'success',
            'response': result.stdout,
            'error': result.stderr if result.returncode != 0 else None
        })
    
    except subprocess.TimeoutExpired:
        return jsonify({
            'status': 'error',
            'message': 'Timeout: сервис не отвечает'
        }), 504
    
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Ошибка проверки: {str(e)}'
        }), 500


@admin_bp.route('/health-check', methods=['GET', 'POST'])
def health_check():
    check_url = request.args.get('url') or request.form.get('url') or (request.json.get('url') if request.is_json else None)
    
    if not check_url:
        return jsonify({
            'status': 'healthy',
            'service': 'DNK News',
            'message': 'Use ?url=<service_url> to check dependencies'
        })
    try:
        result = subprocess.run(
            ['curl', '-s', '-L', '--max-time', '5', check_url],
            capture_output=True,
            text=True,
            timeout=6
        )
        
        return jsonify({
            'status': 'success',
            'url': check_url,
            'response': result.stdout,
            'reachable': result.returncode == 0
        })
    
    except subprocess.TimeoutExpired:
        return jsonify({
            'status': 'timeout',
            'url': check_url,
            'reachable': False
        }), 504
    
    except Exception as e:
        return jsonify({
            'status': 'error',
            'url': check_url,
            'message': str(e)
        }), 500


@admin_bp.route('/system-info')
@login_required
def system_info():
    if current_user.role != 'admin':
        abort(403)
    
    from models import User, News, Report
    
    info = {
        'users_count': User.query.count(),
        'news_count': News.query.count(),
        'reports_count': Report.query.count(),
        'private_news_count': News.query.filter_by(is_private=True).count(),
        'internal_reports_count': Report.query.filter_by(internal=True).count()
    }
    
    return render_template('system_info.html', info=info)
