export default class WorldMap {
  constructor(map) {
    this.map = map;
  }

  goalPoint() {
    return this.map.reduce((a, row, rowI) => {
      const goalCol = row.reduce((a2, col, colI) => col === 'g' ? colI : a2, -1);
      return goalCol !== -1 ? [rowI, goalCol] : a;
    }, -1)
  }

  iterateStates(fn) {
    return this.map.map((row, rowI) => {
      return row.map((cell, collI) => {
        return fn([rowI, collI], cell);
      });
    });
  }

  stateValue([nextRow, nextColl]) {
    return this.map[nextRow][nextColl];
  }

  nextState(state, action) {
    const [nextRow, nextColl] = {
      'up': () => [state[0] - 1, state[1]],
      'down': () => [state[0] + 1, state[1]],
      'left': () => [state[0], state[1] - 1],
      'right': () => [state[0], state[1] + 1],
    }[action]();
    if (nextRow < 0 || nextRow >= this.map.length) {
      return state;
    }
    if (nextColl < 0 || nextColl >= this.map[nextRow].length) {
      return state;
    }
    if (this.stateValue([nextRow, nextColl]) === 'x') {
      return state;
    }

    return [nextRow, nextColl];
  }
}
