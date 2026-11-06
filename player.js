// Controle em Primeira Pessoa, Braços Chibi e Renderização de Avatares
export class PlayerController {
  constructor(camera, domElement, scene) {
    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;

    this.position = new THREE.Vector3(0, 1.6, 17);
    this.velocity = new THREE.Vector3();
    this.keys = {};
    this.isLocked = false;

    this.pitch = 0;
    this.yaw = 0;

    this.raycaster = new THREE.Raycaster();
    this.hoveredObject = null;

    this.initHands();
    this.setupInputs();
  }

  initHands() {
    // Braços e mãos em primeira pessoa
    this.handsGroup = new THREE.Group();
    const handMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8 }); // Tom de pele estilizado

    // Braço direito
    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.45), handMat);
    rightArm.position.set(0.3, -0.25, -0.5);
    rightArm.rotation.x = -0.15;
    this.handsGroup.add(rightArm);

    // Braço esquerdo
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.45), handMat);
    leftArm.position.set(-0.3, -0.25, -0.5);
    leftArm.rotation.x = -0.15;
    this.handsGroup.add(leftArm);

    this.camera.add(this.handsGroup);
    this.scene.add(this.camera);
  }

  setupInputs() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    this.domElement.addEventListener('click', () => {
      if (!this.isLocked && document.pointerLockElement !== this.domElement) {
        this.domElement.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;
      const sensitivity = 0.0022;
      this.yaw -= e.movementX * sensitivity;
      this.pitch -= e.movementY * sensitivity;
      this.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, this.pitch));

      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = this.yaw;
      this.camera.rotation.x = this.pitch;
    });
  }

  update(delta, interactables) {
    if (!this.isLocked) return;

    // Movimentação WASD
    const speed = 7.0;
    const moveDir = new THREE.Vector3();

    if (this.keys['KeyW']) moveDir.z -= 1;
    if (this.keys['KeyS']) moveDir.z += 1;
    if (this.keys['KeyA']) moveDir.x -= 1;
    if (this.keys['KeyD']) moveDir.x += 1;

    moveDir.normalize();
    moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    this.position.x += moveDir.x * speed * delta;
    this.position.z += moveDir.z * speed * delta;

    // Limites de colisão do mercado
    this.position.x = Math.max(-23, Math.min(23, this.position.x));
    this.position.z = Math.max(-20, Math.min(20, this.position.z));

    this.camera.position.copy(this.position);

    // Balanço de mãos ao andar (head bobbing suave)
    if (moveDir.lengthSq() > 0) {
      const time = Date.now() * 0.008;
      this.handsGroup.position.y = Math.sin(time) * 0.02;
      this.handsGroup.position.x = Math.cos(time * 0.5) * 0.015;
    }

    // Raycast para interações
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersects = this.raycaster.intersectObjects(interactables, false);

    const prompt = document.getElementById('interaction-prompt');
    if (intersects.length > 0 && intersects[0].distance < 3.2) {
      this.hoveredObject = intersects[0].object;
      prompt.style.display = 'block';
      prompt.innerHTML = `Pressione <strong>[E]</strong> para: ${this.hoveredObject.userData.name || 'Interagir'}`;
    } else {
      this.hoveredObject = null;
      prompt.style.display = 'none';
    }
  }

  // Gera modelo 3D Chibi para outros jogadores em cena
  static createChibiMesh(colorHex) {
    const group = new THREE.Group();

    // Cabeça Grande (Chibi)
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfde047 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), headMat);
    head.position.y = 1.35;
    group.add(head);

    // Olhos
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
    eyeR.position.set(0.14, 1.4, 0.38);
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
    eyeL.position.set(-0.14, 1.4, 0.38);
    group.add(eyeR);
    group.add(eyeL);

    // Corpo Pequeno (Uniforme da cooperativa)
    const bodyMat = new THREE.MeshStandardMaterial({ color: parseInt(colorHex.replace('#', '0x')) });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.7, 12), bodyMat);
    body.position.y = 0.75;
    group.add(body);

    return group;
  }
}