export default class WorldMap {
  constructor(map) {
    this.map = map;
  }

  iterateStates(fn) {
    return this.map.map((row, rowI) => {
      return row.map((cell, collI) => {
        return fn([rowI, collI], cell);
      });
    });
  }

  nextValue(position, action) {
    const nextRow = position[0] + action[0];
    const nextColl = position[1] + action[1]
    if (nextRow < 0 || nextRow >= this.map.length) {
      return -1;
    }
    if (nextColl < 0 || nextColl >= this.map[nextRow].length) {
      return -1;
    }
    return this.map[nextRow][nextColl];
  }
}
