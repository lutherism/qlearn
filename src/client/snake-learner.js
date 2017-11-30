import React, {Component} from 'react';
import {one, two, three, four} from './maps';
import SnakePolicy from './snake-policy';
import SnakeWorld from './snake-world';
import Cell from './components/cell';
import Snake from 'react-snake-game';
import ReactDOM from 'react-dom';

const SLEEP = 0;
const MAP = two;
const BATCH = 20;

export default class SnakeLearner extends Component {
  constructor(props) {
    super(props);
    this.state = {
      running: false,
      world: new SnakeWorld(),
      policy: new SnakePolicy(),
      score: 0,
      wins: 0,
      sleep: SLEEP,
      losses: 0,
      highScore: 0
    };
    this.handleToggleRun = this.handleToggleRun.bind(this);
    this.runStep = this.runStep.bind(this);
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
    this.state.policy.updatePolicy(
      newState, actionDecision, reward);
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
          height : 700,
          width  : 700
        }}>
          {Array(12).fill().map((row, rowI) => {
            return (
              <div>
                {Array(12).fill().map((cell, collI) => {
                  if (
                    this.state.world.snake
                    .find(body => body[0] === rowI && body[1] === collI)
                  ) {
                    return (
                      <span style={{
                        display: 'inline-block', width: 23, height: 23,
                        backgroundColor: 'green'}} />
                    );
                  }
                  if (
                    this.state.world.food[0] === rowI &&
                    this.state.world.food[1] === collI
                  ) {
                    return (
                      <span style={{
                        display: 'inline-block', width: 23, height: 23,
                        backgroundColor: 'red'}} />
                    );
                  }
                  return (
                    <span style={{
                      display: 'inline-block', width: 23, height: 23,
                      backgroundColor: 'grey'}} />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}
