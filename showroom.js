// Showroom fotográfico de Armería: vistas del local que filtran el catálogo.
const showroomViews = [
  { id: 'entrada', image: 'assets/cliente/boceto.jpg', title: 'Vista principal', filter: { category: '' }, alt: 'Vista principal del showroom de Armería Parabellum' },
  { id: 'pistolas', image: 'assets/cliente/pistol-display.jpg', title: 'Pistolas', filter: { category: 'armas', subcategory: 'pistolas' }, alt: 'Ilustración de referencia del sector de pistolas' },
  { id: 'fusiles', image: 'assets/cliente/sector-fusiles.jpg', title: 'Sector de fusiles', filter: { category: 'armas', subcategory: 'fusiles' }, alt: 'Vista del sector de fusiles' },
  { id: 'accesorios', image: 'assets/cliente/sector-accesorios.jpeg', title: 'Óptica y accesorios', filter: { category: 'accesorios' }, alt: 'Vista de vitrinas de óptica y accesorios' },
];

export function initShowroom({ applyFilter }) {
  const $ = selector => document.querySelector(selector);
  const scene = $('#showroomScene');
  let current = 0;

  function setView(id, { filter = true } = {}) {
    const index = showroomViews.findIndex(view => view.id === id);
    if (index < 0) return;
    current = index;
    const view = showroomViews[index];
    scene.src = view.image;
    scene.alt = view.alt;
    $('#sceneTitle').textContent = view.title;
    $('#sceneCounter').innerHTML = `${String(index + 1).padStart(2, '0')} <i>/ ${String(showroomViews.length).padStart(2, '0')}</i>`;
    document.querySelectorAll('[data-showroom-view]').forEach(button => button.classList.toggle('active', button.dataset.showroomView === id));
    document.querySelectorAll('[data-scene-view]').forEach(button => button.classList.toggle('active', button.dataset.sceneView === id));
    if (filter && view.filter) applyFilter({ ...view.filter, brand: '', scroll: false });
  }

  document.querySelectorAll('[data-showroom-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.showroomView)));
  document.querySelectorAll('[data-scene-view]').forEach(button => button.addEventListener('click', () => {
    setView(button.dataset.sceneView);
    const view = showroomViews.find(item => item.id === button.dataset.sceneView);
    if (view?.filter) $('#catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  document.querySelectorAll('[data-view-step]').forEach(button => button.addEventListener('click', () => {
    const next = (current + Number(button.dataset.viewStep) + showroomViews.length) % showroomViews.length;
    setView(showroomViews[next].id);
  }));
  $('#showroomFullscreen')?.addEventListener('click', async () => {
    const frame = $('#showroomViewer');
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await frame.requestFullscreen?.();
    } catch { /* pantalla completa no disponible */ }
  });
}
