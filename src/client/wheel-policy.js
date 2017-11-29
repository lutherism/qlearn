import Policy from './policy';

function lengthOfSimilarity(snake1, snake2) {
  let matching = true;
  let length = 0;
  snake1.find((b, l) => {
    length++;
    return !snake2[l] || b[0] !== snake2[l][0] || b[1] !== snake2[l][1];
  });
  return length;
}

export default class WheelPolicy extends Policy {
  constructor() {
    super();
  }

  averageSimilarPolicy({direction, snake, food}) {
    const origin = snake[0];
    const similar = Object.keys(this.policy).reduce((a, key) => {
      const statePolicy = JSON.parse(key);
      if (JSON.stringify(statePolicy.foodDirection) ===
        JSON.stringify([
          origin[0] > food[0] ? -1 : origin[0] === food[0] ? 0 : 1,
          origin[1] > food[1] ? -1 : origin[1] === food[1] ? 0 : 1])) {
        const origin = snake[0];
        const relativeSnake = snake.map(b => {
          return [b[0] - origin[0], b[1] - origin[1]];
        });
        const ls = lengthOfSimilarity(statePolicy.snake, relativeSnake);
        if (!a[0] || a[0].similarness === ls) {
          a.push({
            policy: this.policy[key],
            similarness: lengthOfSimilarity(statePolicy.snake, relativeSnake)
          });
        }
        if (a[0] && a[0].similarness < ls) {
          a = [{
            policy: this.policy[key],
            similarness: lengthOfSimilarity(statePolicy.snake, relativeSnake)
          }];
        }
      }
      return a;
    }, []).reduce((a, s, i) => {
      a.policy = a.policy.map((k, ix) => {
        return [k[0], (k[1] * (1-(1/(i+2)))) + (s.policy[ix][1] * (1/(i+2)))];
      });
      return a;
    }, {policy: this.possibleActions().map(a => [a, 0])});
    return (similar && similar.policy);
  }

  discritizeState({direction, snake, food}) {
    const origin = snake[0];
    return JSON.stringify({
      stepsToWall: {
        '-1,0': () => origin[0] + 1,
        '1,0': () => 12 - origin[0],
        '0,-1': () => origin[1] + 1,
        '0,1': () => 12 - origin[1],
      }[direction.map(String).join(',')](),
      foodDirection: [
        origin[0] > food[0] ? -1 : origin[0] === food[0] ? 0 : 1,
        origin[1] > food[1] ? -1 : origin[1] === food[1] ? 0 : 1],
      //food: [food[0] - origin[0], food[1] - origin[1]],
      snake: snake.map(b => {
        return [b[0] - origin[0], b[1] - origin[1]];
      })
    });
  }
}
