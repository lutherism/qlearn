import World from './world';

export default class SnakeWorld extends World {
  constructor() {
    super();
    this.step = 0;
    this.snake = [
      [1,3],
      [1,2],
      [1,1]
    ];
    this.direction = [1,0];
    this.dropFood();
  }
  dropFood() {
    this.food = [parseInt(Math.random() * 12), parseInt(Math.random() * 12)];
  }
  getState() {
    return {
      snake: this.snake,
      food: this.food,
      direction: this.direction
    };
  }
  doAction(action) {
    const originalState = JSON.stringify(this.getState());
    const origDistance = Math.sqrt(
      Math.pow(this.snake[0][0] - this.food[0], 2) +
      Math.pow(this.snake[0][1] - this.food[1], 2)
    );
    if (!this.feeding) {
      this.snake.pop();
    } else {
      this.feeding = false;
    }
    this.direction = {
      'up': [-1,0],
      'down': [1,0],
      'left': [0,-1],
      'right': [0,1],
      'nothing': this.direction
    }[action];
    this.snake.unshift([
      this.snake[0][0] + this.direction[0],
      this.snake[0][1] + this.direction[1]
    ]);
    if (this.snake[0][0] === this.food[0] &&
      this.snake[0][1] === this.food[1]) {
      this.feeding = true;
      this.dropFood();
      return {
        originalState,
        newState: this.getState(),
        action,
        reward: 1
      };
    }
    if (this.snake.slice(1).find(
      body => this.snake[0][0] === body[0] &&
        this.snake[0][1] === body[1]) ||
      this.snake[0][0] < 0 ||
      this.snake[0][0] >= 12 ||
      this.snake[0][1] < 0 ||
      this.snake[0][1] >= 12) {
      this.step = 0;
      this.snake = [
        [1,3],
        [1,2],
        [1,1]
      ];
      this.feeding = false;
      this.direction = [1,0];
      this.dropFood();
      return {
        originalState,
        newState: this.getState(),
        action,
        reward: -1
      };
    }
    return {
      originalState,
      newState: this.getState(),
      action,
      reward: (origDistance - (Math.sqrt(
        Math.pow(this.snake[0][0] - this.food[0], 2) +
        Math.pow(this.snake[0][1] - this.food[1], 2) - .01)
      ))
    };
  }
}
