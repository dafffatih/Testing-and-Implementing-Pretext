export class Shape {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.isDragging = false;
  }

  // To be overridden
  draw(ctx) {}
  isPointInside(px, py) { return false; }
  
  // Get horizontal [startX, endX] that this shape occupies at a given [y, y+h] band
  // returns null if no intersection
  getBlockedInterval(y, h) { return null; }
}

export class Circle extends Shape {
  constructor(x, y, radius, color) {
    super(x, y, color);
    this.radius = radius;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  isPointInside(px, py) {
    return (px - this.x) ** 2 + (py - this.y) ** 2 <= this.radius ** 2;
  }

  getBlockedInterval(y, h) {
    const cy = this.y;
    const r = this.radius;
    // check if band [y, y+h] intersects [cy-r, cy+r]
    if (y + h < cy - r || y > cy + r) return null;
    
    // Find maximum width of circle within this band
    // The widest point might be the center if it's inside the band,
    // otherwise it's at the closest edge of the band to the center.
    let closestY;
    if (cy >= y && cy <= y + h) closestY = cy; // center is in the band
    else if (cy < y) closestY = y; // band is below center
    else closestY = y + h; // band is above center

    const dy = closestY - cy;
    const dx = Math.sqrt(Math.max(0, r * r - dy * dy));
    
    // Add a small padding (e.g. 5px)
    return [this.x - dx - 5, this.x + dx + 5];
  }
}

export class Rectangle extends Shape {
  constructor(x, y, width, height, color) {
    super(x, y, color);
    this.w = width;
    this.h = height;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.rect(this.x - this.w/2, this.y - this.h/2, this.w, this.h);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  isPointInside(px, py) {
    return px >= this.x - this.w/2 && px <= this.x + this.w/2 &&
           py >= this.y - this.h/2 && py <= this.y + this.h/2;
  }

  getBlockedInterval(y, lh) {
    const top = this.y - this.h/2;
    const bottom = this.y + this.h/2;
    if (y + lh < top || y > bottom) return null;
    return [this.x - this.w/2 - 5, this.x + this.w/2 + 5];
  }
}

export class Square extends Rectangle {
  constructor(x, y, size, color) {
    super(x, y, size, size, color);
  }
}

// Generic Polygon for Triangle, Pentagon, Hexagon, Star
export class Polygon extends Shape {
  constructor(x, y, radius, sides, color, startAngle = 0, isStar = false) {
    super(x, y, color);
    this.radius = radius;
    this.sides = sides;
    this.startAngle = startAngle;
    this.isStar = isStar;
    this.vertices = [];
    this.updateVertices();
  }

  updateVertices() {
    this.vertices = [];
    const step = (Math.PI * 2) / this.sides;
    for (let i = 0; i < this.sides; i++) {
      const angle = this.startAngle + i * step;
      this.vertices.push({
        x: this.x + this.radius * Math.cos(angle),
        y: this.y + this.radius * Math.sin(angle)
      });
      if (this.isStar) {
        const innerAngle = angle + step / 2;
        const innerRadius = this.radius / 2.5; // inner valley for star
        this.vertices.push({
          x: this.x + innerRadius * Math.cos(innerAngle),
          y: this.y + innerRadius * Math.sin(innerAngle)
        });
      }
    }
  }

  // To allow moving the shape
  setPos(nx, ny) {
    this.x = nx;
    this.y = ny;
    this.updateVertices();
  }

  draw(ctx) {
    if (this.vertices.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
    for (let i = 1; i < this.vertices.length; i++) {
        ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  isPointInside(px, py) {
    // ray casting logic
    let inside = false;
    for (let i = 0, j = this.vertices.length - 1; i < this.vertices.length; j = i++) {
      let xi = this.vertices[i].x, yi = this.vertices[i].y;
      let xj = this.vertices[j].x, yj = this.vertices[j].y;
      let intersect = ((yi > py) !== (yj > py))
          && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  getBlockedInterval(y, h) {
    // Check intersection of horizontal band [y, y+h] with all polygon edges.
    // For simplicity, sample intersection with the middle line of the band: midY
    // To be perfectly safe, also check topY and bottomY and bound them
    const ys = [y, y + h/2, y + h];
    let minX = Infinity;
    let maxX = -Infinity;
    let intersects = false;

    // Check if any vertices are inside the band
    for(let v of this.vertices) {
        if(v.y >= y && v.y <= y + h) {
            minX = Math.min(minX, v.x);
            maxX = Math.max(maxX, v.x);
            intersects = true;
        }
    }

    // Check edge intersections with the 3 horizontal scanlines
    for (let scanY of ys) {
      for (let i = 0, j = this.vertices.length - 1; i < this.vertices.length; j = i++) {
        let xi = this.vertices[i].x, yi = this.vertices[i].y;
        let xj = this.vertices[j].x, yj = this.vertices[j].y;
        
        // if edge crosses scanY
        if ((yi <= scanY && yj >= scanY) || (yj <= scanY && yi >= scanY)) {
          if (yi !== yj) { // prevent div by zero
            let ix = xi + (scanY - yi) * (xj - xi) / (yj - yi);
            minX = Math.min(minX, ix);
            maxX = Math.max(maxX, ix);
            intersects = true;
          }
        }
      }
    }

    if (!intersects || minX === Infinity) return null;
    return [minX - 5, maxX + 5]; // 5px padding
  }
}

export class Triangle extends Polygon {
  constructor(x, y, radius, color) {
    super(x, y, radius, 3, color, -Math.PI/2);
  }
}

export class Pentagon extends Polygon {
  constructor(x, y, radius, color) {
    super(x, y, radius, 5, color, -Math.PI/2);
  }
}

export class Hexagon extends Polygon {
  constructor(x, y, radius, color) {
    super(x, y, radius, 6, color, 0); // flat top or pointy top
  }
}

export class Star extends Polygon {
  constructor(x, y, radius, color) {
    super(x, y, radius, 5, color, -Math.PI/2, true);
  }
}
