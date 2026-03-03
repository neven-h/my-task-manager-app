from flask import Blueprint, request, jsonify, current_app
from config import (
    _fetch_stock_info_robust, _yahoo_search_tickers,
)

portfolio_search_bp = Blueprint('portfolio_search', __name__)

@portfolio_search_bp.route('/api/portfolio/search-stocks', methods=['GET'])
def search_stocks():
    """Search for stocks by ticker symbol or name using Yahoo Finance"""
    try:
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify({'error': 'Search query is required'}), 400

        if len(query) < 1:
            return jsonify({'error': 'Search query must be at least 1 character'}), 400

        # Use Yahoo Finance search API for comprehensive results
        search_results = _yahoo_search_tickers(query)

        if search_results:
            return jsonify({'results': search_results})

        # Fallback: try direct ticker lookup if search API failed
        try:
            info = _fetch_stock_info_robust(query.upper())
            if info and info.get('symbol'):
                return jsonify({
                    'results': [{
                        'ticker': info.get('symbol', query.upper()),
                        'name': info.get('longName', query.upper()),
                        'exchange': info.get('exchange', ''),
                        'currency': info.get('currency', 'USD'),
                        'quoteType': 'EQUITY',
                    }]
                })
        except Exception:
            pass

        return jsonify({
            'results': [],
            'message': 'No stocks found. Try entering a valid ticker symbol (e.g., AAPL, TSLA, MSFT)'
        })

    except Exception as e:
        current_app.logger.error('portfolio_market search error: %s', e, exc_info=True)
        return jsonify({'error': 'Failed to search stocks'}), 500
