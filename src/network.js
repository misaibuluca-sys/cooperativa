// Gerenciamento de Rede P2P via PeerJS (WebRTC DataChannel e Voz Mesh)
export class NetworkManager {
  constructor(onPlayerJoined, onStateSync, onMeetingTriggered, onChatMsg) {
    this.peer = null;
    this.isHost = false;
    this.roomCode = null;
    this.connections = new Map(); // peerId -> DataConnection
    this.peersData = new Map();   // peerId -> Info
    this.myId = null;

    this.onPlayerJoined = onPlayerJoined;
    this.onStateSync = onStateSync;
    this.onMeetingTriggered = onMeetingTriggered;
    this.onChatMsg = onChatMsg;
  }

  init(myPlayerInfo, asHost, targetRoomCode = null) {
    return new Promise((resolve, reject) => {
      this.isHost = asHost;
      this.roomCode = asHost ? this.generateRoomCode() : targetRoomCode.toUpperCase();
      
      const peerCustomId = asHost 
        ? `coop-room-${this.roomCode}-host` 
        : `coop-guest-${Math.random().toString(36).substring(2, 9)}`;

      this.peer = new Peer(peerCustomId);

      this.peer.on('open', (id) => {
        this.myId = id;
        this.peersData.set(id, myPlayerInfo);

        if (!asHost) {
          const hostPeerId = `coop-room-${this.roomCode}-host`;
          const conn = this.peer.connect(hostPeerId, { metadata: myPlayerInfo });
          this.setupConnection(conn);
        }

        resolve(this.roomCode);
      });

      this.peer.on('connection', (conn) => {
        this.setupConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.error("Erro na conexão PeerJS:", err);
        reject(err);
      });
    });
  }

  setupConnection(conn) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      this.peersData.set(conn.peer, conn.metadata || {});
      this.onPlayerJoined(conn.peer, conn.metadata);

      if (this.isHost) {
        // Envia lista atualizada de jogadores para a sala
        this.broadcast({
          type: 'LOBBY_UPDATE',
          players: Array.from(this.peersData.entries())
        });
      }
    });

    conn.on('data', (data) => {
      this.handleIncomingData(conn.peer, data);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.peersData.delete(conn.peer);
    });
  }

  handleIncomingData(senderId, data) {
    switch (data.type) {
      case 'LOBBY_UPDATE':
        this.peersData = new Map(data.players);
        this.onPlayerJoined();
        break;

      case 'GAME_START':
        this.onStateSync({ type: 'START_MATCH', roleMap: data.roleMap });
        break;

      case 'SYNC_TRANSFORM':
        this.onStateSync({ type: 'PLAYER_MOVE', id: senderId, pos: data.pos, rot: data.rot });
        if (this.isHost) {
          // Host retransmite para os outros peers
          this.broadcastExcept(senderId, data);
        }
        break;

      case 'ECONOMY_UPDATE':
        this.onStateSync({ type: 'ECONOMY', economy: data.economy });
        if (this.isHost) this.broadcastExcept(senderId, data);
        break;

      case 'TRIGGER_MEETING':
        this.onMeetingTriggered(data.callerName);
        if (this.isHost) this.broadcastExcept(senderId, data);
        break;

      case 'CHAT':
        this.onChatMsg(data.sender, data.text);
        if (this.isHost) this.broadcastExcept(senderId, data);
        break;
    }
  }

  broadcast(msg) {
    for (const [_, conn] of this.connections) {
      if (conn.open) conn.send(msg);
    }
  }

  broadcastExcept(senderId, msg) {
    for (const [id, conn] of this.connections) {
      if (id !== senderId && conn.open) conn.send(msg);
    }
  }

  generateRoomCode() {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
  }
}
