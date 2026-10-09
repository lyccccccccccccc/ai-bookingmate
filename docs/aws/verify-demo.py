"""Run on Lightsail; never print credentials or authentication tokens."""
import json
import os
import secrets
import urllib.request
import urllib.error
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

BASE = 'https://bookingmate.3-104-7-211.sslip.io/api'
expected_mode = os.environ.get('AI_EXPECTED_MODE', 'retrieval_fallback')
if expected_mode not in ('openai', 'retrieval_fallback'):
    raise ValueError('AI_EXPECTED_MODE must be openai or retrieval_fallback')

def request(method, path, data=None, token=None):
    headers = {'Content-Type': 'application/json', 'Origin': BASE.removesuffix('/api')}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(BASE + path, data=None if data is None else json.dumps(data).encode(), headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            body = response.read()
            return response.status, json.loads(body) if body else None, response.headers
    except urllib.error.HTTPError as error:
        try:
            return error.code, None, error.headers
        finally:
            error.close()

with open('/home/ubuntu/bookingmate-demo-credentials.json') as f:
    credentials = json.load(f)
tokens = {}
for account in credentials:
    status, body, headers = request('POST', '/auth/login', {'email': account['email'], 'password': account['password']})
    assert status in (200, 201), 'login failed'
    tokens[account['role']] = body['accessToken']
    assert headers.get('Access-Control-Allow-Origin') == BASE.removesuffix('/api'), 'CORS mismatch'
print('PASS demo customer/admin login and configured CORS')
status, body, _ = request('POST', '/auth/register', {'email': 'verify-' + secrets.token_hex(6) + '@bookingmate.example', 'name': 'Demo Verification Customer', 'password': secrets.token_urlsafe(24)})
assert status == 201 and body['user']['role'] == 'CUSTOMER', 'registration failed'
print('PASS registration defaults to CUSTOMER')
for role, expected in [('CUSTOMER', 403), ('ADMIN', 200)]:
    assert request('GET', '/auth/admin-check', token=tokens[role])[0] == expected, 'role enforcement failed'
assert request('GET', '/auth/me')[0] == 401
print('PASS customer/admin/anonymous authorization')
status, services, _ = request('GET', '/services')
assert status == 200
service = next(s for s in services if s['name'] == 'Demo Private Tennis Coaching')
path = '/services/' + service['id'] + '/time-slots'
status, slots, _ = request('GET', path)
assert status == 200 and slots
slot = next(s for s in slots if datetime.fromisoformat(s['startAt'].replace('Z', '+00:00')) > datetime.now(timezone.utc))
instant = datetime.fromisoformat(slot['startAt'].replace('Z', '+00:00'))
print('PASS future slot UTC=%s Brisbane=%s Sydney=%s' % (instant.isoformat(), instant.astimezone(ZoneInfo('Australia/Brisbane')).isoformat(), instant.astimezone(ZoneInfo('Australia/Sydney')).isoformat()))
status, booking, _ = request('POST', '/bookings', {'timeSlotId': slot['id'], 'notes': 'AWS deployment verification'}, tokens['CUSTOMER'])
assert status == 201 and booking['status'] == 'PENDING', 'booking failed'
try:
    assert request('PATCH', '/bookings/' + booking['id'] + '/cancel', {}, tokens['ADMIN'])[0] == 403, 'ownership enforcement failed'
finally:
    status, cancelled, _ = request('PATCH', '/bookings/' + booking['id'] + '/cancel', {}, tokens['CUSTOMER'])
    if status != 200 or cancelled['status'] != 'CANCELLED':
        raise RuntimeError('Test booking cancellation failed; inspect the verification customer booking privately')
status, slots, _ = request('GET', path)
assert any(s['id'] == slot['id'] for s in slots), 'availability restoration failed'
print('PASS booking creation, ownership, cancellation, restored availability')
status, answer, _ = request('POST', '/assistant/ask', {'question': 'How do I cancel my booking?'})
assert status in (200, 201) and answer['mode'] == expected_mode and answer['answer'].strip(), 'assistant mode verification failed'
print('PASS assistant ' + expected_mode)
