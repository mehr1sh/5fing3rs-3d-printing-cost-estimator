"""
Extended upload tests: file type validation, size limits, auth enforcement,
and filename sanitisation / edge cases.
"""
import pytest


VALID_BINARY_STL_HEADER = b"\x00" * 80 + b"\x01\x00\x00\x00"  # 1 triangle declared


class TestUploadFileTypeValidation:
    def test_upload_stl_without_auth_is_rejected(self, client):
        resp = client.post(
            "/api/upload",
            files={"file": ("model.stl", VALID_BINARY_STL_HEADER, "application/octet-stream")},
        )
        assert resp.status_code == 401

    def test_upload_txt_file_is_rejected(self, client, auth_headers):
        resp = client.post(
            "/api/upload",
            files={"file": ("notes.txt", b"hello", "text/plain")},
            headers=auth_headers,
        )
        assert resp.status_code == 400

    def test_upload_exe_file_is_rejected(self, client, auth_headers):
        resp = client.post(
            "/api/upload",
            files={"file": ("malware.exe", b"MZ\x90\x00", "application/octet-stream")},
            headers=auth_headers,
        )
        assert resp.status_code == 400

    def test_upload_pdf_file_is_rejected(self, client, auth_headers):
        resp = client.post(
            "/api/upload",
            files={"file": ("doc.pdf", b"%PDF-1.4", "application/pdf")},
            headers=auth_headers,
        )
        assert resp.status_code == 400

    def test_upload_empty_filename_rejected(self, client, auth_headers):
        resp = client.post(
            "/api/upload",
            files={"file": ("", b"data", "application/octet-stream")},
            headers=auth_headers,
        )
        assert resp.status_code in (400, 422)

    def test_upload_no_file_field(self, client, auth_headers):
        """POST with no file at all should return 422 Unprocessable Entity."""
        resp = client.post("/api/upload", headers=auth_headers)
        assert resp.status_code == 422


class TestUploadSizeLimits:
    def test_upload_zero_byte_file_rejected(self, client, auth_headers):
        resp = client.post(
            "/api/upload",
            files={"file": ("empty.stl", b"", "application/octet-stream")},
            headers=auth_headers,
        )
        assert resp.status_code == 400

    def test_upload_just_under_limit_accepted_or_processed(self, client, auth_headers):
        """49 MB binary STL — under the 50 MB cap.
        The server may reject it for STL structural reasons, but NOT for size."""
        content = VALID_BINARY_STL_HEADER + b"\x00" * (49 * 1024 * 1024)
        resp = client.post(
            "/api/upload",
            files={"file": ("big.stl", content, "application/octet-stream")},
            headers=auth_headers,
        )
        # Must NOT be 413; may be 400 (bad STL) or 200/201 (accepted)
        assert resp.status_code != 413

    def test_upload_over_limit_rejected(self, client, auth_headers):
        content = b"x" * (51 * 1024 * 1024)
        resp = client.post(
            "/api/upload",
            files={"file": ("huge.stl", content, "application/octet-stream")},
            headers=auth_headers,
        )
        assert resp.status_code in (400, 413)


class TestUploadFilenameEdgeCases:
    def test_upload_path_traversal_filename(self, client, auth_headers):
        """../../etc/passwd style names must not cause 500."""
        resp = client.post(
            "/api/upload",
            files={"file": ("../../etc/passwd.stl", VALID_BINARY_STL_HEADER, "application/octet-stream")},
            headers=auth_headers,
        )
        assert resp.status_code != 500

    def test_upload_unicode_filename(self, client, auth_headers):
        """Non-ASCII filename should not cause a server crash."""
        resp = client.post(
            "/api/upload",
            files={"file": ("模型.stl", VALID_BINARY_STL_HEADER, "application/octet-stream")},
            headers=auth_headers,
        )
        assert resp.status_code != 500

    def test_upload_very_long_filename(self, client, auth_headers):
        long_name = "a" * 300 + ".stl"
        resp = client.post(
            "/api/upload",
            files={"file": (long_name, VALID_BINARY_STL_HEADER, "application/octet-stream")},
            headers=auth_headers,
        )
        assert resp.status_code != 500


class TestJobRetrieval:
    def test_get_unknown_job_returns_404(self, client, auth_headers):
        resp = client.get(
            "/api/job/00000000-0000-0000-0000-000000000000",
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_get_job_without_auth_returns_401(self, client):
        resp = client.get("/api/job/00000000-0000-0000-0000-000000000000")
        assert resp.status_code == 401

    def test_get_job_invalid_uuid_format(self, client, auth_headers):
        """Malformed UUID should get a 4xx, not a 500."""
        resp = client.get("/api/job/not-a-uuid", headers=auth_headers)
        assert 400 <= resp.status_code < 500
