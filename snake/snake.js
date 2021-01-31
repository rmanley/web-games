var isRunning = false;
const GAME_OVER = "game_over";
var apples = [];
var snake;
var level = 1;

const Direction = { 
    up: 0, 
    right: 1, 
    down: 2, 
    left: 3,
    areOpposite: (direction1, direction2) => {
        switch (direction1) {
            case Direction.up:
                return direction2 == Direction.down;
            case Direction.right:
                return direction2 == Direction.left;
            case Direction.down:
                return direction2 == Direction.up;
            case Direction.left:
                return direction2 == Direction.right;
            default:
                return false;
        }
    }
};

function startGame(canvas, context) {
    level = 1;
    apples = generateApples(level);
    
    snake = new Snake(
        new Vector2(150, 50),
        2,
        5,
        'lime'
    );
    
    initControls(canvas, snake);
 
    isRunning = true;
    
    gameLoop(
        () => {
            snake.update();
            checkCollisions(canvas, snake, apples);
        },
        () => {
            clearScreen(context, canvas);
            snake.render(context);
            apples.forEach((apple) => {
                apple.render(context);
            });
            displayHUD(context, snake);
        }
    );
}

function gameLoop(update, render) {
    if (!isRunning) {
        dispatchEvent(new CustomEvent(GAME_OVER));
        return;
    }
    update();
    render();
    requestAnimationFrame(() => {
        gameLoop(update, render);
    });
}

function gameOver(canvas, context) {
    alert(`GAME OVER\n\nSCORE:\n\tLENGTH: ${snake.length}\n\tLEVEL: ${level}`);
    startGame(canvas, context);
}

function checkCollisions(canvas, snake) {
    if (snake.position.x < 0 
        || snake.position.x > canvas.width - snake.segmentLength 
        || snake.position.y < 0 
        || snake.position.y > canvas.height - snake.segmentLength
    ) {
        isRunning = false;
    }
    
    const eatenApples = apples.filter((apple) => apple.isDisabled);
    if (eatenApples.length == apples.length) {
        level++;
        apples = generateApples(level + Math.random() * (5 - 1) + 1); 
        return;
    }

    // check apple collisions and grow
    apples.forEach((apple, index) => {
        if (!apple.isDisabled) {
            const snakeCenter = snake.segmentLength / 2;
            const distanceFromCenter = new Vector2(
                Math.abs(
                    apple.position.x - snake.position.x - snakeCenter
                ),
                Math.abs(
                    apple.position.y - snake.position.y - snakeCenter
                )
            );
            const snakeAndApple = snakeCenter + apple.radius;
            if (distanceFromCenter.x <= snakeAndApple 
                && distanceFromCenter.y <= snakeAndApple
            ) {
                apple.isDisabled = true;
                snake.grow();
            }
        }
    });
}

function displayHUD(context, snake) { 
    context.font = '16px Arial'; 
    context.fillStyle = 'white';
    context.fillText(`Length: ${snake.length}`, 10, 20); 
    context.fillText(`Level: ${level}`, canvas.width - 90, 20);
}

function generateApples(quantity) {
    const apples = [];
    for (let i = 0; i < quantity; i++) {
        apples.push(
            new Apple(
                new Vector2(
                    Math.random() * (canvas.width - 20) + 20,
                    Math.random() * (canvas.height - 20) + 20
                ),
                5,
                'red'
            )
        );
    }
    return apples;
}

function initControls(canvas, snake) {
    window.onkeyup = (event) => {
        let direction;
        let velocity;
        switch (event.which) {
            case 37:
                direction = Direction.left;
                velocity = Vector2.left;
                break;
            case 38:
                direction = Direction.up;
                velocity = Vector2.up;
                break;
            case 39:
                direction = Direction.right;
                velocity = Vector2.right;
                break;
            case 40:
                direction = Direction.down;
                velocity = Vector2.down;
                break;
        }
        
        if (Direction.areOpposite(direction, snake.direction) || snake.isTurning) return;
        snake.direction = direction;
        snake.velocity = velocity;
    };
    
    let touchStartPosition;
    window.ontouchstart = (event) => {
        touchStartPosition = new Vector2(
            event.touches[0].pageX - canvas.offsetLeft,
            event.touches[0].pageY - canvas.offsetTop
        );
    };
    
    let touchEndPosition;
    window.ontouchmove = (event) => {
        touchEndPosition = new Vector2(
            event.touches[0].pageX - canvas.offsetLeft,
            event.touches[0].pageY - canvas.offsetTop
        );
    };
    
    window.ontouchend = () => {
        if (!touchStartPosition || !touchEndPosition) return;
        
        const diff = touchEndPosition.minus(touchStartPosition);
        let direction = snake.direction;
        let velocity = snake.velocity;
        
        if (Math.abs(diff.x) > Math.abs(diff.y)) {
            if (diff.x > 0) {
                velocity = Vector2.right;
                direction = Direction.right;
            } else {
                velocity = Vector2.left;
                direction = Direction.left;
            }
        } else {
            if (diff.y > 0) {
                velocity = Vector2.down;
                direction = Direction.down;
            } else {
                velocity = Vector2.up;
                direction = Direction.up;
            } 
        }
        
        if (Direction.areOpposite(direction, snake.direction) || snake.isTurning) return;
        snake.direction = direction;
        snake.velocity = velocity;
        
        touchStartPosition = null;
        touchEndPosition = null;
    };
}

class Snake {
    constructor(position, length, segmentLength, color, speed = 2) {
        this.color = color;
        this.segmentLength = segmentLength;
        this.body = [
            new Rectangle(
                position.copy(),
                segmentLength,
                segmentLength,
                color
            )
        ];
        
        this.velocity = Vector2.zero;
        this.speed = speed;
        this.direction = Direction.right;
        this.lastDirection = Direction.right;
        this.turnCount = 0;
        
        if (length > 2) { 
            this.grow(length - 1); 
            
        } else {
            this.grow(1);
        }
    }
    
    get head() {
        return this.body[0];
    }
    
    get tail() {
        return this.body[this.length - 1];
    }
    
    get length() {
        return this.body.length;
    }
    
    get position() {
        return this.head.position;
    }
    
    get isTurning() {
        return this.direction != this.lastDirection;
    }
    
    grow(length = 1) {
        for (let i = 0; i < length; i++) {
            let position = this.tail.position.copy();
            switch (this.direction) {
                case Direction.up:
                    position.increment(new Vector2(0, this.segmentLength));
                    break;
                case Direction.right:
                    position.decrement(new Vector2(this.segmentLength, 0));
                    break;
                case Direction.down:
                    position.decrement(new Vector2(0, this.segmentLength))
                    break;
                case Direction.left:
                    position.increment(new Vector2(this.segmentLength, 0));
                    break;
            }
            this.body.push(
                new Rectangle(
                    position,
                    this.segmentLength,
                    this.segmentLength,
                    this.color
                )
            );
        }
    }
    
    slither() {
       this.body.forEach((segment) => {
           segment.position.increment(this.velocity.copy().scale(this.speed))
       }); 
    }
    
    turn() {
        const previousSegment = this.body[1];
        const newPosition = previousSegment.position.copy();
        
        switch (this.direction) {
            case Direction.up:
                newPosition.decrement(new Vector2(0, previousSegment.height));
                break;
            case Direction.right:
                newPosition.increment(new Vector2(previousSegment.width, 0));
                break;
            case Direction.down:
                newPosition.increment(new Vector2(0, previousSegment.height));
                break;
            case Direction.left:
                newPosition.decrement(new Vector2(previousSegment.width, 0));
                break;
        }
        this.head.position = newPosition;
        this.turnCount++;
        if (this.turnCount == this.length - 1) {
            this.lastDirection = this.direction;
            this.turnCount = 0;
        }
    }
    
    update() {
        if (this.isTurning) {
            const tail = this.body.pop();
            this.body.splice(0, 0, tail);
            this.turn();
        } else {
            this.slither();
        }
    }
    
    render(context) {
        this.body.forEach((segment) => {
            segment.render(context)
        });
    }
    
    checkSelfCollision() {
        this.body.forEach((segment) => {
            if (this.position.x > segment.position.x 
                && this.position.x < segment.position.x + this.segmentLength 
                && this.position.y > segment.position.y 
                && this.position.y < segment.position.y + this.segmentLength
            ) {
                isRunning = false;
            }
        });
    }
    
    toString() {
        return JSON.stringify(this.body);
    }
}

class Apple {
    constructor(position, radius, color) {
        this.position = position;
        this.radius = radius;
        this.color = color;
        this.isDisabled = false;
        this._shape = new Circle(
            position,
            radius,
            color
        );
    }
    
    render(context) {
        if (!this.isDisabled) {
            this._shape.render(context);
        }
    }
}

class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    
    plus(other) {
        return new Vector2(
            this.x + other.x,
            this.y + other.y
        );
    }
    
    increment(other) {
        this.x += other.x;
        this.y += other.y;
        return this;
    }
    
    minus(other) {
        return new Vector2(
            this.x - other.x,
            this.y - other.y
        );
    }
    
    decrement(other) {
        this.x -= other.x;
        this.y -= other.y;
        return this;
    }
    
    get length() {
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
    }
    
    angleBetween(other) {
        return Math.atan2(
            this.y - other.y,
            this.x - other.x
        );
    }
    
    scale(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }
    
    normalized() {
        const length = this.length;
        if (length === 0) return this;
        this.x /= length;
        this.y /= length;
        return this;
    }
    
    equals(other) {
        return this.x == other.x && this.y == other.y;
    }
    
    copy(x = this.x, y = this.y) {
        return new Vector2(x, y);
    }
    
    toString() {
        return JSON.stringify(this);
    }
    
    static get zero() {
        return new Vector2(0, 0);
    }    
    
    static get up() {
        return new Vector2(0, -1);
    }
    
    static get right() {
        return new Vector2(1, 0);
    }
    
    static get down() {
        return new Vector2(0, 1);
    }
    
    static get left() {
        return new Vector2(-1, 0);
    }
}

class Circle {
    constructor(position, radius, color) {
        this.position = position;
        this.radius = radius;
        this.color = color;
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

class Rectangle {
    constructor(position, width, height, color) {
        this.position = position;
        this.width = width;
        this.height = height;
        this.color = color;
    }
    
    render(context) {
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

function clearScreen(context, canvas) {
    context.clearRect(
        0, 
        0, 
        canvas.width, 
        canvas.height
    );
}

window.onload = () => {
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    window.addEventListener(GAME_OVER, () => {
        gameOver(canvas, context);
    });
    startGame(canvas, context);
};
