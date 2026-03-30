export class Shape {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.color = color;
    this.isDragging = false;
    this.mass = 1;
    this.friction = 0.995;
    this.bounce = 0.8;
    this.radius = 50; // for bounding circle calculation
  }

  update(width, height) {
    if (this.isDragging) return;

    this.x += this.vx;
    this.y += this.vy;

    // Friction
    this.vx *= this.friction;
    this.vy *= this.friction;

    // Wall bounce
    if (this.x - this.radius < 0) {
      this.x = this.radius;
      this.vx *= -this.bounce;
    } else if (this.x + this.radius > width) {
      this.x = width - this.radius;
      this.vx *= -this.bounce;
    }

    if (this.y - this.radius < 0) {
      this.y = this.radius;
      this.vy *= -this.bounce;
    } else if (this.y + this.radius > height) {
      this.y = height - this.radius;
      this.vy *= -this.bounce;
    }
  }

  // To be overridden for polygon updates if needed
  sync() {}

  isPointInside(px, py) { return false; }
  getBlockedInterval(y, h) { return null; }

  // Simple Circle Collision Resolution
  static resolveCollision(s1, s2) {
    const dx = s2.x - s1.x;
    const dy = s2.y - s1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = s1.radius + s2.radius;

    if (distance < minDistance) {
      // 1. Position correction (prevent overlap)
      const overlap = minDistance - distance;
      const nx = dx / distance;
      const ny = dy / distance;
      
      const moveX = nx * overlap / 2;
      const moveY = ny * overlap / 2;

      if (!s1.isDragging) {
        s1.x -= moveX;
        s1.y -= moveY;
      }
      if (!s2.isDragging) {
        s2.x += moveX;
        s2.y += moveY;
      }

      // 2. Velocity resolution (elastic collision)
      // Normal velocity
      const v1n = s1.vx * nx + s1.vy * ny;
      const v2n = s2.vx * nx + s2.vy * ny;

      // Swap normal velocities (assuming equal mass for simplicity, or weighted)
      const restitution = 0.9;
      const impulse = (2 * (v1n - v2n)) / (s1.mass + s2.mass);

      if (!s1.isDragging) {
        s1.vx -= impulse * s2.mass * nx * restitution;
        s1.vy -= impulse * s2.mass * ny * restitution;
      }
      if (!s2.isDragging) {
        s2.vx += impulse * s1.mass * nx * restitution;
        s2.vy += impulse * s1.mass * ny * restitution;
      }
    }
  }
}

export class Circle extends Shape {
  constructor(x, y, radius, color) {
    super(x, y, color);
    this.radius = radius;
    this.mass = radius / 40;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.stroke();
  }

  isPointInside(px, py) {
    return (px - this.x) ** 2 + (py - this.y) ** 2 <= this.radius ** 2;
  }

  getBlockedInterval(y, h) {
    const cy = this.y;
    const r = this.radius;
    if (y + h < cy - r || y > cy + r) return null;
    let closestY = (cy >= y && cy <= y + h) ? cy : (cy < y ? y : y + h);
    const dy = closestY - cy;
    const dx = Math.sqrt(Math.max(0, r * r - dy * dy));
    return [this.x - dx - 8, this.x + dx + 8];
  }
}

export class Rectangle extends Shape {
  constructor(x, y, width, height, color) {
    super(x, y, color);
    this.w = width;
    this.h = height;
    this.radius = Math.max(width, height) / 2; // approximation for collision
    this.mass = (width * height) / 1600;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.rect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.stroke();
  }

  isPointInside(px, py) {
    return px >= this.x - this.w / 2 && px <= this.x + this.w / 2 &&
      py >= this.y - this.h / 2 && py <= this.y + this.h / 2;
  }

  getBlockedInterval(y, lh) {
    const top = this.y - this.h / 2;
    const bottom = this.y + this.h / 2;
    if (y + lh < top || y > bottom) return null;
    return [this.x - this.w / 2 - 8, this.x + this.w / 2 + 8];
  }
}

export class Square extends Rectangle {
  constructor(x, y, size, color) {
    super(x, y, size, size, color);
  }
}

export class Polygon extends Shape {
  constructor(x, y, radius, sides, color, startAngle = 0, isStar = false) {
    super(x, y, color);
    this.radius = radius;
    this.sides = sides;
    this.startAngle = startAngle;
    this.isStar = isStar;
    this.mass = radius / 30;
    this.vertices = [];
    this.sync();
  }

  sync() {
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
        const innerRadius = this.radius / 2.5;
        this.vertices.push({
          x: this.x + innerRadius * Math.cos(innerAngle),
          y: this.y + innerRadius * Math.sin(innerAngle)
        });
      }
    }
  }

  update(w, h) {
    super.update(w, h);
    this.sync();
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
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.stroke();
  }

  isPointInside(px, py) {
    let inside = false;
    for (let i = 0, j = this.vertices.length - 1; i < this.vertices.length; j = i++) {
      let xi = this.vertices[i].x, yi = this.vertices[i].y;
      let xj = this.vertices[j].x, yj = this.vertices[j].y;
      let intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  getBlockedInterval(y, h) {
    const ys = [y, y + h / 2, y + h];
    let minX = Infinity;
    let maxX = -Infinity;
    let intersects = false;

    for (let v of this.vertices) {
      if (v.y >= y && v.y <= y + h) {
        minX = Math.min(minX, v.x);
        maxX = Math.max(maxX, v.x);
        intersects = true;
      }
    }

    for (let scanY of ys) {
      for (let i = 0, j = this.vertices.length - 1; i < this.vertices.length; j = i++) {
        let xi = this.vertices[i].x, yi = this.vertices[i].y;
        let xj = this.vertices[j].x, yj = this.vertices[j].y;
        if ((yi <= scanY && yj >= scanY) || (yj <= scanY && yi >= scanY)) {
          if (yi !== yj) {
            let ix = xi + (scanY - yi) * (xj - xi) / (yj - yi);
            minX = Math.min(minX, ix);
            maxX = Math.max(maxX, ix);
            intersects = true;
          }
        }
      }
    }

    if (!intersects || minX === Infinity) return null;
    return [minX - 8, maxX + 8];
  }
}

export class Triangle extends Polygon {
  constructor(x, y, radius, color) {
    super(x, y, radius, 3, color, -Math.PI / 2);
  }
}

export class Pentagon extends Polygon {
  constructor(x, y, radius, color) {
    super(x, y, radius, 5, color, -Math.PI / 2);
  }
}

export class Hexagon extends Polygon {
  constructor(x, y, radius, color) {
    super(x, y, radius, 6, color, 0);
  }
}

export class Star extends Polygon {
  constructor(x, y, radius, color) {
    super(x, y, radius, 5, color, -Math.PI / 2, true);
  }
}
