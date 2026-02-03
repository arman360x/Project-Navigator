// Run this script with Node.js to generate an icon
// npm install canvas
// node generate-icon.js

const fs = require('fs');
const { createCanvas } = require('canvas');

const size = 256;
const canvas = createCanvas(size, size);
const ctx = canvas.getContext('2d');

// Background
ctx.fillStyle = '#1a1a2e';
ctx.fillRect(0, 0, size, size);

// Rounded corners
ctx.beginPath();
ctx.roundRect(10, 10, size - 20, size - 20, 30);
ctx.fillStyle = '#16213e';
ctx.fill();

// Folder icon
ctx.fillStyle = '#e94560';
ctx.beginPath();
ctx.moveTo(50, 90);
ctx.lineTo(50, 200);
ctx.lineTo(200, 200);
ctx.lineTo(200, 110);
ctx.lineTo(140, 110);
ctx.lineTo(120, 90);
ctx.closePath();
ctx.fill();

// Folder tab
ctx.fillStyle = '#0f4c75';
ctx.beginPath();
ctx.moveTo(50, 90);
ctx.lineTo(120, 90);
ctx.lineTo(140, 110);
ctx.lineTo(200, 110);
ctx.lineTo(200, 130);
ctx.lineTo(50, 130);
ctx.closePath();
ctx.fill();

// Key icon
ctx.fillStyle = '#ffc107';
ctx.beginPath();
ctx.arc(160, 160, 20, 0, Math.PI * 2);
ctx.fill();
ctx.fillRect(140, 155, 40, 10);
ctx.fillRect(120, 155, 10, 20);
ctx.fillRect(130, 155, 10, 15);

// Save as PNG
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('icon.png', buffer);
console.log('Icon generated: icon.png');
