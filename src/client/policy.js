export default class Policy {
  constructor(map) {
    this.policy = this.initPolicyFromMap(map);
  }

  initPolicyFromMap(map) {
    const policy = {};
    map.iterateStates(([rowI, collI], value) => {
      policy[`${rowI}-${collI}`] = this.defaultActions()
        .filter(action => {
          const nextValue = map.nextValue([rowI, collI], action[0]);
          if (nextValue === -1 || nextValue === 'x') {
            return false;
          }
          return true;
        });
    });
    return policy;
  }

  defaultActions() {
    return [
      [[-1, 0], 0],
      [[0, -1], 0],
      [[1, 0], 0],
      [[0, 1], 0]
    ];
  }

  getActionValue([rowI, collI]) {
    const bestOptions = this.policy[`${rowI}-${collI}`].reduce((a, policy) => {
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

  updatePolicy([rowI, collI], action, reward) {
    const statePolicy = this.policy[`${rowI}-${collI}`].find(p => {
      return p[0][0] === action[0] && p[0][1] === action[1];
    });
    statePolicy[1] = statePolicy[1] + reward;
    return statePolicy[1];
  }
}
