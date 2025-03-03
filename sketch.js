// Add this at the beginning of your sketch.js file
console.log("Sketch.js loaded");

// Global variables
let player;
let enemies = [];
let playerBullets = [];
let enemyBullets = [];
let stars = [];
let score = 0;
let lives = 3;
let gameOver = false;
let shootCooldown = 0;
let missedEnemies = 0;
let missedEnemyPenalty = 3; // Lose a life after this many enemies are missed
let powerups = [];
let powerupTypes = [
  { name: "GPT", color: [0, 255, 150], effect: "Triple shot" },
  { name: "BERT", color: [255, 200, 0], effect: "Shield" },
  { name: "DALL-E", color: [200, 100, 255], effect: "Clear screen" }
];

let aiTheme = {
  playerColor: [0, 255, 200],  // Teal/cyan (AI assistant color)
  enemyColors: [
    [255, 50, 50],   // Red (adversarial AI)
    [255, 100, 0],   // Orange
    [150, 0, 255]    // Purple
  ],
  bulletColors: {
    player: [0, 255, 255],     // Cyan
    enemy: [255, 50, 100]      // Pink/red
  },
  background: [10, 5, 20]      // Deep space blue
};

// Update game title and UI text
let gameTitle = "Neural Defender";
let gameSubtitle = "Protect your model from adversarial attacks";

// Add to global variables
let gameState = "title"; // "title", "playing", "gameOver"

// Supabase configuration
const supabaseClient = window.supabaseClient;

// Add to global variables
let leaderboardData = [];
let leaderboardVisible = false;
let formVisible = false;
let leaderboardFormElement;
let finalScoreElement;
let playerNameInput;
let playerEmailInput;
let privacyConsentCheckbox;
let submitScoreButton;
let skipSubmissionButton;

function setup() {
  console.log("Setup function running");
  // Create canvas and append to gameContainer instead of body
  let canvas = createCanvas(600, 400);
  canvas.parent('gameContainer');
  
  // Initialize the player spaceship at the bottom center
  player = {
    x: width / 2,
    y: height - 20,
    width: 30,
    height: 20,
    speed: 5
  };
  
  // Generate 100 stars for the background
  for (let i = 0; i < 100; i++) {
    stars.push({
      x: random(width),
      y: random(height),
      size: random(1, 3)
    });
  }
  
  // Get DOM elements
  leaderboardFormElement = document.getElementById('leaderboardForm');
  finalScoreElement = document.getElementById('finalScore');
  playerNameInput = document.getElementById('playerName');
  playerEmailInput = document.getElementById('playerEmail');
  privacyConsentCheckbox = document.getElementById('privacyConsent');
  submitScoreButton = document.getElementById('submitScore');
  skipSubmissionButton = document.getElementById('skipSubmission');
  
  // Add event listeners
  submitScoreButton.addEventListener('click', submitScore);
  skipSubmissionButton.addEventListener('click', showLeaderboard);
  
  // Fetch leaderboard data
  fetchLeaderboard();
  
  // Test Supabase connection
  testSupabaseConnection().then(connected => {
    console.log('Supabase connected:', connected);
  });
}

function draw() {
  background(aiTheme.background);
  drawNeuralNetworkEffect();
  
  // Draw stars
  for (let star of stars) {
    fill(255);
    noStroke();
    ellipse(star.x, star.y, star.size, star.size);
  }
  
  if (gameState === "title") {
    drawTitleScreen();
  } else if (gameState === "playing") {
    // **Player Movement**
    if (keyIsDown(LEFT_ARROW)) {
      player.x -= player.speed;
      if (player.x < 15) {
        player.x = 15; // Keep within left boundary
      }
    }
    if (keyIsDown(RIGHT_ARROW)) {
      player.x += player.speed;
      if (player.x > width - 15) {
        player.x = width - 15; // Keep within right boundary
      }
    }
    
    // **Player Shooting**
    if (keyIsDown(32) && shootCooldown <= 0) { // Space bar
      playerBullets.push({
        x: player.x,
        y: player.y - 10, // Start at tip of spaceship
        speed: 5,
        size: 5  // Add bullet size property
      });
      shootCooldown = 10; // Cooldown to limit firing rate
    }
    if (shootCooldown > 0) {
      shootCooldown--;
    }
    
    // **Update Player Bullets**
    for (let i = playerBullets.length - 1; i >= 0; i--) {
      let bullet = playerBullets[i];
      bullet.y -= bullet.speed; // Move upwards
      if (bullet.y < 0) {
        playerBullets.splice(i, 1); // Remove if off-screen
      } else {
        // Check collision with enemies
        for (let j = enemies.length - 1; j >= 0; j--) {
          let enemy = enemies[j];
          
          // Simple distance-based collision detection
          let distance = dist(bullet.x, bullet.y, enemy.x, enemy.y);
          if (distance < 15) { // Adjust this value as needed
            console.log("Enemy hit at: " + enemy.x + "," + enemy.y);
            playerBullets.splice(i, 1); // Remove bullet
            enemies.splice(j, 1); // Remove enemy
            score += 10; // Increase score
            break; // Bullet can only hit one enemy
          }
        }
      }
    }
    
    // **Spawn Enemies**
    if (frameCount % 60 === 0) { // Every 60 frames
      enemies.push({
        x: random(30, width - 30), // Increase margin from edges
        y: -20, // Start above the screen
        width: 20,
        height: 20,
        speed: 2
      });
    }
    
    // **Update Enemies**
    for (let enemy of enemies) {
      enemy.y += enemy.speed; // Move downwards
      // Enemy shooting (1% chance per frame)
      if (random() < 0.01) {
        enemyBullets.push({
          x: enemy.x,
          y: enemy.y + enemy.height / 2,
          speed: 3,
          size: 5  // Add bullet size property
        });
      }
    }
    
    // **Update Enemy Bullets**
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      let bullet = enemyBullets[i];
      bullet.y += bullet.speed; // Move downwards
      if (bullet.y > height) {
        enemyBullets.splice(i, 1); // Remove if off-screen
      } else {
        // Check collision with player using distance
        let distance = dist(bullet.x, bullet.y, player.x, player.y);
        if (distance < 15) { // Adjust this value as needed
          console.log("Player hit by bullet at: " + bullet.x + "," + bullet.y);
          enemyBullets.splice(i, 1);
          lives--;
          if (lives <= 0) {
            gameState = "gameOver"; // Change gameOver to gameState
          }
        }
      }
    }
    
    // **Check Enemy-Player Collision**
    for (let i = enemies.length - 1; i >= 0; i--) {
      let enemy = enemies[i];
      
      // Calculate distance between centers
      let distance = dist(player.x, player.y, enemy.x, enemy.y);
      
      // Only count as collision if they're very close (reduced collision radius)
      if (distance < 15) { // Reduced from typical size
        console.log("Collision detected! Enemy at: " + enemy.x + "," + enemy.y + 
                    " Player at: " + player.x + "," + player.y);
        enemies.splice(i, 1);
        lives--;
        if (lives <= 0) {
          gameState = "gameOver"; // Change gameOver to gameState
        }
      }
    }
    
    // **Draw Player Spaceship (AI Assistant)
    fill(aiTheme.playerColor);
    triangle(
      player.x - 15, player.y + 10,
      player.x + 15, player.y + 10,
      player.x, player.y - 10
    );
    // Add glowing effect
    noFill();
    stroke(aiTheme.playerColor[0], aiTheme.playerColor[1], aiTheme.playerColor[2], 150);
    strokeWeight(2);
    triangle(
      player.x - 18, player.y + 12,
      player.x + 18, player.y + 12,
      player.x, player.y - 13
    );
    strokeWeight(1);
    noStroke();
    
    // **Draw Enemies (Adversarial AIs)
    for (let enemy of enemies) {
      let colorIndex = floor(random(aiTheme.enemyColors.length));
      fill(aiTheme.enemyColors[colorIndex]);
      // Hexagon shape for enemies (more tech-looking)
      drawHexagon(enemy.x, enemy.y, 12);
    }
    
    // **Draw Bullets (Data Packets)
    for (let bullet of playerBullets) {
      fill(aiTheme.bulletColors.player);
      // Square bullets for a digital look
      rect(bullet.x-2, bullet.y-2, bullet.size, bullet.size);
    }
    for (let bullet of enemyBullets) {
      fill(aiTheme.bulletColors.enemy);
      rect(bullet.x-2, bullet.y-2, bullet.size, bullet.size);
    }
    
    // **Display Score and Lives**
    fill(255); 
    textSize(16);
    textAlign(LEFT, TOP);
    text("Model Accuracy: " + score, 10, 20);
    text("Integrity: " + lives, 10, 40);
    text("Data Leaks: " + missedEnemies + "/" + missedEnemyPenalty, 10, 60);

    // **Remove Enemies Off-Screen**
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].y > height) {
        // Track missed enemies
        missedEnemies++;
        
        // Apply penalty every few missed enemies
        if (missedEnemies >= missedEnemyPenalty) {
          lives--;
          missedEnemies = 0; // Reset counter
          
          // Visual feedback
          console.log("Life lost due to missed enemies!");
          
          if (lives <= 0) {
            gameState = "gameOver";
          }
        }
        
        // Remove the enemy
        enemies.splice(i, 1);
      }
    }
  } else if (gameState === "gameOver") {
    if (leaderboardVisible) {
      drawLeaderboard();
    } else {
      // Game Over Screen
      fill(255, 50, 50);
      textSize(32);
      textAlign(CENTER, CENTER);
      text("Model Corrupted", width / 2, height / 2);
      text("Final Accuracy: " + score, width / 2, height / 2 + 40);
      
      // Add restart instructions
      textSize(16);
      text("Press 'R' to restart", width / 2, height / 2 + 80);
      
      // Add leaderboard form instructions
      text("Press 'L' to submit your score", width / 2, height / 2 + 110);
      
      // Check for restart - ONLY if form is not visible
      if (keyIsDown(82) && !formVisible) { // 'R' key
        resetGame();
      }
      
      // Check for leaderboard form
      if (keyIsDown(76) && !formVisible) { // 'L' key
        showLeaderboardForm();
      }
    }
  }

  // Spawn powerups occasionally
  if (frameCount % 300 === 0) { // Every 5 seconds
    let type = floor(random(powerupTypes.length));
    powerups.push({
      x: random(30, width - 30),
      y: -20,
      type: type,
      width: 25,
      height: 25,
      speed: 1
    });
  }

  // Update and draw powerups
  for (let i = powerups.length - 1; i >= 0; i--) {
    let powerup = powerups[i];
    powerup.y += powerup.speed;
    
    // Draw powerup
    fill(powerupTypes[powerup.type].color);
    ellipse(powerup.x, powerup.y, 15, 15);
    textSize(10);
    textAlign(CENTER, CENTER);
    fill(255);
    text(powerupTypes[powerup.type].name.charAt(0), powerup.x, powerup.y);
    
    // Check collision with player
    let distance = dist(player.x, player.y, powerup.x, powerup.y);
    if (distance < 20) {
      // Apply powerup effect
      applyPowerup(powerup.type);
      powerups.splice(i, 1);
    }
    
    // Remove if off-screen
    if (powerup.y > height) {
      powerups.splice(i, 1);
    }
  }
}

function drawTitleScreen() {
  fill(0, 255, 200);
  textSize(40);
  textAlign(CENTER, CENTER);
  text(gameTitle, width / 2, height / 3);
  
  textSize(16);
  fill(200, 200, 255);
  text(gameSubtitle, width / 2, height / 3 + 40);
  
  textSize(20);
  fill(255);
  text("Press SPACE to start", width / 2, height * 2/3);
  
  // Animated player ship
  let animX = width / 2;
  let animY = height / 2 + 50;
  fill(aiTheme.playerColor);
  triangle(
    animX - 15, animY + 10,
    animX + 15, animY + 10,
    animX, animY - 10
  );
  
  if (keyIsDown(32)) { // Space
    gameState = "playing";
  }
}

// Add this helper function for collision detection
function collideRectCircle(rx, ry, rw, rh, cx, cy, diameter) {
  // Temporary variables to set edges for testing
  let testX = cx;
  let testY = cy;
  
  // Which edge is closest?
  if (cx < rx) testX = rx;             // Test left edge
  else if (cx > rx+rw) testX = rx+rw;  // Test right edge
  if (cy < ry) testY = ry;             // Test top edge
  else if (cy > ry+rh) testY = ry+rh;  // Test bottom edge
  
  // Get distance from closest edges
  let distance = dist(cx, cy, testX, testY);
  
  // If the distance is less than the radius, collision!
  return distance <= diameter/2;
}

// Add this helper function for rectangle-rectangle collision
function collideRectRect(r1x, r1y, r1w, r1h, r2x, r2y, r2w, r2h) {
  return (r1x < r2x + r2w &&
          r1x + r1w > r2x &&
          r1y < r2y + r2h &&
          r1y + r1h > r2y);
}

// Add this helper function for triangle-triangle collision
function collideTriangles(t1, t2) {
  // This is a simplified version that uses bounding boxes but with a reduced size
  // for more accurate collision detection
  
  // Calculate bounding boxes with a 20% reduction in size for more precise detection
  let t1minX = Math.min(t1[0], t1[2], t1[4]) + 2;
  let t1maxX = Math.max(t1[0], t1[2], t1[4]) - 2;
  let t1minY = Math.min(t1[1], t1[3], t1[5]) + 2;
  let t1maxY = Math.max(t1[1], t1[3], t1[5]) - 2;
  
  let t2minX = Math.min(t2[0], t2[2], t2[4]) + 2;
  let t2maxX = Math.max(t2[0], t2[2], t2[4]) - 2;
  let t2minY = Math.min(t2[1], t2[3], t2[5]) + 2;
  let t2maxY = Math.max(t2[1], t2[3], t2[5]) - 2;
  
  // Check if the bounding boxes overlap
  return !(t1maxX < t2minX || t1minX > t2maxX || t1maxY < t2minY || t1minY > t2maxY);
}

// Update your resetGame function
function resetGame() {
  // Reset game state
  player.x = width / 2;
  player.y = height - 20;
  enemies = [];
  playerBullets = [];
  enemyBullets = [];
  powerups = [];
  score = 0;
  lives = 3;
  missedEnemies = 0;
  gameState = "playing";
  leaderboardVisible = false;
  hideLeaderboardForm();
}

// Add a separate function to track missed enemies if you want
// This would go right after the above code
function trackMissedEnemies() {
  // Count how many enemies have gone past the player
  let missedCount = 0;
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].y > height) {
      missedCount++;
      enemies.splice(i, 1);
    }
  }
  
  // Only reduce lives if you want to penalize missed enemies
  // Comment this out if you don't want to lose lives for missed enemies
  // if (missedCount > 0) {
  //   lives -= missedCount;
  //   if (lives <= 0) {
  //     gameOver = true;
  //   }
  // }
}

function drawHexagon(x, y, size) {
  beginShape();
  for (let i = 0; i < 6; i++) {
    let angle = TWO_PI / 6 * i;
    let px = x + cos(angle) * size;
    let py = y + sin(angle) * size;
    vertex(px, py);
  }
  endShape(CLOSE);
}

function drawNeuralNetworkEffect() {
  stroke(50, 100, 255, 20);
  for (let i = 0; i < 5; i++) {
    let x1 = random(width);
    let y1 = random(height);
    for (let j = 0; j < 3; j++) {
      let x2 = x1 + random(-100, 100);
      let y2 = y1 + random(-100, 100);
      if (x2 > 0 && x2 < width && y2 > 0 && y2 < height) {
        line(x1, y1, x2, y2);
      }
    }
  }
  noStroke();
}

// Add this function
function shareOnX() {
  let shareText = `I scored ${score} defending my neural network in ${gameTitle}! #AI #MachineLearning #GameDev`;
  let shareURL = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(shareText);
  window.open(shareURL, "_blank");
}

// Update keyPressed function
function keyPressed() {
  // Only process game control keys when forms are not visible
  if (!formVisible) {
    if (gameState === "gameOver") {
      if ((key === 'x' || key === 'X') && !leaderboardVisible) {
        shareOnX();
      }
      if ((key === 'l' || key === 'L') && !leaderboardVisible) {
        showLeaderboardForm();
      }
      if ((key === 'r' || key === 'R') && !leaderboardVisible) {
        resetGame();
      }
    } else if (gameState === "title" && key === ' ') {
      gameState = "playing";
    }
  }
  
  // Don't prevent default for text inputs
  if (formVisible) {
    return true;
  }
}

// Add these new functions for leaderboard functionality
function showLeaderboardForm() {
  formVisible = true;
  finalScoreElement.textContent = score;
  leaderboardFormElement.style.display = 'block';
}

function hideLeaderboardForm() {
  formVisible = false;
  leaderboardFormElement.style.display = 'none';
  playerNameInput.value = '';
  playerEmailInput.value = '';
}

async function submitScore() {
  const playerName = playerNameInput.value.trim();
  const playerEmail = playerEmailInput.value.trim();
  const hasConsent = privacyConsentCheckbox.checked;
  
  // Validate input
  if (!playerName) {
    alert('Please enter your name');
    return;
  }
  
  if (playerEmail && !isValidEmail(playerEmail)) {
    alert('Please enter a valid email or leave it blank');
    return;
  }
  
  if (!hasConsent) {
    alert('Please provide consent to store your information');
    return;
  }
  
  try {
    console.log('Attempting to submit score:', {
      name: playerName,
      email: hasConsent ? playerEmail : null,
      score: score
    });
    
    // Submit to Supabase with a simpler approach
    const { data, error } = await supabaseClient
      .from('leaderboard')
      .insert({
        name: playerName,
        email: hasConsent ? playerEmail : null,
        score: score
      });
    
    if (error) {
      console.error('Supabase error details:', error);
      throw error;
    }
    
    console.log('Score submitted successfully!', data);
    hideLeaderboardForm();
    await fetchLeaderboard();
    leaderboardVisible = true;
  } catch (error) {
    console.error('Error submitting score:', error);
    alert('Failed to submit score: ' + (error.message || 'Unknown error'));
  }
}

async function fetchLeaderboard() {
  try {
    const { data, error } = await supabaseClient
      .from('leaderboard')
      .select('name, score')
      .order('score', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    leaderboardData = data;
    console.log('Leaderboard fetched:', leaderboardData);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    leaderboardData = [];
  }
}

function showLeaderboard() {
  hideLeaderboardForm();
  fetchLeaderboard();
  leaderboardVisible = true;
}

function drawLeaderboard() {
  // Draw leaderboard background
  fill(0, 0, 20, 220);
  rect(width/2 - 150, height/2 - 180, 300, 360, 10);
  
  // Draw title
  fill(0, 255, 200);
  textSize(24);
  textAlign(CENTER, TOP);
  text("LEADERBOARD", width/2, height/2 - 160);
  
  // Draw headers
  fill(200, 200, 255);
  textSize(16);
  textAlign(LEFT, TOP);
  text("RANK", width/2 - 130, height/2 - 120);
  text("NAME", width/2 - 80, height/2 - 120);
  text("SCORE", width/2 + 80, height/2 - 120);
  
  // Draw divider
  stroke(100, 100, 200, 100);
  line(width/2 - 130, height/2 - 100, width/2 + 130, height/2 - 100);
  noStroke();
  
  // Draw leaderboard entries
  fill(255);
  textSize(14);
  textAlign(LEFT, TOP);
  
  if (leaderboardData.length === 0) {
    textAlign(CENTER, TOP);
    text("No scores yet. Be the first!", width/2, height/2);
  } else {
    for (let i = 0; i < leaderboardData.length; i++) {
      const entry = leaderboardData[i];
      const y = height/2 - 80 + (i * 25);
      
      // Highlight player's score
      if (entry.name === playerNameInput.value && entry.score === score) {
        fill(255, 255, 0, 50);
        rect(width/2 - 130, y - 5, 260, 25);
        fill(255, 255, 0);
      } else {
        fill(255);
      }
      
      text(`${i + 1}`, width/2 - 130, y);
      text(entry.name, width/2 - 80, y);
      text(entry.score, width/2 + 80, y);
    }
  }
  
  // Draw back button
  fill(100, 100, 200);
  rect(width/2 - 60, height/2 + 150, 120, 30, 5);
  fill(255);
  textAlign(CENTER, CENTER);
  text("BACK", width/2, height/2 + 165);
  
  // Check for back button click
  if (mouseIsPressed && 
      mouseX > width/2 - 60 && mouseX < width/2 + 60 &&
      mouseY > height/2 + 150 && mouseY < height/2 + 180) {
    leaderboardVisible = false;
  }
  
  // Back with ESC key
  if (keyIsDown(27)) { // ESC key
    leaderboardVisible = false;
  }
}

// Helper function to validate email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Add this function
function applyPowerup(type) {
  switch(type) {
    case 0: // Triple shot
      for (let i = -1; i <= 1; i++) {
        playerBullets.push({
          x: player.x + (i * 10),
          y: player.y - 10,
          speed: 5,
          size: 5
        });
      }
      break;
    case 1: // Shield (temporary invincibility)
      // Implementation would require tracking invincibility state
      break;
    case 2: // Clear screen
      enemies = [];
      enemyBullets = [];
      score += 50;
      break;
  }
}

// Add this function
async function testSupabaseConnection() {
  try {
    const { data, error } = await supabaseClient
      .from('leaderboard')
      .select('count(*)', { count: 'exact' });
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    console.log('Supabase connection successful!', data);
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
}