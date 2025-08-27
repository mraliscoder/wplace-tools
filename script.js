let currentImages = {
    simple: null,
    advanced: null,
    transparent: null
};

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + '-tab').classList.add('active');
    event.target.classList.add('active');
}

function handleDragOver(event) {
    event.preventDefault();
    event.target.closest('.upload-area').classList.add('dragover');
}

function handleDragLeave(event) {
    event.target.closest('.upload-area').classList.remove('dragover');
}

function handleDrop(event, type) {
    event.preventDefault();
    event.target.closest('.upload-area').classList.remove('dragover');
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0], type);
    }
}

function handleFileSelect(event, type) {
    const file = event.target.files[0];
    if (file) {
        handleFile(file, type);
    }
}

function handleFile(file, type) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            currentImages[type] = {
                data: e.target.result,
                width: img.width,
                height: img.height,
                name: file.name
            };
            const processButtonId = type === 'simple' ? 'process1' : 
                                    type === 'advanced' ? 'process2' : 'process3';
            document.getElementById(processButtonId).disabled = false;
            
            // Show image preview when file is selected
            showImagePreview(type, {
                data: e.target.result,
                width: img.width,
                height: img.height,
                name: file.name
            });
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function showImagePreview(type, imageData) {
    const progressNum = type === 'simple' ? '1' : type === 'advanced' ? '2' : '3';
    const previewContainer = document.getElementById('preview' + progressNum);
    
    previewContainer.innerHTML = `
        <div class="preview-container">
            <h3>Selected Image Preview</h3>
            <div class="image-container">
                <img src="${imageData.data}" alt="Selected Image">
            </div>
            <div class="image-info">
                📐 ${imageData.width} × ${imageData.height} pixels<br>
                📁 ${imageData.name}
            </div>
            <div class="preview-note">
                ℹ️ Click "${type === 'simple' ? '🚀 Process Image' : type === 'advanced' ? '🔬 Process Image' : '✨ Remove Background'}" to see the processed result
            </div>
        </div>
    `;
}

async function processImage(type) {
    const image = currentImages[type];
    if (!image) return;

    const progressNum = type === 'simple' ? '1' : type === 'advanced' ? '2' : '3';
    const progressElement = document.getElementById('progress' + progressNum);
    const progressBar = progressElement.querySelector('.progress-bar');
    
    progressElement.style.display = 'block';
    progressBar.style.width = '0%';

    try {
        let processedImageData;
        if (type === 'simple') {
            const ratio = parseFloat(document.getElementById('ratio1').value);
            processedImageData = await simpleResize(image, ratio, (progress) => {
                progressBar.style.width = progress + '%';
            });
        } else if (type === 'advanced') {
            const ratio = parseFloat(document.getElementById('ratio2').value);
            processedImageData = await advancedResize(image, ratio, (progress) => {
                progressBar.style.width = progress + '%';
            });
        } else if (type === 'transparent') {
            const threshold = parseInt(document.getElementById('threshold').value);
            processedImageData = await whiteToTransparent(image, threshold, (progress) => {
                progressBar.style.width = progress + '%';
            });
        }

        displayResults(image, processedImageData, type);
    } catch (error) {
        alert('Error processing image: ' + error.message);
    } finally {
        progressElement.style.display = 'none';
    }
}

async function simpleResize(image, ratio, progressCallback) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const img = new Image();
        img.onload = function() {
            const newWidth = Math.floor(img.width / ratio);
            const newHeight = Math.floor(img.height / ratio);
            
            canvas.width = newWidth;
            canvas.height = newHeight;
            
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0, newWidth, newHeight);
            
            progressCallback(100);
            
            resolve({
                dataUrl: canvas.toDataURL('image/png'),
                width: newWidth,
                height: newHeight
            });
        };
        img.src = image.data;
    });
}

async function advancedResize(image, ratio, progressCallback) {
    return new Promise((resolve) => {
        const sourceCanvas = document.createElement('canvas');
        const sourceCtx = sourceCanvas.getContext('2d');
        
        const img = new Image();
        img.onload = function() {
            sourceCanvas.width = img.width;
            sourceCanvas.height = img.height;
            sourceCtx.drawImage(img, 0, 0);
            
            const sourceImageData = sourceCtx.getImageData(0, 0, img.width, img.height);
            const sourcePixels = sourceImageData.data;
            
            const outWidth = Math.floor(img.width / ratio);
            const outHeight = Math.floor(img.height / ratio);
            
            const outputCanvas = document.createElement('canvas');
            const outputCtx = outputCanvas.getContext('2d');
            outputCanvas.width = outWidth;
            outputCanvas.height = outHeight;
            
            const outputImageData = outputCtx.createImageData(outWidth, outHeight);
            const outputPixels = outputImageData.data;
            
            for (let outY = 0; outY < outHeight; outY++) {
                const yStart = Math.floor(outY * ratio);
                const yEnd = Math.min(Math.ceil((outY + 1) * ratio), img.height);
                
                for (let outX = 0; outX < outWidth; outX++) {
                    const xStart = Math.floor(outX * ratio);
                    const xEnd = Math.min(Math.ceil((outX + 1) * ratio), img.width);
                    
                    const colorCount = {};
                    
                    for (let y = yStart; y < yEnd; y++) {
                        for (let x = xStart; x < xEnd; x++) {
                            const index = (y * img.width + x) * 4;
                            const r = sourcePixels[index];
                            const g = sourcePixels[index + 1];
                            const b = sourcePixels[index + 2];
                            const colorKey = `${r},${g},${b}`;
                            
                            colorCount[colorKey] = (colorCount[colorKey] || 0) + 1;
                        }
                    }
                    
                    let maxCount = 0;
                    let mostCommonColor = '0,0,0';
                    
                    for (const [color, count] of Object.entries(colorCount)) {
                        if (count > maxCount) {
                            maxCount = count;
                            mostCommonColor = color;
                        }
                    }
                    
                    const [r, g, b] = mostCommonColor.split(',').map(Number);
                    const outputIndex = (outY * outWidth + outX) * 4;
                    
                    outputPixels[outputIndex] = r;
                    outputPixels[outputIndex + 1] = g;
                    outputPixels[outputIndex + 2] = b;
                    outputPixels[outputIndex + 3] = 255;
                }
                
                progressCallback((outY + 1) / outHeight * 100);
            }
            
            outputCtx.putImageData(outputImageData, 0, 0);
            
            resolve({
                dataUrl: outputCanvas.toDataURL('image/png'),
                width: outWidth,
                height: outHeight
            });
        };
        img.src = image.data;
    });
}

async function whiteToTransparent(image, threshold, progressCallback) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const img = new Image();
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            const pixels = imageData.data;
            
            const totalPixels = pixels.length / 4;
            let processedPixels = 0;
            
            for (let i = 0; i < pixels.length; i += 4) {
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];
                
                // Check if pixel is close to white
                if (r >= threshold && g >= threshold && b >= threshold) {
                    pixels[i + 3] = 0; // Make transparent
                }
                
                processedPixels++;
                if (processedPixels % 1000 === 0) {
                    progressCallback((processedPixels / totalPixels) * 100);
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
            progressCallback(100);
            
            resolve({
                dataUrl: canvas.toDataURL('image/png'),
                width: img.width,
                height: img.height
            });
        };
        img.src = image.data;
    });
}

function displayResults(originalImage, processedImage, type) {
    const progressNum = type === 'simple' ? '1' : type === 'advanced' ? '2' : '3';
    const previewContainer = document.getElementById('preview' + progressNum);
    
    const isTransparent = type === 'transparent';
    const checkerboardClass = isTransparent ? 'checkerboard' : '';
    
    previewContainer.innerHTML = `
        <div class="preview-container">
            <h3>Original Image</h3>
            <div class="image-container ${checkerboardClass}">
                <img src="${originalImage.data}" alt="Original">
            </div>
            <div class="image-info">
                📐 ${originalImage.width} × ${originalImage.height} pixels<br>
                📁 ${originalImage.name}
            </div>
        </div>
        <div class="preview-container">
            <h3>Processed Image</h3>
            <div class="canvas-container ${checkerboardClass}">
                <canvas id="processedCanvas${progressNum}" class="processed-canvas"></canvas>
            </div>
            <div class="canvas-controls">
                <button class="btn btn-secondary" onclick="resetCanvas('${progressNum}')">⏹️ Reset</button>
                <div class="loop-speed">
                    <label>Speed:</label>
                    <input type="range" id="loopSpeed${progressNum}" min="50" max="2000" value="1000" 
                           oninput="updateLoopSpeed('${progressNum}', this.value)">
                    <span id="speedValue${progressNum}">1000ms</span>
                </div>
                <div class="zoom-controls">
                    <button class="btn btn-secondary" onclick="zoomIn('${progressNum}')">🔍+ Zoom In</button>
                    <button class="btn btn-secondary" onclick="zoomOut('${progressNum}')">🔍- Zoom Out</button>
                    <button class="btn btn-secondary" onclick="resetZoom('${progressNum}')">🔍 Fit</button>
                    <div class="zoom-level">
                        <span id="zoomLevel${progressNum}">100%</span>
                    </div>
                </div>
            </div>
            <div class="image-info">
                📐 ${processedImage.width} × ${processedImage.height} pixels<br>
                ${isTransparent ? '✨ Background Removed' : '🔄 Resized'}
            </div>
            <a href="${processedImage.dataUrl}" download="${type}-${originalImage.name.replace(/\.[^/.]+$/, '')}.png" class="download-link">
                💾 Download Image
            </a>
        </div>
    `;
    
    // Initialize canvas with processed image
    initializeProcessedCanvas(progressNum, originalImage, processedImage, isTransparent);
}

// Canvas animation state
let canvasAnimations = {};

function initializeProcessedCanvas(progressNum, originalImage, processedImage, isTransparent) {
    const canvas = document.getElementById(`processedCanvas${progressNum}`);
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = Math.max(processedImage.width, 300);
    canvas.height = Math.max(processedImage.height, 300);
    
    // Load images
    const originalImg = new Image();
    const processedImg = new Image();
    
    originalImg.onload = function() {
        processedImg.onload = function() {
            // Store animation data
            canvasAnimations[progressNum] = {
                canvas: canvas,
                ctx: ctx,
                originalImg: originalImg,
                processedImg: processedImg,
                isLooping: false,
                intervalId: null,
                speed: 1000,
                showingOriginal: false,
                zoom: 1,
                panX: 0,
                panY: 0,
                isDragging: false,
                lastMouseX: 0,
                lastMouseY: 0
            };
            
            // Draw initial processed image
            drawImageWithZoom(canvasAnimations[progressNum]);
            
            // Add mouse event listeners
            setupCanvasMouseEvents(progressNum);
        };
        processedImg.src = processedImage.dataUrl;
    };
    originalImg.src = originalImage.data;
}

function drawImageWithZoom(animation) {
    const { ctx, canvas, zoom, panX, panY, showingOriginal, originalImg, processedImg } = animation;
    const img = showingOriginal ? originalImg : processedImg;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    
    // Calculate scaled dimensions
    const scaledWidth = img.width * zoom;
    const scaledHeight = img.height * zoom;
    
    // Calculate centered position with pan offset
    const x = (canvas.width - scaledWidth) / 2 + panX;
    const y = (canvas.height - scaledHeight) / 2 + panY;
    
    ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
}

function setupCanvasMouseEvents(progressNum) {
    const animation = canvasAnimations[progressNum];
    const canvas = animation.canvas;
    
    // Mouse wheel zoom
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const oldZoom = animation.zoom;
        animation.zoom = Math.max(0.1, Math.min(10, animation.zoom * zoomFactor));
        
        // Adjust pan to zoom towards mouse position
        const zoomChange = animation.zoom / oldZoom;
        animation.panX = mouseX - (mouseX - animation.panX) * zoomChange;
        animation.panY = mouseY - (mouseY - animation.panY) * zoomChange;
        
        drawImageWithZoom(animation);
        updateZoomDisplay(progressNum);
    });
    
    // Mouse drag to pan
    canvas.addEventListener('mousedown', (e) => {
        animation.isDragging = true;
        animation.lastMouseX = e.clientX;
        animation.lastMouseY = e.clientY;
        canvas.style.cursor = 'grabbing';
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (animation.isDragging) {
            const deltaX = e.clientX - animation.lastMouseX;
            const deltaY = e.clientY - animation.lastMouseY;
            
            animation.panX += deltaX;
            animation.panY += deltaY;
            
            animation.lastMouseX = e.clientX;
            animation.lastMouseY = e.clientY;
            
            drawImageWithZoom(animation);
        }
    });
    
    canvas.addEventListener('mouseup', () => {
        animation.isDragging = false;
        canvas.style.cursor = animation.zoom > 1 ? 'grab' : 'default';
    });
    
    canvas.addEventListener('mouseleave', () => {
        animation.isDragging = false;
        canvas.style.cursor = 'default';
    });
    
    // Set initial cursor
    canvas.style.cursor = animation.zoom > 1 ? 'grab' : 'default';
}

function toggleLoop(progressNum) {
    const animation = canvasAnimations[progressNum];
    if (!animation) return;
    
    if (animation.isLooping) {
        // Stop looping
        clearInterval(animation.intervalId);
        animation.isLooping = false;
        // Show processed image
        animation.showingOriginal = false;
        drawImageWithZoom(animation);
    } else {
        // Start looping
        animation.isLooping = true;
        animation.intervalId = setInterval(() => {
            animation.showingOriginal = !animation.showingOriginal;
            drawImageWithZoom(animation);
        }, animation.speed);
    }
}

function resetCanvas(progressNum) {
    const animation = canvasAnimations[progressNum];
    if (!animation) return;
    
    // Stop any animation
    if (animation.isLooping) {
        clearInterval(animation.intervalId);
        animation.isLooping = false;
    }
    
    // Reset to processed image
    animation.showingOriginal = false;
    drawImageWithZoom(animation);
}

function updateLoopSpeed(progressNum, speed) {
    const animation = canvasAnimations[progressNum];
    if (!animation) return;
    
    animation.speed = parseInt(speed);
    document.getElementById(`speedValue${progressNum}`).textContent = speed + 'ms';
    
    // Restart loop with new speed if currently looping
    if (animation.isLooping) {
        clearInterval(animation.intervalId);
        animation.intervalId = setInterval(() => {
            animation.showingOriginal = !animation.showingOriginal;
            drawImageWithZoom(animation);
        }, animation.speed);
    }
}

function zoomIn(progressNum) {
    const animation = canvasAnimations[progressNum];
    if (!animation) return;
    
    animation.zoom = Math.min(10, animation.zoom * 1.2);
    animation.canvas.style.cursor = animation.zoom > 1 ? 'grab' : 'default';
    drawImageWithZoom(animation);
    updateZoomDisplay(progressNum);
}

function zoomOut(progressNum) {
    const animation = canvasAnimations[progressNum];
    if (!animation) return;
    
    animation.zoom = Math.max(0.1, animation.zoom / 1.2);
    animation.canvas.style.cursor = animation.zoom > 1 ? 'grab' : 'default';
    drawImageWithZoom(animation);
    updateZoomDisplay(progressNum);
}

function resetZoom(progressNum) {
    const animation = canvasAnimations[progressNum];
    if (!animation) return;
    
    animation.zoom = 1;
    animation.panX = 0;
    animation.panY = 0;
    animation.canvas.style.cursor = 'default';
    drawImageWithZoom(animation);
    updateZoomDisplay(progressNum);
}

function updateZoomDisplay(progressNum) {
    const animation = canvasAnimations[progressNum];
    if (!animation) return;
    
    const zoomPercent = Math.round(animation.zoom * 100);
    document.getElementById(`zoomLevel${progressNum}`).textContent = `${zoomPercent}%`;
}
