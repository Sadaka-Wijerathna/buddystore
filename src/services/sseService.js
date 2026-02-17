class SSEService {
  constructor() {
    this.clients = new Set();
  }

  addClient(res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    res.write('data: {"type":"connected"}\n\n');

    this.clients.add(res);

    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 30000);

    res.on('close', () => {
      clearInterval(heartbeat);
      this.clients.delete(res);
    });

    return res;
  }

  broadcast(event) {
    const data = JSON.stringify(event);
    this.clients.forEach(client => {
      try {
        client.write(`data: ${data}\n\n`);
      } catch (error) {
        this.clients.delete(client);
      }
    });
  }

  sendToClient(res, event) {
    try {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch (error) {
      this.clients.delete(res);
    }
  }

  getClientCount() {
    return this.clients.size;
  }
}

module.exports = new SSEService();
