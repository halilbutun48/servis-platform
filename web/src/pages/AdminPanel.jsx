import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

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
      toast.error("Okullar alınamadı: " + e.message);
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
      toast.error("Kullanıcılar alınamadı: " + e.message);
    }
  }

  useEffect(() => {
    refreshSchools();
  }, []);

  useEffect(() => {
    if (selectedSchoolId) refreshUsers(Number(selectedSchoolId));
  }, [selectedSchoolId]);

  async function createSchool() {
    if (!newSchool.name.trim()) return toast.error("Okul adı zorunlu");
    try {
      const body = {
        name: newSchool.name.trim(),
        lat: newSchool.lat === "" ? null : Number(newSchool.lat),
        lon: newSchool.lon === "" ? null : Number(newSchool.lon),
      };
      const j = await api("/api/admin/schools", { method: "POST", body });
      toast.success("Okul oluşturuldu (id=" + j.school.id + ")");
      setNewSchool({ name: "", lat: "", lon: "" });
      await refreshSchools();
    } catch (e) {
      toast.error("Okul eklenemedi: " + e.message);
    }
  }

  async function createUser() {
    if (!selectedSchoolId) return toast.error("Önce okul seç");
    if (!newUser.email.trim()) return toast.error("Email zorunlu");
    if (!newUser.password) return toast.error("Şifre zorunlu");
    try {
      const body = {
        email: newUser.email.trim(),
        password: newUser.password,
        role: newUser.role,
        schoolId: Number(selectedSchoolId),
      };
      const j = await api("/api/admin/users", { method: "POST", body });
      toast.success("Kullanıcı oluşturuldu (id=" + j.user.id + ")");
      setNewUser((p) => ({ ...p, email: "" }));
      await refreshUsers(Number(selectedSchoolId));
    } catch (e) {
      toast.error("Kullanıcı eklenemedi: " + e.message);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 8 }}>Servis Odası Paneli</h2>
      <div style={{ opacity: 0.7, marginBottom: 16 }}>
        Okul oluştur, okul kullanıcılarını yönet. (SUPER_ADMIN / SERVICE_ROOM)
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ padding: 14, border: "1px solid #eee", borderRadius: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Okullar</div>

          <button onClick={refreshSchools} disabled={loading}>
            Yenile
          </button>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Yeni okul</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                placeholder="Okul adı"
                value={newSchool.name}
                onChange={(e) => setNewSchool((p) => ({ ...p, name: e.target.value }))}
              />
              <input
                placeholder="lat (opsiyonel)"
                value={newSchool.lat}
                onChange={(e) => setNewSchool((p) => ({ ...p, lat: e.target.value }))}
                style={{ width: 140 }}
              />
              <input
                placeholder="lon (opsiyonel)"
                value={newSchool.lon}
                onChange={(e) => setNewSchool((p) => ({ ...p, lon: e.target.value }))}
                style={{ width: 140 }}
              />
              <button onClick={createSchool}>Okul Ekle</button>
            </div>
          </div>

          <div style={{ marginTop: 14, borderTop: "1px solid #eee", paddingTop: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Mevcut okullar</div>
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              style={{ width: "100%", padding: 8 }}
            >
              <option value="">Okul seç</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  #{s.id} — {s.name}
                </option>
              ))}
            </select>

            {selectedSchool && (
              <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>
                Seçili: <b>{selectedSchool.name}</b> (id={selectedSchool.id}){" "}
                {selectedSchool.lat != null && selectedSchool.lon != null ? (
                  <> — {selectedSchool.lat}, {selectedSchool.lon}</>
                ) : (
                  <> — konum yok</>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: 14, border: "1px solid #eee", borderRadius: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Okul Kullanıcıları</div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <input
              placeholder="email"
              value={newUser.email}
              onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
              style={{ minWidth: 260 }}
            />
            <input
              placeholder="password"
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
            <button onClick={createUser}>Kullanıcı Ekle</button>
          </div>

          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
            Not: Şifre demo için varsayılan <b>Demo123!</b>
          </div>

          <div style={{ borderTop: "1px solid #eee", paddingTop: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Liste</div>
            {!selectedSchoolId ? (
              <div style={{ opacity: 0.7 }}>Okul seçince kullanıcı listesi gelir.</div>
            ) : users.length === 0 ? (
              <div style={{ opacity: 0.7 }}>Kullanıcı yok.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {users.map((u) => (
                  <div key={u.id} style={{ padding: 10, border: "1px solid #f0f0f0", borderRadius: 10 }}>
                    <div style={{ fontWeight: 700 }}>{u.email}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      id={u.id} — role={u.role} — schoolId={u.schoolId ?? "-"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 12, opacity: 0.7 }}>
        Eğer 401/403 görürsen: admin@demo.com ile giriş yaptığından emin ol.
      </div>
    </div>
  );
}
