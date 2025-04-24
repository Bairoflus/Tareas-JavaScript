/*
 * Simple animation on the HTML canvas
 *
 * Gilberto Echeverria
 * 2025-04-21
 */

"use strict";

// Global variables
const canvasWidth = 800;
const canvasHeight = 600;

// Context of the Canvas
let ctx;

// A variable to store the game object
let game;

// Variable to store the time at the previous frame
let oldTime;

let playerSpeed = 0.5;
let animationDelay = 200;
const maxCoins = 5; // Maximum number of coins on screen at once
const minSpawnTime = 1000; // Minimum time between coin spawns (ms)
const maxSpawnTime = 3000; // Maximum time between coin spawns (ms)

const keyDirections = {
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

const playerMovement = {
  up: {
    axis: "y",
    direction: -1,
    frames: [60, 69],
    repeat: true,
    duration: animationDelay,
  },
  down: {
    axis: "y",
    direction: 1,
    frames: [40, 49],
    repeat: true,
    duration: animationDelay,
  },
  left: {
    axis: "x",
    direction: -1,
    frames: [50, 59],
    repeat: true,
    duration: animationDelay,
  },
  right: {
    axis: "x",
    direction: 1,
    frames: [70, 79],
    repeat: true,
    duration: animationDelay,
  },
  idle: {
    axis: "y",
    direction: 0,
    frames: [0, 2],
    repeat: true,
    duration: animationDelay,
  },
};
class Coin extends AnimatedObject {
  constructor(position, width, height, color, sheetCols) {
    super(position, width, height, color, "coin", sheetCols);
    this.keys = [];
  }

  update(deltaTime) {
    this.updateFrame(deltaTime);
  }
}
// Class for the main character in the game
class Player extends AnimatedObject {
  constructor(position, width, height, color, sheetCols) {
    super(position, width, height, color, "player", sheetCols);
    this.velocity = new Vec(0, 0);
    this.keys = [];
    this.previousDirection = "down";
    this.currentDirection = "down";
  }

  update(deltaTime) {
    this.setVelocity();
    this.setMovementAnimation();
    this.position = this.position.plus(this.velocity.times(deltaTime));
    this.constrainToCanvas();
    this.updateFrame(deltaTime);
  }

  constrainToCanvas() {
    if (this.position.y < 0) {
      this.position.y = 0;
    } else if (this.position.y + this.height > canvasHeight) {
      this.position.y = canvasHeight - this.height;
    } else if (this.position.x < 0) {
      this.position.x = 0;
    } else if (this.position.x + this.width > canvasWidth) {
      this.position.x = canvasWidth - this.width;
    }
  }

  setVelocity() {
    this.velocity = new Vec(0, 0);
    for (const key of this.keys) {
      const move = playerMovement[key];
      this.velocity[move.axis] += move.direction;
    }
    this.velocity = this.velocity.normalize().times(playerSpeed);
  }

  setMovementAnimation() {
    // Identify the current movement direction
    if (Math.abs(this.velocity.y) > Math.abs(this.velocity.x)) {
      if (this.velocity.y > 0) {
        this.currentDirection = "down";
      } else if (this.velocity.y < 0) {
        this.currentDirection = "up";
      } else {
        this.currentDirection = "idle";
      }
    } else {
      if (this.velocity.x > 0) {
        this.currentDirection = "right";
      } else if (this.velocity.x < 0) {
        this.currentDirection = "left";
      } else {
        this.currentDirection = "idle";
      }
    }

    // Select the correct animation
    if (this.currentDirection != this.previousDirection) {
      const anim = playerMovement[this.currentDirection];
      this.setAnimation(...anim.frames, anim.repeat, anim.duration);
    }

    // Update direction
    this.previousDirection = this.currentDirection;
  }
}

// Class to keep track of all the events and objects in the game
class Game {
  constructor() {
    this.createEventListeners();
    this.initObjects();
  }

  initObjects() {
    this.player = new Player(
      new Vec(canvasWidth / 2, canvasHeight / 2),
      32,
      32,
      "red",
      10
    );
    this.player.setSprite(
      "../assets/sprites/link_sprite_sheet.png",
      new Rect(0, 0, 120, 130)
    );
    this.player.setAnimation(7, 7, false, animationDelay);
    
    this.coins = [];
    this.nextSpawnTime = 0;
    this.totalTime = 0; 
  }

  draw(ctx) {
    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw coins
    for (let coin of this.coins) {
      if (!coin.collected) {
        coin.draw(ctx);
      }
    }
    
    // Draw player
    this.player.draw(ctx);
  }

  update(deltaTime) {
    for (let actor of this.actors) {
      actor.update(deltaTime);
    }
    if (this.coin) {
      this.coin.update(deltaTime);
      this.checkCollision();
    }
    this.player.update(deltaTime);
  }

  update(deltaTime) {
    this.totalTime += deltaTime;
    
    // Update player
    this.player.update(deltaTime);
    
    // Update coins
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      if (coin.collected) {
        this.coins.splice(i, 1);
      } else {
        coin.update(deltaTime);
      }
    }
    
    // Spawn new coins
    if (this.totalTime >= this.nextSpawnTime && this.coins.length < maxCoins) {
      this.spawnCoin();
      this.nextSpawnTime = this.totalTime + this.getRandomSpawnTime();
    }
    
    // Check collisions
    this.checkCollisions();
  }

  spawnCoin() {
    const coin = new Coin(
      new Vec(
        Math.random() * (canvasWidth - 32),
        Math.random() * (canvasHeight - 32)
      ),
      32,
      32,
      "gold",
      8
    );
    coin.setSprite(
      "../assets/sprites/coin_gold.png",
      new Rect(0, 0, 32, 32)
    );
    coin.setAnimation(0, 7, true, animationDelay);
    this.coins.push(coin);
  }

  getRandomSpawnTime() {
    return minSpawnTime + Math.random() * (maxSpawnTime - minSpawnTime);
  }

  checkCollisions() {
    for (let coin of this.coins) {
      if (!coin.collected && boxOverlap(this.player, coin)) {
        coin.collected = true;
      }
    }
  }

  createEventListeners() {
    window.addEventListener("keydown", (event) => {
      if (Object.keys(keyDirections).includes(event.key)) {
        this.add_key(keyDirections[event.key]);
      }
    });

    window.addEventListener("keyup", (event) => {
      if (Object.keys(keyDirections).includes(event.key)) {
        this.del_key(keyDirections[event.key]);
      }
    });
  }

  add_key(direction) {
    if (!this.player.keys.includes(direction)) {
      this.player.keys.push(direction);
    }
  }

  del_key(direction) {
    let index = this.player.keys.indexOf(direction);
    if (index != -1) {
      this.player.keys.splice(index, 1);
    }
  }
}

// Starting function that will be called from the HTML page
function main() {
  // Get a reference to the object with id 'canvas' in the page
  const canvas = document.getElementById("canvas");
  // Resize the element
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  // Get the context for drawing in 2D
  ctx = canvas.getContext("2d");

  // Create the game object
  game = new Game();

  drawScene(0);
}

// Main loop function to be called once per frame
function drawScene(newTime) {
  if (oldTime == undefined) {
    oldTime = newTime;
  }
  let deltaTime = newTime - oldTime;

  // Clean the canvas so we can draw everything again
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  game.draw(ctx);
  game.update(deltaTime);

  oldTime = newTime;
  requestAnimationFrame(drawScene);
}