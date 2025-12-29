import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { t } from "../i18n/t";

function getToken() {
  return localStorage.getItem("token") || "";
}

async function api(path, { method = "GET", body } = {}) {
  const token = getToken();
  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "x-auth-token": token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    const err = json?.error || `HTTP_${res.status}`;
    throw new Error(err);
  }
  return json;
}

export default function AdminPanel() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);

  const [newSchool, setNewSchool] = useState({ name: "", lat: "", lon: "" });

  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [users, setUsers] = useState([]);

  const [newUser, setNewUser] = useState({
    email: "",
    password: "Demo123!",
    role: "SCHOOL_ADMIN",
  });

  const selectedSchool = useMemo(() => {
    const id = Number(selectedSchoolId);
    return schools.find((s) => s.id === id) || null;
  }, [schools, selectedSchoolId]);

  async function refreshSchools() {
    setLoading(true);
    try {
      const j = await api("/api/admin/schools");
      setSchools(j.schools || []);
    } catch (e) {
      toast.error(`${t("toast_err_admin_schools_fetch_failed")}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function refreshUsers(schoolId) {
    if (!schoolId) return;
    try {
      const j = await api(`/api/admin/users?schoolId=${schoolId}`);
      setUsers(j.users || []);
    } catch (e) {
      toast.error(`${t("toast_err_admin_users_fetch_failed")}: ${e.message}`);
    }
  }

  useEffect(() => {
    refreshSchools();
  }, []);

  useEffect(() => {
    if (selectedSchoolId) refreshUsers(Number(selectedSchoolId));
  }, [selectedSchoolId]);

  async function createSchool() {
    if (!newSchool.name.trim()) return toast.error(t("toast_err_admin_school_name_required"));

    try {
      const body = {
        name: newSchool.name.trim(),
        lat: newSchool.lat === "" ? null : Number(newSchool.lat),
        lon: newSchool.lon === "" ? null : Number(newSchool.lon),
      };
      const j = await api("/api/admin/schools", { method: "POST", body });
      toast.success(`${t("toast_ok_admin_school_created")} (id=${j.school?.id})`);
      setNewSchool({ name: "", lat: "", lon: "" });
      await refreshSchools();
    } catch (e) {
      toast.error(`${t("toast_err_admin_school_create_failed")}: ${e.message}`);
    }
  }

  async function createUser() {
    if (!selectedSchoolId) return toast.error(t("toast_err_admin_select_school_first"));
    if (!newUser.email.trim()) return toast.error(t("toast_err_admin_email_required"));
    if (!newUser.password) return toast.error(t("toast_err_admin_password_required"));

    try {
      const body = {
        email: newUser.email.trim(),
        password: newUser.password,
        role: newUser.role,
        schoolId: Number(selectedSchoolId),
      };
      const j = await api("/api/admin/users", { method: "POST", body });
      toast.success(`${t("toast_ok_admin_user_created")} (id=${j.user?.id})`);
      setNewUser((p) => ({ ...p, email: "" }));
      await refreshUsers(Number(selectedSchoolId));
    } catch (e) {
      toast.error(`${t("toast_err_admin_user_create_failed")}: ${e.message}`);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 8 }}>{t("admin_title")}</h2>
      <div style={{ opacity: 0.7, marginBottom: 16 }}>{t("admin_subtitle")}</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ padding: 14, border: "1px solid #eee", borderRadius: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>{t("admin_section_schools")}</div>

          <button onClick={refreshSchools} disabled={loading}>
            {t("admin_btn_refresh")}
          </button>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{t("admin_new_school_label")}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                placeholder={t("admin_placeholder_school_name")}
                value={newSchool.name}
                onChange={(e) => setNewSchool((p) => ({ ...p, name: e.target.value }))}
              />
              <input
                placeholder={t("admin_placeholder_lat_optional")}
                value={newSchool.lat}
                onChange={(e) => setNewSchool((p) => ({ ...p, lat: e.target.value }))}
                style={{ width: 140 }}
              />
              <input
                placeholder={t("admin_placeholder_lon_optional")}
                value={newSchool.lon}
                onChange={(e) => setNewSchool((p) => ({ ...p, lon: e.target.value }))}
                style={{ width: 140 }}
              />
              <button onClick={createSchool}>{t("admin_btn_add_school")}</button>
            </div>
          </div>

          <div style={{ marginTop: 14, borderTop: "1px solid #eee", paddingTop: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{t("admin_existing_schools_label")}</div>
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              style={{ width: "100%", padding: 8 }}
            >
              <option value="">{t("admin_select_school_placeholder")}</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  #{s.id} - {s.name}
                </option>
              ))}
            </select>

            {selectedSchool && (
              <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>
                {t("admin_selected_label")}: <b>{selectedSchool.name}</b> (id={selectedSchool.id}){" "}
                {selectedSchool.lat != null && selectedSchool.lon != null ? (
                  <> - {selectedSchool.lat}, {selectedSchool.lon}</>
                ) : (
                  <> - {t("admin_location_none")}</>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: 14, border: "1px solid #eee", borderRadius: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>{t("admin_section_users")}</div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <input
              placeholder={t("admin_placeholder_user_email")}
              value={newUser.email}
              onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
              style={{ minWidth: 260 }}
            />
            <input
              placeholder={t("admin_placeholder_user_password")}
              value={newUser.password}
              onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
              style={{ width: 160 }}
            />
            <select
              value={newUser.role}
              onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}
              style={{ padding: 8 }}
            >
              <option value="SCHOOL_ADMIN">SCHOOL_ADMIN</option>
              <option value="DRIVER">DRIVER</option>
              <option value="PARENT">PARENT</option>
            </select>
            <button onClick={createUser}>{t("admin_btn_add_user")}</button>
          </div>

          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>{t("admin_note_default_password")}</div>

          <div style={{ borderTop: "1px solid #eee", paddingTop: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{t("admin_list_label")}</div>

            {!selectedSchoolId ? (
              <div style={{ opacity: 0.7 }}>{t("admin_no_school_selected")}</div>
            ) : users.length === 0 ? (
              <div style={{ opacity: 0.7 }}>{t("admin_no_users")}</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {users.map((u) => (
                  <div key={u.id} style={{ padding: 10, border: "1px solid #f0f0f0", borderRadius: 10 }}>
                    <div style={{ fontWeight: 700 }}>{u.email}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      id={u.id} - role={u.role} - schoolId={u.schoolId ?? "-"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 12, opacity: 0.7 }}>{t("admin_hint_401")}</div>
    </div>
  );
}
