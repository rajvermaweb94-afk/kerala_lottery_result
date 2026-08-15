// support.js — Handles dynamic customer support settings loading and channel toggles

let bookingSettings = null;

async function loadSupportSettings() {
  try {
    const db = getDB();
    bookingSettings = await db.getBookingSettings();
    const activeWaps = await db.getActiveWhatsappNumbers();
    const activeCalls = await db.getActiveCallNumbers();

    // 1. WhatsApp Support
    const wapSection = document.getElementById('supportWapSection');
    const wapBtn = document.getElementById('supportWapBtn');
    if (bookingSettings.whatsapp_enabled) {
      let phoneNum = bookingSettings.whatsapp_number;
      if (activeWaps && activeWaps.length > 0) {
        phoneNum = activeWaps[0].phone_number;
      }
      const phoneDigits = phoneNum.replace(/\D/g, '');
      wapBtn.href = `https://wa.me/${phoneDigits}`;
      wapSection.style.display = 'block';
    } else {
      wapSection.style.display = 'none';
    }

    // 2. Call Support
    const callSection = document.getElementById('supportCallSection');
    const callBtn = document.getElementById('supportCallBtn');
    if (bookingSettings.call_enabled) {
      let callNum = bookingSettings.whatsapp_number; // Fallback
      if (activeCalls && activeCalls.length > 0) {
        callNum = activeCalls[0].phone_number;
      }
      const callDigits = callNum.replace(/\D/g, '');
      callBtn.href = `tel:+${callDigits}`;
      callSection.style.display = 'block';
    } else {
      callSection.style.display = 'none';
    }

    // 3. Live Chat
    const chatSection = document.getElementById('supportChatSection');
    if (bookingSettings.live_chat_enabled && bookingSettings.tawk_embed_code) {
      injectTawkScript(bookingSettings.tawk_embed_code);
      chatSection.style.display = 'block';
    } else {
      chatSection.style.display = 'none';
    }

  } catch (err) {
    console.warn("Failed to load customer support configuration from Supabase", err);
    // Offline fallback
    document.getElementById('supportWapSection').style.display = 'block';
    document.getElementById('supportWapBtn').href = "https://wa.me/919876543210";
  }
}

function injectTawkScript(embedCode) {
  if (window.Tawk_API || document.getElementById('tawk-injected')) return;
  try {
    const container = document.createElement('div');
    container.id = 'tawk-injected';
    container.style.display = 'none';
    container.innerHTML = embedCode.trim();
    
    const scriptNode = container.querySelector('script');
    if (scriptNode) {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.charset = 'UTF-8';
      
      const srcMatch = scriptNode.textContent.match(/s1\.src\s*=\s*['"](https:\/\/embed\.tawk\.to\/[^'"]+)['"]/);
      if (srcMatch && srcMatch[1]) {
        script.src = srcMatch[1];
      } else {
        const srcAttr = scriptNode.getAttribute('src');
        if (srcAttr) {
          script.src = srcAttr;
        } else {
          script.textContent = scriptNode.textContent;
        }
      }
      document.head.appendChild(script);
    }
  } catch (err) {
    console.error("Failed to dynamically load Tawk script on support page", err);
  }
}

function openTawkChat() {
  if (window.Tawk_API && typeof window.Tawk_API.maximize === 'function') {
    window.Tawk_API.maximize();
  } else {
    alert("Live chat is loading. Please try again in a few seconds.");
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadSupportSettings();
  
  // Initialize lucide icons if loaded
  if (window.lucide) {
    lucide.createIcons();
  }
});
