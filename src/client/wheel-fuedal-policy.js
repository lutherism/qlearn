import Policy from './policy';
import {deepqlearn} from "convnetjs-ts";

const ALPHA = 0.5;
const discountRate = 0.7;

var num_inputs = 15;
/*
  12 from 4 wheel
    1 enginerForce
    1 brake
    1 steering
  1 target vector direction
  1 target vector distance
  1 speed
*/
var num_actions = 8; // 5 possible angles agent can turn
var temporal_window = 1; // amount of temporal memory. 0 = agent lives in-the-moment :)
var network_size = num_inputs*temporal_window + num_actions*temporal_window + num_inputs;


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
    // the value function network computes a value of taking any of the possible actions
    // given an input state. Here we specify one explicitly the hard way
    // but user could also equivalently instead use opt.hidden_layer_sizes = [20,20]
    // to just insert simple relu hidden layers.
    var layer_defs = [];
    layer_defs.push({type:'input', out_sx:1, out_sy:1, out_depth:network_size});
    layer_defs.push({type:'fc', num_neurons: 50, activation:'relu'});
    layer_defs.push({type:'fc', num_neurons: 50, activation:'relu'});
    layer_defs.push({type:'regression', num_neurons:num_actions});

    // options for the Temporal Difference learner that trains the above net
    // by backpropping the temporal difference learning rule.
    var tdtrainer_options = {learning_rate:0.01, momentum:0.0, batch_size:64, l2_decay:0.01};

    var opt = {};
    opt.temporal_window = temporal_window;
    opt.experience_size = 30000;
    opt.start_learn_threshold = 1000;
    opt.gamma = 0.7;
    opt.learning_steps_total = 200000;
    opt.learning_steps_burnin = 3000;
    opt.epsilon_min = 0.05;
    opt.epsilon_test_time = 0.05;
    opt.layer_defs = layer_defs;
    opt.tdtrainer_options = tdtrainer_options;

    this.brain = new deepqlearn.Brain(num_inputs, num_actions, opt); // woohoo
    this.actions = this.possibleActions();
  }

  savenet() {
    var j = this.brain.value_net.toJSON();
    var t = JSON.stringify(j);
    return t;
  }

  loadnet(j) {
    this.brain.value_net.fromJSON(JSON.parse(j));
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

  getBestActionValue(state) {
    const array_with_num_inputs_numbers = [
      state.speed,
      state.targetVectorDistance,
      state.directionToTarget
    ].concat(state.wheelInfos.reduce((a, i) => a.concat([
      i.engineForce,
      i.brake,
      i.steering
    ]), []));

    var action = this.brain.forward(array_with_num_inputs_numbers);

    return [this.actions[action], 0];
  }

  updatePolicy(newState, actionDecision, reward) {
    this.brain.backward(reward);
  }
}
