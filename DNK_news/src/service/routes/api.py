from flask import Blueprint, jsonify, request, abort
from flask_login import login_required, current_user
from models import News, Report
from config import Config

api_bp = Blueprint('api', __name__, url_prefix='/api')

@api_bp.route('/news/<int:news_id>', methods=['GET'])
def get_news_api(news_id):
    news = News.query.get_or_404(news_id)
    
    if news.is_private:
        client_ip = request.remote_addr
        
        is_localhost = client_ip in ['127.0.0.1', 'localhost', '::1']
        is_internal_network = client_ip.startswith(Config.INTERNAL_NETWORK_PREFIX)
        
        if not (is_localhost or is_internal_network):
            return jsonify({
                "error": "Private news"
            }), 403
    
    return jsonify({
        "id": news.id,
        "title": news.title,
        "content": news.content,
        "category": news.category,
        "is_private": news.is_private,
        "author_id": news.author_id,
        "created_at": news.created_at.isoformat()
    })


@api_bp.route('/my-news/<int:news_id>', methods=['GET'])
@login_required
def get_my_news_api(news_id):
    news = News.query.get_or_404(news_id)

    if news.author_id != current_user.id:
        return jsonify({
            "error": "Access denied - not your news"
        }), 403
    
    return jsonify({
        "id": news.id,
        "title": news.title,
        "content": news.content,
        "category": news.category,
        "is_private": news.is_private,
        "author_id": news.author_id,
        "created_at": news.created_at.isoformat()
    })


@api_bp.route('/news', methods=['GET'])
def get_all_news():
    news_list = News.query.filter_by(is_private=False).order_by(News.created_at.desc()).all()
    
    return jsonify([{
        "id": n.id,
        "title": n.title,
        "category": n.category,
        "created_at": n.created_at.isoformat()
    } for n in news_list])

@api_bp.route('/reports/submit', methods=['POST'])
@login_required
def submit_report_api():
    data = request.get_json()
    
    if not data or 'title' not in data or 'description' not in data:
        return jsonify({'error': 'Missing required fields'}), 400
    
    report = Report(
        title=data['title'],
        description=data['description'],
        confidential_data=data.get('confidential_data'),
        internal=data.get('internal', False),
        author_id=current_user.id
    )
    
    from models import db
    db.session.add(report)
    db.session.commit()
    
    return jsonify({
        'status': 'success',
        'id': report.id,
        'message': 'Report created successfully'
    }), 201


@api_bp.route('/reports/<int:report_id>', methods=['GET'])
@login_required
def get_report_api(report_id):
    report = Report.query.get_or_404(report_id)
    
    client_ip = request.headers.get('X-Forwarded-For')
    
    if not client_ip:
        client_ip = request.remote_addr
    else:
        client_ip = client_ip.split(',')[0].strip()
    
    is_internal_ip = client_ip.startswith(Config.INTERNAL_NETWORK_PREFIX) or client_ip == '127.0.0.1'
    
    if not is_internal_ip:
        if report.author_id != current_user.id:
            return jsonify({"error": "Access denied - not your report"}), 403
    
    response_data = {
        "id": report.id,
        "title": report.title,
        "description": report.description,
        "internal": report.internal,
        "created_at": report.created_at.isoformat()
    }

    if report.internal and is_internal_ip:
        response_data["confidential_data"] = report.confidential_data
    elif report.internal:
        response_data["message"] = "Confidential data"
    
    return jsonify(response_data)


@api_bp.route('/reports', methods=['GET'])
@login_required
def get_all_reports():
    user_reports = Report.query.filter_by(author_id=current_user.id).order_by(Report.created_at.desc()).all()
    
    return jsonify([{
        "id": r.id,
        "title": r.title,
        "internal": r.internal,
        "created_at": r.created_at.isoformat()
    } for r in user_reports])
