// File upload handling
const uploadContainer = document.createElement("div");

const fileLabel = document.createElement("label");
fileLabel.htmlFor = "file-input";
fileLabel.className = "btn";
fileLabel.textContent = "Choose an image";
fileLabel.style.backgroundColor = "white";
fileLabel.style.color = "black";
fileLabel.style.padding = "10px 15px";
fileLabel.style.borderRadius = "5px";
fileLabel.style.cursor = "pointer";
fileLabel.style.fontFamily = "Arial, sans-serif";
fileLabel.style.fontWeight = "bold";
fileLabel.style.display = "inline-block";
const fileInput = document.createElement("input");
fileInput.id = "file-input";
fileInput.type = "file";
fileInput.accept = "image/*";
fileInput.addEventListener("change", handleImageUpload);
fileInput.style.display = "none";

uploadContainer.appendChild(fileLabel);
uploadContainer.appendChild(fileInput);
document.body.appendChild(uploadContainer);

// Canvas setup
const canvas = document.createElement("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
document.body.appendChild(canvas);
const ctx = canvas.getContext("2d");

// Store our particles
let particles = [];
let animationId;

function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      setupCanvasAndSamplePixels(img);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function setupCanvasAndSamplePixels(img) {
  // Cancel any existing animation
  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  // Create a temporary canvas to draw and sample the image
  const tempCanvas = document.createElement("canvas");

  // Calculate dimensions to fit image within canvas while maintaining aspect ratio
  const scale =
    Math.min(canvas.width / img.width, canvas.height / img.height) * 0.8; // 80% of available space

  const scaledWidth = img.width * scale;
  const scaledHeight = img.height * scale;

  tempCanvas.width = scaledWidth;
  tempCanvas.height = scaledHeight;

  // Draw image on temporary canvas
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
  const imageData = tempCtx.getImageData(0, 0, scaledWidth, scaledHeight);

  // Calculate offset to center the image
  const offsetX = (canvas.width - scaledWidth) / 2;
  const offsetY = (canvas.height - scaledHeight) / 2;

  // Clear canvas for animation
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Sample pixels and create particles
  particles = samplePixels(imageData, 10000, offsetX, offsetY);

  // Start the animation
  startAnimation();
}

function samplePixels(imageData, numSamples, offsetX, offsetY) {
  const particles = [];
  const { width, height, data } = imageData;

  // Create brightness map for weighted sampling
  const brightnessMap = [];
  let totalBrightness = 0;

  // Calculate brightness for each pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Skip fully transparent pixels
      if (data[idx + 3] < 50) {
        brightnessMap.push(0);
        continue;
      }

      // Calculate brightness (higher value = lighter pixel)
      const brightness =
        0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

      brightnessMap.push(brightness);
      totalBrightness += brightness;
    }
  }

  // Sample pixels with preference for lighter ones
  for (let i = 0; i < numSamples; i++) {
    // Choose a random brightness value within the total range
    const targetBrightness = Math.random() * totalBrightness;

    // Find the corresponding pixel
    let brightnessSoFar = 0;
    let selectedPixel = -1;

    for (let j = 0; j < brightnessMap.length; j++) {
      brightnessSoFar += brightnessMap[j];
      if (brightnessSoFar >= targetBrightness) {
        selectedPixel = j;
        break;
      }
    }

    if (selectedPixel === -1) continue; // Skip if no valid pixel found

    // Convert the 1D position back to 2D coordinates
    const x = selectedPixel % width;
    const y = Math.floor(selectedPixel / width);

    // Calculate the index in the pixel data array
    const idx = (y * width + x) * 4;

    // Get the color at that position
    const color = [
      data[idx], // R
      data[idx + 1], // G
      data[idx + 2], // B
    ];

    // Generate random starting position across the full canvas
    const startX = Math.random() * canvas.width;
    const startY = Math.random() * canvas.height;

    // Add offset to end coordinates to center the image
    const endX = x + offsetX;
    const endY = y + offsetY;

    // Create particle
    particles.push({
      startCoords: [startX, startY],
      endCoords: [endX, endY],
      color: color,
      progress: 0, // Animation progress from 0 to 1
      size: Math.random() * 2 + 1, // Random size between 1-3px
    });
  }

  return particles;
}

function startAnimation() {
  // Reset all particles' progress
  particles.forEach((p) => (p.progress = 0));

  // Start animation loop
  animateParticles();
}

function animateParticles() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Update and draw particles
  let allComplete = true;

  particles.forEach((particle) => {
    // Update progress (adjust value to control animation speed)
    if (particle.progress < 1) {
      particle.progress += 0.001;
      allComplete = false;
    }

    // Calculate current position using easing function
    const currentX = easeInOutCubic(
      particle.progress,
      particle.startCoords[0],
      particle.endCoords[0] - particle.startCoords[0],
      1,
    );

    const currentY = easeInOutCubic(
      particle.progress,
      particle.startCoords[1],
      particle.endCoords[1] - particle.startCoords[1],
      1,
    );

    // Draw particle
    ctx.fillStyle = `rgb(${particle.color[0]}, ${particle.color[1]}, ${particle.color[2]})`;
    ctx.beginPath();
    ctx.arc(currentX, currentY, particle.size, 0, Math.PI * 2);
    ctx.fill();
  });

  // Continue animation if not all particles are at their destination
  if (!allComplete) {
    animationId = requestAnimationFrame(animateParticles);
  }
}

// Easing function for smoother animation
function easeInOutCubic(t, b, c, d) {
  t /= d / 2;
  if (t < 1) return (c / 2) * t * t * t + b;
  t -= 2;
  return (c / 2) * (t * t * t + 2) + b;
}

// Resize handler
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Redraw particles at current positions if animation is in progress
  if (particles.length > 0) {
    animateParticles();
  }
});

// Add some basic styling
document.body.style.margin = "0";
document.body.style.overflow = "hidden";
document.body.style.backgroundColor = "black";
// Since fileInput has display: none already set elsewhere in the code,
// we now need to style the uploadContainer and fileLabel instead
uploadContainer.style.position = "absolute";
uploadContainer.style.zIndex = "100";
uploadContainer.style.top = "20px";
uploadContainer.style.left = "20px";
