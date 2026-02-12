export function demoBiomeRGBA({ size }) {
  const out = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      out[i+0] = (x / size) * 255;
      out[i+1] = (y / size) * 255;
      out[i+2] = 140;
      out[i+3] = 255;
    }
  }
  return out;
}

export function demoFindStructures({ x, z, radius, types }) {
  // Makes up “structures” in a circle so you can see markers + nearest list works.
  const all = [];
  const nearest = [];
  for (let i = 0; i < types.length; i++) {
    const t = types[i];
    const angle = (i / Math.max(1, types.length)) * Math.PI * 2;
    const px = x + Math.round(Math.cos(angle) * (radius * 0.6));
    const pz = z + Math.round(Math.sin(angle) * (radius * 0.6));
    const dx = px - x, dz = pz - z;
    const d = Math.sqrt(dx*dx + dz*dz);
    all.push({ type: t, x: px, z: pz });
    nearest.push({ type: t, x: px, z: pz, distance: d });
  }
  return { all, nearest };
}
