const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game settings
canvas.width = 800;
canvas.height = 400;

const gravity = 0.5;
const jumpForce = 12;
const playerSpeed = 5;
const scrollSpeed = 1; // Speed at which the world scrolls left

// Player
const player = {
    x: 50,
    y: canvas.height - 70, // Start a bit higher to land on the first platform
    width: 30,
    height: 50,
    color: 'red',
    dx: 0,
    dy: 0,
    onGround: false,
    jumpCount: 0,
    maxJumps: 2
};

// Platform settings
const platformHeight = 20; // This is our "block" height unit
const minPlatformWidthBlocks = 2; // Min width in "block" units
const maxPlatformWidthBlocks = 12; // Max width in "block" units
const minPlatformGap = 80; // Min horizontal gap between platforms
const maxPlatformGap = 150; // Max horizontal gap between platforms
const minPlatformY = canvas.height - 150; // Minimum Y position for a new platform top
const maxPlatformY = canvas.height - 40;  // Maximum Y position for a new platform top
let lastPlatformEndX = 0; // Tracks the x-coordinate of the end of the last generated platform

// Platforms array - Start with one initial platform
const platforms = [];

function generateInitialPlatforms() {
    platforms.length = 0; // Clear existing platforms if any (for resets)
    const initialPlatform = {
        x: 0,
        y: canvas.height - platformHeight - 20, // A bit above bottom
        width: 300, // Initial platform width
        height: platformHeight,
        color: 'saddlebrown'
    };
    platforms.push(initialPlatform);
    lastPlatformEndX = initialPlatform.x + initialPlatform.width;

    // Generate a few more platforms to fill the screen initially
    while (lastPlatformEndX < canvas.width + 200) { // Generate a bit beyond screen width
        generateNewPlatform();
    }
}

function generateNewPlatform() {
    const gap = minPlatformGap + Math.random() * (maxPlatformGap - minPlatformGap);
    const newPlatformX = lastPlatformEndX + gap;

    const platformWidthInBlocks = Math.floor(Math.random() * (maxPlatformWidthBlocks - minPlatformWidthBlocks + 1)) + minPlatformWidthBlocks;
    const newPlatformWidth = platformWidthInBlocks * platformHeight; // Width based on "blocks"

    // Ensure Y is not too different from the last platform, making it jumpable
    // For simplicity, let's keep Y within a broader range for now
    let newPlatformY = minPlatformY + Math.random() * (maxPlatformY - minPlatformY);
    // Ensure it's an increment of platformHeight if you want perfect block stacking alignment,
    // but for varied heights, this is fine. Let's snap to nearest multiple of platformHeight for aesthetics.
    newPlatformY = Math.round(newPlatformY / platformHeight) * platformHeight;


    platforms.push({
        x: newPlatformX,
        y: newPlatformY,
        width: newPlatformWidth,
        height: platformHeight,
        color: 'saddlebrown'
    });
    lastPlatformEndX = newPlatformX + newPlatformWidth;
}

// Input handling (same as before)
const keys = {
    left: false,
    right: false,
    up: false
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'ArrowRight') keys.right = true;
    if (e.key === 'ArrowUp') keys.up = true;
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'ArrowRight') keys.right = false;
    if (e.key === 'ArrowUp') keys.up = false;
});

function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

function drawPlatforms() {
    platforms.forEach(platform => {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });
}

function updateWorld() {
    // Scroll platforms
    platforms.forEach(platform => {
        platform.x -= scrollSpeed;
    });

    // Player is pushed by scroll if against left edge
    // Effectively, the player's movement is relative to the screen,
    // and the world scrolls underneath.

    // Remove off-screen platforms (from the left)
    for (let i = platforms.length - 1; i >= 0; i--) {
        if (platforms[i].x + platforms[i].width < 0) {
            platforms.splice(i, 1);
        }
    }

    // Update lastPlatformEndX based on the current rightmost platform
    // This is important if platforms are removed or if initial generation logic changes
    if (platforms.length > 0) {
        lastPlatformEndX = Math.max(...platforms.map(p => p.x + p.width));
    } else {
        // If all platforms are gone (e.g., after a bug or specific scenario),
        // reset to generate from near the left edge.
        lastPlatformEndX = 0; // Or a value that triggers immediate generation
    }


    // Generate new platforms if needed
    // The condition ensures we always have platforms generated ahead of the player
    if (lastPlatformEndX < canvas.width + 200) { // Check if rightmost edge is within generation zone
        generateNewPlatform();
    }
}


function updatePlayer() {
    // Horizontal movement
    if (keys.left) {
        player.dx = -playerSpeed;
    } else if (keys.right) {
        player.dx = playerSpeed;
    } else {
        player.dx = 0;
    }
    player.x += player.dx;

    // Apply gravity
    player.dy += gravity;
    player.y += player.dy;
    player.onGround = false;

    // Collision detection with platforms
    platforms.forEach(platform => {
        if (
            player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y < platform.y + platform.height &&
            player.y + player.height > platform.y
        ) {
            // Check for landing on top: player falling and previous bottom was above platform top
            if (player.dy > 0 && (player.y + player.height - player.dy) <= platform.y) {
                player.y = platform.y - player.height;
                player.dy = 0;
                player.onGround = true;
                player.jumpCount = 0;
            }
            // Basic side collision (stop player) - could be more refined
            else if (player.dx > 0 && player.x + player.width - player.dx < platform.x) { // Hit from left
                player.x = platform.x - player.width;
            } else if (player.dx < 0 && player.x - player.dx > platform.x + platform.width) { // Hit from right
                player.x = platform.x + platform.width;
            }
            // TODO: Add collision from bottom if player hits platform from underneath
        }
    });

    // Jumping
    if (keys.up && (player.onGround || player.jumpCount < player.maxJumps)) {
        if (player.jumpCount === 0 && !player.onGround) { /* Allow first jump if falling */ }
        player.dy = -jumpForce;
        player.onGround = false;
        player.jumpCount++;
        keys.up = false;
    }

    // Keep player within canvas bounds (horizontal)
    if (player.x < 0) {
        player.x = 0; // Player is pushed by the left edge of the screen
    }
    if (player.x + player.width > canvas.width) {
        player.x = canvas.width - player.width;
    }

    // If player falls off the bottom (Game Over)
    if (player.y > canvas.height) { // Player fell below the canvas
        resetGame();
    }
}

function resetGame() {
    // Reset player state
    player.x = 50;
    player.y = canvas.height - 70;
    player.dx = 0;
    player.dy = 0;
    player.onGround = false;
    player.jumpCount = 0;

    // Regenerate initial platforms
    generateInitialPlatforms();
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function gameLoop() {
    clearCanvas();

    updateWorld(); // Update platform positions, generate new ones, remove old ones
    updatePlayer(); // Update player based on input and physics

    drawPlatforms();
    drawPlayer();

    requestAnimationFrame(gameLoop);
}

// Initialize and Start the game
generateInitialPlatforms();
gameLoop();
