const VIDEO_ID = "my-fixed-stream-id";

const peer = new Peer();
peer.on('open', () => {
  const fakeStream = getFakeMediaStream(); // tránh lỗi khi không gọi call ngược

  const call = peer.call(VIDEO_ID, fakeStream);
  call.on('stream', stream => {
    document.getElementById('remoteVideo').srcObject = stream;
  });

  call.on('error', err => {
    console.error("Lỗi khi nhận stream:", err);
  });
});

function getFakeMediaStream() {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas.captureStream();
}
