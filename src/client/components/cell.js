import React, {Component} from 'react';

export default class Cell extends Component {
  constructor(props) {
    super(props);
  }
  renderActionValues() {
    return this.props.actionValues.map(v => {
      const action = v[0];
      return (
        <div style={{
          width: 20,
          height: 20,
          position: 'absolute',
          color: 'white',
          backgroundColor:`rgba(${Math.max(Math.floor(v[1] * -150), 0) + 105}, ${Math.max(Math.floor(v[1] * 150), 0) + 105}, 105, 1)`,
          top: {
            'up': '4px',
            'right': '30px',
            'left': '30px'
          }[action],
          bottom: {
            'down': '4px'
          }[action],
          left: {
            'left': '4px',
            'down': '30px',
            'up': '30px'
          }[action],
          right: {
            'right': '4px'
          }[action]
        }}>
          {v[1] * 100}
        </div>
      );
    });
  }
  render() {
    return (
      <div style={{
        border: '1px solid black',
        display: 'inline-block',
        backgroundColor: {
          'o': 'white',
          'r': 'red',
          'g': 'green',
          'x': 'black'
        }[this.props.cell],
        position: 'relative',
        width: 80,
        height: 80
      }}>
        {this.renderActionValues()}
        {this.props.children}
      </div>
    );
  }
}
