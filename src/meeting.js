import { soundManager } from './audio.js';
import { CONFIG } from './config.js';

// Reuniões de Emergência, Votação e Dedução Social
export class MeetingManager {
  constructor(onEjectionResolved) {
    this.onEjectionResolved = onEjectionResolved;
    this.screenMeeting = document.getElementById('screen-meeting');
    this.votingGrid = document.getElementById('voting-grid');
    this.timerDisplay = document.getElementById('meeting-timer');
    this.btnSkip = document.getElementById('btn-skip-vote');

    this.timer = null;
    this.timeLeft = 45;
    this.votes = new Map(); // targetId -> count
    this.myVoted = false;

    this.btnSkip.addEventListener('click', () => this.castVote('SKIP'));
  }

  startMeeting(playersList, localPlayerId, totalPlayersCount, remainingEjections) {
    document.exitPointerLock();
    soundManager.playEmergencyAlarm();
    this.screenMeeting.classList.remove('hidden');
    this.votingGrid.innerHTML = '';
    this.myVoted = false;
    this.votes.clear();
    this.timeLeft = 45;

    // Renderiza cartões dos cooperados elegíveis para voto
    playersList.forEach(([peerId, data]) => {
      const card = document.createElement('div');
      card.className = 'vote-card';
      card.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="player-bullet" style="background:${data.color || '#38bdf8'}"></span>
          <strong>${data.name || 'Cooperado'}</strong>
        </div>
        <span class="vote-count" id="v-count-${peerId}">0 votos</span>
      `;
      card.addEventListener('click', () => {
        if (!this.myVoted) {
          this.castVote(peerId);
          card.classList.add('voted');
        }
      });
      this.votingGrid.appendChild(card);
    });

    clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.timeLeft--;
      this.timerDisplay.innerHTML = `Tempo restante: <strong>${this.timeLeft}s</strong>`;
      if (this.timeLeft <= 0) {
        this.concludeMeeting(playersList, remainingEjections);
      }
    }, 1000);
  }

  castVote(targetId) {
    this.myVoted = true;
    const current = this.votes.get(targetId) || 0;
    this.votes.set(targetId, current + 1);
  }

  concludeMeeting(playersList, remainingEjections) {
    clearInterval(this.timer);
    this.screenMeeting.classList.add('hidden');

    // Apuração de Votos
    let highestVotes = 0;
    let expelledId = null;

    for (const [targetId, count] of this.votes.entries()) {
      if (count > highestVotes) {
        highestVotes = count;
        expelledId = targetId;
      }
    }

    if (expelledId && expelledId !== 'SKIP' && remainingEjections > 0) {
      this.onEjectionResolved(expelledId);
    } else {
      alert("Ninguém foi expulso nesta reunião.");
      this.onEjectionResolved(null);
    }
  }
}
