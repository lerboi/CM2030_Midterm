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
let cueStickLength = 150;
let minPower = 0.1;
let dragStartPos = null;
let isDragging = false;
let cueStickColor;
let cueStickWidth = 8;
let powerIndicatorHeight = 100;
let powerIndicatorWidth = 15;
let angleStep = 0.009;  
let keyboardControl = false;
let arrowKeyPressed = false;
let shotInProgress = false;
let defaultPower = 10;
let minForce = 0.1;
let maxForce = 20;
let maxDragDistance = 200;
let canPlaceCueBall = false;
let cueBallPocketed = false;
let showTrajectory = false;
let trajectoryLength = 200; 
let initialPlacement = true;

function setup() {
  console.log("setup() called");
  createCanvas(800, 400);
  
  // Initialize Matter.js
  engine = Matter.Engine.create();
  world = engine.world;
  engine.world.gravity.y = 0;
  
  // Initialize table dimensions with correct proportions
  tableWidth = width * 0.9;
  tableHeight = height * 0.8;
  
  // Adjust ball diameter to be 2% of table width
  ballDiameter = tableWidth * 0.02;
  pocketSize = ballDiameter * 1.5;
  
  // D zone parameters - approximately 19.64% of table width
  dZoneRadius = tableWidth * 0.0982;
  baulkLineY = height/2;
  
  createTableBounds();
  createPockets();
  initializeBalls();
  setupCollisionTracking();
  
  // Set initial state for cue ball placement
  canPlaceCueBall = true;
  initialPlacement = true;
}

function draw() {
  background(220);
  Matter.Engine.update(engine);
  
  // Handle keyboard input for cue rotation
  if (!shotInProgress && !cueBallPocketed && !initialPlacement) {
    if (keyIsDown(LEFT_ARROW)) {
      cueAngle -= angleStep;
    }
    if (keyIsDown(RIGHT_ARROW)) {
      cueAngle += angleStep;
    }
  }
  
  drawTable();
  drawBalls();
  
  // Check if shot completed and all balls stopped
  if (shotInProgress && isBallStopped()) {
    shotInProgress = false;
    if (!cueBallPocketed) {
      isCueing = true;
    }
  }
  
  // Only draw cue if were able to shoot
  if (!shotInProgress && !cueBallPocketed && !initialPlacement) {
    drawCue();
  }
  
  // Display placement message at start of game or when cue ball is pocketed
  if (canPlaceCueBall) {
    fill(255, 0, 0);
    textSize(20);
    if (initialPlacement) {
      text("Click in D zone to place cue ball for break", 10, height - 20);
    } else {
      text("Click in D zone to place cue ball", 10, height - 20);
    }
  }
  
  displayGameInfo();
}

function drawTable() {
  push();
  translate(width/2, height/2);
  
  // Draw table surface
  fill(34, 139, 34); 
  rect(-tableWidth/2, -tableHeight/2, tableWidth, tableHeight);
  
  // Draw baulk line
  stroke(255);
  strokeWeight(2);
  line(-tableWidth/4, -tableHeight/2, -tableWidth/4, tableHeight/2);
  
  // Draw D zone
  noFill();
  arc(-tableWidth/4, 0, dZoneRadius * 2, dZoneRadius * 2, HALF_PI, -HALF_PI);
  
  // Draw pockets
  fill(0);
  circle(-tableWidth/2, -tableHeight/2, pocketSize);
  circle(tableWidth/2, -tableHeight/2, pocketSize);  
  circle(-tableWidth/2, tableHeight/2, pocketSize);  
  circle(tableWidth/2, tableHeight/2, pocketSize);   
  circle(0, -tableHeight/2, pocketSize);            
  circle(0, tableHeight/2, pocketSize);             
  
  pop();
}

function initializeBalls() {
  console.log("initializeBalls() called");
  // Clear existing balls
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
  
  // Set starting positions
  setStartingPositions();
}

function setStartingPositions() {
  console.log("setStartingPositions() called");
  
  // Stop all ball motion
  balls.forEach(ball => {
    Matter.Body.setVelocity(ball.body, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(ball.body, 0);
  });
  Matter.Body.setVelocity(cueBall.body, { x: 0, y: 0 });
  Matter.Body.setAngularVelocity(cueBall.body, 0);
  
  // Reset placement state
  canPlaceCueBall = true;
  initialPlacement = true;
  isCueing = false;
  
  // Place colored balls and red balls in their positions
  const colorPositions = [
    { x: width/2 - tableWidth/4, y: height/3 }, // Yellow (left of brown)
    { x: width/2 - tableWidth/4, y: height/3*2 }, // Green (right of brown)
    { x: width/2 - tableWidth/4, y: height/2 }, // Brown (on baulk line)
    { x: width/2, y: height/2 }, // Blue (center spot)
    { x: width/2 + tableWidth/6, y: height/2 }, // Pink (pyramid spot)
    { x: width/2 + tableWidth/2.8, y: height/2 } // Black (near top cushion)
  ];
  
  // Set colored balls positions
  for (let i = 0; i < colorPositions.length; i++) {
    Matter.Body.setPosition(balls[i + 15].body, colorPositions[i]);
  }
  
  let startX = width/2 + tableWidth/4.1; // Start from above pink spot
  let startY = height/2;
  let rows = 5;
  let ballIndex = 0;
  let spacing = ballDiameter * 1.1; 
  let angle = -PI/-2; 
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col <= row; col++) {
      // Calculate original position
      let x = col * spacing - (row * spacing/2);
      let y = -(row * spacing) + (rows * spacing/2);
      
      // Apply rotation
      let rotatedX = x * cos(angle) - y * sin(angle);
      let rotatedY = x * sin(angle) + y * cos(angle);
      let xPos = startX + rotatedX;
      let yPos = startY + rotatedY;
      
      Matter.Body.setPosition(balls[ballIndex].body, {
        x: xPos,
        y: yPos
      });
      ballIndex++;
    }
  }
}

function keyPressed() {
  // Number keys for ball positioning and features
  if (key === '1' && !shotInProgress && isBallStopped()) {
    setStartingPositions();
  } else if (key === '2' && !shotInProgress && isBallStopped()) {
    randomizeRedBalls();
  } else if (key === '3' && !shotInProgress && isBallStopped()) {
    randomizeAllBalls();
  } else if (key === '4') {
    showTrajectory = !showTrajectory;
  }
}

function keyReleased() {
  console.log("keyReleased() called");
  if (keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW) {
    arrowKeyPressed = false;
  }
}

function randomizeRedBalls() {
  // Only randomize the first 15 balls (red balls)
  for (let i = 0; i < 15; i++) {
    let newX = random(width/2 - tableWidth/2 + pocketSize, width/2 + tableWidth/2 - pocketSize);
    let newY = random(height/2 - tableHeight/2 + pocketSize, height/2 + tableHeight/2 - pocketSize);
    
    Matter.Body.setPosition(balls[i].body, {
      x: newX,
      y: newY
    });
    Matter.Body.setVelocity(balls[i].body, { x: 0, y: 0 });
  }
}

function randomizeAllBalls() {
  // Randomize all balls except the cue ball
  for (let i = 0; i < balls.length; i++) {
    let newX = random(width/2 - tableWidth/2 + pocketSize, width/2 + tableWidth/2 - pocketSize);
    let newY = random(height/2 - tableHeight/2 + pocketSize, height/2 + tableHeight/2 - pocketSize);
    
    Matter.Body.setPosition(balls[i].body, {
      x: newX,
      y: newY
    });
    Matter.Body.setVelocity(balls[i].body, { x: 0, y: 0 });
  }
}

function createPockets() {
  console.log("createPockets() called");
  const pocketPositions = [
    { x: width/2 - tableWidth/2, y: height/2 - tableHeight/2 }, // Top left
    { x: width/2, y: height/2 - tableHeight/2 }, // Top middle
    { x: width/2 + tableWidth/2, y: height/2 - tableHeight/2 }, // Top right
    { x: width/2 - tableWidth/2, y: height/2 + tableHeight/2 }, // Bottom left
    { x: width/2, y: height/2 + tableHeight/2 }, // Bottom middle
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
    Matter.World.remove(world, ball);
    cueBallPocketed = true;
    shotInProgress = false;
    // Wait for all balls to stop before allowing placement
    if (isBallStopped()) {
      respotCueBall();
    }
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
  // Add cue ball back
  Matter.World.add(world, cueBall.body);
  // Place cue ball in the middle of the D zone
  Matter.Body.setPosition(cueBall.body, {
    x: width/2 - tableWidth/3,
    y: height/2
  });
  Matter.Body.setVelocity(cueBall.body, { x: 0, y: 0 });
  canPlaceCueBall = true;
  cueBallPocketed = false;
}

function respotColoredBall(ball) {
  console.log("respotColoredBall() called");
  const colorPositions = [
    { x: width/2 - tableWidth/3, y: height/2 - ballDiameter }, // Yellow
    { x: width/2 - tableWidth/3, y: height/2 + ballDiameter }, // Green
    { x: width/2 - tableWidth/4, y: height/2 },                // Brown
    { x: width/2, y: height/2 },                              // Blue
    { x: width/2 + tableWidth/4, y: height/2 },               // Pink
    { x: width/2 + tableWidth/3, y: height/2 }                // Black
  ];
  
  const index = balls.indexOf(ball);
  if (index >= 15 && index < balls.length) {
    const spotPosition = colorPositions[index - 15]; 
    Matter.Body.setPosition(ball.body, spotPosition);
    Matter.Body.setVelocity(ball.body, { x: 0, y: 0 });
  }
}

function drawCue() {
  if (!isCueing || shotInProgress) return;
  
  const cuePos = cueBall.body.position;
  
  // Calculate power based on drag distance
  let power = 0;
  if (isDragging && dragStartPos) {
    let dragDistance = dist(mouseX, mouseY, dragStartPos.x, dragStartPos.y);
    power = constrain(dragDistance / 100, 0, 1); 
    cuePower = power * maxPower;
  }
  
  // Draw trajectory line if enabled
  if (showTrajectory) {
    drawTrajectoryLine(cuePos);
  }
  
  push();
  translate(cuePos.x, cuePos.y);
  rotate(cueAngle);
  
  // Draw cue stick
  strokeWeight(cueStickWidth);
  stroke(139, 69, 19); 
  let cueOffset = ballDiameter/2 + power * 50; 
  line(cueOffset, 0, cueOffset + cueStickLength, 0);
  
  // Add highlight effect
  stroke(210, 180, 140, 100);
  strokeWeight(2);
  line(cueOffset, -2, cueOffset + cueStickLength, -2);
  
  pop();
  
  // Only draw power indicator when actively dragging
  if (isDragging && dragStartPos) {
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
  if (canPlaceCueBall && isInsideDZone(mouseX, mouseY)) {
    // Allow placing the cue ball in D zone
    Matter.Body.setPosition(cueBall.body, { x: mouseX, y: mouseY });
    Matter.Body.setVelocity(cueBall.body, { x: 0, y: 0 });
    
    if (initialPlacement) {
      initialPlacement = false;
    }
    canPlaceCueBall = false;
    isCueing = true;
  } else if (!shotInProgress && !cueBallPocketed) {
    // Normal cue stick interaction
    const cuePos = cueBall.body.position;
    const d = dist(mouseX, mouseY, cuePos.x, cuePos.y);
    
    if (d < ballDiameter * 2) {
      isCueing = true;
      isDragging = true;
      dragStartPos = createVector(mouseX, mouseY);
      cuePower = 0;
    }
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
  if (isDragging) {
    if (cuePower > minPower) {
      executeShot();
    }
    isDragging = false;
    dragStartPos = null;
  }
  
  if (canPlaceCueBall && isInsideDZone(mouseX, mouseY)) {
    canPlaceCueBall = false;
    isCueing = true;
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
    rotate(ball.body.angle); 
    
    // Draw ball
    fill(ball.color);
    circle(0, 0, ballDiameter);
    
    // Add a small dot (for visualisation)
    fill(255);
    circle(0, -ballDiameter/4, 3);
    pop();
  });
  
  // Draw cue ball with rotation (feature)
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
    restitution: 0.8, 
    friction: 0.1
  };
  
  // Create cushions
  cushions = [
    Matter.Bodies.rectangle(width/2, height/2 - tableHeight/2, tableWidth, 10, cushionOptions),
    Matter.Bodies.rectangle(width/2, height/2 + tableHeight/2, tableWidth, 10, cushionOptions),
    Matter.Bodies.rectangle(width/2 - tableWidth/2, height/2, 10, tableHeight, cushionOptions),
    Matter.Bodies.rectangle(width/2 + tableWidth/2, height/2, 10, tableHeight, cushionOptions)
  ];
  
  cushions.forEach(cushion => Matter.World.add(world, cushion));
}

function isInsideDZone(x, y) {
  console.log("isInsideDZone() called");
  const dZoneCenterX = width/2 - tableWidth/4;
  const dZoneCenterY = height/2;
  
  // Check if point is within the D zone semicircle
  if (x > dZoneCenterX) return false; // Point is right of the baulk line
  
  const distance = dist(x, y, dZoneCenterX, dZoneCenterY);
  return distance <= dZoneRadius;
}

function executeShot() {
  if (!isCueing || shotInProgress) return;
  
  const force = cuePower;
  const angle = cueAngle + PI; // Add PI to reverse direction
  
  Matter.Body.setVelocity(cueBall.body, {
    x: cos(angle) * force,
    y: sin(angle) * force
  });
  
  shotInProgress = true;
  isCueing = false;
  isDragging = false;
  dragStartPos = null;
}

function isBallStopped() {
  // Check if all balls have stopped moving
  let allStopped = true;
  const velocityThreshold = 0.01;
  
  balls.forEach(ball => {
    const velocity = ball.body.velocity;
    if (Math.abs(velocity.x) > velocityThreshold || Math.abs(velocity.y) > velocityThreshold) {
      allStopped = false;
    }
  });
  
  if (!cueBallPocketed) {
    const cueVelocity = cueBall.body.velocity;
    if (Math.abs(cueVelocity.x) > velocityThreshold || Math.abs(cueVelocity.y) > velocityThreshold) {
      allStopped = false;
    }
  }
  
  return allStopped;
}

function drawTrajectoryLine(cuePos) {
  push();
  // Set line style for trajectory
  stroke(255, 255, 255, 150); 
  strokeWeight(2);
  setLineDash([5, 5]); // Dashed line
  
  // Calculate end point of trajectory line
  let endX = cuePos.x + cos(cueAngle + PI) * trajectoryLength;
  let endY = cuePos.y + sin(cueAngle + PI) * trajectoryLength;
  
  // Draw the line
  line(cuePos.x, cuePos.y, endX, endY);
  
  // Draw a small circle at the end of the line
  noStroke();
  fill(255, 255, 255, 150);
  circle(endX, endY, 5);
  
  pop();
}

function setLineDash(list) {
  drawingContext.setLineDash(list);
}
