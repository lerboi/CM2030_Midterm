// Table dimensions and colors
let tableWidth, tableHeight;
let pocketSize;
let ballDiameter;

// Ball arrays and positions
let redBalls = [];
let coloredBalls = [];
let cueBall;

// D zone parameters
let dZoneRadius;
let baulkLineY;

// Matter.js variables
let engine;
let world;
let balls = [];
let cushions = [];
let pockets = [];

let cueAngle = 0;
let cuePower = 0;
let maxPower = 20;
let isCueing = false;

let lastCollidedBall = null;

// Add these variables at the top with other declarations
let cueStickLength = 150;
let minPower = 0.1;
let dragStartPos = null;
let isDragging = false;
let cueStickColor;
let cueStickWidth = 8;
let powerIndicatorHeight = 100;
let powerIndicatorWidth = 15;
let angleStep = 0.003;  
let keyboardControl = false;
let arrowKeyPressed = false;
let shotInProgress = false;
let defaultPower = 10;
let minForce = 0.1;
let maxForce = 20;
let maxDragDistance = 200;

function setup() {
  console.log("setup() called");
  createCanvas(800, 400);
  
  // Initialize Matter.js
  engine = Matter.Engine.create();
  world = engine.world;
  engine.world.gravity.y = 0;
  
  // Initialize table dimensions
  tableWidth = width * 0.9;
  tableHeight = height * 0.8;
  ballDiameter = tableWidth / 36;
  pocketSize = ballDiameter * 1.5;
  
  // Initialize D zone parameters - Updated for 8-ball pool
  dZoneRadius = tableWidth / 4;  // Adjusted radius
  baulkLineY = height/2;         // Center line of the table
  
  createTableBounds();
  createPockets();
  initializeBalls();
  setupCollisionTracking();
}

function draw() {
  console.log("draw() called");
  background(220);
  Matter.Engine.update(engine);
  
  // Update cue angle based on keyboard input
  if (keyboardControl && arrowKeyPressed) {
    if (keyIsDown(LEFT_ARROW)) {
      cueAngle -= angleStep;
    }
    if (keyIsDown(RIGHT_ARROW)) {
      cueAngle += angleStep;
    }
    // Keep angle between 0 and 2π
    cueAngle = cueAngle % TWO_PI;
  }
  
  // Check if shot has completed
  if (shotInProgress && isBallStopped()) {
    shotInProgress = false;
    isCueing = true;
  }
  
  drawTable();
  drawBalls();
  drawCue();
  displayGameInfo();
}

function drawTable() {
  // Main table
  push();
  translate(width/2, height/2);
  fill(34, 139, 34); // Green table
  rect(-tableWidth/2, -tableHeight/2, tableWidth, tableHeight);
  
  // Draw D zone line
  stroke(255);
  strokeWeight(2);
  line(-tableWidth/4, -tableHeight/2, -tableWidth/4, tableHeight/2);
  
  // Draw pockets
  fill(0);
  circle(-tableWidth/2, -tableHeight/2, pocketSize); // Top left
  circle(tableWidth/2, -tableHeight/2, pocketSize);  // Top right
  circle(-tableWidth/2, tableHeight/2, pocketSize);  // Bottom left
  circle(tableWidth/2, tableHeight/2, pocketSize);   // Bottom right
  circle(0, -tableHeight/2, pocketSize);            // Top middle
  circle(0, tableHeight/2, pocketSize);             // Bottom middle
  
  pop();
}

function initializeBalls() {
  console.log("initializeBalls() called");
  // Clear existing balls from world if any exist
  balls.forEach(ball => {
    if (ball.body) Matter.World.remove(world, ball.body);
  });
  balls = [];
  
  // Create red balls
  for (let i = 0; i < 15; i++) {
    let ball = {
      body: Matter.Bodies.circle(0, 0, ballDiameter/2, {
        restitution: 0.9,
        friction: 0.005,
        frictionAir: 0.01,
        density: 0.1
      }),
      color: '#FF0000'
    };
    balls.push(ball);
    Matter.World.add(world, ball.body);
  }
  
  // Create colored balls
  let colors = ['#FFD700', '#0F0', '#964B00', '#00F', '#FFC0CB', '#000'];
  colors.forEach(color => {
    let ball = {
      body: Matter.Bodies.circle(0, 0, ballDiameter/2, {
        restitution: 0.9,
        friction: 0.005,
        frictionAir: 0.01,
        density: 0.1
      }),
      color: color
    };
    balls.push(ball);
    Matter.World.add(world, ball.body);
  });
  
  // Create cue ball
  cueBall = {
    body: Matter.Bodies.circle(0, 0, ballDiameter/2, {
      restitution: 0.9,
      friction: 0.005,
      frictionAir: 0.01,
      density: 0.1
    }),
    color: '#FFFFFF'
  };
  Matter.World.add(world, cueBall.body);
  
  // Set initial positions
  setStartingPositions();
}

function setStartingPositions() {
  console.log("setStartingPositions() called");
  
  // Place cue ball in the D zone
  Matter.Body.setPosition(cueBall.body, {
    x: width/2 - tableWidth/3,
    y: height/2
  });
  Matter.Body.setVelocity(cueBall.body, { x: 0, y: 0 });
  
  // Place red balls in triangle formation
  let startX = width/2 + tableWidth/4;
  let startY = height/2;
  let rows = 5;
  let ballIndex = 0;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col <= row; col++) {
      let xPos = startX + col * ballDiameter - (row * ballDiameter/2);
      let yPos = startY - (row * ballDiameter) + (rows * ballDiameter/2);
      
      Matter.Body.setPosition(balls[ballIndex].body, {
        x: xPos,
        y: yPos
      });
      ballIndex++;
    }
  }
  
  // Place colored balls in their positions
  let colorPositions = [
    { x: width/2 - tableWidth/4, y: baulkLineY },  // Yellow
    { x: width/2 - tableWidth/6, y: baulkLineY },  // Green
    { x: width/2, y: baulkLineY },                 // Brown
    { x: width/2, y: height/2 },                   // Blue
    { x: startX - 2*ballDiameter, y: height/2 },   // Pink
    { x: width/2 + tableWidth/3, y: height/2 }     // Black
  ];
  
  for (let i = 0; i < colorPositions.length; i++) {
    Matter.Body.setPosition(balls[i + 15].body, {
      x: colorPositions[i].x,
      y: colorPositions[i].y
    });
  }
}

function keyPressed() {
  console.log("keyPressed() called");
  if (keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW) {
    keyboardControl = true;
    arrowKeyPressed = true;
  }
  
  // Number keys for ball positioning
  if (key === '1') {
    setStartingPositions();
  } else if (key === '2') {
    randomizeRedBalls();
  } else if (key === '3') {
    randomizeAllBalls();
  }
}

function keyReleased() {
  console.log("keyReleased() called");
  if (keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW) {
    arrowKeyPressed = false;
  }
}

function randomizeRedBalls() {
  for (let ball of redBalls) {
    ball.x = random(width/2 - tableWidth/2 + pocketSize, 
                    width/2 + tableWidth/2 - pocketSize);
    ball.y = random(height/2 - tableHeight/2 + pocketSize, 
                    height/2 + tableHeight/2 - pocketSize);
  }
}

function randomizeAllBalls() {
  randomizeRedBalls();
  for (let ball of coloredBalls) {
    ball.x = random(width/2 - tableWidth/2 + pocketSize, 
                    width/2 + tableWidth/2 - pocketSize);
    ball.y = random(height/2 - tableHeight/2 + pocketSize, 
                    height/2 + tableHeight/2 - pocketSize);
  }
}

function createPockets() {
  console.log("createPockets() called");
  const pocketPositions = [
    { x: width/2 - tableWidth/2, y: height/2 - tableHeight/2 }, // Top left
    { x: width/2, y: height/2 - tableHeight/2 },                // Top middle
    { x: width/2 + tableWidth/2, y: height/2 - tableHeight/2 }, // Top right
    { x: width/2 - tableWidth/2, y: height/2 + tableHeight/2 }, // Bottom left
    { x: width/2, y: height/2 + tableHeight/2 },                // Bottom middle
    { x: width/2 + tableWidth/2, y: height/2 + tableHeight/2 }  // Bottom right
  ];

  pocketPositions.forEach(pos => {
    let pocket = Matter.Bodies.circle(pos.x, pos.y, pocketSize/2, {
      isSensor: true,
      isStatic: true
    });
    pockets.push(pocket);
    Matter.World.add(world, pocket);
  });

  // Add collision detection for pockets
  Matter.Events.on(engine, 'collisionStart', function(event) {
    event.pairs.forEach((pair) => {
      const bodyA = pair.bodyA;
      const bodyB = pair.bodyB;
      
      if (pockets.includes(bodyA)) {
        handlePocketCollision(bodyB);
      } else if (pockets.includes(bodyB)) {
        handlePocketCollision(bodyA);
      }
    });
  });
}

function handlePocketCollision(ball) {
  console.log("handlePocketCollision() called");
  let pottedBall = balls.find(b => b.body === ball);
  
  if (ball === cueBall.body) {
    respotCueBall();
  } else if (pottedBall) {
    if (pottedBall.color === '#FF0000') {
      Matter.World.remove(world, ball);
      balls = balls.filter(b => b.body !== ball);
    } else {
      respotColoredBall(pottedBall);
    }
  }
}

function respotCueBall() {
  console.log("respotCueBall() called");
  // Place cue ball in the middle of the D zone
  Matter.Body.setPosition(cueBall.body, {
    x: width/2 - tableWidth/3,  // Positioned in the left quarter
    y: height/2                 // Vertically centered
  });
  Matter.Body.setVelocity(cueBall.body, { x: 0, y: 0 });
}

function respotColoredBall(ball) {
  console.log("respotColoredBall() called");
  const colorPositions = [
    { x: width/2 - tableWidth/4, y: baulkLineY },  // Yellow
    { x: width/2 - tableWidth/6, y: baulkLineY },  // Green
    { x: width/2, y: baulkLineY },                 // Brown
    { x: width/2, y: height/2 },                   // Blue
    { x: width/2 + tableWidth/4, y: height/2 },    // Pink
    { x: width/2 + tableWidth/3, y: height/2 }     // Black
  ];
  
  const index = balls.indexOf(ball);
  const spotPosition = colorPositions[index - 15]; // Subtract red balls count
  
  Matter.Body.setPosition(ball.body, spotPosition);
  Matter.Body.setVelocity(ball.body, { x: 0, y: 0 });
}

function drawCue() {
  console.log("drawCue() called");
  if (!isCueing || shotInProgress) return;
  
  const cuePos = cueBall.body.position;
  
  // Calculate power based on drag distance
  let power = defaultPower;
  if (isDragging && dragStartPos) {
    let dragDistance = dist(mouseX, mouseY, dragStartPos.x, dragStartPos.y);
    power = constrain(dragDistance / 100, 0, 1); // Normalize power between 0 and 1
    cuePower = power * maxPower;
  }
  
  push();
  translate(cuePos.x, cuePos.y);
  rotate(cueAngle);
  
  // Draw cue stick
  strokeWeight(cueStickWidth);
  stroke(139, 69, 19); // Brown color for cue stick
  let cueOffset = ballDiameter/2 + power * 50; // Offset increases with power
  line(cueOffset, 0, cueOffset + cueStickLength, 0);
  
  // Add highlight effect
  stroke(210, 180, 140, 100); // Lighter brown for highlight
  strokeWeight(2);
  line(cueOffset, -2, cueOffset + cueStickLength, -2);
  
  pop();
  
  // Draw power indicator
  if (isDragging || keyboardControl) {
    drawPowerIndicator(power);
  }
}

function drawPowerIndicator(power) {
  push();
  translate(width - 50, height/2 - powerIndicatorHeight/2);
  
  // Draw background
  fill(200);
  rect(0, 0, powerIndicatorWidth, powerIndicatorHeight);
  
  // Draw power level
  fill(255, 0, 0);
  let powerHeight = power * powerIndicatorHeight;
  rect(0, powerIndicatorHeight - powerHeight, powerIndicatorWidth, powerHeight);
  
  // Draw border
  noFill();
  stroke(0);
  strokeWeight(2);
  rect(0, 0, powerIndicatorWidth, powerIndicatorHeight);
  
  pop();
}

function mousePressed() {

  const cuePos = cueBall.body.position;
  const d = dist(mouseX, mouseY, cuePos.x, cuePos.y);
  
  if (d < ballDiameter * 2) {
    isCueing = true;
    isDragging = true;
    dragStartPos = createVector(mouseX, mouseY);
  } else if (isInsideDZone(mouseX, mouseY)) {
    // Allow placing the cue ball in the D zone
    Matter.Body.setPosition(cueBall.body, { x: mouseX, y: mouseY });
    Matter.Body.setVelocity(cueBall.body, { x: 0, y: 0 });
  }
}

function mouseMoved() {
  if (!isCueing) return;
  
  const cuePos = cueBall.body.position;
  cueAngle = atan2(mouseY - cuePos.y, mouseX - cuePos.x);
}

function mouseDragged() {
  if (!isDragging) return;
  
  const cuePos = cueBall.body.position;
  cueAngle = atan2(mouseY - cuePos.y, mouseX - cuePos.x);
}

function mouseReleased() {
  console.log("mouseReleased() called");
  if (isDragging) {
    if (cuePower > minPower) {
      executeShot();
    }
    isDragging = false;
    isCueing = false;
    cuePower = 0;
    dragStartPos = null;
  }
}

function shootCueBall() {
  console.log("shootCueBall() called");
  const forceMagnitude = cuePower * 0.08;
  const force = {
    x: cos(cueAngle + PI) * forceMagnitude,
    y: sin(cueAngle + PI) * forceMagnitude
  };
  
  // Apply force to the cue ball
  Matter.Body.applyForce(cueBall.body, cueBall.body.position, force);
}

function displayGameInfo() {
  fill(0);
  noStroke();
  textSize(16);
  text(`Red Balls Remaining: ${balls.filter(b => b.color === '#FF0000').length}`, 10, 20);
  text(`Use Arrow Keys (←/→) to aim`, 10, 40);
  if (keyboardControl) {
    text(`Angle: ${(cueAngle * 180 / PI).toFixed(1)}°`, 10, 60);
  }
}

function setupCollisionTracking() {
  console.log("setupCollisionTracking() called");
  Matter.Events.on(engine, 'collisionStart', function(event) {
    event.pairs.forEach((pair) => {
      if (pair.bodyA === cueBall.body || pair.bodyB === cueBall.body) {
        const otherBody = pair.bodyA === cueBall.body ? pair.bodyB : pair.bodyA;
        const collidedBall = balls.find(b => b.body === otherBody);
        
        if (collidedBall) {
          handleBallCollision(collidedBall);
        } else if (cushions.includes(otherBody)) {
          console.log('Cue ball hit a cushion');
        }
      }
    });
  });
}

function handleBallCollision(collidedBall) {
  console.log("handleBallCollision() called");
  if (lastCollidedBall && lastCollidedBall.color !== '#FF0000' && 
      collidedBall.color !== '#FF0000') {
    console.log('Foul: Two consecutive colored balls hit');
  }
  
  lastCollidedBall = collidedBall;
}

function drawBalls() {
  // Draw all balls using their physics positions
  balls.forEach(ball => {
    push();
    translate(ball.body.position.x, ball.body.position.y);
    rotate(ball.body.angle); // Rotate based on physics angle
    
    // Draw ball
    fill(ball.color);
    circle(0, 0, ballDiameter);
    
    // Add a small dot to visualize rotation
    fill(255);
    circle(0, -ballDiameter/4, 3);
    pop();
  });
  
  // Draw cue ball with rotation
  push();
  translate(cueBall.body.position.x, cueBall.body.position.y);
  rotate(cueBall.body.angle);
  fill(255);
  circle(0, 0, ballDiameter);
  fill(0);
  circle(0, -ballDiameter/4, 3);
  pop();
}

function createTableBounds() {
  console.log("createTableBounds() called");
  let cushionOptions = {
    isStatic: true,
    restitution: 0.8, // Adjusted restitution for cushions
    friction: 0.1
  };
  
  // Create cushions (table bounds)
  cushions = [
    // Top cushion
    Matter.Bodies.rectangle(width/2, height/2 - tableHeight/2, tableWidth, 10, cushionOptions),
    // Bottom cushion
    Matter.Bodies.rectangle(width/2, height/2 + tableHeight/2, tableWidth, 10, cushionOptions),
    // Left cushion
    Matter.Bodies.rectangle(width/2 - tableWidth/2, height/2, 10, tableHeight, cushionOptions),
    // Right cushion
    Matter.Bodies.rectangle(width/2 + tableWidth/2, height/2, 10, tableHeight, cushionOptions)
  ];
  
  cushions.forEach(cushion => Matter.World.add(world, cushion));
}

function isInsideDZone(x, y) {
  console.log("isInsideDZone() called");
  const dZoneCenterX = width/2 - tableWidth/3;
  const dZoneCenterY = height/2;
  const dZoneRadius = tableWidth / 6;
  
  const distance = dist(x, y, dZoneCenterX, dZoneCenterY);
  return distance <= dZoneRadius;
}

function executeShot() {
  console.log("executeShot() called");
  if (!isCueing || shotInProgress) return;
  
  const power = isDragging ? cuePower : defaultPower;
  const forceMagnitude = power * 0.08;
  const force = {
    x: cos(cueAngle + PI) * forceMagnitude,
    y: sin(cueAngle + PI) * forceMagnitude
  };
  
  Matter.Body.applyForce(cueBall.body, cueBall.body.position, force);
  shotInProgress = true;
  isCueing = false;
  isDragging = false;
  dragStartPos = null;
}

function isBallStopped() {
  const velocity = cueBall.body.velocity;
  const speedThreshold = 0.01;
  return Math.abs(velocity.x) < speedThreshold && Math.abs(velocity.y) < speedThreshold;
}
