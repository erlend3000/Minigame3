var CANVAS_BG_COLOR = "#000";
var PLAYER_NAME = "Erlend Klouman Høiner";
var BOX_WIDTH = 400;
var BOX_HEIGHT = 80;
var NAME_PADDING = 24;
var NAME_FONT = "bold 28px Helvetica, Arial, sans-serif";
var SMALL_TEXT = "Teams are created when all students have joined.";
var SMALL_FONT = "16px Helvetica, Arial, sans-serif";
var SMALL_TEXT_COLOR = "#fff";
var SMALL_TEXT_Y_OFFSET = 18; // px gap from box to small text
var SMALL_TEXT_HEIGHT = 18; // estimate for vertical centering
// Physics constants - adjusted to match original feel but time-based
var GRAVITY = 1500; // Increased for more natural falling
var JUMP_VELOCITY = -600; // Adjusted for higher gravity
var MOVE_SPEED = 200; // Back to original value for snappier movement
var FRICTION = 6; // Time-based friction factor
var BOUNCE_FACTOR = 0.4; // How much to bounce when landing
var SQUASH_FACTOR = 0.85; // How much to squash when landing
var RECOVERY_SPEED = 8; // How fast to recover from squashing
// Platform constants
var PLATFORM_HEIGHT = 10;
var PLATFORM_WIDTH = 80; // Fixed short width for all platforms
var PLATFORM_MIN_DISTANCE = 80; // Minimum distance between platforms
var PLATFORM_COUNT = 20; // Total number of platforms
var MIN_DISTANCE_FROM_BOX = 60; // Minimum distance from name box
var PLATFORM_FADE_DURATION = 1000; // ms for fade in animation
var PLATFORM_FADE_DELAY = 200; // ms between each platform appearing
var canvas;
var ctx;
var CANVAS_WIDTH = window.innerWidth;
var CANVAS_HEIGHT = window.innerHeight;
var gameActive = false;
var keyLeft = false;
var keyRight = false;
var keyUp = false;
var playerActivated = false; // Flag to track if the player has started interacting
var firstJump = false; // Flag to track if player has jumped for the first time
var hasExitedBox = false; // Flag to track if player has exited the name box
var platformsGenerated = false; // Flag to track if platforms have been generated
var lastFrameTime = 0; // For tracking time between frames
var squashStretch = 1.0; // For tracking squash and stretch animation (1.0 = normal)
var player;
var nameCharPositions = [];
var selectedCharIndex = -1;
var gameStart = 0;
var platforms = [];
// Calculate vertical center for both box and small text as a group
function getPaddleGroupY() {
    var groupHeight = BOX_HEIGHT + SMALL_TEXT_Y_OFFSET + SMALL_TEXT_HEIGHT;
    return (CANVAS_HEIGHT - groupHeight) / 2;
}
function getBoxX() {
    return CANVAS_WIDTH / 2 - BOX_WIDTH / 2;
}
function getBoxY() {
    return getPaddleGroupY();
}
function calculateNameCharPositions() {
    nameCharPositions = [];
    var boxX = getBoxX();
    var boxY = getBoxY();
    // Calculate the total width of the name
    ctx.font = NAME_FONT;
    var nameWidth = ctx.measureText(PLAYER_NAME).width;
    // Starting X position to center the name
    var currentX = boxX + BOX_WIDTH / 2 - nameWidth / 2;
    var nameY = boxY + BOX_HEIGHT / 2;
    // Store positions for each character
    for (var i = 0; i < PLAYER_NAME.length; i++) {
        var char = PLAYER_NAME[i];
        var charWidth = ctx.measureText(char).width;
        nameCharPositions.push({
            char: char,
            x: currentX + charWidth / 2, // Center position of the character
            y: nameY,
            width: charWidth
        });
        currentX += charWidth;
    }
    // Choose a letter that isn't a space
    do {
        selectedCharIndex = Math.floor(Math.random() * PLAYER_NAME.length);
    } while (PLAYER_NAME[selectedCharIndex] === ' ');
}
function createPlayer() {
    // Calculate character positions if not done already
    if (nameCharPositions.length === 0) {
        calculateNameCharPositions();
    }
    var selectedChar = nameCharPositions[selectedCharIndex];
    var charHeight = 28; // Approximate height based on font size
    return {
        char: selectedChar.char,
        x: selectedChar.x,
        y: selectedChar.y,
        width: selectedChar.width,
        height: charHeight,
        vx: 0,
        vy: 0,
        isJumping: false,
        isInsideBox: true,
        originalX: selectedChar.x,
        originalY: selectedChar.y,
        charIndex: selectedCharIndex,
        baselineY: selectedChar.y, // Store the baseline Y position
        landingTime: 0
    };
}
// Check if a potential platform overlaps with existing platforms
function platformOverlaps(platform, existingPlatforms) {
    var padding = PLATFORM_MIN_DISTANCE; // Minimum distance between platforms
    for (var _i = 0, existingPlatforms_1 = existingPlatforms; _i < existingPlatforms_1.length; _i++) {
        var existing = existingPlatforms_1[_i];
        // Check horizontal overlap with padding
        var horizontalOverlap = (platform.x < existing.x + existing.width + padding) &&
            (platform.x + platform.width + padding > existing.x);
        // Check vertical overlap with padding
        var verticalOverlap = (Math.abs(platform.y - existing.y) < padding);
        if (horizontalOverlap && verticalOverlap) {
            return true;
        }
    }
    return false;
}
// Check if platform is too close to the name box
function platformTooCloseToBox(platform) {
    var boxX = getBoxX();
    var boxY = getBoxY();
    // Check if platform is too close to the name box (horizontally or vertically)
    return (platform.x < boxX + BOX_WIDTH + MIN_DISTANCE_FROM_BOX &&
        platform.x + platform.width > boxX - MIN_DISTANCE_FROM_BOX &&
        platform.y < boxY + BOX_HEIGHT + MIN_DISTANCE_FROM_BOX &&
        platform.y + platform.height > boxY - MIN_DISTANCE_FROM_BOX);
}
// Generate random platforms distributed around the screen
function generatePlatforms() {
    platforms = [];
    var currentTime = performance.now();
    // Divide screen into sections for better distribution
    var boxX = getBoxX();
    var boxY = getBoxY();
    // Ensure platforms are distributed in all areas - above, below, left, right
    var areas = [
        {
            minX: 0,
            maxX: CANVAS_WIDTH,
            minY: 50,
            maxY: boxY - MIN_DISTANCE_FROM_BOX,
            count: Math.floor(PLATFORM_COUNT * 0.25)
        },
        {
            minX: 0,
            maxX: CANVAS_WIDTH,
            minY: boxY + BOX_HEIGHT + MIN_DISTANCE_FROM_BOX,
            maxY: CANVAS_HEIGHT - 50,
            count: Math.floor(PLATFORM_COUNT * 0.3)
        },
        {
            minX: 50,
            maxX: boxX - MIN_DISTANCE_FROM_BOX,
            minY: boxY - 150,
            maxY: boxY + BOX_HEIGHT + 150,
            count: Math.floor(PLATFORM_COUNT * 0.225)
        },
        {
            minX: boxX + BOX_WIDTH + MIN_DISTANCE_FROM_BOX,
            maxY: boxY + BOX_HEIGHT + 150,
            minY: boxY - 150,
            maxX: CANVAS_WIDTH - 50,
            count: Math.floor(PLATFORM_COUNT * 0.225)
        }
    ];
    // Place platforms in each area
    for (var _i = 0, areas_1 = areas; _i < areas_1.length; _i++) {
        var area = areas_1[_i];
        var placedInArea = 0;
        var attempts = 0;
        var maxAttempts = 100;
        while (placedInArea < area.count && attempts < maxAttempts) {
            attempts++;
            // Generate random position within this area
            var platformX = area.minX + Math.random() * (area.maxX - area.minX - PLATFORM_WIDTH);
            var platformY = area.minY + Math.random() * (area.maxY - area.minY);
            var platform = {
                x: platformX,
                y: platformY,
                width: PLATFORM_WIDTH,
                height: PLATFORM_HEIGHT,
                opacity: 0,
                fadeStartTime: currentTime + (platforms.length * PLATFORM_FADE_DELAY)
            };
            // Check if this platform overlaps with existing ones
            if (!platformOverlaps(platform, platforms)) {
                platforms.push(platform);
                placedInArea++;
            }
        }
    }
    // Add a guaranteed stepping stone from the box to help the player
    var stepX = boxX + BOX_WIDTH / 2 - PLATFORM_WIDTH / 2 + (Math.random() * BOX_WIDTH / 2) - BOX_WIDTH / 4;
    var stepY = boxY - MIN_DISTANCE_FROM_BOX - 20;
    platforms.push({
        x: stepX,
        y: stepY,
        width: PLATFORM_WIDTH,
        height: PLATFORM_HEIGHT,
        opacity: 0,
        fadeStartTime: currentTime
    });
}
function drawBoxBackground(ctx) {
    var boxX = getBoxX();
    var boxY = getBoxY();
    // White box
    ctx.fillStyle = "#fff";
    ctx.fillRect(boxX, boxY, BOX_WIDTH, BOX_HEIGHT);
}
function drawName(ctx) {
    var boxX = getBoxX();
    var boxY = getBoxY();
    // Draw name with padding, character by character, skipping the player character if activated
    ctx.font = NAME_FONT;
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.save();
    // Clip to the padding area
    ctx.beginPath();
    ctx.rect(boxX + NAME_PADDING, boxY + NAME_PADDING, BOX_WIDTH - 2 * NAME_PADDING, BOX_HEIGHT - 2 * NAME_PADDING);
    ctx.clip();
    // Draw each character except the player's character if player has been activated
    for (var i = 0; i < nameCharPositions.length; i++) {
        // Skip the player's character only if player has been activated
        if (i === player.charIndex && playerActivated) {
            continue;
        }
        var charInfo = nameCharPositions[i];
        ctx.fillText(charInfo.char, charInfo.x, charInfo.y);
    }
    ctx.restore();
}
function drawSmallText(ctx) {
    var boxX = getBoxX();
    var boxY = getBoxY();
    // Small text underneath
    ctx.font = SMALL_FONT;
    ctx.fillStyle = SMALL_TEXT_COLOR;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(SMALL_TEXT, boxX + BOX_WIDTH / 2, boxY + BOX_HEIGHT + SMALL_TEXT_Y_OFFSET);
}
function drawPlatforms(ctx, currentTime) {
    if (!platformsGenerated)
        return;
    for (var _i = 0, platforms_1 = platforms; _i < platforms_1.length; _i++) {
        var platform = platforms_1[_i];
        // Calculate opacity based on fade-in animation
        var timeSinceFadeStart = currentTime - platform.fadeStartTime;
        if (timeSinceFadeStart < 0) {
            continue; // Skip platforms whose fade-in hasn't started yet
        }
        var opacity = Math.min(timeSinceFadeStart / PLATFORM_FADE_DURATION, 1);
        platform.opacity = opacity;
        // Draw platform with calculated opacity
        ctx.fillStyle = "rgba(255, 255, 255, ".concat(opacity, ")");
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    }
}
function drawPlayer(ctx) {
    // Only draw player if activated
    if (!playerActivated)
        return;
    var boxY = getBoxY();
    // Always use black color when inside box
    // Only use white when jumping outside the box AND when halfway through the top edge
    var playerColor = "#000"; // Default to black
    // Check if player is jumping out (must be outside box or actively jumping through ceiling)
    if (!player.isInsideBox || (player.vy < 0 && player.y - player.height / 2 <= boxY)) {
        playerColor = "#fff";
    }
    ctx.font = NAME_FONT;
    ctx.fillStyle = playerColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Apply squash and stretch effect
    ctx.save();
    ctx.translate(player.x, player.y);
    // Stretch vertically (or squash), squash horizontally (or stretch) to maintain area
    ctx.scale(1 / Math.sqrt(squashStretch), squashStretch);
    ctx.fillText(player.char, 0, 0);
    ctx.restore();
}
function drawGame(ctx, currentTime) {
    ctx.fillStyle = CANVAS_BG_COLOR;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    // Draw platforms if player has exited the box
    if (platformsGenerated) {
        drawPlatforms(ctx, currentTime);
    }
    // Draw box background first
    drawBoxBackground(ctx);
    // If player is activated and inside box, draw player before other letters
    if (playerActivated && player.isInsideBox) {
        drawPlayer(ctx);
    }
    // Now draw the name (other letters)
    drawName(ctx);
    // Draw small text
    drawSmallText(ctx);
    // If player is activated and outside box, draw player on top
    if (playerActivated && !player.isInsideBox) {
        drawPlayer(ctx);
    }
}
function checkPlatformCollisions() {
    // Check if player is landing on any platform
    if (player.vy > 0) { // Moving downward
        for (var _i = 0, platforms_2 = platforms; _i < platforms_2.length; _i++) {
            var platform = platforms_2[_i];
            // Only consider platforms that have fully appeared
            if (platform.opacity < 0.8)
                continue;
            if (player.y + player.height / 2 >= platform.y && // Below or at the top of the platform
                player.y - player.height / 2 < platform.y && // But not too far below
                player.x >= platform.x && // Horizontally aligned with the platform
                player.x <= platform.x + platform.width) {
                // Apply bounce effect
                if (player.vy > 150) { // Adjusted bounce threshold for higher gravity
                    player.vy = -player.vy * BOUNCE_FACTOR;
                    // Apply squashing effect
                    squashStretch = SQUASH_FACTOR;
                    player.landingTime = performance.now();
                }
                else {
                    player.vy = 0;
                }
                player.y = platform.y - player.height / 2;
                player.isJumping = false;
                return true;
            }
        }
    }
    return false;
}
function updatePlayer(deltaTime) {
    var boxX = getBoxX();
    var boxY = getBoxY();
    // Handle horizontal movement with delta time
    if (keyLeft && !keyRight) {
        player.vx = -MOVE_SPEED;
    }
    else if (keyRight && !keyLeft) {
        player.vx = MOVE_SPEED;
    }
    else {
        // Apply friction based on delta time
        player.vx *= Math.pow(0.5, deltaTime * FRICTION);
        if (Math.abs(player.vx) < 1)
            player.vx = 0;
    }
    // Only apply gravity after the first jump
    if (firstJump) {
        player.vy += GRAVITY * deltaTime;
    }
    // Handle jumping - only allow jumping when not already jumping
    if (keyUp && !player.isJumping) {
        player.vy = JUMP_VELOCITY;
        player.isJumping = true;
        firstJump = true; // Mark that the player has jumped for the first time
        // Apply stretching when jumping
        squashStretch = 1 / SQUASH_FACTOR;
        player.landingTime = performance.now();
    }
    // Update squash and stretch animation using delta time
    if (squashStretch !== 1.0) {
        var targetStretch = 1.0;
        squashStretch += (targetStretch - squashStretch) * RECOVERY_SPEED * deltaTime;
        // Reset when close enough to normal
        if (Math.abs(squashStretch - 1.0) < 0.01) {
            squashStretch = 1.0;
        }
    }
    // Update position with delta time
    player.x += player.vx * deltaTime;
    // Only update Y position if we've started jumping
    if (firstJump) {
        player.y += player.vy * deltaTime;
    }
    // Check if player has exited the box for the first time
    if (!hasExitedBox && !player.isInsideBox) {
        hasExitedBox = true;
        // Generate platforms when player exits box
        if (!platformsGenerated) {
            generatePlatforms();
            platformsGenerated = true;
        }
    }
    // Box collision handling
    if (player.isInsideBox) {
        // Left wall
        if (player.x - player.width / 2 < boxX + NAME_PADDING) {
            player.x = boxX + NAME_PADDING + player.width / 2;
            player.vx = -player.vx * 0.5; // Bounce off walls
        }
        // Right wall
        if (player.x + player.width / 2 > boxX + BOX_WIDTH - NAME_PADDING) {
            player.x = boxX + BOX_WIDTH - NAME_PADDING - player.width / 2;
            player.vx = -player.vx * 0.5; // Bounce off walls
        }
        // Bottom - make sure player stays on the baseline when not jumping
        if (!firstJump) {
            player.y = player.baselineY; // Keep on baseline
        }
        else if (player.y + player.height / 2 > boxY + BOX_HEIGHT - NAME_PADDING) {
            player.y = boxY + BOX_HEIGHT - NAME_PADDING - player.height / 2;
            // Apply bounce effect (with adjusted threshold)
            if (player.vy > 150) {
                player.vy = -player.vy * BOUNCE_FACTOR;
                // Apply squashing effect
                squashStretch = SQUASH_FACTOR;
                player.landingTime = performance.now();
            }
            else {
                player.vy = 0;
            }
            player.isJumping = false;
        }
        // One-way ceiling: check if player is jumping and crossing the top edge
        if (firstJump && player.vy < 0 && player.y - player.height / 2 <= boxY + NAME_PADDING) {
            // If player is halfway through the top edge, transition to outside box
            if (player.y <= boxY) {
                player.isInsideBox = false;
            }
        }
    }
    else {
        // Player is outside the box
        // Enforce screen boundaries
        // Top of screen (prevent escaping through top)
        if (player.y - player.height / 2 < 0) {
            player.y = player.height / 2;
            player.vy = 0; // Stop upward velocity
        }
        // Left edge of screen with bounce
        if (player.x - player.width / 2 < 0) {
            player.x = player.width / 2;
            player.vx = -player.vx * 0.5; // Bounce off edges
        }
        // Right edge of screen with bounce
        if (player.x + player.width / 2 > CANVAS_WIDTH) {
            player.x = CANVAS_WIDTH - player.width / 2;
            player.vx = -player.vx * 0.5; // Bounce off edges
        }
        // Check if player is landing on top of the box
        if (player.vy > 0 && // Moving downward
            player.y + player.height / 2 >= boxY && // Below or at the top of the box
            player.y - player.height / 2 < boxY && // But not too far below
            player.x >= boxX && // Horizontally aligned with the box
            player.x <= boxX + BOX_WIDTH) {
            player.y = boxY - player.height / 2;
            // Apply bounce effect (with adjusted threshold)
            if (player.vy > 150) {
                player.vy = -player.vy * BOUNCE_FACTOR;
                // Apply squashing effect
                squashStretch = SQUASH_FACTOR;
                player.landingTime = performance.now();
            }
            else {
                player.vy = 0;
            }
            player.isJumping = false;
        }
        // Check if player is landing on any platform
        else if (platformsGenerated) {
            checkPlatformCollisions();
        }
        // Bottom of screen with bounce
        if (player.y + player.height / 2 > CANVAS_HEIGHT) {
            player.y = CANVAS_HEIGHT - player.height / 2;
            // Apply bounce effect
            if (player.vy > 150) {
                player.vy = -player.vy * BOUNCE_FACTOR;
                // Apply squashing effect
                squashStretch = SQUASH_FACTOR;
                player.landingTime = performance.now();
            }
            else {
                player.vy = 0;
            }
            player.isJumping = false;
        }
    }
}
function updateGame(currentTime) {
    // Calculate delta time (in seconds)
    var deltaTime = lastFrameTime ? (currentTime - lastFrameTime) / 1000 : 0.016; // Default to 60fps on first frame
    // Cap delta time to avoid huge jumps if tab is inactive
    var cappedDeltaTime = Math.min(deltaTime, 0.1);
    lastFrameTime = currentTime;
    if (playerActivated) {
        updatePlayer(cappedDeltaTime);
    }
    else if (keyLeft || keyRight || keyUp) {
        // Player has pressed a key for the first time
        playerActivated = true;
    }
}
function gameLoop(timestamp) {
    if (!gameActive) {
        drawBoxBackground(ctx);
        drawName(ctx);
        drawSmallText(ctx);
    }
    else {
        updateGame(timestamp);
        drawGame(ctx, timestamp);
    }
    requestAnimationFrame(gameLoop);
}
function handleKeyDown(e) {
    if (e.key === "ArrowLeft" || e.key === "a")
        keyLeft = true;
    if (e.key === "ArrowRight" || e.key === "d")
        keyRight = true;
    if (e.key === "ArrowUp" || e.key === "w")
        keyUp = true;
    // Prevent default behavior for arrow keys to avoid page scrolling
    // Using indexOf instead of includes for older browser compatibility
    var preventDefaultKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "];
    if (preventDefaultKeys.indexOf(e.key) !== -1) {
        e.preventDefault();
    }
}
function handleKeyUp(e) {
    if (e.key === "ArrowLeft" || e.key === "a")
        keyLeft = false;
    if (e.key === "ArrowRight" || e.key === "d")
        keyRight = false;
    if (e.key === "ArrowUp" || e.key === "w")
        keyUp = false;
}
function resizeCanvas() {
    CANVAS_WIDTH = window.innerWidth;
    CANVAS_HEIGHT = window.innerHeight;
    if (canvas) {
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
    }
}
function main() {
    canvas = document.createElement("canvas");
    resizeCanvas();
    document.body.style.background = CANVAS_BG_COLOR;
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("resize", function () {
        var oldBoxY = getBoxY();
        var oldBoxX = getBoxX();
        resizeCanvas();
        // Recalculate character positions after resize
        calculateNameCharPositions();
        // Adjust player position if window is resized
        if (player) {
            var newBoxY = getBoxY();
            var newBoxX = getBoxX();
            if (player.isInsideBox) {
                // If player hasn't been activated yet, update to new position
                if (!playerActivated) {
                    player.x = nameCharPositions[player.charIndex].x;
                    player.y = nameCharPositions[player.charIndex].y;
                    player.originalX = player.x;
                    player.originalY = player.y;
                    player.baselineY = player.y;
                }
                else if (!firstJump) {
                    // If player is active but hasn't jumped yet, keep on baseline but adjust x
                    player.x += (newBoxX - oldBoxX);
                    player.y = nameCharPositions[player.charIndex].y;
                    player.baselineY = player.y;
                }
                else {
                    // If player has moved and jumped, keep relative position to box
                    player.x += (newBoxX - oldBoxX);
                    player.y += (newBoxY - oldBoxY);
                    player.baselineY += (newBoxY - oldBoxY);
                }
            }
            else {
                // If player was on top of the box, move them with the box
                if (Math.abs(player.y + player.height / 2 - oldBoxY) < 2) {
                    player.y = newBoxY - player.height / 2;
                }
                // Adjust horizontal position proportionally
                player.x = (player.x - oldBoxX) / BOX_WIDTH * BOX_WIDTH + newBoxX;
                // Update baseline
                player.baselineY += (newBoxY - oldBoxY);
            }
        }
        // Regenerate platforms if they were already generated
        if (platformsGenerated) {
            generatePlatforms();
        }
    });
    // Start game immediately
    gameActive = true;
    gameStart = performance.now();
    calculateNameCharPositions();
    player = createPlayer();
    requestAnimationFrame(gameLoop);
}
main();
