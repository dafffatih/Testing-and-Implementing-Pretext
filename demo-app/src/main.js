import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext';
import { Shape, Circle, Square, Rectangle, Triangle, Pentagon, Hexagon, Star } from './shapes.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const container = document.querySelector('.canvas-container');

let width, height;
let prepared;
const summaryText = "Pretext is a pure JavaScript/TypeScript library designed for high-performance, accurate multiline text measurement and layout, supporting a vast range of languages including those you might not even know about. It works by bypassing traditional DOM-based measurements like getBoundingClientRect or offsetHeight, which trigger expensive and slow layout reflows in the browser. By implementing its own text measurement logic using the browser's canvas-based font engine as its ground truth, Pretext allows developers to calculate paragraph heights or lay out individual text lines manually for rendering to the DOM, Canvas, SVG, or even server-side in the future without directly touching the DOM, enabling new possibilities for modern web UIs such as precise virtualization without guesstimates, flexible masonry layouts, custom JavaScript-driven flexbox implementations, and the prevention of layout shifts by calculating text geometry before it is even rendered on the screen. ";
const longText = summaryText.repeat(40); // Increased repetition for fullscreen

const FONT_SIZE = 16;
const FONT_FAMILY = 'Inter, sans-serif';
const LINE_HEIGHT = 26;
const MARGIN = 15;

const REF_WIDTH = 1024;
const REF_HEIGHT = 768;
const MIN_SCALE = 0.4;

const SHAPE_CONFIGS = [
  { type: 'Circle', x: 250, y: 200, size: 80, color: '#ff5c5c' },
  { type: 'Square', x: 550, y: 150, size: 120, color: '#5c80ff' },
  { type: 'Rectangle', x: 300, y: 480, w: 170, h: 100, color: '#5cff8e' },
  { type: 'Triangle', x: 750, y: 250, size: 90, color: '#ffd85c' },
  { type: 'Pentagon', x: 850, y: 550, size: 85, color: '#b95cff' },
  { type: 'Hexagon', x: 150, y: 650, size: 100, color: '#ff5cd8' },
  { type: 'Star', x: 600, y: 600, size: 110, color: '#ff995c' }
];

const shapes = [];

function initShapes() {
  const currentWidth = window.innerWidth;
  const currentHeight = window.innerHeight;
  
  // Hitung skala berdasarkan lebar, tinggi, dan luas layar
  const scaleW = currentWidth / REF_WIDTH;
  const scaleH = currentHeight / REF_HEIGHT;
  const scaleArea = Math.sqrt((currentWidth * currentHeight) / (REF_WIDTH * REF_HEIGHT));
  
  // Ambil nilai terkecil agar bentuk muat di layar sempit/pendek
  let scale = Math.min(scaleW, scaleH, scaleArea, 1.0);
  
  // Batas pengaman agar tidak terlalu kecil di mobile
  if (scale < MIN_SCALE) scale = MIN_SCALE;

  shapes.length = 0; // Kosongkan array saat ini

  SHAPE_CONFIGS.forEach(conf => {
    let s;
    const nx = conf.x * scaleW; // Posisi menyesuaikan lebar
    const ny = conf.y * scaleH; // Posisi menyesuaikan tinggi
    
    if (conf.type === 'Circle') s = new Circle(nx, ny, conf.size * scale, conf.color);
    else if (conf.type === 'Square') s = new Square(nx, ny, conf.size * scale, conf.color);
    else if (conf.type === 'Rectangle') s = new Rectangle(nx, ny, conf.w * scale, conf.h * scale, conf.color);
    else if (conf.type === 'Triangle') s = new Triangle(nx, ny, conf.size * scale, conf.color);
    else if (conf.type === 'Pentagon') s = new Pentagon(nx, ny, conf.size * scale, conf.color);
    else if (conf.type === 'Hexagon') s = new Hexagon(nx, ny, conf.size * scale, conf.color);
    else if (conf.type === 'Star') s = new Star(nx, ny, conf.size * scale, conf.color);
    
    if (s) shapes.push(s);
  });
}

function init() {
  window.addEventListener('resize', () => {
    resize();
    // Hanya re-init shapes jika layar berubah ukuran besar (opsional)
    // Untuk demo ini, kita re-init agar terlihat responsif
    initShapes();
  });
  
  resize();
  initShapes();
  
  prepared = prepareWithSegments(longText, `${FONT_SIZE}px ${FONT_FAMILY}`);
  
  setupInteraction();
  
  // Continuous animation loop
  animate();
}

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// Drag functionality with velocity tracking
let draggedShape = null;
let offsetX = 0;
let offsetY = 0;
let lastX = 0;
let lastY = 0;

function setupInteraction() {
  const handleStart = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    for (let i = shapes.length - 1; i >= 0; i--) {
      if (shapes[i].isPointInside(x, y)) {
        draggedShape = shapes[i];
        draggedShape.isDragging = true;
        draggedShape.vx = 0;
        draggedShape.vy = 0;
        offsetX = draggedShape.x - x;
        offsetY = draggedShape.y - y;
        lastX = x;
        lastY = y;
        canvas.style.cursor = 'grabbing';
        return true;
      }
    }
    return false;
  };

  const handleMove = (clientX, clientY) => {
    if (!draggedShape) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    draggedShape.vx = x - lastX;
    draggedShape.vy = y - lastY;
    draggedShape.x = x + offsetX;
    draggedShape.y = y + offsetY;
    
    lastX = x;
    lastY = y;
  };

  const handleEnd = () => {
    if (draggedShape) {
      draggedShape.isDragging = false;
      draggedShape = null;
    }
    canvas.style.cursor = 'default';
  };

  // Mouse Events
  canvas.addEventListener('mousedown', e => handleStart(e.clientX, e.clientY));
  window.addEventListener('mousemove', e => handleMove(e.clientX, e.clientY));
  window.addEventListener('mouseup', handleEnd);

  // Touch Events (Mobile)
  canvas.addEventListener('touchstart', e => {
    if (e.touches.length > 0) {
      if (handleStart(e.touches[0].clientX, e.touches[0].clientY)) {
        e.preventDefault(); // Stop scrolling if we grab a shape
      }
    }
  }, { passive: false });

  window.addEventListener('touchmove', e => {
    if (draggedShape && e.touches.length > 0) {
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
      e.preventDefault(); // Prevent scroll while dragging
    }
  }, { passive: false });

  window.addEventListener('touchend', handleEnd);
}

function animate() {
  updatePhysics();
  render();
  requestAnimationFrame(animate);
}

function updatePhysics() {
  // 1. Update positions & Wall collisions
  for (let shape of shapes) {
    shape.update(width, height);
  }

  // 2. Resolve shape-to-shape collisions
  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      Shape.resolveCollision(shapes[i], shapes[j]);
    }
  }
}

function getAvailableIntervals(y, h, totalWidth) {
  let blocked = shapes.map(s => s.getBlockedInterval(y, h)).filter(x => x !== null);
  
  blocked.push([-Infinity, MARGIN]);
  blocked.push([totalWidth - MARGIN, Infinity]);
  
  blocked.sort((a, b) => a[0] - b[0]);
  const merged = [];
  if (blocked.length > 0) {
    let current = blocked[0];
    for (let i = 1; i < blocked.length; i++) {
        if (blocked[i][0] <= current[1]) {
            current[1] = Math.max(current[1], blocked[i][1]);
        } else {
            merged.push([...current]);
            current = blocked[i];
        }
    }
    merged.push([...current]);
  }
  
  const available = [];
  let currentX = 0;
  for (let interval of merged) {
     if (interval[0] > currentX) {
         available.push([currentX, interval[0]]);
     }
     currentX = Math.max(currentX, interval[1]);
  }
  if (totalWidth > currentX) {
      available.push([currentX, totalWidth]);
  }
  
  return available;
}

function render() {
  if (!width || !height || !prepared) return;
  
  ctx.clearRect(0, 0, width, height);
  ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
  ctx.fillStyle = '#e6edf3';
  ctx.textBaseline = 'top';
  
  let cursor = { segmentIndex: 0, graphemeIndex: 0 };
  let y = MARGIN;

  let breakLoop = false;
  while (y < height - MARGIN && !breakLoop) {
    let intervals = getAvailableIntervals(y, LINE_HEIGHT, width);
    
    for (let [start, end] of intervals) {
      let intervalWidth = end - start;
      if (intervalWidth < 40) continue; 
      
      const standardSpaceWidth = ctx.measureText(' ').width;
      // Beri sedikit 'napas' (padding) agar Pretext tidak memaksakan terlalu banyak kata dalam satu baris
      const targetWidth = intervalWidth - 5; 
      
      const line = layoutNextLine(prepared, cursor, targetWidth);
      if (!line) {
          breakLoop = true;
          break;
      }
      
      const isLastOverallLine = line.end.segmentIndex >= prepared.segments.length;
      const words = line.text.trim().split(/\s+/);
      
      if (isLastOverallLine || words.length <= 1) {
          ctx.fillText(line.text, start, y);
      } else {
          let totalWordWidth = 0;
          const wordWidths = words.map(w => {
              const ww = ctx.measureText(w).width;
              totalWordWidth += ww;
              return ww;
          });
          
          // Hitung gapWidth, pastikan tidak lebih kecil dari spasi standar
          let gapWidth = (intervalWidth - totalWordWidth) / (words.length - 1);
          if (gapWidth < standardSpaceWidth) gapWidth = standardSpaceWidth;

          let currentX = start;
          for (let i = 0; i < words.length; i++) {
              ctx.fillText(words[i], currentX, y);
              currentX += wordWidths[i] + gapWidth;
          }
      }
      
      cursor = line.end;
    }
    y += LINE_HEIGHT;
  }
  
  for (let shape of shapes) {
      shape.draw(ctx);
  }
}

document.addEventListener('DOMContentLoaded', init);
