// Clientes autônomos controlados por IA
export class CustomerManager {
  constructor(scene, onTransaction) {
    this.scene = scene;
    this.onTransaction = onTransaction;
    this.customers = [];
    this.spawnTimer = 0;
  }

  update(delta) {
    this.spawnTimer += delta;
    if (this.spawnTimer > 7 && this.customers.length < 5) {
      this.spawnTimer = 0;
      this.spawnCustomer();
    }

    for (let i = this.customers.length - 1; i >= 0; i--) {
      const c = this.customers[i];
      c.update(delta);
      if (c.finished) {
        this.scene.remove(c.mesh);
        this.customers.splice(i, 1);
      }
    }
  }

  spawnCustomer() {
    const c = new CustomerNPC(this.scene, () => {
      this.onTransaction({ amount: 45.0, satisfactionDelta: +5 });
    });
    this.customers.push(c);
  }
}

class CustomerNPC {
  constructor(scene, onPay) {
    this.scene = scene;
    this.onPay = onPay;
    this.state = 'SHOPPING'; // SHOPPING -> TO_CHECKOUT -> PAYING -> LEAVING
    this.timer = 0;
    this.finished = false;

    // Modelo 3D Cliente Chibi
    this.mesh = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), new THREE.MeshStandardMaterial({ color: 0xfed7aa }));
    head.position.y = 1.25;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.6, 10), new THREE.MeshStandardMaterial({ color: 0x64748b }));
    body.position.y = 0.65;
    this.mesh.add(head);
    this.mesh.add(body);

    this.mesh.position.set(0, 0, 18); // Entrada
    this.target = new THREE.Vector3(-10 + Math.random() * 20, 0, -2 + Math.random() * 10);
    this.scene.add(this.mesh);
  }

  update(delta) {
    this.timer += delta;
    const current = this.mesh.position;

    if (this.state === 'SHOPPING') {
      this.moveTo(this.target, 2.5, delta);
      if (current.distanceTo(this.target) < 0.6) {
        if (this.timer > 8) {
          this.state = 'TO_CHECKOUT';
          this.target.set(0, 0, 13); // Caixa
        }
      }
    } else if (this.state === 'TO_CHECKOUT') {
      this.moveTo(this.target, 2.5, delta);
      if (current.distanceTo(this.target) < 0.8) {
        this.state = 'PAYING';
        this.timer = 0;
      }
    } else if (this.state === 'PAYING') {
      if (this.timer > 3) {
        this.onPay();
        this.state = 'LEAVING';
        this.target.set(0, 0, 21); // Saída
      }
    } else if (this.state === 'LEAVING') {
      this.moveTo(this.target, 3.0, delta);
      if (current.z >= 19.5) {
        this.finished = true;
      }
    }
  }

  moveTo(target, speed, delta) {
    const dir = new THREE.Vector3().subVectors(target, this.mesh.position);
    dir.y = 0;
    if (dir.lengthSq() > 0.01) {
      dir.normalize();
      this.mesh.position.addScaledVector(dir, speed * delta);
      this.mesh.rotation.y = Math.atan2(dir.x, dir.z);
    }
  }
}
