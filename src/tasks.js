import { soundManager } from './audio.js';

// Minigames Funcionais para Cooperados e Sabotagens Físicas
export class TaskManager {
  constructor(onEconomyDelta) {
    this.onEconomyDelta = onEconomyDelta;
    this.modal = document.getElementById('minigame-modal');
    this.modalTitle = document.getElementById('minigame-title');
    this.modalContent = document.getElementById('minigame-content');
    this.btnClose = document.getElementById('btn-close-minigame');

    this.btnClose.addEventListener('click', () => this.close());
  }

  open(objectUserData, isImpostor) {
    document.exitPointerLock();
    this.modal.classList.remove('hidden');

    switch (objectUserData.type) {
      case 'CASHIER':
        this.renderCashierGame(isImpostor);
        break;
      case 'SHELF_PRODUCT':
      case 'HORTIFRUTI_STAND':
        this.renderRestockGame(isImpostor);
        break;
      case 'OFFICE_PC':
        this.renderOfficeAuditGame(isImpostor);
        break;
      case 'STOCK_PALLET':
        this.renderReceivingGame(isImpostor);
        break;
      default:
        this.close();
    }
  }

  close() {
    this.modal.classList.add('hidden');
    this.modalContent.innerHTML = '';
  }

  // 1. Minigame do Caixa: Bipar produtos e dar troco
  renderCashierGame(isImpostor) {
    this.modalTitle.innerText = "Operação de Caixa Registrador";
    this.modalContent.innerHTML = `
      <div class="minigame-interactive-area">
        <div class="register-screen" id="reg-screen">TOTAL: R$ 42,00</div>
        <p>Bipe os 3 itens do cliente e finalize a cobrança:</p>
        <div style="display:flex; gap:10px;">
          <button id="btn-scan-1" class="btn secondary">Passar Arroz (R$ 28,50)</button>
          <button id="btn-scan-2" class="btn secondary">Passar Feijão (R$ 8,90)</button>
          <button id="btn-scan-3" class="btn secondary">Passar Leite (R$ 4,60)</button>
        </div>
        <div style="margin-top:14px; width:100%; display:flex; gap:10px;">
          <button id="btn-complete-cash" class="btn primary full-width">Registrar Pagamento Correto (+R$ 42)</button>
          ${isImpostor ? `<button id="btn-sabotage-cash" class="btn secondary" style="background:#dc2626;">Furtar Pequeno Troco (-R$ 50)</button>` : ''}
        </div>
      </div>
    `;

    let scanned = 0;
    const regScreen = document.getElementById('reg-screen');

    ['1', '2', '3'].forEach(id => {
      document.getElementById(`btn-scan-${id}`).addEventListener('click', (e) => {
        soundManager.playBeep();
        e.target.disabled = true;
        scanned++;
        regScreen.innerText = `ITENS BIPADOS: ${scanned}/3`;
      });
    });

    document.getElementById('btn-complete-cash').addEventListener('click', () => {
      if (scanned >= 3) {
        soundManager.playCashRegister();
        this.onEconomyDelta({ moneyDelta: +42.0, satDelta: +4 });
        this.close();
      } else {
        alert("Bipe todos os produtos antes de fechar a compra!");
      }
    });

    if (isImpostor) {
      document.getElementById('btn-sabotage-cash').addEventListener('click', () => {
        // Sabotagem discreta: Desvio financeiro simulado
        this.onEconomyDelta({ moneyDelta: -50.0, satDelta: -8 });
        this.close();
      });
    }
  }

  // 2. Minigame de Reposição / Sabotagem de Alimentos
  renderRestockGame(isImpostor) {
    this.modalTitle.innerText = "Organização e Reposição de Prateleiras";
    this.modalContent.innerHTML = `
      <div class="minigame-interactive-area">
        <p>Preencha os espaços vazios da gôndola com as mercadorias certas:</p>
        <div class="shelf-items-grid">
          <div class="item-slot" id="slot-1">Espaço Vazio [Clique para Repor]</div>
          <div class="item-slot" id="slot-2">Espaço Vazio [Clique para Repor]</div>
          <div class="item-slot" id="slot-3">Espaço Vazio [Clique para Repor]</div>
        </div>
        ${isImpostor ? `<button id="btn-sabotage-rot" class="btn secondary full-width" style="background:#dc2626; margin-top:10px;">Misturar Mercadoria Estragada (Prejuízo)</button>` : ''}
      </div>
    `;

    let filled = 0;
    ['slot-1', 'slot-2', 'slot-3'].forEach(slotId => {
      const el = document.getElementById(slotId);
      el.addEventListener('click', () => {
        if (!el.classList.contains('filled')) {
          soundManager.playBeep();
          el.innerText = "Abastecido ✓";
          el.style.background = "#15803d";
          el.classList.add('filled');
          filled++;
          if (filled === 3) {
            this.onEconomyDelta({ moneyDelta: +15.0, satDelta: +6 });
            setTimeout(() => this.close(), 400);
          }
        }
      });
    });

    if (isImpostor) {
      document.getElementById('btn-sabotage-rot').addEventListener('click', () => {
        this.onEconomyDelta({ moneyDelta: -80.0, satDelta: -15 });
        this.close();
      });
    }
  }

  // 3. Minigame do Escritório: Auditoria Fiscal
  renderOfficeAuditGame(isImpostor) {
    this.modalTitle.innerText = "Auditoria de Fornecedores & Notas Fiscais";
    this.modalContent.innerHTML = `
      <div class="minigame-interactive-area">
        <p>Validação de Nota Fiscal nº 4892 (Cooperativa Agrícola)</p>
        <div style="background:#020617; padding:12px; border-radius:6px; font-family:monospace; width:100%;">
          Lote: 50x Sacos Feijão<br>
          Cobrança: R$ 260,00<br>
          Status: Pendente de Conferência
        </div>
        <div style="display:flex; gap:10px; width:100%; margin-top:10px;">
          <button id="btn-audit-approve" class="btn primary full-width">Aprovar Nota Regular (+Reputação)</button>
          ${isImpostor ? `<button id="btn-sabotage-audit" class="btn secondary" style="background:#dc2626;">Adulterar Registro (-R$ 150)</button>` : ''}
        </div>
      </div>
    `;

    document.getElementById('btn-audit-approve').addEventListener('click', () => {
      soundManager.playCashRegister();
      this.onEconomyDelta({ repDelta: +4 });
      this.close();
    });

    if (isImpostor) {
      document.getElementById('btn-sabotage-audit').addEventListener('click', () => {
        this.onEconomyDelta({ moneyDelta: -150.0, repDelta: -6 });
        this.close();
      });
    }
  }

  // 4. Recebimento de Cargas no Estoque
  renderReceivingGame(isImpostor) {
    this.modalTitle.innerText = "Conferência de Paletes no Estoque";
    this.modalContent.innerHTML = `
      <div class="minigame-interactive-area">
        <p>Descarregue os fardos entregues pelo caminhão:</p>
        <button id="btn-unload" class="btn secondary" style="padding:20px; font-size:16px;">Descarregar Fardo (0/4)</button>
        ${isImpostor ? `<button id="btn-sabotage-stock" class="btn secondary full-width" style="background:#dc2626; margin-top:10px;">Esconder e Rasgar Fardos no Fundo</button>` : ''}
      </div>
    `;

    let count = 0;
    const btn = document.getElementById('btn-unload');
    btn.addEventListener('click', () => {
      count++;
      soundManager.playBeep();
      btn.innerText = `Descarregar Fardo (${count}/4)`;
      if (count >= 4) {
        this.onEconomyDelta({ satDelta: +5, moneyDelta: +20.0 });
        setTimeout(() => this.close(), 300);
      }
    });

    if (isImpostor) {
      document.getElementById('btn-sabotage-stock').addEventListener('click', () => {
        this.onEconomyDelta({ moneyDelta: -120.0, satDelta: -10 });
        this.close();
      });
    }
  }
}
