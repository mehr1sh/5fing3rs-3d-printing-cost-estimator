"""
Integration tests for /api/admin/* endpoints.
Verifies RBAC (only admins can access), material CRUD, and config updates.
"""

import pytest


class TestAdminMaterialsAccess:

    def test_list_materials_requires_auth(self, client):
        response = client.get("/api/admin/materials")
        assert response.status_code == 401

    def test_list_materials_customer_gets_403(self, client, user_token):
        response = client.get(
            "/api/admin/materials",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 403

    def test_list_materials_admin_gets_200(self, client, admin_token):
        response = client.get(
            "/api/admin/materials",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestAdminMaterialsCRUD:

    def test_create_material_returns_201(self, client, admin_token):
        response = client.post(
            "/api/admin/materials",
            json={"name": "ABS", "density_g_cm3": 1.05, "cost_per_gram": 3.0},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "ABS"
        assert data["density_g_cm3"] == 1.05

    def test_create_duplicate_material_returns_400(self, client, admin_token, pla_material):
        response = client.post(
            "/api/admin/materials",
            json={"name": "PLA", "density_g_cm3": 1.24, "cost_per_gram": 2.5},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()

    def test_update_material_price(self, client, admin_token, pla_material):
        response = client.put(
            f"/api/admin/materials/{pla_material.id}",
            json={"cost_per_gram": 3.5},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        assert float(response.json()["cost_per_gram"]) == pytest.approx(3.5, abs=0.01)

    def test_update_nonexistent_material_returns_404(self, client, admin_token):
        response = client.put(
            "/api/admin/materials/99999",
            json={"cost_per_gram": 5.0},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 404

    def test_delete_material_returns_204(self, client, admin_token, pla_material):
        response = client.delete(
            f"/api/admin/materials/{pla_material.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 204

    def test_delete_nonexistent_material_returns_404(self, client, admin_token):
        response = client.delete(
            "/api/admin/materials/99999",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 404

    def test_material_appears_in_list_after_create(self, client, admin_token):
        client.post(
            "/api/admin/materials",
            json={"name": "PETG", "density_g_cm3": 1.27, "cost_per_gram": 3.2},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        response = client.get(
            "/api/admin/materials",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        names = [m["name"] for m in response.json()]
        assert "PETG" in names

    def test_material_absent_from_list_after_delete(self, client, admin_token, pla_material):
        client.delete(
            f"/api/admin/materials/{pla_material.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        response = client.get(
            "/api/admin/materials",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        names = [m["name"] for m in response.json()]
        assert "PLA" not in names


class TestAdminConfig:

    def test_get_config_returns_dict(self, client, admin_token, admin_config):
        response = client.get(
            "/api/admin/config",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        assert "config" in response.json()

    def test_update_config_creates_new_key(self, client, admin_token):
        response = client.put(
            "/api/admin/config",
            json={"key": "new_setting", "value": "42", "description": "test"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        assert response.json()["config"]["new_setting"] == "42"

    def test_update_config_overwrites_existing_key(self, client, admin_token, admin_config):
        response = client.put(
            "/api/admin/config",
            json={"key": "machine_hourly_rate", "value": "750"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        assert response.json()["config"]["machine_hourly_rate"] == "750"

    def test_get_config_requires_admin(self, client, user_token):
        response = client.get(
            "/api/admin/config",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 403


class TestAdminLogs:

    def test_get_logs_returns_list(self, client, admin_token):
        response = client.get(
            "/api/admin/logs",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_logs_customer_gets_403(self, client, user_token):
        response = client.get(
            "/api/admin/logs",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 403