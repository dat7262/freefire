async function startStream(facingMode, videoElementId, peerId) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facingMode },
      audio: false
    });

    document.getElementById(videoElementId).srcObject = stream;

    const peer = new Peer(peerId);
    peer.on("open", id => {
      console.log(`🎥 ${facingMode} đang phát tại ID: ${id}`);
    });

    peer.on("call", call => {
      call.answer(stream);
      console.log(`📞 Có người đang xem ${facingMode}`);
    });
  } catch (err) {
    alert(`Lỗi camera ${facingMode}: ` + err.message);
  }
}

// Phát camera trước và sau
startStream("user", "frontCam", "stream-front");
startStream("environment", "backCam", "stream-back");
