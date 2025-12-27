const router = require("express").Router();

// Eğer projende auth middleware varsa burada require et.
// Yoksa şimdilik açık bırakıp 404'ü kaldırırız.
// const auth = require("../middleware/auth");

router.get("/me", /*auth,*/ async (req, res) => {
  // Şimdilik minimum: 200 + boş liste
  return res.json({ ok: true, items: [] });
});

module.exports = router;
