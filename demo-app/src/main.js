import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext';
import { Circle, Square, Rectangle, Triangle, Pentagon, Hexagon, Star } from './shapes.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const container = document.querySelector('.canvas-container');

let width, height;
let prepared;
const summaryText = "Pretext adalah pustaka JavaScript dan TypeScript murni yang dirancang khusus untuk pengukuran dan tata letak teks multibaris dengan performa tinggi, akurasi tinggi, serta dukungan luas untuk berbagai bahasa yang bahkan jarang diketahui, di mana pustaka ini bekerja dengan menghindari kebutuhan akan pengukuran DOM tradisional seperti getBoundingClientRect atau offsetHeight yang biasanya memicu layout reflow yang lambat dan berat bagi peramban. Dengan mengimplementasikan logika pengukuran teksnya sendiri dan menggunakan mesin font peramban melalui elemen kanvas sebagai sumber kebenaran data, Pretext memungkinkan pengembang untuk menghitung tinggi paragraf atau menyusun baris teks secara manual untuk di-render ke DOM, Canvas, SVG, maupun sisi server di masa depan tanpa harus menyentuh DOM secara langsung, sehingga membuka peluang baru dalam pembuatan antarmuka web modern seperti virtualisasi daftar yang presisi tanpa perkiraan kasar, tata letak masonry yang fleksibel, implementasi flexbox kustom berbasis JavaScript, serta pencegahan pergeseran tata letak saat konten baru dimuat dengan cara menghitung geometri teks sebelum teks tersebut benar-benar ditampilkan di layar. ";
const longText = summaryText.repeat(15);

const FONT_SIZE = 16;
const FONT_FAMILY = 'Inter, sans-serif';
const LINE_HEIGHT = 26;
const MARGIN = 20;

const shapes = [];

function init() {
  window.addEventListener('resize', resize);
  
  // Create preset shapes
  shapes.push(new Circle(250, 200, 80, '#ff5c5c')); // red circle
  shapes.push(new Square(450, 150, 100, '#5c80ff')); // blue square
  shapes.push(new Rectangle(300, 450, 140, 70, '#5cff8e')); // green rect
  shapes.push(new Triangle(600, 300, 80, '#ffd85c')); // yellow triangle
  shapes.push(new Pentagon(800, 150, 75, '#b95cff')); // purple pentagon
  shapes.push(new Hexagon(150, 600, 90, '#ff5cd8')); // pink hexagon
  shapes.push(new Star(750, 500, 100, '#ff995c')); // orange star
  
  prepared = prepareWithSegments(longText, `${FONT_SIZE}px ${FONT_FAMILY}`);
  
  setupInteraction();
  resize(); // triggers render
}

function resize() {
  const rect = container.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  
  // Handling high DPI displays
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  
  // Scale context to match DPI
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  
  requestAnimationFrame(render);
}

// Drag functionality
let draggedShape = null;
let offsetX = 0;
let offsetY = 0;

function setupInteraction() {
  canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check backwards to grab top-most shape
    for (let i = shapes.length - 1; i >= 0; i--) {
      if (shapes[i].isPointInside(x, y)) {
        draggedShape = shapes[i];
        if (draggedShape.setPos) { // Polygon
           offsetX = draggedShape.x - x;
           offsetY = draggedShape.y - y;
        } else {
           offsetX = draggedShape.x - x;
           offsetY = draggedShape.y - y;
        }
        canvas.style.cursor = 'grabbing';
        break;
      }
    }
  });

  window.addEventListener('mousemove', e => {
    if (!draggedShape) return;
    const rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    
    if (draggedShape.setPos) {
       draggedShape.setPos(x + offsetX, y + offsetY);
    } else {
       draggedShape.x = x + offsetX;
       draggedShape.y = y + offsetY;
    }
    
    // trigger render
    requestAnimationFrame(render);
  });

  window.addEventListener('mouseup', () => {
    draggedShape = null;
    canvas.style.cursor = 'default';
  });
  
  // Touch support for mobile (optional)
  canvas.addEventListener('touchstart', e => {
    if (e.touches.length > 0) {
      e.clientX = e.touches[0].clientX;
      e.clientY = e.touches[0].clientY;
      const mousedownEvent = new MouseEvent('mousedown', e);
      canvas.dispatchEvent(mousedownEvent);
    }
  }, {passive:true});
  
  canvas.addEventListener('touchmove', e => {
    if (draggedShape && e.touches.length > 0) {
      e.preventDefault(); // prevent scrolling
      const mousemoveEvent = new MouseEvent('mousemove', {
        clientX: e.touches[0].clientX,
        clientY: e.touches[0].clientY
      });
      window.dispatchEvent(mousemoveEvent);
    }
  }, {passive:false});
  
  window.addEventListener('touchend', () => {
    window.dispatchEvent(new MouseEvent('mouseup'));
  });
}

function getAvailableIntervals(y, h, totalWidth) {
  // 1. Collect blocked intervals for this horizontal slice
  let blocked = shapes.map(s => s.getBlockedInterval(y, h)).filter(x => x !== null);
  
  // 2. Add canvas boundaries margins
  blocked.push([-Infinity, MARGIN]);
  blocked.push([totalWidth - MARGIN, Infinity]);
  
  // 3. Merge overlapping intervals
  blocked.sort((a, b) => a[0] - b[0]);
  const merged = [];
  if (blocked.length > 0) {
    let current = blocked[0];
    for (let i = 1; i < blocked.length; i++) {
        if (blocked[i][0] <= current[1]) {
            current[1] = Math.max(current[1], Math.max(current[1], blocked[i][1]));
        } else {
            merged.push([...current]);
            current = blocked[i];
        }
    }
    merged.push([...current]);
  }
  
  // 4. Invert blocked intervals to find available gaps
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

  // Render loop using layoutNextLine for each unblocked segment on a row
  let breakLoop = false;
  while (y < height - MARGIN && !breakLoop) {
    let intervals = getAvailableIntervals(y, LINE_HEIGHT, width);
    
    for (let [start, end] of intervals) {
      let intervalWidth = end - start;
      if (intervalWidth < 40) continue; // skip narrow gaps
      
      const line = layoutNextLine(prepared, cursor, intervalWidth);
      if (!line) {
          breakLoop = true;
          break;
      }
      
      ctx.fillText(line.text, start, y);
      cursor = line.end;
      
      // If we've processed all segments, break early
      // Depending on pretext version, line exhaustion can be checked by whether line text was empty, 
      // but usually layoutNextLine returns null when done. 
      // We also verify segment boundaries if exposed.
    }
    
    y += LINE_HEIGHT;
  }
  
  // Draw shapes
  for (let shape of shapes) {
      shape.draw(ctx);
  }
}

// Start
document.addEventListener('DOMContentLoaded', init);
