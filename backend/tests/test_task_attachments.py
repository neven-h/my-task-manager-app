"""
Tests for task attachment upload (the "Take Photo" / photo library path).

The database is faked and Cloudinary is off, so these run without MySQL or
network. Requires CI=true so config uses its CI secrets:
    CI=true python -m pytest tests/test_task_attachments.py
"""
import io
import os
import sys
import tempfile
import unittest
from contextlib import contextmanager
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('CI', 'true')

from flask import Flask  # noqa: E402
from mysql.connector import Error  # noqa: E402

from auth_utils import generate_jwt_token  # noqa: E402
import routes.attachments as attachments  # noqa: E402

OWNER = 'noa'
TASK_ID = 7


class FakeCursor:
    """Answers the two queries the upload route runs: task lookup and insert."""

    def __init__(self, db):
        self.db = db
        self.lastrowid = None
        self._row = None

    def execute(self, sql, params):
        if sql.startswith('SELECT id FROM tasks'):
            owner = params[1] if len(params) > 1 else None
            found = params[0] == TASK_ID and owner in (None, OWNER)
            self._row = (TASK_ID,) if found else None
        elif sql.lstrip().startswith('INSERT INTO task_attachments'):
            self.db.inserted.append(params)
            self.lastrowid = len(self.db.inserted)
        elif 'FROM task_attachments WHERE id' in sql:
            p = self.db.inserted[params[0] - 1]
            self._row = {'id': params[0], 'filename': p[1], 'content_type': p[3],
                         'file_size': p[4], 'cloudinary_url': p[5]}

    def fetchone(self):
        return self._row


class FakeDb:
    def __init__(self):
        self.inserted = []

    @contextmanager
    def connect(self):
        conn = mock.Mock()
        conn.cursor.side_effect = lambda **_: FakeCursor(self)
        yield conn


class UploadTaskAttachmentTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        app = Flask(__name__)
        app.config['TASK_ATTACHMENTS_FOLDER'] = self.tmp.name
        app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
        app.register_blueprint(attachments.attachments_bp)
        self.client = app.test_client()
        self.db = FakeDb()
        patcher = mock.patch.object(attachments, 'get_db_connection', self.db.connect)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.addCleanup(self.tmp.cleanup)

    def _upload(self, filename, data=b'\xff\xd8\xff\xe0fake-jpeg', user=OWNER,
                content_type='image/jpeg', task_id=TASK_ID, auth=True):
        headers = {'Authorization': f'Bearer {generate_jwt_token(user, "limited")}'} if auth else {}
        body = {'file': (io.BytesIO(data), filename, content_type)} if filename else {}
        return self.client.post(f'/api/tasks/{task_id}/attachments', data=body,
                                headers=headers, content_type='multipart/form-data')

    def test_camera_photo_is_saved(self):
        # iOS hands a camera capture to the web view as "image.jpg"
        res = self._upload('image.jpg')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.get_json()['filename'], 'image.jpg')
        self.assertEqual(len(os.listdir(self.tmp.name)), 1)
        self.assertEqual(len(self.db.inserted), 1)

    def test_heic_photo_is_accepted(self):
        res = self._upload('IMG_0001.HEIC', content_type='image/heic')
        self.assertEqual(res.status_code, 201)

    def test_missing_file_is_rejected(self):
        res = self._upload(None)
        self.assertEqual(res.status_code, 400)

    def test_disallowed_type_is_rejected(self):
        res = self._upload('run.exe', content_type='application/octet-stream')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(os.listdir(self.tmp.name), [])

    def test_other_users_task_is_not_found(self):
        res = self._upload('image.jpg', user='someone-else')
        self.assertEqual(res.status_code, 404)
        self.assertEqual(self.db.inserted, [])

    def test_missing_token_is_unauthorized(self):
        res = self._upload('image.jpg', auth=False)
        self.assertEqual(res.status_code, 401)

    def test_oversized_photo_is_rejected(self):
        res = self._upload('image.jpg', data=b'0' * (16 * 1024 * 1024 + 1))
        self.assertEqual(res.status_code, 413)
        self.assertEqual(self.db.inserted, [])

    def test_db_error_returns_generic_message(self):
        def broken():
            raise Error('Table task_attachments is missing in schema secret_db')
        with mock.patch.object(attachments, 'get_db_connection', broken):
            res = self._upload('image.jpg')
        self.assertEqual(res.status_code, 500)
        self.assertNotIn('secret_db', res.get_data(as_text=True))


if __name__ == '__main__':
    unittest.main()
