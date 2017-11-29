import React, {Component} from 'react';
import {one, two, three, four} from './maps';
import WheelWorld from './wheel-world';
import WheelPolicy from './wheel-policy';
import Cell from './components/cell';
import Snake from 'react-snake-game';
import ReactDOM from 'react-dom';

const SLEEP = 0;
const MAP = two;
const BATCH = 20;


export default class Wheel extends Component {
  constructor(props) {
    super(props);
    this.state = {
      running: false,
      policy: new WheelPolicy(),
      score: 0,
      wins: 0,
      sleep: SLEEP,
      losses: 0,
      highScore: 0
    };
    this.handleToggleRun = this.handleToggleRun.bind(this);
    this.runStep = this.runStep.bind(this);
  }
  componentDidMount() {
    this.world = new WheelWorld({
      containerEl: ReactDOM.findDOMNode(this.refs.inspector)
    });
  }
  handleToggleRun() {
    this.setState({
      running: !this.state.running
    }, this.runStep);
  }
  runStep(iter = 1) {
    const actionDecision = this.state.policy.getBestActionValue(
      this.state.world.getState());

    const {newState, action, reward} = this.state.world.doAction(actionDecision[0]);

    console.log('new policy', this.state.policy.updatePolicy(
      newState, actionDecision, reward));
    console.log('action', actionDecision[0]);
    console.log('reward', reward);
    console.log('score', this.state.score);

    if (reward === 1) {
      this.setState({
        wins: this.state.wins + 1,
        score: this.state.score + 1
      });
    } else if (reward === -1) {
      this.state.policy.endGame();
      this.setState({
        losses: this.state.losses + 1,
        score: 0,
        highScore: Math.max(this.state.highScore, this.state.score)
      });
    } else {
      this.forceUpdate();
    }

    setTimeout(this.runStep, this.state.sleep);
  }
  render() {
    return (
      <div>
        <button onClick={this.handleToggleRun}>
          {'Run Training'}
        </button>
        <label>{'Sleep time'}</label>
        <input type="number" value={this.state.sleep}
          onChange={(e) => this.setState({sleep: e.target.value})} />
        <label>
          {'Wins: '}
          <strong>{this.state.wins}</strong>
        </label>
        <label>
          {'Losses: '}
          <strong>{this.state.losses}</strong>
        </label>
        <label>
          {'High Score: '}
          <strong>{this.state.highScore}</strong>
        </label>
        <div style={{
          margin : '30px auto',
          height : 900,
          width  : 900
        }} ref='inspector'></div>
      </div>
    );
  }
}
