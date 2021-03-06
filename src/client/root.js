import React, {Component} from 'react';
import * as MAPS from './maps';
import World from './world';
import Policy from './policy';
import WorldMap from './map';
import Cell from './components/cell';
import Snake from 'react-snake-game';

const SLEEP = 0;
const MAP = 'one';
const BATCH = 20;

export default class Root extends Component {
  constructor(props) {
    super(props);
    const worldMap = new WorldMap(MAPS[MAP]);
    this.state = {
      running: false,
      worldMap: worldMap,
      world: new World(worldMap),
      policy: new Policy(worldMap),
      position: [0, 0],
      moves: [],
      score: 0,
      sleep: SLEEP,
      wins: 0,
      losses: 0
    };
    this.handleToggleRun = this.handleToggleRun.bind(this);
    this.handleSelectWorld = this.handleSelectWorld.bind(this);
    this.runStep = this.runStep.bind(this);
  }
  handleSelectWorld(e) {
    const worldMap = new WorldMap(MAPS[e.target.value]);
    this.setState({
      worldMap: worldMap,
      world: new World(worldMap),
      policy: new Policy(worldMap),
      position: [0, 0]
    });
  }
  handleToggleRun() {
    this.setState({
      running: !this.state.running
    }, this.runStep);
  }
  runStep(n) {
    const iter = n || 1;
    if (!this.state.running) {
      return false;
    }
    const actionDecision = this.state.policy.getBestActionValue(
      this.state.world.agent);

    const {newState, action, reward} = this.state.world.doAction(actionDecision[0]);

    console.log('new policy', this.state.policy.updatePolicy(
      newState, actionDecision, reward));
    console.log('action', actionDecision[0]);
    console.log('reward', reward);
    console.log('score', this.state.score);

    if ( this.state.worldMap.map[
      this.state.world.agent[0]
    ][
      this.state.world.agent[1]
    ] === 'g') {
      /*this.state.moves.map(move => {
        this.state.policy.updatePolicy(move[0], move[1],
          this.state.score /this.state.moves.length));
      });*/
      this.state.policy.endGame();
      this.setState({
        world: new World(this.state.worldMap),
        position: [0, 0],
        moves: [],
        wins: this.state.wins + 1,
        score: 0
      });
    } else {
      this.state.moves.push([newState, actionDecision[0]])
      this.setState({
        position: this.state.world.agent,
        score: this.state.score + reward
      });
    }

    setTimeout(this.runStep, this.state.sleep);
  }
  render() {
    return (
      <div>
        <button onClick={this.handleToggleRun}>
          {'Run Training'}
        </button>
        <label>{'World'}</label>
        <select onChange={this.handleSelectWorld}>
          <option value="one">One</option>
          <option value="two">Two</option>
          <option value="three">Three</option>
          <option value="four">Four</option>
          <option value="five">Five</option>
        </select>
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
        <div>
          {this.state.world.map.map.map((row, rowI) => {
            return (
              <div>
                {row.map((cell, cellI) => {
                  const actions = this.state.policy.getActionValue([rowI, cellI]);
                  return (
                    <Cell cell={cell}
                      actionValues={actions}>
                      {this.state.position[0] === rowI &&
                        this.state.position[1] === cellI ?
                          <div style={{
                            margin: 24,
                            width: '100%',
                            height: '100%',
                            backgroundColor: 'orange'
                          }} /> : null}
                    </Cell>
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
