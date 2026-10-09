"""Offline checks for verifier failure cleanup; no network or database access."""
import io
import json
import os
from pathlib import Path
import runpy
import unittest
from datetime import timedelta, timezone
from unittest.mock import patch
from urllib.error import HTTPError

SCRIPT = Path(__file__).with_name('verify-demo.py')

class Response:
    def __init__(self, status, body):
        self.status = status
        self.body = body
        self.headers = {'Access-Control-Allow-Origin': 'https://bookingmate.3-104-7-211.sslip.io'}
    def __enter__(self):
        return self
    def __exit__(self, *args):
        pass
    def read(self):
        return json.dumps(self.body).encode()

class VerifierTests(unittest.TestCase):
    def run_verifier(self, ownership_status):
        self.cancelled = False
        def endpoint(req, **kwargs):
            route = req.full_url.split('/api', 1)[1]
            auth = req.headers.get('Authorization', '')
            if route == '/auth/login':
                email = json.loads(req.data)['email']
                return Response(201, {'accessToken': 'ADMIN' if email.startswith('admin') else 'CUSTOMER'})
            if route == '/auth/register':
                return Response(201, {'user': {'role': 'CUSTOMER'}})
            if route == '/auth/admin-check':
                if auth == 'Bearer ADMIN': return Response(200, {})
                raise HTTPError(req.full_url, 403, 'Forbidden', {}, io.BytesIO())
            if route == '/auth/me':
                raise HTTPError(req.full_url, 401, 'Unauthorized', {}, io.BytesIO())
            if route == '/services':
                return Response(200, [{'id': 'service', 'name': 'Demo Private Tennis Coaching'}])
            if route == '/services/service/time-slots':
                return Response(200, [{'id': 'slot', 'startAt': '2099-01-01T01:00:00Z'}])
            if route == '/bookings':
                return Response(201, {'id': 'booking', 'status': 'PENDING'})
            if route == '/bookings/booking/cancel':
                if auth == 'Bearer ADMIN':
                    if ownership_status == 403:
                        raise HTTPError(req.full_url, 403, 'Forbidden', {}, io.BytesIO())
                    return Response(ownership_status, {})
                self.cancelled = True
                return Response(200, {'status': 'CANCELLED'})
            if route == '/assistant/ask':
                return Response(201, {'mode': 'openai', 'answer': 'Mocked response'})
            raise AssertionError('Unexpected endpoint')
        accounts = [{'email': 'admin@bookingmate.example', 'password': 'mock', 'role': 'ADMIN'},
                    {'email': 'customer@bookingmate.example', 'password': 'mock', 'role': 'CUSTOMER'}]
        with patch.dict(os.environ, {'AI_EXPECTED_MODE': 'openai'}), \
             patch('zoneinfo.ZoneInfo', side_effect=lambda name: timezone(timedelta(hours=10 if name.endswith('Brisbane') else 11))), \
             patch('builtins.open', return_value=io.StringIO(json.dumps(accounts))), \
             patch('urllib.request.urlopen', side_effect=endpoint), patch('sys.stdout', new=io.StringIO()):
            runpy.run_path(str(SCRIPT))

    def test_success_cancels_booking(self):
        self.run_verifier(403)
        self.assertTrue(self.cancelled)

    def test_failed_ownership_assertion_still_cancels_booking(self):
        with self.assertRaises(AssertionError): self.run_verifier(200)
        self.assertTrue(self.cancelled)

    def test_invalid_mode_fails_before_network_or_credentials(self):
        with patch.dict(os.environ, {'AI_EXPECTED_MODE': 'invalid'}), \
             patch('urllib.request.urlopen') as network, patch('builtins.open') as credentials:
            with self.assertRaises(ValueError): runpy.run_path(str(SCRIPT))
            network.assert_not_called()
            credentials.assert_not_called()

if __name__ == '__main__':
    unittest.main()
