import { demoBiomeRGBA, demoFindStructures } from "./engine_demo.js";

const STRUCTS = [
  { key: "Village", label: "Village", color: "#22c55e", dims: ["overworld"] },
  { key: "Pillager_Outpost", label: "Pillager Outpost", color: "#f97316", dims: ["overworld"] },
  { key: "Monument", label: "Ocean Monument", color: "#38bdf8", dims: ["overworld"] },
  { key: "Mansion", label: "Woodland Mansion", color: "#a78bfa", dims: ["overworld"] },
  { key: "Ancient_City", label: "Ancient City", color: "#60a5fa", dims: ["overworld"] },
  { key: "Fortress", label: "Nether Fortress", color: "#ef4444", dims: ["nether"] },
  { key: "Bastion", label: "Bastion Remnant", color: "#eab308", dims: ["nether"] },
];

const el = (id) => document.getElementById(id);

const seedEl = el("seed");
const dimEl = el("dim");
const sizeEl = el("size");
const scaleEl = el("scale");
const genMapBtn = el("genMap");
const findBtn = el("findNearest");
const xEl = el("x");
const zEl = el("z");
const radiusEl = el("radius");
const filtersEl = el("filters");
const resultsEl = el("results");
const statusEl = el("status");
const legendEl = el("legend");
const hoverCoordsEl = el("hoverCoords");

const canvas = el("map");
const ctx = canvas.getContext("2d");

let state = {
  dim: "overworld",
  size: 512,
  scale: 8,
  filters: new Set(STRUCTS.filter(s => s.dims.includes("overworld")).map(s => s.key)),
  mapOriginX: 0,
  mapOriginZ: 0,
  zoom: 1,
  panX: 0,
  panY: 0,
  markers: [],
};

function rebuildFiltersUI() {
  filtersEl.innerHTML = "";
  legendEl.innerHTML = "";

  const available = STRUCTS.filter(s => s.dims.includes(state.dim));
  const colorByKey = Object.fromEntries(available.map(s => [s.key, s.color]));

  for (const s of available) {
    const wrap = document.createElement("label");
    wrap.className = "filter";
    wrap.innerHTML = `<input type="checkbox" ${state.filters.has(s.key) ? "checked":""}/> <span>${s.label}</span>`;
    wrap.querySelector("input").addEventListener("change", (e) => {
      if (e.target.checked) state.filters.add(s.key);
      else state.filters.delete(s.key);
      drawAll(colorByKey);
    });
    filtersEl.appendChild(wrap);

    const li = document.createElement("div");
    li.className = "item";
    li.innerHTML = `<span class="dot" style="background:${s.color}"></span> ${s.label}`;
    legendEl.appendChild(li);
  }
}

function setStatus(msg){ statusEl.textContent = msg; }
function setCanvasSize(n){ canvas.width = n; canvas.height = n; }
function mapToScreen(wx, wz) {
  const bpp = state.scale;
  return { x: (wx - state.mapOriginX)/bpp, y: (wz - state.mapOriginZ)/bpp };
}
function screenToMap(px, py) {
  const bpp = state.scale;
  return { wx: state.mapOriginX + px*bpp, wz: state.mapOriginZ + py*bpp };
}

let baseImage = null;

function drawMarkers(colorByKey) {
  ctx.save();
  ctx.setTransform(state.zoom,0,0,state.zoom,state.panX,state.panY);
  for (const m of state.markers) {
    if (!state.filters.has(m.type)) continue;
    const { x, y } = mapToScreen(m.x, m.z);
    ctx.beginPath();
    ctx.fillStyle = colorByKey[m.type] || "#fff";
    ctx.strokeStyle = "rgba(0,0,0,.5)";
    ctx.lineWidth = 2;
    ctx.arc(x, y, 4, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

function drawAll(colorByKey) {
  if (!baseImage) return;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.setTransform(state.zoom,0,0,state.zoom,state.panX,state.panY);
  ctx.imageSmoothingEnabled = false;
  ctx.putImageData(baseImage, 0, 0);
  drawMarkers(colorByKey);
}

let dragging = false;
let last = {x:0,y:0};
canvas.addEventListener("mousedown", (e)=>{ dragging=true; last={x:e.clientX,y:e.clientY}; });
window.addEventListener("mouseup", ()=> dragging=false);
window.addEventListener("mousemove", (e)=>{
  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const invX = (cx - state.panX)/state.zoom;
  const invY = (cy - state.panY)/state.zoom;
  const { wx, wz } = screenToMap(invX, invY);
  hoverCoordsEl.textContent = `~ X ${Math.floor(wx)}  Z ${Math.floor(wz)}`;

  if (!dragging) return;
  state.panX += (e.clientX - last.x);
  state.panY += (e.clientY - last.y);
  last = {x:e.clientX,y:e.clientY};
  const colorByKey = Object.fromEntries(STRUCTS.filter(s => s.dims.includes(state.dim)).map(s => [s.key,s.color]));
  drawAll(colorByKey);
});
canvas.addEventListener("wheel", (e)=>{
  e.preventDefault();
  state.zoom = Math.min(6, Math.max(0.5, state.zoom + Math.sign(e.deltaY)*-0.1));
  const colorByKey = Object.fromEntries(STRUCTS.filter(s => s.dims.includes(state.dim)).map(s => [s.key,s.color]));
  drawAll(colorByKey);
},{passive:false});

function renderResults(list) {
  resultsEl.innerHTML = "";
  if (!list.length) {
    resultsEl.innerHTML = `<div class="card"><div class="title">No results</div><div class="meta">Enable structures or raise radius.</div></div>`;
    return;
  }
  for (const r of list) {
    const label = STRUCTS.find(s => s.key === r.type)?.label || r.type;
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="title"><span>${label}</span><span class="copy">Copy</span></div>
      <div class="meta"><span>X ${r.x} Z ${r.z}</span><span>~ ${Math.round(r.distance)} blocks away</span></div>
    `;
    card.querySelector(".copy").addEventListener("click", async ()=>{
      await navigator.clipboard.writeText(`${r.x} ${r.z}`);
    });
    resultsEl.appendChild(card);
  }
}

async function generateMap() {
  setStatus("Generating map (demo)…");
  state.dim = dimEl.value;
  state.size = parseInt(sizeEl.value, 10);
  state.scale = parseInt(scaleEl.value, 10);

  const cx = parseInt(xEl.value || "0", 10);
  const cz = parseInt(zEl.value || "0", 10);
  state.mapOriginX = cx - (state.size * state.scale)/2;
  state.mapOriginZ = cz - (state.size * state.scale)/2;

  setCanvasSize(state.size);
  state.zoom = 1; state.panX = 0; state.panY = 0;

  // default enable all for dim
  state.filters = new Set(STRUCTS.filter(s => s.dims.includes(state.dim)).map(s => s.key));
  rebuildFiltersUI();

  const rgba = demoBiomeRGBA({ size: state.size });
  baseImage = new ImageData(rgba, state.size, state.size);
  state.markers = [];
  const colorByKey = Object.fromEntries(STRUCTS.filter(s => s.dims.includes(state.dim)).map(s => [s.key,s.color]));
  drawAll(colorByKey);
  setStatus("Map ready (demo).");
}

async function findNearest() {
  setStatus("Finding nearest (demo)…");
  const x = parseInt(xEl.value || "0", 10);
  const z = parseInt(zEl.value || "0", 10);
  const radius = parseInt(radiusEl.value || "5000", 10);

  const enabled = STRUCTS.filter(s => s.dims.includes(state.dim)).filter(s => state.filters.has(s.key)).map(s => s.key);
  const res = demoFindStructures({ x, z, radius, types: enabled });

  state.markers = res.all;
  renderResults(res.nearest);
  const colorByKey = Object.fromEntries(STRUCTS.filter(s => s.dims.includes(state.dim)).map(s => [s.key,s.color]));
  drawAll(colorByKey);
  setStatus("Nearest results ready (demo).");
}

genMapBtn.addEventListener("click", generateMap);
findBtn.addEventListener("click", findNearest);

dimEl.addEventListener("change", ()=>{
  state.dim = dimEl.value;
  state.filters = new Set(STRUCTS.filter(s => s.dims.includes(state.dim)).map(s => s.key));
  rebuildFiltersUI();
});

rebuildFiltersUI();
setStatus("Ready. Click Generate Map.");
