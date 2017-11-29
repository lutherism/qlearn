import Policy from './policy';
import WorldMap from './map';

export default class World {
  constructor(map) {
    this.agent = [0, 0];
    this.map = map;
  }

  doAction(action) {
    const agent = this.agent;
    const newState = this.map.nextState(agent, action);
    let reward = 0;
    const fieldValue = {
      'o': -0.01,
      'r': -1,
      'g': 1
    };
    reward += fieldValue[this.map.stateValue(newState)];
    this.agent = newState;
    return {
      agent,
      newState,
      action,
      reward
    };
  }
}
