"""
Yahoo Finance ticker search using the autocomplete API.
"""
import json
import urllib.request
import urllib.parse


def _yahoo_search_tickers(query):
    """
    Search for tickers using Yahoo Finance's autocomplete API.
    Returns a list of matching results. Handles rate limiting gracefully.
    """
    results = []
    try:
        url = (
            f"https://query2.finance.yahoo.com/v1/finance/search"
            f"?q={urllib.parse.quote(query)}&quotesCount=8&newsCount=0&listsCount=0&enableFuzzyQuery=false"
        )
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status == 429:
                print(f"Yahoo Finance search API rate limited for query: {query}")
                return results
            data = json.loads(resp.read().decode())
            for q in data.get('quotes', []):
                if q.get('quoteType') in ('EQUITY', 'ETF', 'MUTUALFUND', 'INDEX', 'CRYPTOCURRENCY'):
                    results.append({
                        'ticker': q.get('symbol', ''),
                        'name': q.get('longname') or q.get('shortname', q.get('symbol', '')),
                        'exchange': q.get('exchange', ''),
                        'currency': q.get('currency', 'USD'),
                        'quoteType': q.get('quoteType', ''),
                    })
    except urllib.error.HTTPError as e:
        if e.code == 429:
            print(f"Yahoo Finance search API rate limited (HTTP 429) for query: {query}")
        else:
            print(f"Yahoo search API HTTP error: {e}")
    except json.JSONDecodeError as e:
        print(f"Yahoo search API JSON decode error (likely rate limit) for query: {query}: {e}")
    except Exception as e:
        error_str = str(e).lower()
        if '429' in error_str or 'too many requests' in error_str:
            print(f"Yahoo Finance search API rate limited for query: {query}")
        else:
            print(f"Yahoo search API error: {e}")
    return results
