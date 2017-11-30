import Policy from './policy';
const ALPHA = 0.5;
const discountRate = 0.3;

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

  possibleActions(state) {
    return [
      'down-straight',
      'down-left',
      'down-right',
      'left',
      'right',
      'straight',
      'brake',
      'neutral'
    ];
  }

  averageSimilarPolicy({wheelInfos}) {
    const similar = Object.keys(this.policy).reduce((a, key) => {
      const statePolicy = JSON.parse(key);
      if (JSON.stringify(wheelInfos) === JSON.stringify(statePolicy.wheelInfos)) {
        a.push({
          policy: this.policy[key]
        });
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

  discritizeState(state) {
    return JSON.stringify(state);
  }

  updatePolicy(newState, actionDecision, reward) {
    const valuePrime = this.getBestActionValue(newState);
    const learnedWeight = ((1 - ALPHA) * actionDecision[1]) +
      (ALPHA * (reward + (discountRate * valuePrime[1])));
    actionDecision[1] = learnedWeight;
    return actionDecision;
  }
}
