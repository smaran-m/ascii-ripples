// Get the canvas and context
const canvas = document.getElementById('rippleCanvas');
const context = canvas.getContext('2d');

// Resize canvas to fill the window
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

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
    //const charSet = " ░▒▓█";
    const charSet = "-∘◦•○◎◍●◉⬤";
    //const charSet = "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\|()1{}[]?-_+~<>i!lI;:,\"^`'. ".split('').reverse().join('');

    // Max amplitude for normalization
    const maxAmplitude = 2;

    // ASCII cells
    for (let col = 0; col < cols; col++) {
        for (let row = 0; row < rows; row++) {
            const cellX = col * cellWidth + cellWidth / 2;
            const cellY = row * cellHeight + cellHeight / 2;

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
            // Normalize total amplitude to range 0 to len(charSet) - 1
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

// Handle mouse click
function mouseClick(event) {
    const ripple = {
        x: event.clientX,
        y: event.clientY,
        time: performance.now() / 1000, // Time in seconds
        wavelength: 50,    // Adjust for wavelength
        speed: 100,        // Speed of the ripple expansion (pixels per second)
        thickness: 50,     // Thickness of the ripple wavefront
        height: 1,         // Height of the wave (affects amplitude)
    };
    ripples.push(ripple);
}

// Add event listener for mouse clicks
canvas.addEventListener('click', mouseClick);

// Start the animation
requestAnimationFrame(updateCanvas);
