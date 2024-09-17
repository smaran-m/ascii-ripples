// Get the canvas and context
const canvas = document.getElementById('rippleCanvas');
const context = canvas.getContext('2d');

// Fish variables
const NUM_SEGMENTS = 10;
const SEGMENT_LENGTH = 15; // Fixed distance between segments
let fish_positions = [];
let fish_sizes = [];
const fish_char_set = " ░▒▓█";

// Mode variables
let followCursor = true;
let targetPoint = null; // Stores the target point when not following the cursor
let lastTargetTime = 0; // Timestamp of the last target point generation
const TARGET_INTERVAL = 1; // Time interval (in seconds) between target generations

// Mouse position
let mousePosition = { x: canvas.width / 2, y: canvas.height / 2 };

// Resize canvas to fill the window
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    initializeFish();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Initialize fish positions and sizes
function initializeFish() {
    fish_positions = [];
    for (let i = 0; i < NUM_SEGMENTS; i++) {
        fish_positions.push({ x: canvas.width / 2, y: canvas.height / 2 });
    }

    // Sizes increase to midpoint and then decrease
    fish_sizes = [];
    const half_length = (NUM_SEGMENTS - 1) / 2;
    for (let i = 0; i < NUM_SEGMENTS; i++) {
        let size;
        if (i <= half_length) {
            size = Math.floor(i / half_length * (fish_char_set.length - 1));
        } else {
            size = Math.floor((NUM_SEGMENTS - 1 - i) / half_length * (fish_char_set.length - 1));
        }
        fish_sizes.push(size);
    }
}

// List to keep track of active ripples
let ripples = [];

// Animation loop
function updateCanvas() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    const currentTime = performance.now() / 1000; // Convert to seconds
    const cellWidth = 10;
    const cellHeight = 20;
    const cols = Math.floor(canvas.width / cellWidth);
    const rows = Math.floor(canvas.height / cellHeight);

    // Customizable character set
    const charSet = "-∘◦•○◎◍●◉⬤";

    // Max amplitude for normalization
    const maxAmplitude = 2;

    // Update fish positions
    updateFishPositions();

    // ASCII cells
    for (let col = 0; col < cols; col++) {
        for (let row = 0; row < rows; row++) {
            const cellX = col * cellWidth + cellWidth / 2;
            const cellY = row * cellHeight + cellHeight / 2;

            // Check if this cell is occupied by the fish
            const fishChar = getFishCharAtPosition(cellX, cellY);
            if (fishChar) {
                // Draw fish character
                context.fillStyle = "#6699CC";
                context.font = '12px Courier';
                context.fillText(fishChar, cellX, cellY);
                continue; // Skip drawing ripples at this cell
            }

            // Draw the target point if it exists
            //if (targetPoint && Math.abs(cellX - targetPoint.x) < cellWidth / 2 && Math.abs(cellY - targetPoint.y) < cellHeight / 2) {
            //    context.fillStyle = "red";
            //    context.font = '12px Courier';
            //    context.fillText('◓', cellX, cellY);
            //    continue; // Skip drawing ripples at this cell
            //}

            // Draw the red ◓ at the cursor position in follow cursor mode
            if (followCursor) {
                // Align mouse position to the grid
                const cursorCol = Math.floor(mousePosition.x / cellWidth);
                const cursorRow = Math.floor(mousePosition.y / cellHeight);
                const cursorX = cursorCol * cellWidth + cellWidth / 2;
                const cursorY = cursorRow * cellHeight + cellHeight / 2;
                if (Math.abs(cellX - cursorX) < cellWidth / 2 && Math.abs(cellY - cursorY) < cellHeight / 2) {
                    context.fillStyle = "red";
                    context.font = '12px Courier';
                    context.fillText('◓', cellX, cellY);
                    continue; // Skip drawing ripples at this cell
                }
            }

            let totalAmplitude = 0;

            for (const ripple of ripples) {
                const dx = cellX - ripple.x;
                const dy = cellY - ripple.y;
                const distance = Math.hypot(dx, dy);
                const elapsed = currentTime - ripple.time;

                // Parameters
                const speed = ripple.speed;           // Speed of the ripple expansion
                const height = ripple.height;         // Height of the wave (affects amplitude)
                const wavelength = ripple.wavelength; // Wavelength
                const thickness = ripple.thickness;   // Thickness of the ripple wavefront

                // Calculate the phase of the wave at this point
                const phase = (distance - speed * elapsed) * (2 * Math.PI / wavelength);

                // Calculate the amplitude using cosine function
                let amplitude = height * Math.cos(phase) * (1 / (1 + elapsed));

                // Consider the ripple if the point is within its active area
                if (Math.abs(distance - speed * elapsed) < thickness) {
                    totalAmplitude += amplitude;
                }
            }

            // If total amplitude is negligible, skip drawing
            if (Math.abs(totalAmplitude) < 0.01) {
                continue;
            }

            // Map total amplitude to character set index
            // Normalize total amplitude to range 0 to charSet.length - 1
            // Use tanh to handle cases where totalAmplitude exceeds expected values
            let normalizedAmplitude = Math.tanh(totalAmplitude);
            normalizedAmplitude = (normalizedAmplitude + 1) / 2; // Now between 0 and 1
            let index = Math.floor(normalizedAmplitude * (charSet.length - 1));
            index = Math.max(0, Math.min(charSet.length - 1, index)); // Clamp index to valid range
            const char = charSet.charAt(index);

            // Draw the character
            const color = amplitudeToColor(totalAmplitude);
            context.fillStyle = color;
            context.font = '12px Courier';
            context.fillText(char, cellX, cellY);
        }
    }

    // Remove ripples that have expanded beyond the window
    ripples = ripples.filter(ripple => {
        return (currentTime - ripple.time) * ripple.speed < Math.max(canvas.width, canvas.height) * 1.5;
    });

    // Request the next frame
    requestAnimationFrame(updateCanvas);
}

// Convert amplitude to color
function amplitudeToColor(amplitude) {
    // Normalize amplitude
    // Acceptable value between 127 and 255
    let colorValue = Math.floor((amplitude + 1) / 2 * 255);
    colorValue = Math.max(127, Math.min(255, colorValue));

    // Style the color, currently greyscale
    return `rgb(${colorValue}, ${colorValue}, 220)`;
}

function updateFishPositions() {
    const currentTime = performance.now() / 1000; // Convert to seconds

    let targetX, targetY;

    if (followCursor) {
        const mouseX = mousePosition.x;
        const mouseY = mousePosition.y;
        targetX = mouseX;
        targetY = mouseY;
    } else {
        // Generate a new target point every TARGET_INTERVAL seconds
        if (targetPoint === null || (currentTime - lastTargetTime) >= TARGET_INTERVAL) {
            generateRandomTarget();
            lastTargetTime = currentTime;
        }
        targetX = targetPoint.x;
        targetY = targetPoint.y;
    }

    // Update the head position
    let headX = fish_positions[0].x;
    let headY = fish_positions[0].y;
    let dx = targetX - headX;
    let dy = targetY - headY;
    let distance = Math.hypot(dx, dy);

    if (distance > 0) {
        // Move the head towards the target position
        let moveX = dx / distance * Math.min(distance, SEGMENT_LENGTH);
        let moveY = dy / distance * Math.min(distance, SEGMENT_LENGTH);
        fish_positions[0] = { x: headX + moveX, y: headY + moveY };
    }

    // Update positions of the rest of the segments
    for (let i = 1; i < NUM_SEGMENTS; i++) {
        let prevX = fish_positions[i - 1].x;
        let prevY = fish_positions[i - 1].y;
        let currX = fish_positions[i].x;
        let currY = fish_positions[i].y;
        let dx = prevX - currX;
        let dy = prevY - currY;
        let distance = Math.hypot(dx, dy);

        if (distance > 0) {
            // Calculate the amount to move
            let moveDistance = distance - SEGMENT_LENGTH;
            let moveX = dx / distance * moveDistance;
            let moveY = dy / distance * moveDistance;
            // Update position to maintain the fixed segment length
            fish_positions[i] = { x: currX + moveX, y: currY + moveY };
        }
    }
}

function getFishCharAtPosition(x, y) {
    for (let i = 0; i < fish_positions.length; i++) {
        const pos = fish_positions[i];
        const fx = pos.x;
        const fy = pos.y;
        const dx = x - fx;
        const dy = y - fy;
        const distance = Math.hypot(dx, dy);
        if (distance < 10) { // Adjust as needed
            const sizeIndex = fish_sizes[i];
            return fish_char_set.charAt(sizeIndex);
        }
    }
    return null;
}

function generateRandomTarget() {
    const cellWidth = 10;
    const cellHeight = 20;
    const cols = Math.floor(canvas.width / cellWidth);
    const rows = Math.floor(canvas.height / cellHeight);

    // Randomly select a cell
    const col = Math.floor(Math.random() * cols);
    const row = Math.floor(Math.random() * rows);

    // Calculate the center position of the cell
    const cellX = col * cellWidth + cellWidth / 2;
    const cellY = row * cellHeight + cellHeight / 2;

    targetPoint = { x: cellX, y: cellY };
}

// Handle mouse click
function mouseClick(event) {
    // Toggle between follow cursor mode and random target mode
    followCursor = !followCursor;
    const currentTime = performance.now() / 1000;

    if (!followCursor) {
        // Switched to random target mode
        targetPoint = null; // Will be generated in updateFishPositions()
        lastTargetTime = currentTime - TARGET_INTERVAL; // Force immediate target generation
    } else {
        // Switched back to follow cursor mode
        targetPoint = null;
    }

    // Add a ripple at the click position
    const ripple = {
        x: event.offsetX,
        y: event.offsetY,
        time: currentTime,
        wavelength: 50,    // Adjust for wavelength
        speed: 100,        // Speed of the ripple expansion (pixels per second)
        thickness: 50,     // Thickness of the ripple wavefront
        height: 1,         // Height of the wave (affects amplitude)
    };
    ripples.push(ripple);
}

// Handle mouse move
canvas.addEventListener('mousemove', function(event) {
    mousePosition.x = event.offsetX;
    mousePosition.y = event.offsetY;
});

// Add event listener for mouse clicks
canvas.addEventListener('click', mouseClick);

// Start the animation
requestAnimationFrame(updateCanvas);
