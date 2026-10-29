from flask import Blueprint, render_template, redirect, url_for, flash, request, abort, jsonify
from flask_login import login_required, current_user
from models import db, Report

reports_bp = Blueprint('reports', __name__, url_prefix='/reports')


@reports_bp.route('/')
@login_required
def reports_list():
    user_reports = Report.query.filter_by(author_id=current_user.id).order_by(Report.created_at.desc()).all()
    return render_template('reports.html', reports=user_reports)


@reports_bp.route('/create', methods=['GET', 'POST'])
@login_required
def create_report():
    if request.method == 'POST':
        title = request.form.get('title')
        description = request.form.get('description')
        confidential_data = request.form.get('confidential_data', '')
        internal = request.form.get('internal') == 'on'
        
        if not title or not description:
            flash('Заполните все обязательные поля', 'error')
            return render_template('report_create.html')
        
        report = Report(
            title=title,
            description=description,
            confidential_data=confidential_data if confidential_data else None,
            internal=internal,
            author_id=current_user.id
        )
        
        db.session.add(report)
        db.session.commit()
        
        flash('Отчет успешно создан', 'success')
        return redirect(url_for('reports.reports_list'))
    
    return render_template('report_create.html')


@reports_bp.route('/<int:report_id>')
@login_required
def view_report(report_id):
    report = Report.query.get_or_404(report_id)
    
    if report.author_id != current_user.id:
        abort(403)
    
    return render_template('report_detail.html', report=report)
