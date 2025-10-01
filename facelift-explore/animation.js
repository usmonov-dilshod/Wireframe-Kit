/*
  Образовательная 3D-схема: этапы deep-plane rhytidectomy.
  Этапы:
  1) Разметка: линия от латерального кантуса к углу нижней челюсти; кожный лоскут.
  2) Вход в deep plane: остро №10, затем тупо; под-SMAS внизу.
  3) Супериорно: над orbicularis/zygomaticus; сохранение связок и нервов.
  4) Освобождение zygomatic ligament и плотных прикреплений.
  5) Соединение карманов: релиз щёчной области и жировых компартментов.
  6) Подвеска: 3 шва 3-0 PDS к надкостнице скуловой дуги, вертикально-обlique ~60°.
*/

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
camera.position.set(0, 1.2, 6);

const light = new THREE.DirectionalLight(0xffffff, 1.0);
light.position.set(4, 6, 8);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.35));

// Базовая голова-манекен (схематично)
const headGroup = new THREE.Group();
scene.add(headGroup);

const skinMat = new THREE.MeshStandardMaterial({ color: 0xe7c9a9, roughness: 0.7, metalness: 0.0, transparent:true, opacity: 0.9 });
const smasMat = new THREE.MeshStandardMaterial({ color: 0xc77d7d, roughness: 0.8, metalness: 0.0, transparent:true, opacity: 0.75 });
const dissectionMat = new THREE.MeshStandardMaterial({ color: 0x86b6ff, roughness: 0.8, metalness: 0.0, transparent:true, opacity: 0.55 });
const sutureMat = new THREE.LineBasicMaterial({ color: 0x8bd5ca, linewidth: 2 });

const headGeom = new THREE.SphereGeometry(1.2, 48, 48);
const jawGeom = new THREE.SphereGeometry(0.9, 36, 36);
const skinMesh = new THREE.Mesh(headGeom, skinMat);
skinMesh.position.set(0, 0.2, 0);
const jawMesh = new THREE.Mesh(jawGeom, skinMat);
jawMesh.position.set(0, -0.6, 0.2);
headGroup.add(skinMesh, jawMesh);

// Слой SMAS/мышечный (внутренний объем)
const smasGeom = new THREE.SphereGeometry(1.05, 40, 40);
const smasMesh = new THREE.Mesh(smasGeom, smasMat);
smasMesh.position.copy(skinMesh.position);
headGroup.add(smasMesh);

// Зоны диссекции (условные пластины)
const plateGeom = new THREE.PlaneGeometry(1.4, 1.0, 1, 1);
const inferiorPlate = new THREE.Mesh(plateGeom, dissectionMat);
inferiorPlate.position.set(0.2, -0.2, 0.9);
inferiorPlate.rotation.y = -0.4;
inferiorPlate.visible = false;
headGroup.add(inferiorPlate);

const superiorPlate = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), dissectionMat);
superiorPlate.position.set(0.0, 0.5, 0.9);
superiorPlate.rotation.y = -0.2;
superiorPlate.visible = false;
headGroup.add(superiorPlate);

// Связка/узел (скуловая область) — маркер релиза
const ligamentMarker = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), new THREE.MeshStandardMaterial({ color: 0xffcc66 }));
ligamentMarker.position.set(0.6, 0.2, 0.9);
ligamentMarker.visible = false;
headGroup.add(ligamentMarker);

// Векторы подвески — 3 линии к скуловой дуге
function makeArrow(from, to){
  const pts = [new THREE.Vector3(from.x, from.y, from.z), new THREE.Vector3(to.x, to.y, to.z)];
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.Line(geo, sutureMat);
}
const sutures = [
  makeArrow(new THREE.Vector3(0.1, -0.1, 1.1), new THREE.Vector3(1.3, 0.6, 0.0)),
  makeArrow(new THREE.Vector3(0.2, 0.2, 1.1), new THREE.Vector3(1.3, 0.6, 0.0)),
  makeArrow(new THREE.Vector3(0.3, 0.5, 1.05), new THREE.Vector3(1.3, 0.6, 0.0))
];
sutures.forEach(l => { l.visible = false; scene.add(l); });

// Разметочная линия кантус→угол НЧ
const markMat = new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.06, gapSize: 0.04 });
const markGeo = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0.9, 0.4, 0.9), new THREE.Vector3(-0.2, -0.8, 0.6)
]);
const guideLine = new THREE.Line(markGeo, markMat);
guideLine.computeLineDistances();
guideLine.visible = false;
scene.add(guideLine);

// Стадии
const stages = [
  { id: 'mark', name: 'Разметка и кожный лоскут', enter: () => { guideLine.visible = true; }, exit: () => { guideLine.visible = false; } },
  { id: 'deep-entry', name: 'Вход в deep plane', enter: () => { inferiorPlate.visible = true; }, exit: () => { inferiorPlate.visible = false; } },
  { id: 'superior', name: 'Супериорная диссекция', enter: () => { superiorPlate.visible = true; }, exit: () => { superiorPlate.visible = false; } },
  { id: 'release', name: 'Релиз скуловой связки', enter: () => { ligamentMarker.visible = true; }, exit: () => { ligamentMarker.visible = false; } },
  { id: 'connect', name: 'Соединение карманов', enter: () => { inferiorPlate.visible = true; superiorPlate.visible = true; }, exit: () => { inferiorPlate.visible = false; superiorPlate.visible = false; } },
  { id: 'suspend', name: 'Подвеска 3-0 PDS (~60°)', enter: () => { sutures.forEach(l => l.visible = true); }, exit: () => { sutures.forEach(l => l.visible = false); } }
];

let stageIndex = 0;
function setStage(i){
  stages[stageIndex]?.exit?.();
  stageIndex = (i + stages.length) % stages.length;
  stages[stageIndex]?.enter?.();
  updateStagebar();
}

// UI
const stagebar = document.getElementById('stagebar');
function updateStagebar(){
  stagebar.innerHTML = '';
  stages.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'stage' + (i === stageIndex ? ' active' : '');
    b.textContent = `${i+1}. ${s.name}`;
    b.addEventListener('click', () => setStage(i));
    stagebar.appendChild(b);
  });
}

document.getElementById('prev').addEventListener('click', () => setStage(stageIndex - 1));
document.getElementById('next').addEventListener('click', () => setStage(stageIndex + 1));
let playing = false; let playTimer = null;
document.getElementById('play').addEventListener('click', () => {
  playing = !playing;
  const btn = document.getElementById('play');
  btn.textContent = playing ? 'Пауза' : 'Пуск';
  if(playing){
    playTimer = setInterval(() => setStage(stageIndex + 1), 2000);
  } else if(playTimer){
    clearInterval(playTimer); playTimer = null;
  }
});

function resize(){
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if(canvas.width !== w || canvas.height !== h){
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
}
window.addEventListener('resize', resize);

// Простая анимация дыхания головы
const clock = new THREE.Clock();
function tick(){
  resize();
  const t = clock.getElapsedTime();
  headGroup.position.y = Math.sin(t * 0.6) * 0.02;
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

setStage(0);
tick();

