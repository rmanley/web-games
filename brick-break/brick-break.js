var canvas;
var context;
var paddle;
var ball;
const BALL_SPEED = 4.0;
var score = 0;
var lives = 3;
var isGameOver = false;
const GAME_OVER = 'gameOver';
var soundEffects;

var delta = 0;
let oldTimestamp = 0;

function runGame(timestamp, update, render) {
    delta = (timestamp - oldTimestamp) / 1000;
    delta = Math.min(delta, 0.1);
    oldTimestamp = timestamp;

    if (isGameOver) {
        dispatchEvent(
            new CustomEvent(GAME_OVER)
        );
        return;
    }

    update(delta);
    render();
    requestAnimationFrame((timestamp) => {
        runGame(timestamp, update, render);
    });
}

function init() {
    isGameOver = false;
    
    ball = new Ball(
        new Vector2(
            canvas.width / 2 - 32.5, 
            canvas.height - 40
        ), 
        10, 
        'magenta'
    );
    ball.velocity = new Vector2(BALL_SPEED, -BALL_SPEED);
    
    const bricks = buildBricks();
    
    paddle = new Paddle(
        new Vector2(
            canvas.width / 2 - 32.5,
            canvas.height - 30
        ),
        75,
        15,
        '#0095DD'
    );
    
    initPaddleContols(paddle);
    requestAnimationFrame((timestamp) => {
        runGame(
            timestamp,
            (delta) => {
                ball.update(delta);
                checkPaddleCollisions(paddle, ball);
                checkBallCollisions(ball);
                checkBrickCollisions(bricks, ball);
            },
            () => {
                context.clearRect(
                    0, 
                    0, 
                    canvas.width, 
                    canvas.height
                );
                displayHUD(context);
                ball.render(context);
                paddle.render(context);
                bricks.forEach((row) => {
                    row.forEach((brick) => {
                        brick.render(context);
                    })
                });
            }
        )
    });
    soundEffects.music.sound.volume = 1;
    soundEffects.music.play();
}

function initPaddleContols(paddle) {
    const onMouseMove = (event) => {
        let x = event.pageX;
        paddle.position.x = x - canvas.offsetLeft - paddle.width / 2;
    };
    window.addEventListener('mousemove', onMouseMove, false);
    
    window.addEventListener('touchmove', function isMobile(event) {
        window.removeEventListener('mousemove', onMouseMove, false);
        window.removeEventListener('touchmove', isMobile, false);
    }, false);
    
    window.ontouchmove = (event) => {
        let x = event.touches[0].pageX;
        paddle.position.x = x - canvas.offsetLeft - paddle.width / 2;
    };
}

function buildBricks() {
    const bricks = [];
    const rows = 6;
    const columns = 6;
    const padding = 0;
    const offsetTop = 35;
    const offsetStart = 0;
    const width = 70;
    const height = 20;
    const colors = [
        'red', 'orange', 'tan', 'yellow', 'green', 'blue'
    ];
    
    for (let row = 0; row < rows; row++) {
        bricks[row] = [];
        for (let column = 0; column < columns; column++) {
            bricks[row][column] = new Brick(
                new Vector2(
                    column * (width + padding) + offsetStart,
                    row * (height + padding) + offsetTop
                ),
                width,
                height,
                colors[row]
            );
        }
    }
    
    return bricks;
}

let bricksBroken = 0;
function checkBrickCollisions(bricks, ball) {
    bricks.forEach((row, rowIndex) => {
        row.forEach((brick) => {
            if (brick.enabled && 
            ball.position.x + ball.radius > brick.position.x &&
            ball.position.x < brick.position.x + brick.width &&
            ball.position.y + ball.radius > brick.position.y &&
            ball.position.y < brick.position.y + brick.height) {
                soundEffects.brickHits[rowIndex].play();
                ball.velocity.x *= Math.random() > 0.5 ? 1 : -1;
                ball.velocity.y *= -1;
                brick.enabled = false;
                bricksBroken++;
                score += lives * 20;
                if (bricksBroken == bricks.length * row.length) {
                    gameOver(`YOU WIN!\nSCORE: ${score}`);
                }
            }
        });
    });
}

function displayPlayButton(context, canvas) {
    context.font = '32px "Press Start 2P"';
    context.fillStyle = 'white';
    context.fillText('PLAY', canvas.width / 2 - 60, canvas.height / 2);
}

function displayHUD(context) { 
    context.font = '16px Arial'; 
    context.fillStyle = 'white';
    context.fillText(`Score: ${score}`, 10, 20); 
    context.fillText(`Lives: ${lives}`, canvas.width - 65, 20);
}

function checkPaddleCollisions(paddle, ball) {
    // paddle hit top
    if (ball.position.x >= paddle.position.x && 
        ball.position.x <= paddle.position.x + paddle.width && 
        ball.position.y >= paddle.position.y - ball.radius
    ) {
        soundEffects.paddleHit.play();
        ball.velocity.y = -BALL_SPEED;
    }
    
    // paddle hit left
    if (ball.position.x >= paddle.position.x - ball.radius &&
        ball.position.x < paddle.position.x &&
        ball.position.y >= paddle.position.y &&
        ball.position.y <= paddle.position.y + paddle.height) {
        soundEffects.paddleHit.play();
        ball.velocity = new Vector2(-BALL_SPEED, -BALL_SPEED);
    }
    
    // paddle hit right
    if (ball.position.x <= paddle.position.x + paddle.width + ball.radius &&
        ball.position.x > paddle.position.x + paddle.width &&
        ball.position.y >= paddle.position.y &&
        ball.position.y <= paddle.position.y + paddle.height) {
        soundEffects.paddleHit.play();
        ball.velocity = new Vector2(BALL_SPEED, -BALL_SPEED);
    }
    
    if (paddle.position.x < 0) {
        paddle.position.x = 0;
    }
    if (paddle.position.x > canvas.width - paddle.width) {
        paddle.position.x = canvas.width - paddle.width;
    }
}

function checkBallCollisions(ball) {
    if (ball.position.x < ball.radius || 
        ball.position.x + ball.velocity.x > canvas.width - ball.radius
    ) {
        soundEffects.wallHit.play();
        ball.velocity.x *= -1;
    }
    if (ball.position.y < ball.radius) {
        soundEffects.wallHit.play();
        ball.velocity.y *= -1;
    }
    if (ball.position.y + ball.velocity.y > canvas.height - ball.radius) {
        loseLife();
    }
}

function loseLife() {
    soundEffects.lifeLost.play();
    lives--;
    score -= 100;
    if (lives == 0) {
        gameOver('GAME OVER');
    } else {
        ball.velocity.y *= -1;
        paddle.isHurt = true;
    }
}

function gameOver(message) {
    soundEffects.music.pause();
    isGameOver = true;
    alert(message);
    //location.reload();
    bricksBroken = 0;
    score = 0;
    lives = 3;
}

class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    
    plus(other) {
        this.x += other.x;
        this.y += other.y;
        return this;
    }
    
    minus(other) {
        this.x -= other.x;
        this.y -= other.y;
        return this;
    }
    
    scale(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }

    scaled(scalar) {
        return this.copy(
            this.x * scalar,
            this.y * scalar
        );
    }

    copy() {
        return new Vector2(
            this.x,
            this.y
        );
    }

    toString() {
        return JSON.stringify(this);
    }
    
    static Zero() {
        return new Vector2(0, 0);
    }    
}

class Ball {
    constructor(position, radius, color) {
        this.position = position;
        this.radius = radius;
        this.color = color;
        this.velocity = Vector2.Zero();
    }
    
    update(delta) {
        this.position.plus(this.velocity.scaled(delta));
    }
    
    render(context) {
        context.beginPath();
        context.arc(
            this.position.x,
            this.position.y,
            this.radius,
            0,
            2 * Math.PI
        )
        context.fillStyle = this.color;
        context.fill();
        context.closePath();
    }
}

class Paddle {
    constructor(position, width, height, color) {
        this.position = position;
        this.width = width;
        this.height = height;
        this.color = color;
        this.velocity = Vector2.Zero();
        this.friction = 0.9;
        this.acceleration = 4;
        this.isHurt = false;
        this.hurtDuration = 0;
        this.hurtStartTime = 0;
        this.flashFrequency = 200;
    }
    
    render(context) {
        if (!this.isHurt || Math.floor(Date.now() / this.flashFrequency) % 2) {
            context.beginPath();
            context.rect(
                this.position.x,
                this.position.y,
                this.width,
                this.height
            );
            context.fillStyle = this.color;
            context.fill();
            context.closePath();
        }
        if (this.isHurt) {
            if (this.hurtStartTime == 0) {
                this.hurtStartTime = Date.now();
            } else {
                this.hurtDuration = Date.now() - this.hurtStartTime;
                this.hurtDuration %= 60 * 1000;
            }
            
            if (this.hurtDuration >= 2000) {
                this.isHurt = false;
                this.hurtDuration = 0;
                this.hurtStartTime = 0;
            }
        }
    }
    
    moveLeft() {
        this.velocity.x -= this.acceleration + this.friction * this.velocity.x;
    }
    
    moveRight() {
        this.velocity.x += this.acceleration - this.friction * this.velocity.x;
    }
}

class Brick {
    constructor(position, width, height, color) {
        this.position = position;
        this.width = width;
        this.height = height;
        this.color = color;
        this.enabled = true;
    }
    
    render(context) {
        if (this.enabled) {
        context.beginPath();
        context.rect(
            this.position.x,
            this.position.y,
            this.width,
            this.height
        );
        context.fillStyle = this.color;
        context.fill();
        context.closePath();
        }
    }
}

class Sound {
    constructor(source, isLooping = false) {
        this.sound = document.createElement('audio');
        this.sound.src = source;
        this.sound.setAttribute('preload', 'auto');
        this.sound.setAttribute('controls', 'none');
        this.sound.style.display = 'none';
        this.sound.loop = isLooping;
        document.body.appendChild(this.sound);
    }
    
    play() {
        this.sound.play();
    }
    
    pause() {
        this.sound.pause();
    }
}

function initSoundEffects() {
    for (const [key, soundEffect] of Object.entries(soundEffects)) {
        if (key != 'brickHits') {
            initSoundEffect(soundEffect);
        } else {
            soundEffect.forEach(initSoundEffect);
        }
    }
}

function initSoundEffect(soundEffect) {
    soundEffect.sound.volume = 0;
    soundEffect.sound.addEventListener('ended', function onEnded() {
        soundEffect.sound.volume = 0.25;
        soundEffect.sound.removeEventListener('ended', onEnded, false);
    }, false);
    soundEffect.sound.play();
}

window.onload = () => {
    try {
        canvas = document.getElementById('canvas');
        context = canvas.getContext('2d');
        soundEffects = {
            paddleHit: new Sound('https://freesound.org/data/previews/4/4379_4948-lq.mp3'), // G
            wallHit: new Sound('https://freesound.org/data/previews/4/4365_4948-lq.mp3'), // A
            brickHits: [
                new Sound('https://freesound.org/data/previews/4/4374_4948-lq.mp3'), // F
                new Sound('https://freesound.org/data/previews/4/4388_4948-lq.mp3'), // E
                new Sound('https://freesound.org/data/previews/4/4385_4948-lq.mp3'), // D
                new Sound('https://freesound.org/data/previews/4/4370_4948-lq.mp3'), // C#
                new Sound('https://freesound.org/data/previews/4/4372_4948-lq.mp3'), // C
                new Sound('https://freesound.org/data/previews/4/4367_4948-lq.mp3') // B
            ],
            lifeLost: new Sound('https://freesound.org/data/previews/462/462189_9461949-lq.mp3'),
            music: new Sound('https://freesound.org/data/previews/431/431304_3356610-lq.mp3', true)
        }; 
        window.addEventListener(GAME_OVER, init);
        displayPlayButton(context, canvas);
        canvas.addEventListener('click', function initGame() {
            initSoundEffects();
            init(); 
            canvas.removeEventListener('click', initGame, false);
        }, false);
    } catch(e) {
        log(e);
    }
}

function log(message) {
    console.log(message);
}