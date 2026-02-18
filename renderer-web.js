// Web-compatible API wrapper (replaces Electron IPC)
window.api = {
  invoke: async (channel, data) => {
    const response = await fetch('/api/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ channel, data })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
};

// Load the original renderer.js after setting up the API wrapper
const script = document.createElement('script');
script.src = 'renderer.js';
document.head.appendChild(script);
