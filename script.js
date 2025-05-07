const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game settings
canvas.width = 800;
canvas.height = 400;

const gravity = 0.5;
const jumpForce = 9; // Adjusted
const playerSpeed = 5;
const scrollSpeed = 1;
const PLAYER_SPRITE_SCALE = 0.25;

// Image Loading
const images = {
    stand: new Image(),
    walk1: new Image(),
    walk2: new Image(),
    jump: new Image(),
    background: new Image()
};
const imageSources = {
    stand: 'assets/robot_stand.png',
    walk1: 'assets/robot_walk_pos_1.png',
    walk2: 'assets/robot_walk_pos_2.png',
    jump: 'assets/robot_jump.png',
    background: 'assets/platform_bg.png'
};

let imagesToLoad = Object.keys(imageSources).length;
let imagesActuallyLoaded = 0;

// Background Scrolling Variables
let bgX = 0;
let bgImageWidth = 0;
const BG_ASPECT_RATIO = 3 / 1;

function onImageLoad() {
    imagesActuallyLoaded++;
    if (imagesActuallyLoaded === imagesToLoad) {
        // *** ADDED: Calculate bgImageWidth here ***
        if (images.background.complete && images.background.naturalHeight > 0) {
            bgImageWidth = canvas.height * BG_ASPECT_RATIO;
        } else {
            // Fallback or error if background image didn't load its dimensions properly
            console.error("Background image dimensions not available for calculating width.");
            bgImageWidth = canvas.width; // A fallback, though not ideal for 3:1 ratio
        }

        initializePlayerSprite();
        generateInitialPlatforms();
        gameLoop();
    }
}

for (const key in imageSources) {
    images[key].onload = onImageLoad;
    images[key].src = imageSources[key];
    images[key].onerror = () => {
        console.error(`Failed to load image: ${imageSources[key]}`);
        // Call onImageLoad anyway to not stall the game if one image fails,
        // but background might be missing or fallback might be used.
        onImageLoad();
    }
}

const player = {
    x: 50,
    y: canvas.height - 70,
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
    player.currentImage = images.stand;
}

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

// *** ADDED: drawBackground function ***
function drawBackground() {
    if (!images.background.complete || images.background.naturalHeight === 0 || bgImageWidth === 0) {
        // Background image not ready, invalid, or width not calculated
        // Draw solid blue as fallback if canvas has blue, or clear to canvas default
        // The canvas already has a blue background from CSS, so clearRect will show it.
        return;
    }
    ctx.drawImage(images.background, bgX, 0, bgImageWidth, canvas.height);
    ctx.drawImage(images.background, bgX + bgImageWidth, 0, bgImageWidth, canvas.height);
}

function drawPlayer() {
    if (!player.currentImage || !player.currentImage.complete || player.currentImage.naturalHeight === 0) {
        ctx.fillStyle = 'purple';
        ctx.fillRect(player.x, player.y, player.width, player.height);
        return;
    }
    ctx.save();
    const img = player.currentImage;
    const scaledSpriteWidth = img.naturalWidth * PLAYER_SPRITE_SCALE;
    const scaledSpriteHeight = img.naturalHeight * PLAYER_SPRITE_SCALE;
    const drawX = player.x + (player.width / 2) - (scaledSpriteWidth / 2);
    const drawY = player.y + player.height - scaledSpriteHeight;
    if (player.facingDirection === 'right') {
        ctx.translate(drawX + scaledSpriteWidth / 2, drawY + scaledSpriteHeight / 2);
        ctx.scale(-1, 1);
        ctx.drawImage(img, -scaledSpriteWidth / 2, -scaledSpriteHeight / 2, scaledSpriteWidth, scaledSpriteHeight);
    } else {
        ctx.drawImage(img, drawX, drawY, scaledSpriteWidth, scaledSpriteHeight);
    }
    ctx.restore();
}

function drawPlatforms() {
    platforms.forEach(platform => {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });
}

function updateWorld() {
    // *** ADDED: Background scrolling logic ***
    if (bgImageWidth > 0) { // Only scroll if width is calculated
        bgX -= scrollSpeed;
        if (bgX <= -bgImageWidth) {
            bgX += bgImageWidth;
        }
    }

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
            } else if (player.dx > 0 && player.x + player.width - player.dx < platform.x) {
                player.x = platform.x - player.width;
                if (!player.onGround) player.dx = 0;
            } else if (player.dx < 0 && player.x - player.dx > platform.x + platform.width) {
                player.x = platform.x + platform.width;
                if (!player.onGround) player.dx = 0;
            }
        }
    });
    if (keys.up && (player.onGround || player.jumpCount < player.maxJumps)) {
        if (player.jumpCount === 0 && !player.onGround) {}
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
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    if (player.y > canvas.height) {
        resetGame();
    }
}

function resetGame() {
    player.x = 50;
    player.y = canvas.height - (player.height + 50);
    player.dx = 0;
    player.dy = 0;
    player.onGround = false;
    player.jumpCount = 0;
    player.facingDirection = 'right';
    player.currentImage = images.stand;
    // *** ADDED: Reset bgX on game reset ***
    bgX = 0;
    generateInitialPlatforms();
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function gameLoop() {
    clearCanvas();
    updateWorld();
    updatePlayer();

    // *** ADDED: Call to drawBackground ***
    drawBackground();
    drawPlatforms();
    drawPlayer();

    requestAnimationFrame(gameLoop);
}
