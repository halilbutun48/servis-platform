// ASCII-only TR dictionary (Turkish UI text via unicode escapes)
export const TR = {
  // ===== School Panel (General) =====
  school_title: "Okul y\u00F6netimi",
  school_subtitle: "Ara\u00E7 / Rota / Durak y\u00F6netimi (SCHOOL_ADMIN)",
  school_section_school: "Okul",
  school_btn_save_location: "Konumu kaydet",
  school_loading: "Y\u00FCkleniyor\u2026",

  // Vehicles
  school_section_vehicles: "Ara\u00E7lar",
  school_placeholder_plate: "Plaka",
  school_placeholder_driver_user_id: "driverUserId (ops)",
  school_btn_add_vehicle: "Ara\u00E7 ekle",
  school_vehicle_driver_label: "S\u00FCr\u00FCc\u00FC",
  school_vehicle_none: "Ara\u00E7 yok.",

  // Routes
  school_section_routes: "Rotalar",
  school_placeholder_route_name: "Rota ad\u0131",
  school_option_vehicle_optional: "Ara\u00E7 (ops)",
  school_btn_add_route: "Rota ekle",
  school_select_route_placeholder: "Rota se\u00E7",
  school_label_stops: "durak",

  // Stops
  school_section_add_stop: "Durak ekle",
  school_placeholder_ord: "ord (bo\u015F=auto)",
  school_placeholder_stop_name: "Durak ad\u0131",
  school_btn_add_stop: "Durak ekle",
  school_selected_route_no_stops: "Se\u00E7ili rotada durak yok.",
  school_select_route_to_view_stops: "Duraklar\u0131 g\u00F6rmek i\u00E7in rota se\u00E7.",
  school_map_click_hint: "Haritaya t\u0131kla -> lat/lon otomatik dolar.",
  school_popup_school: "Okul",

  // ===== Students =====
  school_students_title: "\u00D6\u011Frenciler", // Ogrenciler
  school_students_search_placeholder: "Ara (isim)",
  school_students_search_btn: "Ara",
  school_students_refresh_btn: "Yenile",
  school_students_loading: "y\u00FCkleniyor\u2026",

  school_students_col_id: "ID",
  school_students_col_fullname: "Ad Soyad",
  school_students_col_route: "Rota",
  school_students_col_parent_email: "Veli Email",
  school_students_no_records: "Kay\u0131t yok",

  // ===== Toasts / Errors =====
  toast_err_refresh_failed: "Veriler al\u0131namad\u0131",
  toast_err_stops_fetch_failed: "Duraklar al\u0131namad\u0131",

  toast_err_plate_required: "Plaka zorunlu",
  toast_err_vehicle_add_failed: "Ara\u00E7 eklenemedi",

  toast_err_route_name_required: "Rota ad\u0131 zorunlu",
  toast_err_route_add_failed: "Rota eklenemedi",

  toast_err_select_route_first: "\u00D6nce rota se\u00E7",
  toast_err_stop_name_required: "Durak ad\u0131 zorunlu",
  toast_err_latlon_required: "Lat/Lon zorunlu (haritadan t\u0131klayabilirsin)",
  toast_err_stop_add_failed: "Durak eklenemedi",

  toast_err_school_location_save_failed: "Konum kaydedilemedi",

  // ===== Toasts / Success =====
  toast_ok_vehicle_added: "Ara\u00E7 eklendi",
  toast_ok_route_added: "Rota eklendi",
  toast_ok_stop_added: "Durak eklendi",
  toast_ok_school_location_saved: "Okul konumu kaydedildi",
    // ===== App / Nav =====
  nav_service_room: "Servis odas\u0131",
  nav_school_panel: "Okul y\u00F6netimi",

  // ===== Admin Panel =====
  admin_title: "Servis odas\u0131 paneli",
  admin_subtitle: "Okul olu\u015Ftur, okul kullan\u0131c\u0131lar\u0131n\u0131 y\u00F6net. (SUPER_ADMIN / SERVICE_ROOM)",

  admin_section_schools: "Okullar",
  admin_btn_refresh: "Yenile",

  admin_new_school_label: "Yeni okul",
  admin_existing_schools_label: "Mevcut okullar",

  admin_placeholder_school_name: "Okul ad\u0131",
  admin_placeholder_lat_optional: "lat (opsiyonel)",
  admin_placeholder_lon_optional: "lon (opsiyonel)",
  admin_btn_add_school: "Okul ekle",

  admin_select_school_placeholder: "Okul se\u00E7",
  admin_selected_label: "Se\u00E7ili",
  admin_location_none: "konum yok",

  admin_section_users: "Okul kullan\u0131c\u0131lar\u0131",
  admin_placeholder_user_email: "email",
  admin_placeholder_user_password: "password",
  admin_btn_add_user: "Kullan\u0131c\u0131 ekle",

  admin_note_default_password: "Not: Sifre demo icin varsay\u0131lan Demo123!",
  admin_list_label: "Liste",
  admin_no_school_selected: "Okul secince kullan\u0131c\u0131 listesi gelir.",
  admin_no_users: "Kullan\u0131c\u0131 yok.",
  admin_hint_401: "Eger 401/403 gorursen: admin@demo.com ile giris yaptigindan emin ol.",

  // ===== Admin Toasts =====
  toast_err_admin_schools_fetch_failed: "Okullar al\u0131namad\u0131",
  toast_err_admin_users_fetch_failed: "Kullan\u0131c\u0131lar al\u0131namad\u0131",
  toast_err_admin_school_name_required: "Okul ad\u0131 zorunlu",
  toast_err_admin_school_create_failed: "Okul eklenemedi",
  toast_ok_admin_school_created: "Okul olu\u015Fturuldu",

  toast_err_admin_select_school_first: "\u00D6nce okul se\u00E7",
  toast_err_admin_email_required: "Email zorunlu",
  toast_err_admin_password_required: "Sifre zorunlu",
  toast_err_admin_user_create_failed: "Kullan\u0131c\u0131 eklenemedi",
  toast_ok_admin_user_created: "Kullan\u0131c\u0131 olu\u015Fturuldu",

};
