import * as THREE from 'three';
import { levels } from './levels.js';
import { runSQL } from './sql-engine.js';
import './style.css';

const $ = (id) => document.getElementById(id);
const world = $('world');
const welcome = $('welcome');
const lesson = $('lesson');
const levelBadge = $('levelBadge');
const conceptTag = $('conceptTag');
const stepCounter = $('stepCounter');
const taskTitle = $('taskTitle');
const taskText = $('taskText');
const hintBox = $('hintBox');
const sqlInput = $('sqlInput');
const feedback = $('feedback');
const results = $('results');
const nextButton = $('nextButton');
const toast = $('toast');

let scene;
let camera;
let renderer;
let levelIndex = 0;
let started = false;
let dragging = false;
let targetYaw = 0;
let targetPitch = 0;
const pressed = new Set();
const moveButtons = new Set();
const velocity = new THREE.Vector3();
const levelObjects = new THREE.Group();
const lamps = [];
let lastFrame = 0;
let toastTimer;
let soundContext;
let soundGain;

const clamp = THREE.MathUtils.clamp;

function makeWallpaperTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#d3c77f';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#b9a963';
  ctx.lineWidth = 2;
  for (let x = 0; x < 256; x += 32) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke();
  }
  for (let y = 0; y < 256; y += 32) {
    for (let x = 16; x < 256; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, y + 5); ctx.lineTo(x + 5, y + 16); ctx.lineTo(x, y + 27); ctx.lineTo(x - 5, y + 16); ctx.closePath();
      ctx.fillStyle = '#c2b36a'; ctx.fill();
      ctx.fillStyle = '#eee1a3'; ctx.beginPath(); ctx.arc(x, y + 16, 2, 0, Math.PI * 2); ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 14);
  return texture;
}

function makeCarpetTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#827c55';
  ctx.fillRect(0, 0, 128, 128);
  let seed = 817;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 1900; i += 1) {
    const shade = random() > 0.5 ? '#aaa176' : '#5f6249';
    ctx.fillStyle = shade;
    ctx.globalAlpha = 0.1 + random() * 0.18;
    ctx.fillRect(random() * 128, random() * 128, 1 + random() * 2, 1 + random() * 2);
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 42);
  return texture;
}

function makeDataTexture(board) {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 570;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff9e8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#e9d99d';
  ctx.fillRect(0, 0, canvas.width, 86);
  ctx.fillStyle = '#425945';
  ctx.font = '900 36px Nunito, Arial, sans-serif';
  ctx.fillText(`Tabla: ${board.title}`, 34, 56);
  const left = 34;
  const tableTop = 115;
  const colWidth = (canvas.width - left * 2) / board.columns.length;
  ctx.fillStyle = '#f2e9cc';
  ctx.fillRect(left, tableTop, canvas.width - left * 2, 56);
  ctx.font = '800 25px Nunito, Arial, sans-serif';
  ctx.fillStyle = '#675629';
  board.columns.forEach((column, index) => ctx.fillText(column, left + index * colWidth + 15, tableTop + 37));
  ctx.strokeStyle = '#d7ccb0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, tableTop + 56); ctx.lineTo(canvas.width - left, tableTop + 56); ctx.stroke();
  ctx.font = '700 24px Nunito, Arial, sans-serif';
  board.rows.forEach((row, rowIndex) => {
    const y = tableTop + 56 + rowIndex * 73;
    if (rowIndex % 2 === 0) {
      ctx.fillStyle = '#fffdf5';
      ctx.fillRect(left, y, canvas.width - left * 2, 73);
    }
    row.forEach((value, colIndex) => {
      ctx.fillStyle = '#493f2b';
      ctx.fillText(String(value), left + colIndex * colWidth + 15, y + 45);
    });
    ctx.strokeStyle = '#e3dbc6';
    ctx.beginPath(); ctx.moveTo(left, y + 73); ctx.lineTo(canvas.width - left, y + 73); ctx.stroke();
  });
  ctx.fillStyle = '#8a7d60';
  ctx.font = '700 17px Nunito, Arial, sans-serif';
  ctx.fillText('Mira las columnas y las filas', 34, canvas.height - 20);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function addBox(parent, size, position, material, castShadow = false) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addBoard(board, x, width) {
  const group = new THREE.Group();
  group.position.set(x, 2.18, -9.5);
  const height = 2.08;
  const frameMaterial = new THREE.MeshStandardMaterial({ color: '#927b4a', roughness: 0.82 });
  addBox(group, [width + 0.16, height + 0.16, 0.16], [0, 0, -0.08], frameMaterial);
  const boardMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({ map: makeDataTexture(board), roughness: 0.9, side: THREE.DoubleSide })
  );
  boardMesh.position.z = 0.012;
  group.add(boardMesh);
  addBox(group, [width * 0.82, 0.11, 0.3], [0, -height / 2 - 0.2, -0.07], new THREE.MeshStandardMaterial({ color: '#a58e58', roughness: 0.8 }));
  scene.add(group);
  levelObjects.add(group);
}

function addLevelDecor(index) {
  const level = levels[index];
  if (level.boards.length === 1) {
    addBoard(level.boards[0], 0, 3.65);
  } else {
    addBoard(level.boards[0], -1.72, 3.05);
    addBoard(level.boards[1], 1.72, 3.05);
    const link = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.075, 0.075),
      new THREE.MeshStandardMaterial({ color: '#e4ba56', emissive: '#684a18', emissiveIntensity: 0.22 })
    );
    link.position.set(0, 2.18, -9.36);
    scene.add(link);
    levelObjects.add(link);
  }
  const marker = makeSignTexture(index === 0 ? '¡Busca y elige!' : index === 1 ? '¡Pon en orden!' : '¡Une las parejas!');
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.9, 0.55),
    new THREE.MeshBasicMaterial({ map: marker, transparent: true, side: THREE.DoubleSide })
  );
  sign.position.set(0, 3.62, -9.45);
  scene.add(sign);
  levelObjects.add(sign);
}

function makeSignTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 700; canvas.height = 140;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f4e8bc';
  ctx.beginPath(); ctx.roundRect(5, 5, 690, 130, 28); ctx.fill();
  ctx.strokeStyle = '#b99a51'; ctx.lineWidth = 6; ctx.stroke();
  ctx.fillStyle = '#5a4d2c'; ctx.font = '900 45px Nunito, Arial, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(text, 350, 88);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createWorld() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#c9bb7d');
  scene.fog = new THREE.Fog('#c9bb7d', 16, 48);
  camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.08, 90);
  camera.rotation.order = 'YXZ';
  camera.position.set(0, 1.65, 3.5);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.17;
  renderer.shadowMap.enabled = false;
  renderer.domElement.id = 'gameCanvas';
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', 'Vista del pasillo. Haz clic y mueve el ratón para mirar.');
  world.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight('#fff5d5', '#746d49', 1.65));
  scene.add(new THREE.AmbientLight('#fff2c8', 0.4));
  const wallTexture = makeWallpaperTexture();
  const wallMaterial = new THREE.MeshStandardMaterial({ map: wallTexture, color: '#fff4c8', roughness: 1, side: THREE.DoubleSide });
  const floorMaterial = new THREE.MeshStandardMaterial({ map: makeCarpetTexture(), color: '#ffffff', roughness: 1 });
  const ceilingMaterial = new THREE.MeshStandardMaterial({ color: '#e1d8ad', roughness: 1, side: THREE.DoubleSide });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 72), floorMaterial);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -20);
  scene.add(floor);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(8, 72), ceilingMaterial);
  ceiling.rotation.x = Math.PI / 2; ceiling.position.set(0, 4.55, -20);
  scene.add(ceiling);
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(72, 4.55), wallMaterial);
    wall.rotation.y = Math.PI / 2;
    wall.position.set(side * 4, 2.275, -20);
    scene.add(wall);
    addBox(scene, [0.11, 0.24, 72], [side * 3.93, 0.12, -20], new THREE.MeshStandardMaterial({ color: '#9b8950', roughness: 0.9 }));
  }
  const farWall = new THREE.Mesh(new THREE.PlaneGeometry(8, 4.55), wallMaterial);
  farWall.position.set(0, 2.275, -55.9);
  scene.add(farWall);

  for (let i = 0; i < 7; i += 1) {
    const z = 1 - i * 8.2;
    const housing = addBox(scene, [2.5, 0.12, 0.72], [0, 4.39, z], new THREE.MeshStandardMaterial({ color: '#d8d1ae', roughness: 0.75 }));
    const panel = addBox(scene, [2.22, 0.035, 0.51], [0, 4.31, z], new THREE.MeshStandardMaterial({ color: '#fff9df', emissive: '#f4eab7', emissiveIntensity: 0.75, roughness: 0.5 }));
    const light = new THREE.PointLight('#fff2c9', 1.25, 13, 2);
    light.position.set(0, 4.02, z);
    scene.add(light);
    lamps.push({ light, panel, phase: i * 1.7, base: 1.1 + (i % 3) * 0.14 });
    housing.userData.staticWorld = true;
  }

  scene.add(levelObjects);
  addLevelDecor(levelIndex);
  bindLookControls();
  window.addEventListener('resize', onResize);
  $('loading').remove();
  requestAnimationFrame(animate);
}

function bindLookControls() {
  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', (event) => {
    if (!started || event.button !== 0) return;
    dragging = true;
    if (canvas.requestPointerLock && document.pointerLockElement !== canvas) {
      try { canvas.requestPointerLock(); } catch { /* el arrastre sigue disponible */ }
    }
  });
  window.addEventListener('pointerup', () => { dragging = false; });
  window.addEventListener('pointermove', (event) => {
    if (!dragging && document.pointerLockElement !== canvas) return;
    targetYaw -= event.movementX * 0.0022;
    targetPitch = clamp(targetPitch - event.movementY * 0.0018, -0.92, 0.92);
  });
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== canvas) dragging = false;
  });

  window.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault(); runQuery(); return;
    }
    if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) return;
    const key = event.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      event.preventDefault(); pressed.add(key);
    }
  });
  window.addEventListener('keyup', (event) => pressed.delete(event.key.toLowerCase()));
  window.addEventListener('blur', () => { pressed.clear(); moveButtons.clear(); dragging = false; });

  document.querySelectorAll('.move-button').forEach((button) => {
    const direction = button.dataset.move;
    button.addEventListener('pointerdown', (event) => { event.preventDefault(); moveButtons.add(direction); });
    for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
      button.addEventListener(type, () => moveButtons.delete(direction));
    }
  });
}

function movePlayer(delta) {
  const forwardAmount = Number(pressed.has('w') || pressed.has('arrowup') || moveButtons.has('forward'))
    - Number(pressed.has('s') || pressed.has('arrowdown') || moveButtons.has('back'));
  const sideAmount = Number(pressed.has('d') || pressed.has('arrowright') || moveButtons.has('right'))
    - Number(pressed.has('a') || pressed.has('arrowleft') || moveButtons.has('left'));
  const forwardX = -Math.sin(camera.rotation.y);
  const forwardZ = -Math.cos(camera.rotation.y);
  const rightX = Math.cos(camera.rotation.y);
  const rightZ = -Math.sin(camera.rotation.y);
  const desired = new THREE.Vector3(
    forwardX * forwardAmount + rightX * sideAmount,
    0,
    forwardZ * forwardAmount + rightZ * sideAmount
  );
  if (desired.lengthSq() > 0) desired.normalize().multiplyScalar(3.3);
  velocity.lerp(desired, 1 - Math.exp(-7.5 * delta));
  camera.position.x = clamp(camera.position.x + velocity.x * delta, -2.7, 2.7);
  camera.position.z = clamp(camera.position.z + velocity.z * delta, -52.7, 3.4);
  camera.position.y = 1.65;
}

function animate(time) {
  requestAnimationFrame(animate);
  const delta = Math.min((time - lastFrame) / 1000 || 0, 0.05);
  lastFrame = time;
  const yawDelta = Math.atan2(Math.sin(targetYaw - camera.rotation.y), Math.cos(targetYaw - camera.rotation.y));
  camera.rotation.y += yawDelta * (1 - Math.exp(-13 * delta));
  camera.rotation.x += (targetPitch - camera.rotation.x) * (1 - Math.exp(-13 * delta));
  if (started) movePlayer(delta);
  lamps.forEach(({ light, panel, phase, base }, index) => {
    const gentle = Math.sin(time * 0.0013 + phase) * 0.07;
    const tinyFlicker = Math.sin(time * 0.011 + phase * 2) > 0.996 ? -0.13 : 0;
    light.intensity = base + gentle + tinyFlicker;
    panel.material.emissiveIntensity = 0.72 + gentle * 0.32 + tinyFlicker * 0.24;
  });
  renderer.render(scene, camera);
}

function onResize() {
  if (!renderer || !camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function disposeLevelDecor() {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  levelObjects.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    const attachedMaterials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of attachedMaterials) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture) textures.add(value);
      }
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
  levelObjects.clear();
}

function updateLesson() {
  const level = levels[levelIndex];
  levelBadge.textContent = `Nivel ${level.id} de ${levels.length}`;
  conceptTag.textContent = level.concept;
  stepCounter.textContent = `${levelIndex + 1} / ${levels.length}`;
  taskTitle.textContent = level.title;
  taskText.textContent = level.task;
  hintBox.textContent = `Pista: ${level.hint}`;
  sqlInput.value = '';
  feedback.textContent = '¡Tú puedes! Prueba cuando quieras.';
  feedback.className = 'feedback';
  results.replaceChildren();
  nextButton.classList.add('hidden');
  disposeLevelDecor();
  addLevelDecor(levelIndex);
  camera.position.set(0, 1.65, 3.5);
  targetYaw = 0; targetPitch = 0;
  camera.rotation.set(0, 0, 0);
}

function renderResults(result) {
  results.replaceChildren();
  if (!result.ok) return;
  if (result.rows.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No salió ninguna fila esta vez. ¡Prueba otro valor!';
    results.append(empty);
    return;
  }
  const table = document.createElement('table');
  const head = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const column of result.columns) {
    const th = document.createElement('th'); th.textContent = column; headerRow.append(th);
  }
  head.append(headerRow); table.append(head);
  const body = document.createElement('tbody');
  for (const row of result.rows) {
    const tr = document.createElement('tr');
    for (const column of result.columns) {
      const td = document.createElement('td'); td.textContent = String(row[column] ?? ''); tr.append(td);
    }
    body.append(tr);
  }
  table.append(body); results.append(table);
}

function runQuery() {
  if (!started) return;
  const result = runSQL(levels[levelIndex].id, sqlInput.value);
  feedback.textContent = result.message;
  feedback.className = `feedback ${result.ok ? (result.complete ? 'good' : 'help') : 'help'}`;
  renderResults(result);
  nextButton.classList.toggle('hidden', !result.complete);
  if (result.complete) showToast('¡Nivel superado!');
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2000);
}

function advanceLevel() {
  if (levelIndex < levels.length - 1) {
    levelIndex += 1;
    updateLesson();
    showToast('¡Nuevo reto!');
    sqlInput.focus();
  } else {
    conceptTag.textContent = '¡Aventura completa!';
    taskTitle.textContent = '¡Eres un gran explorador!';
    taskText.textContent = 'Ya aprendiste a elegir, buscar, ordenar y unir datos. ¡Buen trabajo!';
    hintBox.textContent = 'Puedes cerrar el juego o volver a empezar desde el nivel 1.';
    sqlInput.classList.add('hidden');
    document.querySelector('.editor-label-row').classList.add('hidden');
    document.querySelector('.action-row').classList.add('hidden');
    feedback.textContent = '¡Lo lograste! Cada tabla tiene una nueva aventura.';
    feedback.className = 'feedback good';
    results.replaceChildren();
    nextButton.textContent = 'Jugar otra vez';
    nextButton.classList.remove('hidden');
    nextButton.onclick = () => {
      levelIndex = 0;
      sqlInput.classList.remove('hidden');
      document.querySelector('.editor-label-row').classList.remove('hidden');
      document.querySelector('.action-row').classList.remove('hidden');
      nextButton.textContent = 'Seguir al próximo nivel →';
      nextButton.onclick = advanceLevel;
      updateLesson();
    };
    showToast('¡Tres niveles superados!');
  }
}

function toggleSound(button) {
  if (!soundContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) { button.textContent = 'Sonido no disponible'; return; }
    soundContext = new AudioContextClass();
    const oscillator = soundContext.createOscillator();
    soundGain = soundContext.createGain();
    const lowPass = soundContext.createBiquadFilter();
    oscillator.type = 'sine'; oscillator.frequency.value = 110;
    lowPass.type = 'lowpass'; lowPass.frequency.value = 180;
    soundGain.gain.value = 0;
    oscillator.connect(lowPass).connect(soundGain).connect(soundContext.destination);
    oscillator.start();
  }
  if (soundContext.state === 'suspended') soundContext.resume();
  const isOn = button.getAttribute('aria-pressed') !== 'true';
  soundGain.gain.setTargetAtTime(isOn ? 0.012 : 0, soundContext.currentTime, 0.3);
  button.setAttribute('aria-pressed', String(isOn));
  button.textContent = `Sonido: ${isOn ? 'encendido' : 'apagado'}`;
}

function wireUi() {
  $('startButton').addEventListener('click', () => {
    started = true;
    welcome.classList.add('hidden');
    lesson.classList.remove('hidden');
    updateLesson();
    sqlInput.focus();
  });
  $('runButton').addEventListener('click', runQuery);
  $('nextButton').addEventListener('click', advanceLevel);
  $('exampleButton').addEventListener('click', () => {
    sqlInput.value = levels[levelIndex].example;
    sqlInput.focus();
    feedback.textContent = 'Aquí tienes un ejemplo. Pulsa “Probar consulta”.';
    feedback.className = 'feedback';
  });
  $('soundButton').addEventListener('click', (event) => toggleSound(event.currentTarget));
  sqlInput.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); runQuery(); }
  });
}

function boot() {
  createWorld();
  wireUi();
}

boot();
