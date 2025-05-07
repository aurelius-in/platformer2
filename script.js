const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game settings
canvas.width = 800;
canvas.height = 400;

const gravity = 0.5;
const jumpForce = 9; // Adjusted for potentially taller sprite
const playerSpeed = 5;
const scrollSpeed = 1;
const PLAYER_SPRITE_SCALE = 0.25; // To make the sprite 1/4 of its natural size

// Image Loading
const images = {
    stand: new Image(),
    walk1: new Image(),
    walk2: new Image(),
    jump: new Image(),
    background: new Image() // Add background image object
};
const imageSources = {
    stand: 'assets/robot_stand.png',
    walk1: 'assets/robot_walk_pos_1.png',
    walk2: 'assets/robot_walk_pos_2.png',
    jump: 'assets/robot_jump.png',
    background: 'assets/platform_bg.png' // Add background image source
};

let imagesToLoad = Object.keys(imageSources).length;
let imagesActuallyLoaded = 0;

function onImageLoad() {
    imagesActuallyLoaded++;
    if (imagesActuallyLoaded === imagesToLoad) {
        // All images loaded, now we can initialize player and start game
        initializePlayerSprite();
        generateInitialPlatforms();
        gameLoop(); // Start the game loop
    }
}

for (const key in imageSources) {
    images[key].onload = onImageLoad;
    images[key].src = imageSources[key];
    images[key].onerror = () => console.error(`Failed to load image: ${imageSources[key]}`);
}


// Player
const player = {
    x: 50,
    y: canvas.height - 70, // Initial y
    // Collision hitbox dimensions (adjust these to fit your robot's core body)
    width: 35, // Example: Adjust based on robot_stand.png's perceived width
    height: 55, // Example: Adjust based on robot_stand.png's perceived height
    dx: 0,
    dy: 0,
    onGround: false,
    jumpCount: 0,
    maxJumps: 2,
    // Animation properties
    facingDirection: 'right', // 'left' or 'right'
    currentImage: null, // Will be set to one of the loaded images
    walkFrame: 0, // To cycle between walk1 and walk2
    walkFrameTimer: 0,
    walkAnimationSpeed: 8, // Change walk frame every X game frames
};
// Background Scrolling
let bgX = 0;
let bgImageWidth = 0; // Will be calculated based on canvas height and aspect ratio
const BG_ASPECT_RATIO = 3 / 1; // Given as 3:1
function initializePlayerSprite() {
    player.currentImage = images.stand; // Default starting image
    // You might want to adjust player.y based on the initial sprite's height
    // For now, we assume player.y and player.height define the collision box bottom correctly
}


// Platform settings (same as before)
const platformHeight = 20;
const minPlatformWidthBlocks = 2;
const maxPlatformWidthBlocks = 12;
const minPlatformGap = 80;
const maxPlatformGap = 150;
const minPlatformY = canvas.height - 150;
const maxPlatformY = canvas.height - 40;
let lastPlatformEndX = 0;

const platforms = [];

function generateInitialPlatforms() {
    platforms.length = 0;
    const initialPlatform = {
        x: 0,
        y: canvas.height - platformHeight - 20,
        width: 300,
        height: platformHeight,
        color: 'saddlebrown'
    };
    platforms.push(initialPlatform);
    lastPlatformEndX = initialPlatform.x + initialPlatform.width;
    while (lastPlatformEndX < canvas.width + 200) {
        generateNewPlatform();
    }
}

function generateNewPlatform() {
    const gap = minPlatformGap + Math.random() * (maxPlatformGap - minPlatformGap);
    const newPlatformX = lastPlatformEndX + gap;
    const platformWidthInBlocks = Math.floor(Math.random() * (maxPlatformWidthBlocks - minPlatformWidthBlocks + 1)) + minPlatformWidthBlocks;
    const newPlatformWidth = platformWidthInBlocks * platformHeight;
    let newPlatformY = minPlatformY + Math.random() * (maxPlatformY - minPlatformY);
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

const keys = { left: false, right: false, up: false };
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
    if (!player.currentImage || !player.currentImage.complete || player.currentImage.naturalHeight === 0) {
        // Image not loaded or invalid, draw fallback rectangle
        ctx.fillStyle = 'purple'; // Fallback color
        ctx.fillRect(player.x, player.y, player.width, player.height);
        return;
    }

    ctx.save(); // Save the current canvas state

    const img = player.currentImage;
    // Calculate the new scaled dimensions for drawing
    const scaledSpriteWidth = img.naturalWidth * PLAYER_SPRITE_SCALE;
    const scaledSpriteHeight = img.naturalHeight * PLAYER_SPRITE_SCALE;

    // Calculate draw position to align the SCALED sprite's bottom 
    // with the collision box bottom, and the SCALED sprite's horizontal center 
    // with the collision box's horizontal center.
    // player.x, player.y is the top-left of the collision box.
    const drawX = player.x + (player.width / 2) - (scaledSpriteWidth / 2);
    const drawY = player.y + player.height - scaledSpriteHeight;

    if (player.facingDirection === 'right') {
        // To flip around the center of the SCALED sprite:
        // 1. Translate to the SCALED sprite's center point
        // 2. Scale
        // 3. Draw the image offset by half its SCALED width/height
        ctx.translate(drawX + scaledSpriteWidth / 2, drawY + scaledSpriteHeight / 2);
        ctx.scale(-1, 1); // Flip horizontally
        ctx.drawImage(img, -scaledSpriteWidth / 2, -scaledSpriteHeight / 2, scaledSpriteWidth, scaledSpriteHeight);
    } else { // Facing left (images are default left)
        ctx.drawImage(img, drawX, drawY, scaledSpriteWidth, scaledSpriteHeight);
    }

    ctx.restore(); // Restore canvas state

    // Optional: Draw collision box for debugging
    // ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
    // ctx.strokeRect(player.x, player.y, player.width, player.height);
}


function drawPlatforms() {
    platforms.forEach(platform => {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });
}

function updateWorld() {
    platforms.forEach(platform => {
        platform.x -= scrollSpeed;
    });
    for (let i = platforms.length - 1; i >= 0; i--) {
        if (platforms[i].x + platforms[i].width < 0) {
            platforms.splice(i, 1);
        }
    }
    if (platforms.length > 0) {
        lastPlatformEndX = Math.max(...platforms.map(p => p.x + p.width));
    } else {
        lastPlatformEndX = 0;
    }
    if (lastPlatformEndX < canvas.width + 200) {
        generateNewPlatform();
    }
}

function updatePlayer() {
    // Determine facing direction
    if (keys.left) {
        player.dx = -playerSpeed;
        player.facingDirection = 'left';
    } else if (keys.right) {
        player.dx = playerSpeed;
        player.facingDirection = 'right';
    } else {
        player.dx = 0;
    }
    player.x += player.dx;

    player.dy += gravity;
    player.y += player.dy;
    player.onGround = false;

    platforms.forEach(platform => {
        if (
            player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y < platform.y + platform.height &&
            player.y + player.height > platform.y
        ) {
            if (player.dy > 0 && (player.y + player.height - player.dy) <= platform.y) {
                player.y = platform.y - player.height;
                player.dy = 0;
                player.onGround = true;
                player.jumpCount = 0;
            }
            // Basic side collision (can be improved)
            else if (player.dx > 0 && player.x + player.width - player.dx < platform.x) {
                player.x = platform.x - player.width;
                 if (!player.onGround) player.dx = 0; // Stop horizontal movement if hitting wall mid-air
            } else if (player.dx < 0 && player.x - player.dx > platform.x + platform.width) {
                player.x = platform.x + platform.width;
                 if (!player.onGround) player.dx = 0; // Stop horizontal movement
            }
        }
    });

// Jumping
    if (keys.up && (player.onGround || player.jumpCount < player.maxJumps)) {
        if (player.jumpCount === 0 && !player.onGround) { /* Allow first jump if falling */ }
        
        player.dy = -jumpForce; // Apply vertical jump force
        player.onGround = false;
        player.jumpCount++;
        keys.up = false; // Consume the up key press to prevent continuous jumping if held

        // Add horizontal momentum based on facing direction if player is currently still horizontally
        // This gives a little push to help clear gaps when jumping from a standstill.
        if (player.dx === 0) { // Only apply if not already moving due to left/right keys
            const horizontalJumpNudge = playerSpeed * 0.55; // Adjust this multiplier (0.0 to 1.0+)
            if (player.facingDirection === 'right') {
                player.dx = horizontalJumpNudge;
            } else { // Facing left
                player.dx = -horizontalJumpNudge;
            }
        }
        // If player.dx is already non-zero (because player is holding left/right),
        // that existing horizontal speed will naturally carry them during the jump.
    }

    // Update Animation
    if (!player.onGround) {
        player.currentImage = images.jump;
    } else {
        if (player.dx !== 0) { // Walking
            player.walkFrameTimer++;
            if (player.walkFrameTimer >= player.walkAnimationSpeed) {
                player.walkFrameTimer = 0;
                player.walkFrame = (player.walkFrame + 1) % 2; // Cycle 0 and 1
            }
            player.currentImage = player.walkFrame === 0 ? images.walk1 : images.walk2;
        } else { // Standing
            player.currentImage = images.stand;
            player.walkFrameTimer = 0; // Reset walk timer when standing
        }
    }


    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    if (player.y > canvas.height) {
        resetGame();
    }
}

function resetGame() {
    player.x = 50;
    player.y = canvas.height - (player.height + 50); // Adjust y to be on platform
    player.dx = 0;
    player.dy = 0;
    player.onGround = false;
    player.jumpCount = 0;
    player.facingDirection = 'right';
    player.currentImage = images.stand;
    generateInitialPlatforms();
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function gameLoop() { // This will be called once images are loaded
    clearCanvas();
    updateWorld();
    updatePlayer();
    drawPlatforms();
    drawPlayer();
    requestAnimationFrame(gameLoop);
}

// Game doesn't start until images are loaded (see onImageLoad function)
// generateInitialPlatforms(); // Moved to onImageLoad
// gameLoop(); // Moved to onImageLoad
