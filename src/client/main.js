import SnakeLearner from './snake-learner';
import Root from './root';
import React from 'react';
import ReactDOM from 'react-dom';
import Wheel from './wheel-game';
import SpeedGame from './speed-game';
import {BrowserRouter, Route} from 'react-router-dom';

ReactDOM.render(
  <BrowserRouter>
    <div>
      <Route exact path={"/"} component={Root} />
      <Route path={"/snake"} component={SnakeLearner} />
      <Route path={"/wheel"} component={Wheel} />
      <Route path={"/speed"} component={SpeedGame} />
    </div>
  </BrowserRouter>,
  document.querySelector('#root'));
