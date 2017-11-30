import React, {Component} from 'react';
import {one, two, three, four} from './maps';
import SpeedWorld from './speed-world';
import WheelPolicy from './wheel-net-policy';
import Cell from './components/cell';
import Snake from 'react-snake-game';
import ReactDOM from 'react-dom';

const SLEEP = 500;
const MAP = two;
const BATCH = 20;
const RELOAD = 6000;

export default class Wheel extends Component {
  constructor(props) {
    super(props);
    this.state = {
      running: true,
      policy: new WheelPolicy(),
      score: 0,
      wins: 0,
      sleep: SLEEP,
      losses: 0,
      highScore: 0,
      reward: 0,
      rewardFactors: {}
    };
    this.handleToggleRun = this.handleToggleRun.bind(this);
    this.runStep = this.runStep.bind(this);
  }
  componentDidMount() {
    this.world = new SpeedWorld({
      stepFrequency: 600
    });
    this.state.policy.loadnet(
      localStorage.getItem('qlearn-net')
    )
    this.setState({
      rewardFactors: this.world.getRewardFactors()
    });
    // Update wheels
    let gap = this.state.sleep;
    this.world.getWorld()
      .addEventListener('postStep', () => {
        if (gap === 0) {
          gap = this.state.sleep;
          this.runStep();
        } else {
          gap--;
        }
      });
    this.runStep();
  }
  handleToggleRun() {
    this.setState({
      running: !this.state.running
    }, this.runStep);
  }
  runStep(iter = 1) {
    const actionDecision = this.state.policy.getBestActionValue(
      this.world.getState());

    this.world.doAction(actionDecision[0], this.state.sleep - 1)
    .then(({newState, action, reward}) => {
      this.state.policy.updatePolicy(
        newState, actionDecision, reward);
      console.log('action', actionDecision[0]);
      console.log('reward', reward);
      this.setState({
        action: actionDecision[0],
        reward,
        points: this.world.pointIdx});
      if (reward === 2) {
        this.setState({
          wins: this.state.wins + 1,
          score: this.state.score + 1
        });
      } else if (reward === -2) {
        this.state.policy.endGame();
        this.setState({
          losses: this.state.losses + 1,
          score: 0,
          highScore: Math.max(this.state.highScore, this.state.score)
        });
      } else {
        this.forceUpdate();
      }
      setTimeout(this.runStep, 1);
    });
  }
  render() {
    return (
      <div>
        <button onClick={this.handleToggleRun}>
          {'Run Training'}
        </button>
        <button onClick={() => {
          localStorage.setItem(
            'qlearn-net',
            this.state.policy.savenet()
          );
        }}>
          {'Save'}
        </button>
        <button onClick={() => {
          this.state.policy.loadnet(
            localStorage.getItem('qlearn-net')
          )
        }}>
          {'Load'}
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
          {'Points: '}
          <strong>{this.state.points}</strong>
        </label>
        <label>
          {'High Score: '}
          <strong>{this.state.highScore}</strong>
        </label>
        <div>
          <label>
            {'action: '}
            <strong>{this.state.action}</strong>
          </label>
        </div>
        <div>
          <label>{'distance'}</label>
          <input type="number" value={this.state.rewardFactors.distanceProgressFactor}
            onChange={(e) => {
              this.world.setRewardFactor('distanceProgressFactor', e.target.value);
              this.setState({rewardFactors: this.world.getRewardFactors})
            }} />
          <label>{'orientation'}</label>
          <input type="number" value={this.state.rewardFactors.orientationProgressFactor}
            onChange={(e) => {
              this.world.setRewardFactor('orientationProgressFactor', e.target.value);
              this.setState({rewardFactors: this.world.getRewardFactors})
            }} />
        </div>
        <div>
          <label>
            {'Reward: '}
            <div style={{width: '100px', display: 'inline-block',
              position: 'relative', height: 16, border: '1px solid black'}}>
              <div style={{
                position: 'absolute',
                height: '100%',
                backgroundColor: 'black',
                left: this.state.reward >= 0 ?
                  '50px' : null,
                right: this.state.reward <= 0 ?
                  '50px' : null,

                width: Math.abs(this.state.reward) * 50
              }} />
              <div style={{position:'absolute', backgroundColor: 'red',
                left: '49.5px', width: '1px', height: '100%'}} />
            </div>
          </label>
        </div>
      </div>
    );
  }
}
