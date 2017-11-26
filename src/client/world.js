import Policy from './policy';
import WorldMap from './map';

export default class World {
  constructor(map) {
    this.agent = [0, 0];
    this.map = map;
  }

  doAction(action) {
    const agent = this.agent;
    const reward = {
      'o': -0.4,
      'r': -1,
      'g': 1
    }[this.map.nextValue(agent, action)];
    this.agent = [agent[0] + action[0], agent[1] + action[1]];
    return {
      agent,
      action,
      reward
    };
  }
}
