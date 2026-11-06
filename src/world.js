import { CONFIG } from './config.js';

export class SupermarketWorld {
  constructor(scene) {
    this.scene = scene;
    this.interactableObjects = [];
    this.buildMarket();
  }

  buildMarket() {
    // 1. Chão do Supermercado (ladrilhos claros padrão mercado brasileiro)
    const floorGeo = new THREE.PlaneGeometry(50, 44);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.1 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // 2. Paredes
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
    this.createWall(0, 3.5, -22, 50, 7, 0.5, wallMat); // Fundo
    this.createWall(0, 3.5, 22, 50, 7, 0.5, wallMat);  // Frente
    this.createWall(-25, 3.5, 0, 0.5, 7, 44, wallMat); // Esquerda
    this.createWall(25, 3.5, 0, 0.5, 7, 44, wallMat);  // Direita

    // 3. Divisória Escritório & Estoque (fundo)
    const wallPartMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
    this.createWall(-8, 3.5, -12, 16, 7, 0.4, wallPartMat);
    this.createWall(8, 3.5, -12, 16, 7, 0.4, wallPartMat);

    // 4. Placas de Setores
    this.createSectorSign("HORTIFRÚTI", -14, 4.5, 8, 0x16a34a);
    this.createSectorSign("MERCEARIA", 0, 4.5, 2, 0x0284c7);
    this.createSectorSign("LATICÍNIOS", 14, 4.5, 8, 0x3b82f6);
    this.createSectorSign("CAIXAS RÁPIDOS", 0, 4.5, 12, 0xf59e0b);
    this.createSectorSign("ESTOQUE & CARGAS", -14, 4.5, -12, 0x475569);
    this.createSectorSign("ESCRITÓRIO COOPERATIVO", 14, 4.5, -12, 0x7c3aed);

    // 5. Gôndolas e Prateleiras (Mercearia)
    this.createShelves(-4, 0, 0);
    this.createShelves(4, 0, 0);

    // 6. Bancas de Frutas e Legumes (Hortifrúti)
    this.createHortifrutiStand(-14, 0, 6);
    this.createHortifrutiStand(-14, 0, 10);

    // 7. Refrigeradores de Laticínios
    this.createFridgeWall(24, 0, 6);

    // 8. Baterias de Caixas (Checkout)
    this.createCashierDesk(-6, 0, 14, "Caixa 01");
    this.createCashierDesk(0, 0, 14, "Caixa 02");
    this.createCashierDesk(6, 0, 14, "Caixa 03");

    // 9. Mesa do Escritório & Botão Vermelho de Reunião de Emergência
    this.createOfficeEmergencyDesk(14, 0, -18);

    // 10. Paletes de Carga no Estoque
    this.createStockPallet(-14, 0, -18);

    // 11. Iluminação Geral e Focos Suaves
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffbeb, 0.6);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    this.scene.add(dirLight);
  }

  createWall(x, y, z, w, h, d, mat) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
  }

  createSectorSign(text, x, y, z, color) {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(7, 1.2, 0.3),
      new THREE.MeshStandardMaterial({ color: color })
    );
    box.position.set(x, y, z);
    this.scene.add(box);
  }

  createShelves(x, y, z) {
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4 });
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(3, 2.5, 12), shelfMat);
    shelf.position.set(x, 1.25, z);
    this.scene.add(shelf);

    // Produtos nas prateleiras
    for (let pz = -5; pz <= 5; pz += 2) {
      const prod = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.6, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x0284c7 })
      );
      prod.position.set(x + 1.2, 1.6, z + pz);
      this.scene.add(prod);

      // Marcação para interação de reposição/sabotagem
      prod.userData = { type: 'SHELF_PRODUCT', name: 'Prateleira de Alimentos', pos: { x, y, z } };
      this.interactableObjects.push(prod);
    }
  }

  createHortifrutiStand(x, y, z) {
    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(5, 1.1, 3),
      new THREE.MeshStandardMaterial({ color: 0x78350f })
    );
    stand.position.set(x, 0.55, z);
    stand.userData = { type: 'HORTIFRUTI_STAND', name: 'Banca de Frutas & Legumes' };
    this.scene.add(stand);
    this.interactableObjects.push(stand);
  }

  createFridgeWall(x, y, z) {
    const fridge = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 3, 8),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, transparent: true, opacity: 0.85 })
    );
    fridge.position.set(x, 1.5, z);
    fridge.userData = { type: 'LATICINIOS_FRIDGE', name: 'Geladeira de Laticínios' };
    this.scene.add(fridge);
    this.interactableObjects.push(fridge);
  }

  createCashierDesk(x, y, z, label) {
    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.2, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x334155 })
    );
    desk.position.set(x, 0.6, z);

    // Monitor do Caixa
    const monitor = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.5, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x0284c7 })
    );
    monitor.position.set(x, 1.45, z);
    this.scene.add(desk);
    this.scene.add(monitor);

    desk.userData = { type: 'CASHIER', name: label, id: label };
    this.interactableObjects.push(desk);
  }

  createOfficeEmergencyDesk(x, y, z) {
    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(4, 1.1, 2.5),
      new THREE.MeshStandardMaterial({ color: 0x475569 })
    );
    desk.position.set(x, 0.55, z);
    this.scene.add(desk);

    // Botão Vermelho de Emergência
    const btnBase = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    const redBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
    btnBase.position.set(x, 1.15, z);
    redBtn.position.set(x, 1.25, z);
    this.scene.add(btnBase);
    this.scene.add(redBtn);

    redBtn.userData = { type: 'EMERGENCY_BUTTON', name: 'Botão de Reunião Geral de Emergência' };
    this.interactableObjects.push(redBtn);

    // Computador de Gestão Fiscal
    const pc = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.2), new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
    pc.position.set(x - 1, 1.4, z);
    pc.userData = { type: 'OFFICE_PC', name: 'Computador de Notas e Fornecedores' };
    this.scene.add(pc);
    this.interactableObjects.push(pc);
  }

  createStockPallet(x, y, z) {
    const pallet = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.4, 4),
      new THREE.MeshStandardMaterial({ color: 0xb45309 })
    );
    pallet.position.set(x, 0.2, z);
    this.scene.add(pallet);

    // Caixas empilhadas
    for (let i = 0; i < 4; i++) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.0, 1.2),
        new THREE.MeshStandardMaterial({ color: 0xd97706 })
      );
      box.position.set(x + (i % 2 === 0 ? 0.7 : -0.7), 0.9, z + (i > 1 ? 0.7 : -0.7));
      this.scene.add(box);
    }

    pallet.userData = { type: 'STOCK_PALLET', name: 'Carga de Mercadorias para Receber' };
    this.interactableObjects.push(pallet);
  }
}
