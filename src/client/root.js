import React, {Component} from 'react';
import {one} from './maps';
import World from './world';
import Policy from './policy';
import WorldMap from './map';

export default class Root extends Component {
  constructor(props) {
    super(props);
    const worldMap = new WorldMap(one);
    this.state = {
      running: false,
      worldMap: worldMap,
      world: new World(worldMap),
      policy: new Policy(worldMap),
      position: [0, 0],
      moves: [],
      score: 0
    };
    this.handleToggleRun = this.handleToggleRun.bind(this);
    this.runStep = this.runStep.bind(this);
  }
  handleToggleRun() {
    this.setState({
      running: !this.state.running
    }, this.runStep);
  }
  runStep() {
    if (!this.state.running) {
      return false;
    }
    const nextActionValue = this.state.policy.getActionValue(
      this.state.world.agent);

    const {agent, action, reward} = this.state.world.doAction(nextActionValue[0]);

    console.log('new policy', this.state.policy.updatePolicy(
      agent, nextActionValue[0],
      reward * (Math.pow(1.1, this.state.moves.length + 1))));

    if (this.state.moves.length > 50 ||
      this.state.worldMap.map[
        this.state.world.agent[0]
      ][
        this.state.world.agent[1]
      ] === 'g') {
      /*this.state.moves.map(move => {
        this.state.policy.updatePolicy(move[0], move[1],
          this.state.score /this.state.moves.length));
      });*/
      this.setState({
        world: new World(this.state.worldMap),
        position: [0, 0],
        moves: [],
        score: 0
      });
    } else {
      this.state.moves.push([agent, nextActionValue[0]])
      this.setState({
        position: this.state.world.agent,
        score: this.state.score + reward
      });
    }
    console.log('action', nextActionValue[0]);
    console.log('reward', reward);
    console.log('score', this.state.score);

    setTimeout(this.runStep, 50);
  }
  render() {
    return (
      <div>
        <button onClick={this.handleToggleRun}>
          {'Run Training'}
        </button>
        <div>
          {this.state.world.map.map.map((row, rowI) => {
            return (
              <div>
                {row.map((cell, cellI) => {
                  return (
                    <div style={{
                      border: '1px solid black',
                      display: 'inline-block',
                      backgroundColor: {
                        'o': 'white',
                        'r': 'red',
                        'g': 'green',
                        'x': 'black'
                      }[cell],
                      padding: 24,
                      width: 56,
                      height: 56
                    }}>
                      {this.state.position[0] === rowI &&
                        this.state.position[1] === cellI ?
                          <div style={{
                            margin: 24,
                            width: '100%',
                            height: '100%',
                            backgroundColor: 'orange'
                          }} /> : null}
                    </div>
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
