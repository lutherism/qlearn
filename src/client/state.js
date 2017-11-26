export default class State {
  constructor(state) {
    super(state);
    Object.assign(this, state);
  }
}
