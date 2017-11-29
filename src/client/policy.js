
const ALPHA = 0.4;
const discountRate = 0.1;
const NOVELTY_REWARD = .4;

export default class Policy {
  constructor() {
    this.policy = {};
    this.actionHistory = [];
  }

  discritizeState(state) {
    return JSON.stringify(state);
  }

  possibleActions(state) {
    return [
      'up',
      'down',
      'left',
      'right'
    ];
  }

  getActionValue(state) {
    const discritizeState = this.discritizeState(state);
    if (!this.policy[discritizeState]) {
      if (this.averageSimilarPolicy) {
        this.policy[discritizeState] = this.averageSimilarPolicy(state);
      } else {
        this.policy[discritizeState] = this.possibleActions(state).map(p => [p, 0]);
      }
    }
    return this.policy[discritizeState];
  }

  getBestActionValue(state) {
    const bestOptions = this.getActionValue(state).reduce((a, policy) => {
      if (!a[0] || policy[1] > a[0][1]) {
        return [policy];
      }
      if (policy[1] === a[0][1]) {
        a.push(policy);
      }
      return a;
    }, []);
    return bestOptions[parseInt(Math.random() * bestOptions.length)];
  }

  endGame() {
    this.actionHistory = [];
  }

  updatePolicy(...args) {
    this.actionHistory.push(args);
    return this.actionHistory.reverse().map(([newState, actionDecision, reward]) => {
      const valuePrime = this.getBestActionValue(newState);
      const learnedWeight = ((1 - ALPHA) * actionDecision[1]) +
        (ALPHA * (reward + (discountRate * valuePrime[1])));
      actionDecision[1] = learnedWeight;
      return actionDecision;
    });
  }
}
