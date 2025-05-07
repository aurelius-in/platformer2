const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game settings
canvas.width = 800;
canvas.height = 400;

const gravity = 0.5;
const jumpForce = 11;
const playerSpeed = 5;
// const scrollSpeed = 1; // REMOVED - Replaced by camera movement
const PLAYER_SPRITE_SCALE = 0.25;

console.log("Script started. Canvas initialized.");

// Image Loading
const images = {
    stand: new Image(),
    walk1: new Image(),
    walk2: new Image(),
    jump: new Image(),
    // background: new Image(), // We'll replace this single background
    bg1: new Image(), // New background images
    bg2: new Image(),
    bg3: new Image(),
    bg4: new Image(),
    bg5: new Image(),
    bg6: new Image(),
    bg7: new Image(),
    bg8: new Image(),
    bricks1: new Image(),
    bricks2: new Image(),
    bricks3: new Image(),
    bricks4: new Image(),
    bricks5: new Image()
};
const imageSources = {
    stand: 'assets/robot_stand.png',
    walk1: 'assets/robot_walk_pos_1.png',
    walk2: 'assets/robot_walk_pos_2.png',
    jump: 'assets/robot_jump.png',
    // background: 'assets/platform_bg.png', // Remove old single background
    bg1: 'assets/platform_bg1.png', // Add new background image sources
    bg2: 'assets/platform_bg2.png',
    bg3: 'assets/platform_bg3.png',
    bg4: 'assets/platform_bg4.png',
    bg5: 'assets/platform_bg5.png',
    bg6: 'assets/platform_bg6.png',
    bg7: 'assets/platform_bg7.png',
    bg8: 'assets/platform_bg8.png',
    bricks1: 'assets/bricks1.png',
    bricks2: 'assets/bricks2.png',
    bricks3: 'assets/bricks3.png',
    bricks4: 'assets/bricks4.png',
    bricks5: 'assets/bricks5.png'
};

// The rest of your image loading logic (imagesToLoad, imagesActuallyLoaded, onImageLoad, for loop)
// will automatically pick these up.

let imagesToLoad = Object.keys(imageSources).length;
let imagesActuallyLoaded = 0;
console.log("Total images to load:", imagesToLoad);

// Camera variables
let cameraX = 0;
let cameraY = 0; // We'll keep cameraY fixed at 0 for now (no vertical scrolling)

// Background Scrolling Variables (relative to world)
let bgImageWidth = 0;
const BG_ASPECT_RATIO = 3 / 1;

function onImageLoad(imageKey) {
    imagesActuallyLoaded++;
    console.log(`Image loaded (${imageKey}). ${imagesActuallyLoaded}/${imagesToLoad} images loaded so far.`);
    // console.log(`  Details for ${imageKey}: complete=${images[imageKey].complete}, naturalWidth=${images[imageKey].naturalWidth}, naturalHeight=${images[imageKey].naturalHeight}`);

    if (imagesActuallyLoaded === imagesToLoad) {
        console.log("All images reported as loaded/processed.");
        if (images.background.complete && images.background.naturalHeight > 0) {
            bgImageWidth = canvas.height * BG_ASPECT_RATIO;
            console.log("SUCCESS: Background image dimensions appear valid. Calculated bgImageWidth:", bgImageWidth);
        } else {
            console.error("ERROR: Background image not complete or naturalHeight is 0 when trying to calculate bgImageWidth.");
        }
        initializePlayerSprite();
        generateInitialPlatforms(); // Generate platforms based on initial cameraX (0)
        console.log("Starting gameLoop...");
        gameLoop();
    }
}

for (const key in imageSources) {
    // console.log("Setting up image:", key, "with source:", imageSources[key]); // Can be noisy
    images[key].onload = () => onImageLoad(key);
    images[key].onerror = function() {
        console.error(`ERROR: Failed to load image with key: ${key}, source: ${this.src}`);
        if (key === 'background') console.error("CRITICAL: BACKGROUND IMAGE FAILED TO LOAD.");
        onImageLoad(key);
    };
    images[key].src = imageSources[key];
}

// Player (x, y are now world coordinates)
const player = {
    x: 50, // World X
    y: canvas.height - 70, // World Y
    width: 35,
    height: 55,
    dx: 0,
    dy: 0,
    onGround: false,
    jumpCount: 0,
    maxJumps: 2,
    facingDirection: 'right',
    currentImage: null,
    walkFrame: 0,
    walkFrameTimer: 0,
    walkAnimationSpeed: 8,
};

function initializePlayerSprite() {
    console.log("Initializing player sprite.");
    player.currentImage = images.stand;
}

// Platform settings
const platformHeight = 20; // This will also be the size of one brick sprite
const minPlatformWidthBlocks = 3; // Min number of bricks for a platform
const maxPlatformWidthBlocks = 10; // Max number of bricks
const minPlatformGap = 80;
const maxPlatformGap = 150;
const minPlatformY = canvas.height - 150; // World Y
const maxPlatformY = canvas.height - 40;  // World Y
let lastPlatformEndX = 0; // World X of the end of the last generated platform
const platforms = [];

function generateInitialPlatforms() {
    platforms.length = 0;
    // Create a wider initial platform for the player to start on
    const initialPlatformWidthInBlocks = 15;
    const initialPlatform = {
        x: 0, // World X
        y: canvas.height - platformHeight - 20, // World Y
        width: initialPlatformWidthInBlocks * platformHeight,
        height: platformHeight,
        numBricks: initialPlatformWidthInBlocks,
        brickPattern: []
    };
    for (let i = 0; i < initialPlatformWidthInBlocks; i++) {
        const brickIndex = Math.floor(Math.random() * 5) + 1;
        initialPlatform.brickPattern.push('bricks' + brickIndex);
    }
    platforms.push(initialPlatform);
    lastPlatformEndX = initialPlatform.x + initialPlatform.width;

    // Generate more platforms to fill the initial view based on camera
    while (lastPlatformEndX < cameraX + canvas.width + 200) {
        generateNewPlatform();
    }
}

function generateNewPlatform() {
    const gap = minPlatformGap + Math.random() * (maxPlatformGap - minPlatformGap);
    const newPlatformX = lastPlatformEndX + gap; // World X

    const platformWidthInBlocks = Math.floor(Math.random() * (maxPlatformWidthBlocks - minPlatformWidthBlocks + 1)) + minPlatformWidthBlocks;
    const newPlatformWidth = platformWidthInBlocks * platformHeight;

    let newPlatformY = minPlatformY + Math.random() * (maxPlatformY - minPlatformY); // World Y
    newPlatformY = Math.round(newPlatformY / platformHeight) * platformHeight;

    const newPlatform = {
        x: newPlatformX,
        y: newPlatformY,
        width: newPlatformWidth,
        height: platformHeight,
        numBricks: platformWidthInBlocks,
        brickPattern: []
    };
    for (let i = 0; i < platformWidthInBlocks; i++) {
        const brickIndex = Math.floor(Math.random() * 5) + 1; // 1 to 5
        newPlatform.brickPattern.push('bricks' + brickIndex);
    }
    platforms.push(newPlatform);
    lastPlatformEndX = newPlatformX + newPlatform.width;
}

const keys = { left: false, right: false, up: false };
document.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') keys.left = true; if (e.key === 'ArrowRight') keys.right = true; if (e.key === 'ArrowUp') keys.up = true; });
document.addEventListener('keyup', (e) => { if (e.key === 'ArrowLeft') keys.left = false; if (e.key === 'ArrowRight') keys.right = false; if (e.key === 'ArrowUp') keys.up = false; });

function drawBackground() {
    if (!images.background.complete || images.background.naturalHeight === 0 || bgImageWidth <= 0) {
        return;
    }
    // Calculate the starting X position for drawing the background based on cameraX
    // This creates a seamless loop.
    const parallaxFactor = 1; // Set to < 1 for slower background scroll (parallax)
    let effectiveCameraX = cameraX * parallaxFactor;
    let startX = -(effectiveCameraX % bgImageWidth);
    if (startX > 0) { // Ensure startX is 0 or negative for proper looping from left
        startX -= bgImageWidth;
    }

    ctx.drawImage(images.background, startX, 0 - cameraY, bgImageWidth, canvas.height);
    ctx.drawImage(images.background, startX + bgImageWidth, 0 - cameraY, bgImageWidth, canvas.height);
    // Draw a third if necessary to cover screen during fast camera moves or very wide bgImageWidth
    if (startX + bgImageWidth * 2 < canvas.width + effectiveCameraX ) { // Heuristic check
         ctx.drawImage(images.background, startX + bgImageWidth * 2, 0 - cameraY, bgImageWidth, canvas.height);
    }
}

function drawPlayer() {
    if (!player.currentImage || !player.currentImage.complete || player.currentImage.naturalHeight === 0) {
        ctx.fillStyle = 'purple';
        ctx.fillRect(player.x - cameraX, player.y - cameraY, player.width, player.height);
        return;
    }
    ctx.save();
    const img = player.currentImage;
    const scaledSpriteWidth = img.naturalWidth * PLAYER_SPRITE_SCALE;
    const scaledSpriteHeight = img.naturalHeight * PLAYER_SPRITE_SCALE;

    // Player's collision box top-left on screen
    const playerScreenX = player.x - cameraX;
    const playerScreenY = player.y - cameraY;

    // Position the scaled sprite relative to the collision box screen coordinates
    const drawX = playerScreenX + (player.width / 2) - (scaledSpriteWidth / 2);
    const drawY = playerScreenY + player.height - scaledSpriteHeight;

    if (player.facingDirection === 'right') {
        ctx.translate(drawX + scaledSpriteWidth / 2, drawY + scaledSpriteHeight / 2);
        ctx.scale(-1, 1);
        ctx.drawImage(img, -scaledSpriteWidth / 2, -scaledSpriteHeight / 2, scaledSpriteWidth, scaledSpriteHeight);
    } else {
        ctx.drawImage(img, drawX, drawY, scaledSpriteWidth, scaledSpriteHeight);
    }
    ctx.restore();

    // Optional: Draw collision box for debugging (uses screen coordinates)
    // ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
    // ctx.strokeRect(playerScreenX, playerScreenY, player.width, player.height);
}

function drawPlatforms() {
    const brickSize = platformHeight; // Bricks are scaled to platformHeight

    platforms.forEach(platform => {
        // Calculate screen Y for the top of the platform
        const platformScreenY = platform.y - cameraY;

        // Cull platforms not visible vertically (basic)
        if (platformScreenY + platform.height < 0 || platformScreenY > canvas.height) {
            return;
        }

        for (let i = 0; i < platform.numBricks; i++) {
            // Calculate screen X for each brick
            const brickWorldX = platform.x + i * brickSize;
            const brickScreenX = brickWorldX - cameraX;

            // Cull individual bricks not visible horizontally
            if (brickScreenX + brickSize < 0 || brickScreenX > canvas.width) {
                continue;
            }

            const brickImageKey = platform.brickPattern[i];
            const brickImage = images[brickImageKey];

            if (brickImage && brickImage.complete && brickImage.naturalHeight > 0) {
                ctx.drawImage(brickImage, brickScreenX, platformScreenY, brickSize, brickSize);
            } else {
                // Fallback for missing/unloaded brick
                ctx.fillStyle = '#777'; // Darker grey fallback
                ctx.fillRect(brickScreenX, platformScreenY, brickSize, brickSize);
            }
        }
    });
}


function updateCamera() {
    // Camera tries to keep player in the middle-left third of the screen.
    const targetCameraX = player.x - canvas.width / 3;

    // Smooth camera movement (optional, can just do cameraX = targetCameraX for instant)
    // cameraX += (targetCameraX - cameraX) * 0.1; // Smoothing factor

    cameraX = targetCameraX; // For now, instant camera

    // Prevent camera from scrolling too far left (e.g., beyond world origin 0)
    if (cameraX < 0) {
        cameraX = 0;
    }
    // No right limit for an endless world for now.
    // cameraY remains 0 for this implementation
}


function updateWorld() { // This function now mostly handles platform generation/removal
    // Remove off-screen platforms (relative to camera)
    for (let i = platforms.length - 1; i >= 0; i--) {
        if (platforms[i].x + platforms[i].width < cameraX - 50) { // -50 buffer
            platforms.splice(i, 1);
        }
    }

    // Update lastPlatformEndX based on current platforms (if any)
    if (platforms.length > 0) {
        // Find the maximum end X of existing platforms, or default to camera's right edge
        let maxEndX = 0;
        for(let i=0; i<platforms.length; i++){
            if(platforms[i].x + platforms[i].width > maxEndX){
                maxEndX = platforms[i].x + platforms[i].width;
            }
        }
        lastPlatformEndX = Math.max(lastPlatformEndX, maxEndX); // Ensure it doesn't go backwards
    } else { // No platforms exist, player might be falling, generate near player
        lastPlatformEndX = player.x; // Or cameraX + some offset
    }


    // Generate new platforms if the rightmost generated platform is getting close to the camera's right edge
    if (lastPlatformEndX < cameraX + canvas.width + 200) { // 200px buffer beyond screen right
        generateNewPlatform();
    }
}

function updatePlayer() {
    // Horizontal movement
    if (keys.left) {
        player.dx = -playerSpeed;
        player.facingDirection = 'left';
    } else if (keys.right) {
        player.dx = playerSpeed;
        player.facingDirection = 'right';
    } else {
        player.dx = 0;
    }
    player.x += player.dx; // Update player's world X

    // Prevent player from moving beyond camera's left edge if camera is at 0
    if (cameraX <= 0 && player.x < 0) {
        player.x = 0;
    }
    // More generally, if player.x - cameraX < 0, means player is at screen left edge
    // If player.x - cameraX < 0 (player's left edge relative to screen)
    // player.x = cameraX; // Pushes player to stay on screen

    // Apply gravity
    player.dy += gravity;
    player.y += player.dy; // Update player's world Y
    player.onGround = false;

    // Collision detection with platforms (uses world coordinates)
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
            // Side collision (simplified, can be improved)
            else if (player.dx > 0 && (player.x + player.width - player.dx) < platform.x && (player.y + player.height) > platform.y && player.y < platform.y + platform.height) {
                player.x = platform.x - player.width;
                if (!player.onGround) player.dx = 0;
            } else if (player.dx < 0 && (player.x - player.dx) > (platform.x + platform.width) && (player.y + player.height) > platform.y && player.y < platform.y + platform.height) {
                player.x = platform.x + platform.width;
                if (!player.onGround) player.dx = 0;
            }
        }
    });

    // Jumping
    if (keys.up && (player.onGround || player.jumpCount < player.maxJumps)) {
        player.dy = -jumpForce;
        player.onGround = false;
        player.jumpCount++;
        keys.up = false;
        if (player.dx === 0) {
            const horizontalJumpNudge = playerSpeed * 0.55;
            if (player.facingDirection === 'right') {
                player.dx = horizontalJumpNudge;
            } else {
                player.dx = -horizontalJumpNudge;
            }
        }
    }

    // Update Animation
    if (!player.onGround) {
        player.currentImage = images.jump;
    } else {
        if (player.dx !== 0) {
            player.walkFrameTimer++;
            if (player.walkFrameTimer >= player.walkAnimationSpeed) {
                player.walkFrameTimer = 0;
                player.walkFrame = (player.walkFrame + 1) % 2;
            }
            player.currentImage = player.walkFrame === 0 ? images.walk1 : images.walk2;
        } else {
            player.currentImage = images.stand;
            player.walkFrameTimer = 0;
        }
    }

    // If player falls off the bottom (relative to some logical "floor" or just far down)
    // For an endless world, "falling off" means player.y is too far below the typical platform generation Y range.
    if (player.y > canvas.height + 200) { // Significantly below the typical viewport bottom
        resetGame();
    }
}

function resetGame() {
    player.x = 50;
    player.y = canvas.height - (player.height + 50); // Initial world position
    player.dx = 0;
    player.dy = 0;
    player.onGround = false;
    player.jumpCount = 0;
    player.facingDirection = 'right';
    player.currentImage = images.stand;

    cameraX = 0; // Reset camera
    cameraY = 0;
    lastPlatformEndX = 0; // Reset for platform generation

    generateInitialPlatforms();
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function gameLoop() {
    clearCanvas();

    updatePlayer(); // Update player logic first (to get new player.x for camera)
    updateCamera(); // Update camera based on new player position
    updateWorld();  // Update world (platform gen/removal) based on new camera position

    drawBackground();
    drawPlatforms();
    drawPlayer();

    requestAnimationFrame(gameLoop);
}

console.log("Script setup complete. Waiting for images to load...");
