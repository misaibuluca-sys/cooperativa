import { CONFIG } from './config.js';
import { soundManager } from './audio.js';
import { SupermarketWorld } from './world.js';
import { PlayerController } from './player.js';
import { CustomerManager } from './npc.js';
import { NetworkManager } from './network.js';
import { TaskManager } from './tasks.js';
import { MeetingManager } from './meeting.js';

class GameApp {
  constructor() {
    this.state = 'MAIN_MENU'; // MAIN_MENU, LOBBY, PLAYING, MEETING, GAME_OVER
    this.myRole = 'COOPERADO'; // COOPERADO ou IMPOSTOR
    this.isSpectator = false;

    // Estado Econômico Sincronizado
    this.economy = {
      money: CONFIG.INITIAL_MONEY,
      reputation: CONFIG.STARTING_REPUTATION,
      satisfaction: CONFIG.STARTING_SATISFACTION,
      remainingEjections: 2
    };

    this.initThree();
    this.initSystems();
    this.bindUI();
    this.animate();
  }

  initThree() {
    const container = document.getElementById('game-container');
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Otimização para Chromebooks
    container.appendChild(this.renderer.domElement);

    this.world = new SupermarketWorld(this.scene);
    this.player = new PlayerController(this.camera, this.renderer.domElement, this.scene);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  initSystems() {
    this.otherPlayerMeshes = new Map();

    this.taskManager = new TaskManager((delta) => this.applyEconomyDelta(delta));
    this.customerManager = new CustomerManager(this.scene, (delta) => this.applyEconomyDelta(delta));

    this.meetingManager = new MeetingManager((expelledId) => {
      this.resolveExpulsion(expelledId);
    });

    this.network = new NetworkManager(
      () => this.updateLobbyUI(),
      (syncData) => this.handleNetworkSync(syncData),
      (caller) => this.triggerEmergencyMeeting(caller),
      (sender, text) => this.receiveChatMessage(sender, text)
    );
  }

  bindUI() {
    // Seleção de Avatar
    let selectedColor = '#2563eb';
    document.querySelectorAll('.avatar-opt').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.avatar-opt').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        selectedColor = e.target.dataset.color;
      });
    });

    // Criar Sala
    document.getElementById('btn-create-room').addEventListener('click', async () => {
      const name = document.getElementById('player-name').value.trim() || 'Cooperado';
      const code = await this.network.init({ name, color: selectedColor }, true);
      this.enterLobby(code, true);
    });

    // Entrar na Sala
    document.getElementById('btn-join-room').addEventListener('click', async () => {
      const code = document.getElementById('room-code-input').value.trim();
      const name = document.getElementById('player-name').value.trim() || 'Cooperado';
      if (!code) return alert("Digite o código da sala!");
      await this.network.init({ name, color: selectedColor }, false, code);
      this.enterLobby(code, false);
    });

    // Iniciar Partida (Host)
    document.getElementById('btn-start-game').addEventListener('click', () => {
      this.hostStartMatch();
    });

    // Fechar Tela de Apresentação de Papel
    document.getElementById('btn-start-playing').addEventListener('click', () => {
      document.getElementById('screen-role-reveal').classList.add('hidden');
      document.getElementById('hud').classList.remove('hidden');
      this.state = 'PLAYING';
      this.renderer.domElement.requestPointerLock();
    });

    // Chat
    const chatInput = document.getElementById('chat-input');
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && chatInput.value.trim() !== '') {
        const text = chatInput.value.trim();
        const myName = document.getElementById('player-name').value.trim();
        chatInput.value = '';
        this.network.broadcast({ type: 'CHAT', sender: myName, text });
        this.receiveChatMessage("Você", text);
      }
    });

    // Tecla [E] para Interações Físicas
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyE' && this.state === 'PLAYING' && this.player.hoveredObject) {
        const objData = this.player.hoveredObject.userData;
        if (objData.type === 'EMERGENCY_BUTTON') {
          const myName = document.getElementById('player-name').value.trim();
          this.network.broadcast({ type: 'TRIGGER_MEETING', callerName: myName });
          this.triggerEmergencyMeeting(myName);
        } else {
          this.taskManager.open(objData, this.myRole === 'IMPOSTOR');
        }
      }
    });
  }

  enterLobby(code, isHost) {
    document.getElementById('screen-main-menu').classList.add('hidden');
    document.getElementById('screen-lobby').classList.remove('hidden');
    document.getElementById('lobby-code-display').innerText = code;

    if (isHost) {
      document.getElementById('host-controls').classList.remove('hidden');
      document.getElementById('client-wait-msg').classList.add('hidden');
    }
    this.updateLobbyUI();
  }

  updateLobbyUI() {
    const list = document.getElementById('lobby-players-list');
    list.innerHTML = '';
    const peers = Array.from(this.network.peersData.entries());
    document.getElementById('player-count').innerText = peers.length;

    peers.forEach(([_, info]) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="player-bullet" style="background:${info.color || '#38bdf8'}"></span> ${info.name || 'Cooperado'}`;
      list.appendChild(li);
    });
  }

  hostStartMatch() {
    const peers = Array.from(this.network.peersData.keys());
    // Sorteio de 1 Impostor
    const impostorIndex = Math.floor(Math.random() * peers.length);
    const roleMap = {};

    peers.forEach((peerId, idx) => {
      roleMap[peerId] = (idx === impostorIndex) ? 'IMPOSTOR' : 'COOPERADO';
    });

    this.network.broadcast({ type: 'GAME_START', roleMap });
    this.handleNetworkSync({ type: 'START_MATCH', roleMap });
  }

  handleNetworkSync(data) {
    if (data.type === 'START_MATCH') {
      this.myRole = data.roleMap[this.network.myId] || 'COOPERADO';
      document.getElementById('screen-lobby').classList.add('hidden');
      
      const reveal = document.getElementById('screen-role-reveal');
      const title = document.getElementById('reveal-role-title');
      const desc = document.getElementById('reveal-role-instructions');
      reveal.classList.remove('hidden');

      if (this.myRole === 'IMPOSTOR') {
        title.innerText = "VOCÊ É O IMPOSTOR";
        title.style.color = "#ef4444";
        desc.innerText = "Sabote o estoque, desvie recursos no caixa e leve a cooperativa à falência sem ser descoberto!";
        document.getElementById('role-title').innerText = "PAPEL: IMPOSTOR";
        document.getElementById('role-title').style.color = "#ef4444";
      } else {
        title.innerText = "VOCÊ É UM COOPERADO";
        title.style.color = "#38bdf8";
        desc.innerText = "Trabalhe em equipe, mantenha o estoque abastecido e identifique quem está sabotando o mercado!";
        document.getElementById('role-title').innerText = "PAPEL: COOPERADO";
        document.getElementById('role-title').style.color = "#38bdf8";
      }

      soundManager.setupProximityMicrophone();
    } else if (data.type === 'PLAYER_MOVE') {
      this.updateRemotePlayer(data.id, data.pos, data.rot);
    } else if (data.type === 'ECONOMY') {
      this.economy = data.economy;
      this.updateHUD();
      this.checkEndGameConditions();
    }
  }

  updateRemotePlayer(peerId, pos, rot) {
    let mesh = this.otherPlayerMeshes.get(peerId);
    if (!mesh) {
      const info = this.network.peersData.get(peerId) || { color: '#2563eb' };
      mesh = PlayerController.createChibiMesh(info.color);
      this.scene.add(mesh);
      this.otherPlayerMeshes.set(peerId, mesh);
    }
    mesh.position.set(pos.x, pos.y - 1.6, pos.z); // Alinha com o chão
    mesh.rotation.y = rot;

    // Atualiza áudio espacial WebRTC
    const dist = this.player.position.distanceTo(mesh.position);
    soundManager.updateSpatialVolume(peerId, dist);
  }

  applyEconomyDelta({ moneyDelta = 0, repDelta = 0, satDelta = 0 }) {
    this.economy.money += moneyDelta;
    this.economy.reputation = Math.max(0, Math.min(100, this.economy.reputation + repDelta));
    this.economy.satisfaction = Math.max(0, Math.min(100, this.economy.satisfaction + satDelta));

    this.updateHUD();
    this.network.broadcast({ type: 'ECONOMY_UPDATE', economy: this.economy });
    this.checkEndGameConditions();
  }

  updateHUD() {
    document.getElementById('hud-money').innerText = `R$ ${this.economy.money.toFixed(2)}`;
    document.getElementById('hud-rep').innerText = `${this.economy.reputation}%`;
    document.getElementById('hud-sat').innerText = `${this.economy.satisfaction}%`;
    document.getElementById('hud-ejections').innerText = this.economy.remainingEjections;
  }

  triggerEmergencyMeeting(callerName) {
    this.state = 'MEETING';
    const playersList = Array.from(this.network.peersData.entries());
    this.meetingManager.startMeeting(playersList, this.network.myId, playersList.length, this.economy.remainingEjections);
    this.receiveChatMessage("SISTEMA", `🚨 Reunião convocada por ${callerName}!`);
  }

  resolveExpulsion(expelledId) {
    this.state = 'PLAYING';
    if (!expelledId) return;

    this.economy.remainingEjections--;
    const expelledInfo = this.network.peersData.get(expelledId);

    if (expelledId === this.network.myId) {
      this.isSpectator = true;
      alert("Você foi expulso da cooperativa! Agora assistirá como espectador.");
    }

    // Se expulsou o impostor: Cooperativa Vence
    if (this.myRole === 'IMPOSTOR' && expelledId === this.network.myId) {
      this.triggerGameOver(false, "O Impostor foi identificado e expulso pelos cooperados!");
    } else {
      // Expulsou um inocente: Perda pesada de reputação
      this.applyEconomyDelta({ repDelta: -25, satDelta: -20 });
      alert(`O cooperado ${expelledInfo ? expelledInfo.name : ''} era inocente! A reputação da cooperativa caiu.`);
    }
  }

  checkEndGameConditions() {
    if (this.economy.money <= CONFIG.BANKRUPT_THRESHOLD) {
      this.triggerGameOver(true, "A COOPERATIVA FALIU! As dívidas superaram o capital.");
    } else if (this.economy.reputation <= 15) {
      this.triggerGameOver(true, "A COOPERATIVA FOI INTERDITADA por baixa reputação e escândalos!");
    }
  }

  triggerGameOver(impostorWon, reason) {
    this.state = 'GAME_OVER';
    document.exitPointerLock();
    document.getElementById('hud').classList.add('hidden');
    const screen = document.getElementById('screen-game-over');
    screen.classList.remove('hidden');

    const title = document.getElementById('game-over-title');
    title.innerText = impostorWon ? "VITÓRIA DO IMPOSTOR!" : "VITÓRIA DOS COOPERADOS!";
    title.style.color = impostorWon ? "#ef4444" : "#22c55e";
    document.getElementById('game-over-reason').innerText = reason;

    document.getElementById('btn-return-lobby').onclick = () => window.location.reload();
  }

  receiveChatMessage(sender, text) {
    const box = document.getElementById('chat-messages');
    const msg = document.createElement('div');
    msg.className = 'chat-msg';
    msg.innerHTML = `<strong>${sender}:</strong> ${text}`;
    box.appendChild(msg);
    box.scrollTop = box.scrollHeight;
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = 0.016; // Taxa de quadro consistente

    if (this.state === 'PLAYING') {
      this.player.update(delta, this.world.interactableObjects);
      this.customerManager.update(delta);

      // Sincroniza posição via P2P
      if (this.network.myId && this.player.isLocked) {
        this.network.broadcast({
          type: 'SYNC_TRANSFORM',
          pos: { x: this.player.position.x, y: this.player.position.y, z: this.player.position.z },
          rot: this.player.yaw
        });
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Inicia aplicação após o carregamento da página
window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
