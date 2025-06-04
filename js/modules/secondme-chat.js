// 配置需替换为实际值
const SECONDME_CONFIG = {
  instance_id: '5qrqcidl',
  endpoint: '/api/chat-proxy' // 如果配置了代理
};

class SecondMeChat {
  constructor() {
    this.sseConnection = null;
    this.isProcessing = false;
  }

  init() {
    this.injectHTML();
    this.bindEvents();
    this.checkCompatibility();
  }

  injectHTML() {
    const container = document.createElement('div');
    container.innerHTML = `
      <div id="secondme-chat" style="display:none;">
        <!-- 保持之前提供的HTML结构 -->
      </div>
      <button id="chat-trigger">💬</button>
    `;
    document.body.appendChild(container);
  }

  // ... 其他方法保持之前核心逻辑，增加以下适配代码 ...

  async handleSend() {
    if (this.isProcessing) return;
    
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    if (!message) return;

    this.appendMessage(message, false);
    input.value = '';
    this.isProcessing = true;

    try {
      const response = await fetch(`${SECONDME_CONFIG.endpoint}/${SECONDME_CONFIG.instance_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "你是我个人博客的AI助手，用中文回答，保持回答简洁专业" },
            { role: "user", content: message }
          ],
          stream: true
        })
      });

      if (!response.ok) throw new Error(`HTTP错误 ${response.status}`);
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop();

        for (const part of parts) {
          const event = this.parseSSEEvent(part);
          if (event?.data) this.appendMessage(event.data, true);
        }
      }
    } catch (err) {
      console.error('请求失败:', err);
      this.appendMessage("服务暂时不可用，请稍后再试", true);
    } finally {
      this.isProcessing = false;
    }
  }

  parseSSEEvent(rawData) {
    try {
      const event = {};
      rawData.split('\n').forEach(line => {
        const [key, value] = line.split(': ');
        if (key && value) event[key] = value;
      });
      return event.data ? JSON.parse(event.data) : null;
    } catch (e) {
      return null;
    }
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  window.secondMeChat = new SecondMeChat();
  window.secondMeChat.init();
});