// web/src/socket.js
// DEPRECATED: Tek kaynak WS artık web/src/live/ws.js
// Bu dosya eskiden ikinci bir Socket.IO bağlantısı açıyordu ve event'leri 2x yapıyordu.
// Şimdilik geriye dönük uyumluluk için NO-OP bıraktık.

export function connectSocket(token) {
  // Eski çağrıları kırmamak için dummy nesne dönüyoruz.
  // Nereden çağrıldığını yakalamak için uyarı basıyoruz.
  console.warn(
    "[socket.js] connectSocket() is deprecated. Use startLiveWs(token) from web/src/live/ws.js instead.",
    { hasToken: Boolean(token) }
  );

  // Socket.IO benzeri minimal API (kırılmayı önler)
  return {
    id: null,
    connected: false,
    on() {},
    off() {},
    onAny() {},
    offAny() {},
    removeAllListeners() {},
    disconnect() {},
  };
}
